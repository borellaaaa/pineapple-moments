/**
 * Vercel Serverless Function — /api/moderate
 * Proxy para a OpenAI Moderation API (resolve o problema de CORS)
 * 
 * A chave OPENAI_API_KEY fica só no servidor (sem VITE_ prefix)
 * → nunca exposta no bundle do frontend
 */

export default async function handler(req, res) {
  // Só aceita POST
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  const apiKey = process.env.OPENAI_API_KEY
  if (!apiKey) {
    // Sem chave → modera como "ok" para não travar o app
    return res.status(200).json({ flagged: false, categories: [] })
  }

  try {
    const response = await fetch('https://api.openai.com/v1/moderations', {
      method: 'POST',
      headers: {
        'Content-Type':  'application/json',
        'Authorization': `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: 'omni-moderation-latest',
        input: req.body.input,
      }),
    })

    if (!response.ok) {
      console.error('[moderate] OpenAI error:', response.status)
      return res.status(200).json({ flagged: false, categories: [] })
    }

    const data = await response.json()
    const result = data.results?.[0]

    if (!result) return res.status(200).json({ flagged: false, categories: [] })

    const BLOCKED = [
      'hate','hate/threatening',
      'harassment','harassment/threatening',
      'sexual','sexual/minors',
      'violence','violence/graphic',
      'self-harm','self-harm/intent','self-harm/instructions',
      'illicit','illicit/violent',
    ]

    const flagged = BLOCKED.filter(cat => result.categories?.[cat] === true)

    return res.status(200).json({
      flagged: flagged.length > 0,
      categories: flagged,
    })
  } catch (err) {
    console.error('[moderate] Erro:', err)
    // Em caso de falha de rede, deixa passar (não bloqueia o usuário)
    return res.status(200).json({ flagged: false, categories: [] })
  }
}
