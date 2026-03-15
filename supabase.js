import { createClient } from '@supabase/supabase-js'

export const supabase = createClient(
  import.meta.env.VITE_SUPABASE_URL,
  import.meta.env.VITE_SUPABASE_ANON_KEY
)


// ─── Log Técnico (interno) ─────────────────────────────────────────────────
async function logEvent(userId, eventType, details = {}) {
  try {
    await supabase.from('technical_logs').insert({
      user_id:    userId,
      event_type: eventType,
      details:    details,
      created_at: new Date().toISOString(),
    })
  } catch(_) {} // log nunca deve quebrar a aplicação
}

// ─── Auth ──────────────────────────────────────────────
export const signInWithGoogle = () =>
  supabase.auth.signInWithOAuth({
    provider: 'google',
    options: { redirectTo: window.location.origin + '/dashboard' }
  })

export const signOut = async () => {
  const { data: { user } } = await supabase.auth.getUser()
  if (user) await logEvent(user.id, 'logout', {})
  return supabase.auth.signOut()
}

// ─── Profiles ─────────────────────────────────────────
export const getProfile = (userId) =>
  supabase.from('profiles').select('*').eq('id', userId).single()

export const getProfileByUsername = (username) =>
  supabase.from('profiles').select('*').eq('username', username.toLowerCase()).single()

export const upsertProfile = (userId, data) =>
  supabase.from('profiles').upsert({
    id: userId,
    ...data,
    username: data.username ? data.username.toLowerCase() : undefined,
    updated_at: new Date().toISOString()
  }, { onConflict: 'id' }).select().single()

export const isUsernameAvailable = async (username, currentUserId) => {
  const { data } = await supabase
    .from('profiles')
    .select('id')
    .eq('username', username.toLowerCase())
    .single()
  if (!data) return true
  return data.id === currentUserId
}

// ─── Albums ────────────────────────────────────────────
export const getMyAlbums = (userId) =>
  supabase.from('albums').select('*').eq('owner_id', userId).order('created_at', { ascending: false })

export const getAlbumById = (id) =>
  supabase.from('albums').select('*').eq('id', id).single()

export const getAlbumByToken = (token) =>
  supabase.from('albums').select('*').eq('share_token', token).single()

export const createAlbum = async (data) => {
  const res = await supabase.from('albums').insert(data).select().single()
  if (res.data) await logEvent(data.owner_id, 'create_album', { album_id: res.data.id, name: data.name })
  return res
}

export const updateAlbum = (id, data) =>
  supabase.from('albums').update(data).eq('id', id).select().single()

export const deleteAlbum = async (id) => {
  const { data: { user } } = await supabase.auth.getUser()
  if (user) await logEvent(user.id, 'delete_album', { album_id: id })
  return supabase.from('albums').delete().eq('id', id)
}

// ─── Saved Albums ──────────────────────────────────────
export const getSavedAlbums = (userId) =>
  supabase
    .from('saved_albums')
    .select('album_id, saved_at, albums(*)')
    .eq('user_id', userId)
    .order('saved_at', { ascending: false })

export const saveAlbum = (userId, albumId) =>
  supabase.from('saved_albums').insert({ user_id: userId, album_id: albumId }).select().single()

export const unsaveAlbum = (userId, albumId) =>
  supabase.from('saved_albums').delete().eq('user_id', userId).eq('album_id', albumId)

export const isAlbumSaved = async (userId, albumId) => {
  const { data } = await supabase
    .from('saved_albums')
    .select('id')
    .eq('user_id', userId)
    .eq('album_id', albumId)
    .single()
  return !!data
}

// ─── Pages ─────────────────────────────────────────────
export const getPages = (albumId) =>
  supabase.from('pages').select('*').eq('album_id', albumId).order('page_number')

export const createPage = (albumId, pageNumber) =>
  supabase.from('pages').insert({ album_id: albumId, page_number: pageNumber, elements: [], bg_color: '#FFFFFF' }).select().single()

// FIX: salva elements, bg_color E svg_paths juntos
export const updatePage = (pageId, elements, bgColor, svgPaths) =>
  supabase.from('pages').update({
    elements,
    ...(bgColor   !== undefined ? { bg_color:  bgColor   } : {}),
    ...(svgPaths  !== undefined ? { svg_paths: svgPaths  } : {}),
  }).eq('id', pageId).select().single()

export const deletePage = (pageId) =>
  supabase.from('pages').delete().eq('id', pageId)

