/**
 * ─── Sistema de Moderação via Supabase Edge Function ─────────────────────────
 *
 * Chama a Edge Function "moderate" hospedada no próprio Supabase.
 * Isso resolve CORS (mesma origem) e mantém a chave OpenAI segura no servidor.
 *
 * Setup (único — rodar uma vez):
 *   1. Instalar Supabase CLI: npm install -g supabase
 *   2. supabase login
 *   3. supabase link --project-ref SEU_PROJECT_REF
 *   4. supabase secrets set OPENAI_API_KEY=sk-...
 *   5. supabase functions deploy moderate
 *
 * Pronto. Sem mexer no Vercel, sem CORS, sem variável VITE_.
 * ─────────────────────────────────────────────────────────────────────────────
 */

import { supabase } from './supabase'

const VIOLATIONS_BEFORE_BAN = 3

const CATEGORY_LABELS = {
  'hate':                    'discurso de ódio',
  'hate/threatening':        'ameaça de ódio',
  'harassment':              'assédio',
  'harassment/threatening':  'ameaça de assédio',
  'sexual':                  'conteúdo sexual',
  'sexual/minors':           'conteúdo sexual envolvendo menores',
  'violence':                'violência',
  'violence/graphic':        'violência gráfica',
  'self-harm':               'automutilação',
  'self-harm/intent':        'intenção de automutilação',
  'self-harm/instructions':  'instruções de automutilação',
  'illicit':                 'atividade ilegal',
  'illicit/violent':         'atividade ilegal com violência',
}

// ─── Chama a Edge Function "moderate" no Supabase ────────────────────────────
async function callModerate(input) {
  try {
    const { data, error } = await supabase.functions.invoke('moderate', {
      body: { input },
    })
    if (error) {
      console.warn('[Moderação] Edge function erro:', error.message)
      return { flagged: false, categories: [] }
    }
    return data || { flagged: false, categories: [] }
  } catch (err) {
    console.warn('[Moderação] Falha na chamada:', err)
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

  if (count >= VIOLATIONS_BEFORE_BAN) {
    await supabase.from('moderation_bans').upsert({
      user_id:   userId,
      reason:    `Ban automático: ${count} violações de moderação`,
      banned_at: new Date().toISOString(),
    }, { onConflict: 'user_id' })
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
        await recordViolation(userId, 'image', '[base64-pre-upload]', result.categories)
        const labels = result.categories.map(c => CATEGORY_LABELS[c] || c).join(', ')
        return resolve({ blocked: true, categories: result.categories, label: labels })
      }
      resolve({ blocked: false, categories: [], label: '' })
    }
    reader.onerror = () => resolve({ blocked: false, categories: [], label: '' })
    reader.readAsDataURL(file)
  })
}
