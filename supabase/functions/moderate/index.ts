import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'

const CORS_HEADERS = {
  'Access-Control-Allow-Origin':  '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization, apikey, x-client-info',
}

function json(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
  })
}

// ─── Padrões PT-BR — fallback instantâneo, zero custo ────────────────────────
const PATTERNS: Record<string, RegExp[]> = {
  'violence': [
    /\b(vou te matar|te mato|vou matar|vou te machucar|vou te bater|te espanco|vou te enforcar|vou te esfaquear)\b/i,
    /\b(i('ll| will) kill you|gonna kill you|i('ll| will) stab you|i('ll| will) shoot you|kill yourself|kys)\b/i,
    /\b(te voy a matar|voy a matarte|te voy a apuñalar)\b/i,
    /\b(je vais te tuer|je vais te frapper)\b/i,
    /\b(ich bringe dich um|ich töte dich)\b/i,
  ],
  'harassment/threatening': [
    /\b(vou te estuprar|te estupro|vou te abusar)\b/i,
    /\b(i('ll| will) rape you|i('ll| will) assault you)\b/i,
    /\b(te voy a violar|voy a violarte)\b/i,
  ],
  'self-harm': [
    /\b(se mata|se suicide|toma veneno|corta os pulsos)\b/i,
    /\b(kill yourself|cut yourself|end your life|commit suicide|hang yourself)\b/i,
    /\b(mátate|suicídate|córtate las venas)\b/i,
  ],
  'sexual': [
    /\b(buceta|xoxota|cu arrombado|pau no seu|pica no seu)\b/i,
    /\b(fuck you|suck my dick|motherfucker|cunt)\b/i,
    /\b(chinga tu madre|hijo de puta|concha tu madre)\b/i,
    /\b(va te faire foutre|fils de pute|enculé)\b/i,
    /\b(fick dich|hurensohn|wichser)\b/i,
    /\b(vaffanculo|figlio di puttana)\b/i,
    /\b(nudes|send nudes|dick pic)\b/i,
  ],
  'hate': [
    /\b(negro safado|viado do inferno|sapatão do inferno)\b/i,
    /\b(nigger|faggot|kike|spic|chink|raghead)\b/i,
    /\b(negro de mierda|maricón)\b/i,
    /\b(sale noir|sale arabe|sale juif|pédé)\b/i,
    /\b(white power|heil hitler|death to (jews|muslims|blacks|gays))\b/i,
  ],
  'harassment': [
    /\b(seu fdp|sua fdp|vai se foder|filha da puta|filho da puta)\b/i,
    /\b(you('re| are) (worthless|garbage|trash|pathetic)|nobody likes you|go to hell)\b/i,
    /\b(eres una basura|nadie te quiere|vete al infierno)\b/i,
  ],
  'illicit': [
    /\b(cp link|child porn|loli porn|underage porn)\b/i,
    /\b(buy (cocaine|heroin|meth)|sell (drugs|weapons|guns))\b/i,
  ],
}

function detectByPattern(text: string): string[] {
  const found = new Set<string>()
  for (const [cat, patterns] of Object.entries(PATTERNS)) {
    if (patterns.some(p => p.test(text))) found.add(cat)
  }
  return [...found]
}

// ─── Hugging Face — multilíngue, qualquer idioma ─────────────────────────────
// Modelos ativos (verificados março 2025):
//   1. cardiffnlp/twitter-roberta-base-hate-latest → hate speech multilíngue
//   2. facebook/roberta-hate-speech-dynabench-r4-target → EN hate/toxicidade
//   3. martin-ha/toxic-comment-model → EN toxicidade geral
async function checkHuggingFace(text: string, hfKey: string): Promise<string[]> {
  const models = [
    'cardiffnlp/twitter-roberta-base-hate-latest',
    'martin-ha/toxic-comment-model',
    'facebook/roberta-hate-speech-dynabench-r4-target',
  ]

  for (const model of models) {
    try {
      const res = await fetch(`https://api-inference.huggingface.co/models/${model}`, {
        method:  'POST',
        headers: {
          'Authorization': `Bearer ${hfKey}`,
          'Content-Type':  'application/json',
        },
        body: JSON.stringify({ inputs: text }),
      })

      if (!res.ok) {
        console.warn(`[moderate] HF ${model} status ${res.status}`)
        continue
      }

      const raw = await res.text()
      console.log(`[moderate] HF ${model} raw:`, raw.slice(0, 300))

      let data: unknown
      try { data = JSON.parse(raw) } catch { continue }

      // Modelo carregando — cold start free tier
      if ((data as {error?: string})?.error?.includes('loading')) {
        console.warn(`[moderate] HF ${model} carregando...`)
        continue
      }

      // Normaliza resposta: pode ser [[...]] ou [...]
      const arr = Array.isArray(data) ? data : []
      const results: {label: string; score: number}[] = Array.isArray(arr[0]) ? arr[0] : arr

      if (results.length === 0) continue

      const cats: string[] = []
      const THRESHOLD = 0.60

      for (const item of results) {
        const label = (item.label || '').toLowerCase()
        const score = item.score || 0
        if (score < THRESHOLD) continue

        console.log(`[moderate] HF label="${label}" score=${score.toFixed(3)}`)

        if (['hate', 'hate speech', 'hateful', 'offensive', 'toxic', '1', 'label_1'].some(l => label.includes(l)))
          cats.push('harassment')
        if (label.includes('threat'))                              cats.push('harassment/threatening')
        if (label.includes('insult') || label.includes('obscene')) cats.push('harassment')
        if (label.includes('sexual') || label.includes('porn'))    cats.push('sexual')
        if (label.includes('violen'))                              cats.push('violence')
        if (label.includes('self') || label.includes('suicide'))   cats.push('self-harm')
        if (label.includes('identity') || label.includes('race'))  cats.push('hate')
      }

      if (results.length > 0) return [...new Set(cats)]

    } catch (err) {
      console.warn(`[moderate] HF ${model} erro:`, err)
    }
  }

  return []
}

// ─── Sightengine — moderação de IMAGEM ───────────────────────────────────────
async function checkImageByUrl(url: string, user: string, secret: string): Promise<string[]> {
  try {
    const params = new URLSearchParams({ url, models: 'nudity-2.1,weapon,violence,gore-2.0,self-harm', api_user: user, api_secret: secret })
    const res  = await fetch(`https://api.sightengine.com/1.0/check.json?${params}`)
    const data = await res.json()
    return parseSightengine(data)
  } catch { return [] }
}

async function checkImageByBase64(base64: string, user: string, secret: string): Promise<string[]> {
  try {
    const match  = base64.match(/^data:([^;]+);base64,(.+)$/)
    const mime   = match?.[1] ?? 'image/jpeg'
    const raw    = match?.[2] ?? base64
    const binary = atob(raw)
    const bytes  = new Uint8Array(binary.length)
    for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i)

    const form = new FormData()
    form.append('media',      new Blob([bytes], { type: mime }), 'image.jpg')
    form.append('models',     'nudity-2.1,weapon,violence,gore-2.0,self-harm')
    form.append('api_user',   user)
    form.append('api_secret', secret)

    const res  = await fetch('https://api.sightengine.com/1.0/check.json', { method: 'POST', body: form })
    const data = await res.json()
    console.log('[moderate] SE base64:', JSON.stringify(data).slice(0, 300))
    return parseSightengine(data)
  } catch (err) { console.warn('[moderate] SE base64 erro:', err); return [] }
}

function parseSightengine(data: Record<string, unknown>): string[] {
  if ((data as {status?: string}).status !== 'success') {
    console.warn('[moderate] SE falhou:', JSON.stringify(data).slice(0, 150))
    return []
  }
  const cats: string[] = []
  const T  = 0.7
  const n  = (data.nudity    as Record<string,number>) ?? {}
  const v  = (data.violence  as Record<string,number>) ?? {}
  const g  = (data.gore      as Record<string,number>) ?? {}
  const sh = (data['self-harm'] as Record<string,number>) ?? {}
  const w  = (data.weapon    as {classes?: Record<string,number>}) ?? {}

  if ((n.sexual_activity ?? 0) > T) cats.push('sexual')
  if ((n.sexual_display  ?? 0) > T) cats.push('sexual')
  if ((n.erotica         ?? 0) > T) cats.push('sexual')
  if ((v.prob            ?? 0) > T) cats.push('violence')
  if ((g.prob            ?? 0) > T) cats.push('violence/graphic')
  if ((sh.prob           ?? 0) > T) cats.push('self-harm')
  if ((w.classes?.firearm ?? 0) > T) cats.push('violence')

  return [...new Set(cats)]
}

// ─── Handler principal ────────────────────────────────────────────────────────
serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: CORS_HEADERS })
  if (req.method !== 'POST')   return json({ error: 'Method not allowed' }, 405)

  const HF_KEY    = Deno.env.get('HUGGINGFACE_API_KEY') ?? ''
  const SE_USER   = Deno.env.get('SIGHTENGINE_USER')    ?? ''
  const SE_SECRET = Deno.env.get('SIGHTENGINE_SECRET')  ?? ''

  let input: {type: string; text?: string; image_url?: {url: string}}[] = []
  try {
    const body = await req.json()
    input = body.input ?? []
  } catch {
    return json({ flagged: false, categories: [] })
  }

  const allCats: string[] = []

  for (const item of input) {
    // ── Texto ──────────────────────────────────────────────────────────────
    if (item.type === 'text' && item.text) {
      const text = item.text

      // 1. Padrões locais — instantâneo
      const patternCats = detectByPattern(text)
      allCats.push(...patternCats)
      console.log('[moderate] padrões:', patternCats, '|', text.slice(0, 60))

      // 2. Hugging Face — chama sempre para pegar textos sutis em qualquer idioma
      if (HF_KEY) {
        const hfCats = await checkHuggingFace(text, HF_KEY)
        allCats.push(...hfCats)
        console.log('[moderate] HF cats:', hfCats)
      }
    }

    // ── Imagem ─────────────────────────────────────────────────────────────
    if (item.type === 'image_url' && item.image_url?.url) {
      const url = item.image_url.url
      if (SE_USER && SE_SECRET) {
        const cats = url.startsWith('data:')
          ? await checkImageByBase64(url, SE_USER, SE_SECRET)
          : await checkImageByUrl(url, SE_USER, SE_SECRET)
        allCats.push(...cats)
        console.log('[moderate] imagem cats:', cats)
      }
    }
  }

  const unique  = [...new Set(allCats)]
  const flagged = unique.length > 0
  console.log('[moderate] FINAL — flagged:', flagged, '| cats:', unique)
  return json({ flagged, categories: unique })
})
