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

// ─── Padrões multilíngue ──────────────────────────────────────────────────────
const PATTERNS: Record<string, RegExp[]> = {
  'violence': [
    /\b(vou te matar|te mato|vou matar|vou te machucar|vou te bater|te espanco|vou te enforcar|vou te esfaquear)\b/i,
    /\b(i('ll| will) kill you|i('ll| will) hurt you|gonna kill you|i('ll| will) stab you|i('ll| will) shoot you)\b/i,
    /\b(te voy a matar|te mato|voy a matarte|te voy a golpear|te voy a apuñalar)\b/i,
    /\b(je vais te tuer|je vais te blesser|je vais te frapper)\b/i,
    /\b(ich bringe dich um|ich töte dich|ich werde dich töten)\b/i,
    /\b(ti ammazzo|ti uccido|ti faccio del male)\b/i,
    /\b(kill yourself|kys|go die|drop dead)\b/i,
  ],
  'harassment/threatening': [
    /\b(vou te estuprar|te estupro|vou te abusar)\b/i,
    /\b(i('ll| will) rape you|i('ll| will) assault you sexually)\b/i,
    /\b(te voy a violar|voy a violarte)\b/i,
    /\b(je vais te violer)\b/i,
  ],
  'self-harm': [
    /\b(se mata|se suicide|toma veneno|corta os pulsos|se enforque)\b/i,
    /\b(kill yourself|cut yourself|end your life|commit suicide|hang yourself)\b/i,
    /\b(mátate|suicídate|córtate las venas)\b/i,
    /\b(tue-toi|suicide-toi)\b/i,
    /\b(bring dich um|töte dich selbst)\b/i,
  ],
  'sexual': [
    /\b(buceta|xoxota|cu arrombado|pau no seu|pica no seu|putaria)\b/i,
    /\b(fuck you|suck my (dick|cock)|motherfucker|cunt|pussy|asshole)\b/i,
    /\b(chinga tu madre|hijo de puta|concha tu madre)\b/i,
    /\b(va te faire foutre|fils de pute|enculé|salope)\b/i,
    /\b(fick dich|wichser|hurensohn)\b/i,
    /\b(vaffanculo|figlio di puttana|cazzo)\b/i,
    /\b(nudes|send nudes|dick pic)\b/i,
  ],
  'hate': [
    /\b(negro safado|viado do inferno|sapatão do inferno|judeu imundo)\b/i,
    /\b(nigger|faggot|kike|spic|chink|towelhead|raghead)\b/i,
    /\b(negro de mierda|maricón|judío de mierda)\b/i,
    /\b(sale (noir|arabe|juif)|pédé)\b/i,
    /\b(scheiß (jude|ausländer)|schwuchtel)\b/i,
    /\b(white power|heil hitler|death to (jews|muslims|blacks|gays))\b/i,
  ],
  'harassment': [
    /\b(seu fdp|sua fdp|vai se foder|vai tomar no|filha da puta|filho da puta|lixo humano)\b/i,
    /\b(you('re| are) (worthless|garbage|trash|disgusting|pathetic)|nobody likes you|go to hell)\b/i,
    /\b(eres una basura|nadie te quiere|vete al infierno|pedazo de mierda)\b/i,
    /\b(tu es un(e)? (déchet|merde|ordure)|va en enfer)\b/i,
    /\b(du bist wertlos|niemand mag dich|geh zur hölle)\b/i,
  ],
  'illicit': [
    /\b(comprar (droga|cocaína|crack|heroína)|vender (droga|arma))\b/i,
    /\b(buy (drugs|cocaine|heroin|meth)|sell (drugs|weapons|guns))\b/i,
    /\b(cp link|child porn|loli porn|underage porn)\b/i,
  ],
}

function detectByPattern(text: string): string[] {
  const found = new Set<string>()
  for (const [category, patterns] of Object.entries(PATTERNS)) {
    if (patterns.some(p => p.test(text))) found.add(category)
  }
  return [...found]
}

// ─── Sightengine via URL pública ──────────────────────────────────────────────
async function checkImageByUrl(url: string, apiUser: string, apiSecret: string): Promise<string[]> {
  try {
    const params = new URLSearchParams({
      url,
      models:     'nudity-2.1,weapon,violence,gore-2.0,self-harm',
      api_user:   apiUser,
      api_secret: apiSecret,
    })
    const res  = await fetch(`https://api.sightengine.com/1.0/check.json?${params}`)
    const data = await res.json()
    console.log('[moderate] SE url:', JSON.stringify(data).slice(0, 300))
    return parseSightengine(data)
  } catch (err) {
    console.warn('[moderate] SE url erro:', err)
    return []
  }
}

// ─── Sightengine via base64 — converte para Blob e envia multipart correto ────
async function checkImageByBase64(base64: string, apiUser: string, apiSecret: string): Promise<string[]> {
  try {
    // Extrai mime type e dados
    const match   = base64.match(/^data:([^;]+);base64,(.+)$/)
    const mime    = match?.[1] ?? 'image/jpeg'
    const rawB64  = match?.[2] ?? base64
    const binary  = atob(rawB64)
    const bytes   = new Uint8Array(binary.length)
    for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i)

    // Cria o Blob e adiciona ao FormData com a chave 'media' exigida pelo Sightengine
    const blob = new Blob([bytes], { type: mime })
    const form = new FormData()
    form.append('media',      blob, 'image.jpg')
    form.append('models',     'nudity-2.1,weapon,violence,gore-2.0,self-harm')
    form.append('api_user',   apiUser)
    form.append('api_secret', apiSecret)

    const res  = await fetch('https://api.sightengine.com/1.0/check.json', { method: 'POST', body: form })
    const data = await res.json()
    console.log('[moderate] SE base64:', JSON.stringify(data).slice(0, 300))
    return parseSightengine(data)
  } catch (err) {
    console.warn('[moderate] SE base64 erro:', err)
    return []
  }
}

function parseSightengine(data: Record<string, unknown>): string[] {
  if ((data as { status?: string }).status !== 'success') {
    console.warn('[moderate] SE falhou:', JSON.stringify(data).slice(0, 200))
    return []
  }
  const cats: string[] = []
  const T = 0.7
  const nudity    = (data.nudity    as Record<string, number>) ?? {}
  const violence  = (data.violence  as Record<string, number>) ?? {}
  const gore      = (data.gore      as Record<string, number>) ?? {}
  const selfHarm  = (data['self-harm'] as Record<string, number>) ?? {}
  const weapon    = (data.weapon    as { classes?: Record<string, number> }) ?? {}

  if ((nudity.sexual_activity ?? 0) > T) cats.push('sexual')
  if ((nudity.sexual_display  ?? 0) > T) cats.push('sexual')
  if ((nudity.erotica         ?? 0) > T) cats.push('sexual')
  if ((violence.prob          ?? 0) > T) cats.push('violence')
  if ((gore.prob              ?? 0) > T) cats.push('violence/graphic')
  if ((selfHarm.prob          ?? 0) > T) cats.push('self-harm')
  if ((weapon.classes?.firearm ?? 0) > T) cats.push('violence')

  return [...new Set(cats)]
}

// ─── Handler principal ────────────────────────────────────────────────────────
serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: CORS_HEADERS })
  if (req.method !== 'POST')   return json({ error: 'Method not allowed' }, 405)

  const SE_USER   = Deno.env.get('SIGHTENGINE_USER')   ?? ''
  const SE_SECRET = Deno.env.get('SIGHTENGINE_SECRET') ?? ''

  let input: { type: string; text?: string; image_url?: { url: string } }[] = []
  try {
    const body = await req.json()
    input = body.input ?? []
  } catch {
    return json({ flagged: false, categories: [] })
  }

  const allCategories: string[] = []

  for (const item of input) {
    if (item.type === 'text' && item.text) {
      const cats = detectByPattern(item.text)
      console.log('[moderate] texto cats:', cats, '|', item.text.slice(0, 60))
      allCategories.push(...cats)
    }

    if (item.type === 'image_url' && item.image_url?.url) {
      const url = item.image_url.url
      if (SE_USER && SE_SECRET) {
        const cats = url.startsWith('data:')
          ? await checkImageByBase64(url, SE_USER, SE_SECRET)
          : await checkImageByUrl(url, SE_USER, SE_SECRET)
        console.log('[moderate] imagem cats:', cats)
        allCategories.push(...cats)
      } else {
        console.warn('[moderate] Sightengine não configurado')
      }
    }
  }

  const unique  = [...new Set(allCategories)]
  const flagged = unique.length > 0
  console.log('[moderate] FINAL — flagged:', flagged, '| cats:', unique)
  return json({ flagged, categories: unique })
})
