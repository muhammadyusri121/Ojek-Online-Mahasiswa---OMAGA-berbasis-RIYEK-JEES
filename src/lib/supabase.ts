import { createClient } from "@supabase/supabase-js";

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || "";
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || "";

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

// --- Tipe Data Database ---

export interface User {
  id: string;
  email?: string;
  name?: string;
  wa_number: string;
  role: "admin" | "driver" | "pengguna";
  profile_picture_url?: string;
  created_at: string;
  updated_at: string;
}

export interface Driver {
  id: string;
  user_id: string;
  status: "online" | "offline";
  created_at: string;
  updated_at: string;
  user?: User;
}

export interface Order {
  id: string;
  user_id: string;
  driver_id?: string;
  type: "delivery" | "ride";
  pickup_addr: string;
  dest_addr: string;
  notes?: string;
  status: "pending" | "accepted" | "in_progress" | "completed" | "cancelled";
  created_at: string;
  completed_at?: string;
  updated_at: string;
  user?: User;
  driver?: Driver;
  reports?: Report[]; // Penambahan untuk fitur Laporan
}

export interface OrderImage {
  id: string;
  order_id: string;
  filename: string;
  url: string;
  uploaded_by: string;
  created_at: string;
}

// Penambahan interface untuk fitur Laporan
export interface Report {
  id: string;
  order_id: string;
  user_id: string;
  report_message: string;
  is_anonymous: boolean;
  created_at: string;
}

// --- Fungsi Helper untuk File ---

export const uploadProfilePicture = async (userId: string, file: File) => {
  const fileExt = file.name.split(".").pop();
  const fileName = `${userId}/profile.${fileExt}`;

  const { error } = await supabase.storage
    .from("profile-pictures")
    .upload(fileName, file, { upsert: true });

  if (error) throw error;

  const {
    data: { publicUrl },
  } = supabase.storage.from("profile-pictures").getPublicUrl(fileName);

  return publicUrl;
};

export const uploadOrderImage = async (
  orderId: string,
  file: File,
  userId: string
) => {
  const fileExt = file.name.split(".").pop();
  const fileName = `${orderId}/${Date.now()}.${fileExt}`;

  const { error } = await supabase.storage
    .from("order-images")
    .upload(fileName, file);

  if (error) throw error;

  const {
    data: { publicUrl },
  } = supabase.storage.from("order-images").getPublicUrl(fileName);

  // Simpan ke database
  const { error: dbError } = await supabase.from("order_images").insert({
    order_id: orderId,
    filename: file.name,
    url: publicUrl,
    uploaded_by: userId,
  });

  if (dbError) throw dbError;

  return publicUrl;
};
