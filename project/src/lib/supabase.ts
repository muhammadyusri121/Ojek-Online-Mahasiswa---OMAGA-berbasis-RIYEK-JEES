import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || ''
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || ''

export const supabase = createClient(supabaseUrl, supabaseAnonKey)




// --- KODE DEBUGGING ---
console.log('--- Memeriksa Environment Variables (di profil baru) ---');
console.log('URL dari import.meta.env:', import.meta.env.VITE_SUPABASE_URL);
console.log('Key dari import.meta.env:', import.meta.env.VITE_SUPABASE_ANON_KEY);
console.log('----------------------------------------------------');




// import { createClient } from "@supabase/supabase-js";

// const supabaseUrl = process.env.REACT_APP_SUPABASE_URL || '';
// const supabaseKey = process.env.REACT_APP_SUPABASE_ANON_KEY || '';

// export const supabase = createClient(supabaseUrl, supabaseKey);
        

// Database types
export interface User {
  id: string
  name: string
  phone: string
  wa_number: string
  role: 'admin' | 'driver' | 'pengguna'
  created_at: string
}

export interface Driver {
  id: string
  user_id: string
  status: 'online' | 'offline'
  created_at: string
  user?: User
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
  user?: User
  driver?: Driver
}

export interface OrderImage {
  id: string
  order_id: string
  filename: string
  url: string
  created_at: string
}