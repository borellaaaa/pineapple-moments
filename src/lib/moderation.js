/**
 * ─── Sistema de Moderação de Conteúdo ────────────────────────────────────────
 *
 * Chama /api/moderate (Vercel Serverless Function) que é um proxy para a
 * OpenAI Moderation API. Isso resolve o bloqueio de CORS que acontece quando
 * o browser tenta chamar a OpenAI diretamente.
 *
 * A chave OPENAI_API_KEY fica APENAS no servidor (Vercel Environment Variables)
 * sem o prefixo VITE_ — nunca é exposta no bundle do frontend.
 *
 * Setup:
 *   1. No Vercel → Settings → Environment Variables
 *      Nome: OPENAI_API_KEY  (sem VITE_)
 *      Valor: sua chave sk-...
 *   2. Redeploy
 *   3. Rodar supabase-moderation.sql no Supabase SQL Editor
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

// ─── Chamar nosso proxy /api/moderate ────────────────────────────────────────
async function callModerate(input) {
  try {
    const res = await fetch('/api/moderate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ input }),
    })
    if (!res.ok) return { flagged: false, categories: [] }
    return await res.json()
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

// ─── Moderação de IMAGEM (base64) ─────────────────────────────────────────────
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