// ─── Photos ────────────────────────────────────────────
export const uploadPhoto = async (file, userId) => {
  const allowed = ['image/jpeg', 'image/png', 'image/webp', 'image/gif']
  if (!allowed.includes(file.type)) return { url: null, error: new Error('Tipo de arquivo não permitido. Use JPG, PNG, WEBP ou GIF.') }
  if (file.size > 5 * 1024 * 1024) return { url: null, error: new Error('Imagem muito grande! Máximo 5MB.') }

  // ── Moderação: verifica a imagem ANTES de fazer upload ──
  const { moderateImageBase64, isUserBanned } = await import('./moderation.js')
  if (userId && await isUserBanned(userId)) {
    return { url: null, error: new Error('BANNED') }
  }
  const modResult = await moderateImageBase64(file, userId)
  if (modResult.blocked) {
    return { url: null, error: new Error(`MODERATION:${modResult.label}`) }
  }

  const ext = file.name.split('.').pop().toLowerCase()
  const safeName = `${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`
  const path = `${userId}/${safeName}`

  const { error } = await supabase.storage.from('album-photos').upload(path, file, {
    cacheControl: '3600',
    contentType: file.type
  })
  if (error) return { url: null, error }
  const { data } = supabase.storage.from('album-photos').getPublicUrl(path)
  await logEvent(userId, 'upload_photo', { path })
  return { url: data.publicUrl, error: null }
}

// ─── Letters ───────────────────────────────────────────
export const sendLetter = async ({ senderId, recipientUsername, message, photoUrl }) => {
  const { data: recipient, error: rErr } = await getProfileByUsername(recipientUsername)
  if (rErr || !recipient) return { data: null, error: new Error('Usuário não encontrado 😢') }
  if (recipient.id === senderId) return { data: null, error: new Error('Você não pode enviar carta para si mesmo!') }

  // ── Moderação: verifica texto da cartinha ──
  const { moderateText, isUserBanned } = await import('./moderation.js')
  if (await isUserBanned(senderId)) {
    return { data: null, error: new Error('BANNED') }
  }
  const modResult = await moderateText(message, senderId)
  if (modResult.blocked) {
    return { data: null, error: new Error(`MODERATION:${modResult.label}`) }
  }

  await logEvent(senderId, 'send_letter', { recipient: recipientUsername })
  return supabase.from('letters').insert({
    sender_id: senderId,
    recipient_username: recipientUsername.toLowerCase(),
    recipient_id: recipient.id,
    message: message.trim(),
    photo_url: photoUrl || null
  }).select().single()
}

// FIX: usar select simples sem join nomeado que pode falhar
export const getInboxLetters = async (userId) => {
  const { data, error } = await supabase
    .from('letters')
    .select('*')
    .eq('recipient_id', userId)
    .order('created_at', { ascending: false })

  if (error || !data) return { data: [], error }

  // Busca perfis dos remetentes separadamente
  const senderIds = [...new Set(data.map(l => l.sender_id).filter(Boolean))]
  let senderMap = {}
  if (senderIds.length > 0) {
    const { data: profiles } = await supabase
      .from('profiles')
      .select('id, username, display_name, avatar_emoji')
      .in('id', senderIds)
    if (profiles) profiles.forEach(p => { senderMap[p.id] = p })
  }

  return {
    data: data.map(l => ({ ...l, sender: senderMap[l.sender_id] || null })),
    error: null
  }
}

export const getSentLetters = async (userId) => {
  const { data, error } = await supabase
    .from('letters')
    .select('*')
    .eq('sender_id', userId)
    .order('created_at', { ascending: false })

  if (error || !data) return { data: [], error }

  // Busca perfis dos destinatários separadamente
  const recipientIds = [...new Set(data.map(l => l.recipient_id).filter(Boolean))]
  let recipientMap = {}
  if (recipientIds.length > 0) {
    const { data: profiles } = await supabase
      .from('profiles')
      .select('id, username, display_name, avatar_emoji')
      .in('id', recipientIds)
    if (profiles) profiles.forEach(p => { recipientMap[p.id] = p })
  }

  return {
    data: data.map(l => ({ ...l, recipient: recipientMap[l.recipient_id] || null })),
    error: null
  }
}

export const markLetterRead = (letterId) =>
  supabase.from('letters').update({ is_read: true }).eq('id', letterId)

export const deleteLetter = (letterId) =>
  supabase.from('letters').delete().eq('id', letterId)

export const getUnreadCount = async (userId) => {
  const { count } = await supabase
    .from('letters')
    .select('id', { count: 'exact', head: true })
    .eq('recipient_id', userId)
    .eq('is_read', false)
  return count || 0
}
