import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

export const supabase = createClient(supabaseUrl, supabaseAnonKey)

// AUTH
export const signUp = (email, password) =>
  supabase.auth.signUp({ email, password })

export const signIn = (email, password) =>
  supabase.auth.signInWithPassword({ email, password })

export const signOut = () => supabase.auth.signOut()

export const getUser = () => supabase.auth.getUser()

// ALBUMS
export const createAlbum = async (userId, data) => {
  const { data: album, error } = await supabase
    .from('albums')
    .insert({
      owner_id: userId,
      name: data.name,
      description: data.description,
      cover_color: data.cover_color || '#FFD93D',
      cover_accent: data.cover_accent || '#FF6B9D',
      share_token: data.share_token,
      share_mode: data.share_mode || 'view',
    })
    .select()
    .single()
  return { album, error }
}

export const getMyAlbums = async (userId) => {
  const { data, error } = await supabase
    .from('albums')
    .select('*')
    .eq('owner_id', userId)
    .order('created_at', { ascending: false })
  return { data, error }
}

export const getAlbumById = async (albumId) => {
  const { data, error } = await supabase
    .from('albums')
    .select('*')
    .eq('id', albumId)
    .single()
  return { data, error }
}

export const getAlbumByToken = async (token) => {
  const { data, error } = await supabase
    .from('albums')
    .select('*')
    .eq('share_token', token)
    .single()
  return { data, error }
}

export const updateAlbum = async (albumId, updates) => {
  const { data, error } = await supabase
    .from('albums')
    .update(updates)
    .eq('id', albumId)
    .select()
    .single()
  return { data, error }
}

export const deleteAlbum = async (albumId) => {
  const { error } = await supabase.from('albums').delete().eq('id', albumId)
  return { error }
}

// PAGES
export const getPages = async (albumId) => {
  const { data, error } = await supabase
    .from('pages')
    .select('*')
    .eq('album_id', albumId)
    .order('page_number', { ascending: true })
  return { data, error }
}

export const createPage = async (albumId, pageNumber) => {
  const { data, error } = await supabase
    .from('pages')
    .insert({ album_id: albumId, page_number: pageNumber, elements: [] })
    .select()
    .single()
  return { data, error }
}

export const updatePage = async (pageId, elements) => {
  const { data, error } = await supabase
    .from('pages')
    .update({ elements })
    .eq('id', pageId)
    .select()
    .single()
  return { data, error }
}

export const deletePage = async (pageId) => {
  const { error } = await supabase.from('pages').delete().eq('id', pageId)
  return { error }
}

// STORAGE (photos)
export const uploadPhoto = async (file, userId) => {
  const ext = file.name.split('.').pop()
  const fileName = `${userId}/${Date.now()}.${ext}`
  const { data, error } = await supabase.storage
    .from('album-photos')
    .upload(fileName, file)
  if (error) return { url: null, error }
  const { data: urlData } = supabase.storage
    .from('album-photos')
    .getPublicUrl(fileName)
  return { url: urlData.publicUrl, error: null }
}
