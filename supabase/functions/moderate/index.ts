// Supabase Edge Function — moderate
// IMPORTANTE: no dashboard Supabase → Edge Functions → moderate
//             desativa "Enforce JWT" para esta função

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'

const CORS_HEADERS = {
  'Access-Control-Allow-Origin':  '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization, apikey, x-client-info',
}

const BLOCKED = [
  'hate','hate/threatening',
  'harassment','harassment/threatening',
  'sexual','sexual/minors',
  'violence','violence/graphic',
  'self-harm','self-harm/intent','self-harm/instructions',
  'illicit','illicit/violent',
]

function json(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
  })
}

serve(async (req) => {
  // CORS preflight — obrigatório para chamadas do browser
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: CORS_HEADERS })
  }

  if (req.method !== 'POST') {
    return json({ error: 'Method not allowed' }, 405)
  }

  const apiKey = Deno.env.get('OPENAI_API_KEY')
  if (!apiKey) {
    console.warn('[moderate] OPENAI_API_KEY não configurada')
    return json({ flagged: false, categories: [] })
  }

  let input
  try {
    const body = await req.json()
    input = body.input
  } catch {
    return json({ flagged: false, categories: [] })
  }

  if (!input) return json({ flagged: false, categories: [] })

  try {
    const res = await fetch('https://api.openai.com/v1/moderations', {
      method: 'POST',
      headers: {
        'Content-Type':  'application/json',
        'Authorization': `Bearer ${apiKey}`,
      },
      body: JSON.stringify({ model: 'omni-moderation-latest', input }),
    })

    if (!res.ok) {
      console.error('[moderate] OpenAI respondeu:', res.status)
      return json({ flagged: false, categories: [] })
    }

    const data = await res.json()
    const result = data.results?.[0]
    const flagged = result
      ? BLOCKED.filter(cat => result.categories?.[cat] === true)
      : []

    console.log('[moderate] flagged:', flagged)
    return json({ flagged: flagged.length > 0, categories: flagged })

  } catch (err) {
    console.error('[moderate] Erro:', err)
    return json({ flagged: false, categories: [] })
  }
})
