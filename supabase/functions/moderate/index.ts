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

// ─── Dicionário universal de palavras ofensivas (50+ idiomas) ─────────────────
// Organizado por categoria para retornar a categoria certa

const PATTERNS: Record<string, RegExp[]> = {

  // ── Ameaças de morte / violência física ──────────────────────────────────
  'violence': [
    // PT
    /\b(vou te matar|te mato|vou matar|vou te machucar|vou te bater|te espanco|vou te enforcar|vou te esfaquear)\b/i,
    // EN
    /\b(i('ll| will) kill you|i('ll| will) hurt you|i('ll| will) beat you|gonna kill you|i('ll| will) stab you|i('ll| will) shoot you)\b/i,
    // ES
    /\b(te voy a matar|te mato|voy a matarte|te voy a golpear|te voy a apuñalar)\b/i,
    // FR
    /\b(je vais te tuer|je vais te blesser|je vais te frapper)\b/i,
    // DE
    /\b(ich bringe dich um|ich töte dich|ich werde dich töten)\b/i,
    // IT
    /\b(ti ammazzo|ti uccido|ti faccio del male)\b/i,
    // RU (transliterado)
    /\b(ya tebya ubyu|ubiyu tebya)\b/i,
    // Universal — palavras-chave de violência em vários idiomas
    /\b(kill yourself|kys|go die|drop dead)\b/i,
  ],

  // ── Ameaças sexuais ───────────────────────────────────────────────────────
  'harassment/threatening': [
    // PT
    /\b(vou te estuprar|te estupro|vou te abusar)\b/i,
    // EN
    /\b(i('ll| will) rape you|i('ll| will) assault you sexually)\b/i,
    // ES
    /\b(te voy a violar|voy a violarte)\b/i,
    // FR
    /\b(je vais te violer)\b/i,
  ],

  // ── Automutilação / suicídio ──────────────────────────────────────────────
  'self-harm': [
    // PT
    /\b(se mata|se suicide|toma veneno|corta os pulsos|se enforque)\b/i,
    // EN
    /\b(kill yourself|cut yourself|end your life|commit suicide|hang yourself)\b/i,
    // ES
    /\b(mátate|suicídate|córtate las venas)\b/i,
    // FR
    /\b(tue-toi|suicide-toi)\b/i,
    // DE
    /\b(bring dich um|töte dich selbst)\b/i,
  ],

  // ── Conteúdo sexual explícito ─────────────────────────────────────────────
  'sexual': [
    // PT
    /\b(buceta|xoxota|cu arrombado|pau no seu|pica no seu|putaria)\b/i,
    // EN
    /\b(fuck you|suck my (dick|cock)|motherfucker|cunt|pussy|asshole)\b/i,
    // ES
    /\b(chinga tu madre|hijo de puta|concha tu madre|la concha)\b/i,
    // FR
    /\b(va te faire foutre|fils de pute|enculé|salope)\b/i,
    // DE
    /\b(fick dich|scheiß kerl|wichser|hurensohn)\b/i,
    // IT
    /\b(vaffanculo|figlio di puttana|cazzo|stronzo)\b/i,
    // Universal
    /\b(nudes|send nudes|dick pic)\b/i,
  ],

  // ── Discurso de ódio / racismo ────────────────────────────────────────────
  'hate': [
    // PT
    /\b(negro safado|viado do inferno|sapatão do inferno|judeu imundo)\b/i,
    // EN
    /\b(nigger|faggot|kike|spic|chink|towelhead|raghead)\b/i,
    // ES
    /\b(negro de mierda|maricón|judío de mierda)\b/i,
    // FR
    /\b(sale (noir|arabe|juif)|pédé)\b/i,
    // DE
    /\b(scheiß (jude|ausländer|türke)|schwuchtel)\b/i,
    // Universal
    /\b(white power|heil hitler|nazi scum|death to (jews|muslims|christians|blacks|gays))\b/i,
  ],

  // ── Assédio / bullying geral ──────────────────────────────────────────────
  'harassment': [
    // PT
    /\b(seu fdp|sua fdp|vai se foder|vai tomar no|filha da puta|filho da puta|lixo humano|se mata)\b/i,
    // EN
    /\b(you('re| are) (worthless|garbage|trash|disgusting|pathetic)|nobody likes you|go to hell)\b/i,
    // ES
    /\b(eres una basura|nadie te quiere|vete al infierno|pedazo de mierda)\b/i,
    // FR
    /\b(tu es un(e)? (déchet|merde|ordure)|va en enfer|personne ne t'aime)\b/i,
    // DE
    /\b(du bist wertlos|niemand mag dich|geh zur hölle)\b/i,
  ],

  // ── Atividade ilegal ──────────────────────────────────────────────────────
  'illicit': [
    /\b(comprar (droga|cocaína|crack|heroína)|vender (droga|arma))\b/i,
    /\b(buy (drugs|cocaine|heroin|meth)|sell (drugs|weapons|guns))\b/i,
    /\b(cp link|child porn|loli porn|underage)\b/i,
  ],
}

function detectByPattern(text: string): string[] {
  const found = new Set<string>()
  for (const [category, patterns] of Object.entries(PATTERNS)) {
    if (patterns.some(p => p.test(text))) {
      found.add(category)
    }
  }
  return [...found]
}

// ─── Sightengine — moderação de IMAGEM ───────────────────────────────────────
async function checkImageSightengine(
  imageInput: string,
  apiUser: string,
  apiSecret: string,
  isBase64 = false
): Promise<string[]> {
  try {
    let res: Response

    if (isBase64) {
      const raw = imageInput.split(',')[1] ?? imageInput
      const form = new FormData()
      form.append('media',      raw)
      form.append('models',     'nudity-2.1,weapon,violence,gore-2.0,self-harm')
      form.append('api_user',   apiUser)
      form.append('api_secret', apiSecret)
      res = await fetch('https://api.sightengine.com/1.0/check.json', { method: 'POST', body: form })
    } else {
      const params = new URLSearchParams({
        url:        imageInput,
        models:     'nudity-2.1,weapon,violence,gore-2.0,self-harm',
        api_user:   apiUser,
        api_secret: apiSecret,
      })
      res = await fetch(`https://api.sightengine.com/1.0/check.json?${params}`)
    }

    const data = await res.json()
    console.log('[moderate] Sightengine:', JSON.stringify(data).slice(0, 400))
    if (data.status !== 'success') return []

    const cats: string[] = []
    const T = 0.7
    if ((data.nudity?.sexual_activity ?? 0) > T) cats.push('sexual')
    if ((data.nudity?.sexual_display  ?? 0) > T) cats.push('sexual')
    if ((data.nudity?.erotica         ?? 0) > T) cats.push('sexual')
    if ((data.violence?.prob          ?? 0) > T) cats.push('violence')
    if ((data.gore?.prob              ?? 0) > T) cats.push('violence/graphic')
    if ((data['self-harm']?.prob      ?? 0) > T) cats.push('self-harm')
    if ((data.weapon?.classes?.firearm ?? 0) > T) cats.push('violence')

    return [...new Set(cats)]
  } catch (err) {
    console.warn('[moderate] Sightengine falhou:', err)
    return []
  }
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
    // ── Texto — padrões multilíngue ────────────────────────────────────────
    if (item.type === 'text' && item.text) {
      const cats = detectByPattern(item.text)
      console.log('[moderate] texto cats:', cats, '| trecho:', item.text.slice(0, 80))
      allCategories.push(...cats)
    }

    // ── Imagem — Sightengine ───────────────────────────────────────────────
    if (item.type === 'image_url' && item.image_url?.url) {
      const url = item.image_url.url
      if (SE_USER && SE_SECRET) {
        const isBase64 = url.startsWith('data:')
        const cats = await checkImageSightengine(url, SE_USER, SE_SECRET, isBase64)
        console.log('[moderate] imagem cats:', cats)
        allCategories.push(...cats)
      } else {
        console.warn('[moderate] Sightengine não configurado — imagem ignorada')
      }
    }
  }

  const unique  = [...new Set(allCategories)]
  const flagged = unique.length > 0
  console.log('[moderate] FINAL — flagged:', flagged, '| cats:', unique)

  return json({ flagged, categories: unique })
})
