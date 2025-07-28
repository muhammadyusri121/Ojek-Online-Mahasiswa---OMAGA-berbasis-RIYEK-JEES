import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || ''
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || ''

export const supabase = createClient(supabaseUrl, supabaseAnonKey)

// Enhanced Database types
export interface User {
  id: string
  email?: string
  name?: string
  wa_number: string
  role: 'admin' | 'driver' | 'pengguna'
  profile_picture_url?: string
  created_at: string
  updated_at: string
}

export interface Driver {
  id: string
  user_id: string
  status: 'online' | 'offline'
  created_at: string
  updated_at: string
  // PERBAIKAN: Pastikan 'user' adalah satu objek User, bukan array.
  users: User 
}

export interface Order {
  id: string
  user_id: string
  driver_id?: string
  type: 'delivery' | 'ride'
  pickup_addr: string
  dest_addr: string
  notes?: string
  status: 'pending' | 'accepted' | 'in_progress' | 'completed' | 'cancelled'
  created_at: string
  completed_at?: string
  updated_at: string
  user?: User
  driver?: Driver
}

export interface OrderImage {
  id: string
  order_id: string
  filename: string
  url: string
  uploaded_by: string
  created_at: string
}

// Helper functions for file upload
export const uploadProfilePicture = async (userId: string, file: File) => {
  const fileExt = file.name.split('.').pop()
  const fileName = `${userId}/profile.${fileExt}`
  
  const { data, error } = await supabase.storage
    .from('profile-pictures')
    .upload(fileName, file, { upsert: true })

  if (error) throw error

  const { data: { publicUrl } } = supabase.storage
    .from('profile-pictures')
    .getPublicUrl(fileName)

  return publicUrl
}

export const uploadOrderImage = async (orderId: string, file: File, userId: string) => {
  const fileExt = file.name.split('.').pop()
  const fileName = `${orderId}/${Date.now()}.${fileExt}`
  
  const { data, error } = await supabase.storage
    .from('order-images')
    .upload(fileName, file)

  if (error) throw error

  const { data: { publicUrl } } = supabase.storage
    .from('order-images')
    .getPublicUrl(fileName)

  // Save to database
  const { error: dbError } = await supabase
    .from('order_images')
    .insert({
      order_id: orderId,
      filename: file.name,
      url: publicUrl,
      uploaded_by: userId
    })

  if (dbError) throw dbError

  return publicUrl
}