import { createClient } from '@supabase/supabase-js'

export const supabase = createClient(
  import.meta.env.VITE_SUPABASE_URL,
  import.meta.env.VITE_SUPABASE_ANON_KEY
)

export const signInWithGoogle = () =>
  supabase.auth.signInWithOAuth({
    provider: 'google',
    options: { redirectTo: window.location.origin + '/dashboard' }
  })

export const signOut = () => supabase.auth.signOut()

export const getMyAlbums = (userId) =>
  supabase.from('albums').select('*').eq('owner_id', userId).order('created_at', { ascending: false })

export const getAlbumById = (id) =>
  supabase.from('albums').select('*').eq('id', id).single()

export const getAlbumByToken = (token) =>
  supabase.from('albums').select('*').eq('share_token', token).single()

export const createAlbum = (data) =>
  supabase.from('albums').insert(data).select().single()

export const updateAlbum = (id, data) =>
  supabase.from('albums').update(data).eq('id', id).select().single()

export const deleteAlbum = (id) =>
  supabase.from('albums').delete().eq('id', id)

export const getPages = (albumId) =>
  supabase.from('pages').select('*').eq('album_id', albumId).order('page_number')

export const createPage = (albumId, pageNumber) =>
  supabase.from('pages').insert({ album_id: albumId, page_number: pageNumber, elements: [] }).select().single()

export const updatePage = (pageId, elements) =>
  supabase.from('pages').update({ elements }).eq('id', pageId).select().single()

export const deletePage = (pageId) =>
  supabase.from('pages').delete().eq('id', pageId)

export const uploadPhoto = async (file, userId) => {
  const ext = file.name.split('.').pop()
  const path = `${userId}/${Date.now()}.${ext}`
  const { error } = await supabase.storage.from('album-photos').upload(path, file)
  if (error) return { url: null, error }
  const { data } = supabase.storage.from('album-photos').getPublicUrl(path)
  return { url: data.publicUrl, error: null }
}
