/**
 * Moderação via Supabase Edge Function — chamada fetch direta (sem SDK)
 * Isso evita problemas de configuração do supabase.functions.invoke()
 */

import { supabase } from './supabase'

const VIOLATIONS_BEFORE_BAN = 3

// URL da Edge Function montada a partir da URL do Supabase
const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL
const MODERATE_URL = `${SUPABASE_URL}/functions/v1/moderate`
const ANON_KEY     = import.meta.env.VITE_SUPABASE_ANON_KEY

const CATEGORY_LABELS = {
  'hate':                   'discurso de ódio',
  'hate/threatening':       'ameaça de ódio',
  'harassment':             'assédio',
  'harassment/threatening': 'ameaça de assédio',
  'sexual':                 'conteúdo sexual',
  'sexual/minors':          'conteúdo sexual envolvendo menores',
  'violence':               'violência',
  'violence/graphic':       'violência gráfica',
  'self-harm':              'automutilação',
  'self-harm/intent':       'intenção de automutilação',
  'self-harm/instructions': 'instruções de automutilação',
  'illicit':                'atividade ilegal',
  'illicit/violent':        'atividade ilegal com violência',
}

// ─── Chama a Edge Function diretamente via fetch ──────────────────────────────
async function callModerate(input) {
  try {
    const res = await fetch(MODERATE_URL, {
      method:  'POST',
      headers: {
        'Content-Type':  'application/json',
        'Authorization': `Bearer ${ANON_KEY}`,
        'apikey':        ANON_KEY,
      },
      body: JSON.stringify({ input }),
    })
    if (!res.ok) {
      console.warn('[Moderação] Edge function status:', res.status)
      return { flagged: false, categories: [] }
    }
    return await res.json()
  } catch (err) {
    console.warn('[Moderação] Falha:', err)
    return { flagged: false, categories: [] }
  }
}

// ─── Registrar violação + banir se atingiu limite ────────────────────────────
async function recordViolation(userId, type, content, categories) {
  if (!userId) return

  await supabase.from('moderation_violations').insert({
    user_id:    userId,
    type,
    content:    typeof content === 'string' ? content.slice(0, 500) : '[imagem]',
    categories: categories.join(', '),
    created_at: new Date().toISOString(),
  })

  const { count } = await supabase
    .from('moderation_violations')
    .select('id', { count: 'exact', head: true })
    .eq('user_id', userId)

  // Ban automático a partir da 1ª violação grave (harassment/threatening, sexual, violence)
  const INSTANT_BAN = ['harassment/threatening','hate/threatening','sexual/minors','illicit/violent']
  const hasInstantBan = categories.some(c => INSTANT_BAN.includes(c))

  if (hasInstantBan || count >= VIOLATIONS_BEFORE_BAN) {
    await supabase.from('moderation_bans').upsert({
      user_id:   userId,
      reason:    hasInstantBan
        ? `Ban imediato: ${categories.join(', ')}`
        : `Ban automático: ${count} violações`,
      banned_at: new Date().toISOString(),
    }, { onConflict: 'user_id' })

    // Força logout imediato
    await supabase.auth.signOut()
    window.location.href = '/auth?banned=1'
  }
}

// ─── Verificar se usuário está banido ────────────────────────────────────────
export async function isUserBanned(userId) {
  if (!userId) return false
  const { data } = await supabase
    .from('moderation_bans')
    .select('id')
    .eq('user_id', userId)
    .maybeSingle()
  return !!data
}

// ─── Moderação de TEXTO ───────────────────────────────────────────────────────
export async function moderateText(text, userId = null) {
  if (!text || text.trim().length < 3) return { blocked: false, categories: [], label: '' }

  const result = await callModerate([{ type: 'text', text }])

  if (result.flagged && result.categories.length > 0) {
    await recordViolation(userId, 'text', text, result.categories)
    const labels = result.categories.map(c => CATEGORY_LABELS[c] || c).join(', ')
    return { blocked: true, categories: result.categories, label: labels }
  }

  return { blocked: false, categories: [], label: '' }
}

// ─── Moderação de IMAGEM (base64 antes do upload) ────────────────────────────
export async function moderateImageBase64(file, userId = null) {
  if (!file) return { blocked: false, categories: [], label: '' }

  return new Promise((resolve) => {
    const reader = new FileReader()
    reader.onload = async () => {
      const base64 = reader.result
      const result = await callModerate([{
        type:      'image_url',
        image_url: { url: base64 },
      }])

      if (result.flagged && result.categories.length > 0) {
        await recordViolation(userId, 'image', '[imagem]', result.categories)
        const labels = result.categories.map(c => CATEGORY_LABELS[c] || c).join(', ')
        return resolve({ blocked: true, categories: result.categories, label: labels })
      }
      resolve({ blocked: false, categories: [], label: '' })
    }
    reader.onerror = () => resolve({ blocked: false, categories: [], label: '' })
    reader.readAsDataURL(file)
  })
}
