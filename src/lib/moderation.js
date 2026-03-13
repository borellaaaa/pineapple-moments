/**
 * ─── Sistema de Moderação de Conteúdo ────────────────────────────────────────
 *
 * Usa a OpenAI Moderation API (GRATUITA) para detectar:
 *   Texto  → hate speech, violência, conteúdo sexual, automutilação, etc.
 *   Imagem → conteúdo sexual, violência, automutilação (via URL ou base64)
 *
 * Ao detectar conteúdo ofensivo:
 *   1. Bloqueia a ação imediatamente
 *   2. Registra a violação no banco (tabela `moderation_violations`)
 *   3. Se atingir o limite de violações → bane o usuário automaticamente
 *
 * Setup necessário:
 *   - Adicionar VITE_OPENAI_API_KEY no .env (chave gratuita: platform.openai.com)
 *   - Rodar o SQL em supabase-moderation.sql no Supabase SQL Editor
 * ─────────────────────────────────────────────────────────────────────────────
 */

import { supabase } from './supabase'

const OPENAI_KEY = import.meta.env.VITE_OPENAI_API_KEY
const VIOLATIONS_BEFORE_BAN = 3   // quantas violações antes do ban automático

// ─── Categorias que bloqueamos (mapeadas da OpenAI) ──────────────────────────
const BLOCKED_CATEGORIES = [
  'hate',
  'hate/threatening',
  'harassment',
  'harassment/threatening',
  'sexual',
  'sexual/minors',
  'violence',
  'violence/graphic',
  'self-harm',
  'self-harm/intent',
  'self-harm/instructions',
  'illicit',
  'illicit/violent',
]

// Labels amigáveis em PT-BR para mostrar ao usuário
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

// ─── Registrar violação + banir se atingiu limite ────────────────────────────
async function recordViolation(userId, type, content, categories) {
  if (!userId) return

  // Registra a violação
  await supabase.from('moderation_violations').insert({
    user_id:    userId,
    type,                        // 'text' | 'image'
    content:    typeof content === 'string' ? content.slice(0, 500) : '[imagem]',
    categories: categories.join(', '),
    created_at: new Date().toISOString(),
  })

  // Conta violações totais do usuário
  const { count } = await supabase
    .from('moderation_violations')
    .select('id', { count: 'exact', head: true })
    .eq('user_id', userId)

  // Ban automático se atingiu o limite
  if (count >= VIOLATIONS_BEFORE_BAN) {
    await supabase.from('moderation_bans').upsert({
      user_id:    userId,
      reason:     `Ban automático: ${count} violações de moderação`,
      banned_at:  new Date().toISOString(),
    }, { onConflict: 'user_id' })
  }
}

// ─── Chamar a OpenAI Moderation API ──────────────────────────────────────────
async function callModerationAPI(input) {
  if (!OPENAI_KEY) {
    console.warn('[Moderação] VITE_OPENAI_API_KEY não configurada — moderação desativada')
    return null
  }

  try {
    const res = await fetch('https://api.openai.com/v1/moderations', {
      method: 'POST',
      headers: {
        'Content-Type':  'application/json',
        'Authorization': `Bearer ${OPENAI_KEY}`,
      },
      body: JSON.stringify({
        model: 'omni-moderation-latest',
        input,
      }),
    })

    if (!res.ok) {
      console.warn('[Moderação] Erro na API OpenAI:', res.status)
      return null
    }

    const data = await res.json()
    return data.results?.[0] || null
  } catch (err) {
    console.warn('[Moderação] Falha na chamada da API:', err)
    return null
  }
}

// ─── Moderação de TEXTO ───────────────────────────────────────────────────────
/**
 * Modera um texto (mensagens, títulos de álbum, textos de página, etc.)
 * @returns { blocked: boolean, categories: string[], label: string }
 */
export async function moderateText(text, userId = null) {
  if (!text || text.trim().length < 3) return { blocked: false, categories: [], label: '' }

  const result = await callModerationAPI([{ type: 'text', text }])
  if (!result) return { blocked: false, categories: [], label: '' }

  const flagged = BLOCKED_CATEGORIES.filter(cat => result.categories?.[cat] === true)

  if (flagged.length > 0) {
    await recordViolation(userId, 'text', text, flagged)
    const labels = flagged.map(c => CATEGORY_LABELS[c] || c).join(', ')
    return { blocked: true, categories: flagged, label: labels }
  }

  return { blocked: false, categories: [], label: '' }
}

// ─── Moderação de IMAGEM (por URL) ───────────────────────────────────────────
/**
 * Modera uma imagem após o upload (passa a URL pública)
 * @returns { blocked: boolean, categories: string[], label: string }
 */
export async function moderateImageUrl(imageUrl, userId = null) {
  if (!imageUrl) return { blocked: false, categories: [], label: '' }

  const result = await callModerationAPI([{
    type:      'image_url',
    image_url: { url: imageUrl },
  }])
  if (!result) return { blocked: false, categories: [], label: '' }

  const flagged = BLOCKED_CATEGORIES.filter(cat => result.categories?.[cat] === true)

  if (flagged.length > 0) {
    await recordViolation(userId, 'image', imageUrl, flagged)
    const labels = flagged.map(c => CATEGORY_LABELS[c] || c).join(', ')
    return { blocked: true, categories: flagged, label: labels }
  }

  return { blocked: false, categories: [], label: '' }
}

// ─── Moderação de IMAGEM (base64 — para preview antes de upload) ──────────────
/**
 * Modera uma imagem em base64 (antes de fazer upload)
 * @returns { blocked: boolean, categories: string[], label: string }
 */
export async function moderateImageBase64(file, userId = null) {
  if (!file) return { blocked: false, categories: [], label: '' }

  return new Promise((resolve) => {
    const reader = new FileReader()
    reader.onload = async () => {
      const base64 = reader.result  // "data:image/jpeg;base64,..."
      const result = await callModerationAPI([{
        type:      'image_url',
        image_url: { url: base64 },
      }])

      if (!result) return resolve({ blocked: false, categories: [], label: '' })

      const flagged = BLOCKED_CATEGORIES.filter(cat => result.categories?.[cat] === true)
      if (flagged.length > 0) {
        await recordViolation(userId, 'image', '[base64-pre-upload]', flagged)
        const labels = flagged.map(c => CATEGORY_LABELS[c] || c).join(', ')
        return resolve({ blocked: true, categories: flagged, label: labels })
      }
      resolve({ blocked: false, categories: [], label: '' })
    }
    reader.onerror = () => resolve({ blocked: false, categories: [], label: '' })
    reader.readAsDataURL(file)
  })
}
