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

// ═══════════════════════════════════════════════════════════════════════════════
// LISTA DE PALAVRAS/EXPRESSÕES SEMPRE PERMITIDAS
// Contexto afetivo, fofo e carinhoso em PT, EN, ES, FR, DE
// O sistema NUNCA bloqueia textos que contenham essas expressões
// ═══════════════════════════════════════════════════════════════════════════════
const ALWAYS_SAFE: RegExp[] = [
  // PT — carinho e afeto
  /\b(te amo|amo você|amo te|adoro você|amo demais|amo muito)\b/i,
  /\b(saudade|com saudade|que saudade|saudades)\b/i,
  /\b(fofo|fofa|fofinho|fofinha|fofura|bonitinho|bonitinha)\b/i,
  /\b(gatinho|gatinha|gato|gata|lindinho|lindinha|lindo|linda)\b/i,
  /\b(delícia|delicia|gostoso|gostosa|que delícia|que delicia)\b/i,
  /\b(amor|meu amor|minha amor|querido|querida|coração|coracao)\b/i,
  /\b(beijo|beijinho|beijinhos|abraço|abraco|abraços|abracos)\b/i,
  /\b(princesa|príncipe|principe|rei|rainha|meu rei|minha rainha)\b/i,
  /\b(parabéns|parabens|feliz aniversário|feliz aniversario)\b/i,
  /\b(feliz natal|feliz ano novo|boa sorte|torcendo por você)\b/i,
  /\b(você é incrível|voce e incrivel|você é especial|voce e especial)\b/i,
  /\b(você me faz feliz|voce me faz feliz|obrigado por existir)\b/i,
  /\b(amigo|amiga|amizade|parceiro|parceira|companheiro|companheira)\b/i,
  /\b(minha flor|florzinha|meu sol|meu bem|meu tudo|vida minha)\b/i,
  /\b(te adoro|te quero|quero você|quero voce|te cuido|cuido de você)\b/i,
  /\b(orgulho|tenho orgulho|muito orgulho|estou feliz por você)\b/i,
  /\b(maravilhoso|maravilhosa|incrível|incrivel|perfeito|perfeita)\b/i,
  /\b(ótimo|otimo|ótima|otima|excelente|brilhante|inteligente)\b/i,
  /\b(divertido|divertida|engraçado|engracado|animado|animada)\b/i,

  // EN — affection and care
  /\b(i love you|love you|i adore you|miss you|i miss you)\b/i,
  /\b(cute|cutie|sweetie|honey|darling|baby|babe|sweetheart)\b/i,
  /\b(beautiful|gorgeous|pretty|handsome|lovely|adorable)\b/i,
  /\b(amazing|wonderful|awesome|fantastic|brilliant|great)\b/i,
  /\b(dear|dearest|my love|my heart|sunshine|angel)\b/i,
  /\b(happy birthday|merry christmas|good luck|proud of you)\b/i,
  /\b(thank you|thanks|grateful|appreciate|congrats|congratulations)\b/i,
  /\b(friend|friendship|buddy|pal|bestie|best friend)\b/i,
  /\b(yummy|delicious|tasty|yum)\b/i,

  // ES — cariño
  /\b(te quiero|te amo|te adoro|mi amor|corazón|querido|querida)\b/i,
  /\b(bonito|bonita|lindo|linda|guapo|guapa|hermoso|hermosa)\b/i,
  /\b(amigo|amiga|feliz cumpleaños|gracias|increíble)\b/i,

  // FR — affection
  /\b(je t'aime|mon amour|ma chérie|mon chéri|belle|beau)\b/i,
  /\b(ami|amie|joyeux anniversaire|merci|magnifique)\b/i,

  // DE — Zuneigung
  /\b(ich liebe dich|mein schatz|liebling|süß|wunderbar|danke)\b/i,
]

// ═══════════════════════════════════════════════════════════════════════════════
// DETECÇÃO DE FRASES OFENSIVAS (precisa ser FRASE completa, não palavra solta)
// Regra: só bloqueia quando há INTENÇÃO clara de causar dano
// Palavras sozinhas como "matar", "ódio", "raiva" NÃO bloqueiam
// ═══════════════════════════════════════════════════════════════════════════════
const HARMFUL_PHRASES: Record<string, RegExp[]> = {

  'violence': [
    // PT — ameaças diretas com alvo ("te", "você", "ele", "ela")
    /\b(vou te matar|te mato agora|vou matar você|vou te machucar|vou te bater|te espanco)\b/i,
    /\b(vou te enforcar|vou te esfaquear|vou te atirar|vou acabar com você)\b/i,
    // EN — direct threats with target
    /\b(i('ll| will) kill you|i('ll| will) hurt you|gonna kill you|i('ll| will) stab you)\b/i,
    /\b(i('ll| will) shoot you|i('ll| will) beat you up|i('ll| will) destroy you)\b/i,
    /\b(kill yourself|kys)\b/i,
    // ES
    /\b(te voy a matar|voy a matarte|te voy a golpear|te voy a apuñalar)\b/i,
    // FR
    /\b(je vais te tuer|je vais te frapper|je vais te blesser)\b/i,
    // DE
    /\b(ich bringe dich um|ich töte dich|ich werde dich töten)\b/i,
  ],

  'harassment/threatening': [
    // Ameaças sexuais — frases completas apenas
    /\b(vou te estuprar|te estupro|vou te abusar sexualmente)\b/i,
    /\b(i('ll| will) rape you|i('ll| will) sexually assault you)\b/i,
    /\b(te voy a violar|voy a violarte)\b/i,
    /\b(je vais te violer)\b/i,
  ],

  'self-harm': [
    // Incitação à automutilação dirigida a outra pessoa
    /\b(se mata|vai se matar|toma veneno|corta os pulsos|se enforque)\b/i,
    /\b(kill yourself|cut yourself|end your life|commit suicide|hang yourself)\b/i,
    /\b(mátate|suicídate|córtate las venas)\b/i,
    /\b(tue-toi|suicide-toi)\b/i,
    /\b(bring dich um|töte dich selbst)\b/i,
  ],

  'sexual': [
    // Palavrões sexuais explícitos usados como ataque
    /\b(buceta|xoxota|cu arrombado|pau no seu cu|pica no seu)\b/i,
    /\b(fuck you|suck my (dick|cock)|motherfucker)\b/i,
    /\b(chinga tu madre|hijo de (puta|perra)|concha tu madre)\b/i,
    /\b(va te faire foutre|fils de pute|enculé|ta gueule)\b/i,
    /\b(fick dich|hurensohn|wichser|verpiss dich)\b/i,
    /\b(vaffanculo|figlio di puttana|cazzo in culo)\b/i,
    /\b(send nudes|dick pic|manda foto pelada|manda nudes)\b/i,
  ],

  'hate': [
    // Discurso de ódio com slur + alvo
    /\b(negro safado|viado do inferno|sapatão imundo|judeu sujo)\b/i,
    /\b(nigger|faggot|kike|spic|chink|raghead|towelhead)\b/i,
    /\b(negro de mierda|maricón de mierda)\b/i,
    /\b(sale (noir|arabe|juif|pédé))\b/i,
    /\b(white power|heil hitler|death to (jews|muslims|blacks|gays|christians))\b/i,
    /\b(nazi|nazismo|fascismo) (é bom|é certo|tem razão)/i,
  ],

  'harassment': [
    // Assédio direto — frase com alvo
    /\b(seu fdp|sua fdp|vai se foder|filha da puta|filho da puta)\b/i,
    /\b(you('re| are) (worthless|garbage|trash|pathetic|disgusting))\b/i,
    /\b(nobody likes you|no one wants you|go kill yourself|go to hell)\b/i,
    /\b(eres una basura|nadie te quiere|vete al infierno|pedazo de mierda)\b/i,
    /\b(tu n'es qu'une? (merde|ordure|déchet))\b/i,
    /\b(du bist wertlos|niemand mag dich|geh zur hölle)\b/i,
    /\b(lixo humano|escória|inútil idiota|sua merda)\b/i,
  ],

  'illicit': [
    /\b(cp link|child porn|loli porn|underage porn|pedo)\b/i,
    /\b(comprar (cocaína|heroína|crack|meth)|vender (drogas|armas|crack))\b/i,
    /\b(buy (cocaine|heroin|meth|fentanyl)|sell (drugs|guns|weapons))\b/i,
  ],
}

// ─── Verifica se texto é seguro (afetivo/fofo) ────────────────────────────────
function isSafeText(text: string): boolean {
  return ALWAYS_SAFE.some(p => p.test(text))
}

// ─── Detecta frases ofensivas com contexto ───────────────────────────────────
function detectHarmfulPhrases(text: string): string[] {
  const found = new Set<string>()
  for (const [cat, patterns] of Object.entries(HARMFUL_PHRASES)) {
    if (patterns.some(p => p.test(text))) found.add(cat)
  }
  return [...found]
}

// ─── Hugging Face — só para textos ambíguos (sem padrão claro e não fofo) ────
async function checkHuggingFace(text: string, hfKey: string): Promise<string[]> {
  const models = [
    'martin-ha/toxic-comment-model',
    'michellejieli/offensive_speech_classifier',
    'cardiffnlp/twitter-roberta-base-offensive',
  ]

  for (const model of models) {
    try {
      const res = await fetch(`https://router.huggingface.co/hf-inference/models/${model}`, {
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
      let data: unknown
      try { data = JSON.parse(raw) } catch { continue }

      if ((data as {error?: string})?.error?.includes('loading')) {
        console.warn(`[moderate] HF ${model} carregando...`)
        continue
      }

      const arr = Array.isArray(data) ? data : []
      const results: {label: string; score: number}[] = Array.isArray(arr[0]) ? arr[0] : arr
      if (results.length === 0) continue

      const cats: string[] = []
      // Threshold alto (0.88) para evitar falsos positivos
      const THRESHOLD = 0.88

      for (const item of results) {
        const label = (item.label || '').toLowerCase()
        const score = item.score || 0
        if (score < THRESHOLD) continue

        console.log(`[moderate] HF label="${label}" score=${score.toFixed(3)}`)

        if (['toxic', 'hate speech', 'hateful', 'offensive', '1', 'label_1'].some(l => label.includes(l)))
          cats.push('harassment')
        if (label.includes('threat'))                               cats.push('harassment/threatening')
        if (label.includes('insult') || label.includes('obscene'))  cats.push('harassment')
        if (label.includes('sexual') || label.includes('porn'))     cats.push('sexual')
        if (label.includes('violen'))                               cats.push('violence')
        if (label.includes('self') || label.includes('suicide'))    cats.push('self-harm')
        if (label.includes('identity') || label.includes('hate'))   cats.push('hate')
      }

      if (results.length > 0) return [...new Set(cats)]

    } catch (err) {
      console.warn(`[moderate] HF ${model} erro:`, err)
    }
  }
  return []
}

// ─── Sightengine — imagens ────────────────────────────────────────────────────
async function checkImageByUrl(url: string, user: string, secret: string): Promise<string[]> {
  try {
    const params = new URLSearchParams({
      url, models: 'nudity-2.1,weapon,violence,gore-2.0,self-harm',
      api_user: user, api_secret: secret,
    })
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
    form.append('media', new Blob([bytes], { type: mime }), 'image.jpg')
    form.append('models', 'nudity-2.1,weapon,violence,gore-2.0,self-harm')
    form.append('api_user', user)
    form.append('api_secret', secret)
    const res  = await fetch('https://api.sightengine.com/1.0/check.json', { method: 'POST', body: form })
    const data = await res.json()
    console.log('[moderate] SE base64:', JSON.stringify(data).slice(0, 200))
    return parseSightengine(data)
  } catch (err) { console.warn('[moderate] SE erro:', err); return [] }
}

function parseSightengine(data: Record<string, unknown>): string[] {
  if ((data as {status?: string}).status !== 'success') return []
  const cats: string[] = []
  const T  = 0.75
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

    // ── TEXTO ──────────────────────────────────────────────────────────────────
    if (item.type === 'text' && item.text) {
      const text = item.text.trim()
      if (text.length < 2) continue

      console.log('[moderate] texto:', text.slice(0, 80))

      // 1. Se contém expressão afetiva/fofa — PASSA sempre, sem checar HF
      if (isSafeText(text)) {
        console.log('[moderate] texto SEGURO (afetivo/fofo) — passou ✅')
        continue
      }

      // 2. Verifica frases ofensivas com contexto
      const phraseCats = detectHarmfulPhrases(text)
      if (phraseCats.length > 0) {
        console.log('[moderate] frases ofensivas:', phraseCats)
        allCats.push(...phraseCats)
        continue  // Já detectado, não precisa do HF
      }

      // 3. HF apenas para textos ambíguos (sem padrão claro E não fofo)
      // Só chama se o texto for longo o suficiente para ter contexto real
      if (HF_KEY && text.length > 10) {
        const hfCats = await checkHuggingFace(text, HF_KEY)
        if (hfCats.length > 0) {
          console.log('[moderate] HF cats:', hfCats)
          allCats.push(...hfCats)
        }
      }
    }

    // ── IMAGEM ─────────────────────────────────────────────────────────────────
    if (item.type === 'image_url' && item.image_url?.url) {
      const url = item.image_url.url
      if (SE_USER && SE_SECRET) {
        const cats = url.startsWith('data:')
          ? await checkImageByBase64(url, SE_USER, SE_SECRET)
          : await checkImageByUrl(url, SE_USER, SE_SECRET)
        if (cats.length > 0) {
          console.log('[moderate] imagem cats:', cats)
          allCats.push(...cats)
        }
      }
    }
  }

  const unique  = [...new Set(allCats)]
  const flagged = unique.length > 0
  console.log('[moderate] FINAL — flagged:', flagged, '| cats:', unique)
  return json({ flagged, categories: unique })
})
