/**
 * NCMEC CyberTipline API Integration
 * Envia relatórios automáticos para o NCMEC quando conteúdo ilícito é confirmado
 */
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization, apikey',
}

function json(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), {
    status, headers: { ...CORS, 'Content-Type': 'application/json' }
  })
}

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: CORS })
  if (req.method !== 'POST') return json({ error: 'Method not allowed' }, 405)

  const NCMEC_API_KEY = Deno.env.get('NCMEC_API_KEY') ?? ''
  const NCMEC_ORG_ID  = Deno.env.get('NCMEC_ORG_ID')  ?? ''
  const IS_TEST       = Deno.env.get('NCMEC_TEST_MODE') === 'true'

  let body: any
  try { body = await req.json() } catch { return json({ error: 'Invalid body' }, 400) }

  // Modo simulação — NCMEC não configurado ainda
  if (!NCMEC_API_KEY || !NCMEC_ORG_ID) {
    console.log('[NCMEC] Modo simulação — credenciais não configuradas')
    console.log('[NCMEC] Dados do relatório:', JSON.stringify(body))
    return json({
      status: 'simulation',
      tip_id: `SIM-${Date.now()}`,
      message: 'NCMEC em modo simulação. Configure NCMEC_API_KEY e NCMEC_ORG_ID após aprovação do NCMEC.',
    })
  }

  const BASE = IS_TEST
    ? 'https://api-test.cybertipline.org/v2'
    : 'https://api.cybertipline.org/v2'

  const auth = `Basic ${btoa(`${NCMEC_ORG_ID}:${NCMEC_API_KEY}`)}`

  try {
    // Inicia relatório
    const res = await fetch(`${BASE}/reports`, {
      method: 'POST',
      headers: { 'Authorization': auth, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        reportType: 'url',
        incidentSummary: {
          incidentType: 'Child Pornography (possession, manufacture, and distribution)',
          incidentDateTime: body.incident_datetime,
          incidentTimeZone: 'America/Sao_Paulo',
        },
        reporter: {
          reportingESPName: 'Pineapple Moments',
          reportingESPWebsite: 'https://pineapple-moments.vercel.app',
          reporterName: 'Pineapple Moments Admin',
          reporterEmail: 'rafaelborella49@gmail.com',
        },
        uploadedContent: [{
          fileDetails: {
            reportedToNCMEC: true,
            originalFileName: `album-${body.album_id}`,
            publicationInfo: { reportedUploadUrl: body.content_url },
          }
        }],
        incidentUser: {
          displayName: body.reported_username || 'unknown',
          loginName:   body.reported_username || 'unknown',
          userId:      body.reported_user_id  || '',
          emailAddress: body.reported_user_email || '',
        },
        additionalInfo: `Report ID: ${body.report_id} | Reason: ${body.reason} | Reporter: @${body.reporter_username}`,
      })
    })

    const data = await res.json()
    const tipId = data.reportId || data.tip_id || data.id

    // Submete o relatório
    if (tipId) {
      await fetch(`${BASE}/reports/${tipId}/submit`, {
        method: 'POST',
        headers: { 'Authorization': auth, 'Content-Type': 'application/json' },
      })
    }

    console.log('[NCMEC] Relatório enviado:', tipId)
    return json({ status: 'success', tip_id: tipId, submitted_at: new Date().toISOString() })

  } catch (err) {
    console.error('[NCMEC] Erro:', err)
    return json({ status: 'error', message: String(err) }, 500)
  }
})
