// Supabase Edge Function — moderate
// Deploy: supabase functions deploy moderate
// Variável necessária: supabase secrets set OPENAI_API_KEY=sk-...

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'

const CORS = {
  'Access-Control-Allow-Origin':  '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
}

const BLOCKED = [
  'hate','hate/threatening',
  'harassment','harassment/threatening',
  'sexual','sexual/minors',
  'violence','violence/graphic',
  'self-harm','self-harm/intent','self-harm/instructions',
  'illicit','illicit/violent',
]

serve(async (req) => {
  // CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: CORS })
  }

  if (req.method !== 'POST') {
    return new Response('Method not allowed', { status: 405, headers: CORS })
  }

  const apiKey = Deno.env.get('OPENAI_API_KEY')
  if (!apiKey) {
    // Sem chave → deixa passar (não bloqueia o app)
    return new Response(
      JSON.stringify({ flagged: false, categories: [] }),
      { headers: { ...CORS, 'Content-Type': 'application/json' } }
    )
  }

  try {
    const { input } = await req.json()

    const res = await fetch('https://api.openai.com/v1/moderations', {
      method: 'POST',
      headers: {
        'Content-Type':  'application/json',
        'Authorization': `Bearer ${apiKey}`,
      },
      body: JSON.stringify({ model: 'omni-moderation-latest', input }),
    })

    if (!res.ok) {
      console.error('OpenAI error:', res.status)
      return new Response(
        JSON.stringify({ flagged: false, categories: [] }),
        { headers: { ...CORS, 'Content-Type': 'application/json' } }
      )
    }

    const data = await res.json()
    const result = data.results?.[0]
    const flagged = result
      ? BLOCKED.filter(cat => result.categories?.[cat] === true)
      : []

    return new Response(
      JSON.stringify({ flagged: flagged.length > 0, categories: flagged }),
      { headers: { ...CORS, 'Content-Type': 'application/json' } }
    )
  } catch (err) {
    console.error('Edge function error:', err)
    return new Response(
      JSON.stringify({ flagged: false, categories: [] }),
      { headers: { ...CORS, 'Content-Type': 'application/json' } }
    )
  }
})
