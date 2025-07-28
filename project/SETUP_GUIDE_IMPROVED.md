# 🚀 Panduan Setup OMAGA - Sistem Ojek Mahasiswa (Versi Terbaru)

Panduan lengkap untuk setup dan deploy aplikasi OMAGA yang telah diupgrade dengan sistem database dan authentication yang lebih aman dan modern.

## 📋 Prasyarat

Sebelum memulai, pastikan Anda sudah memiliki:
- Akun [Supabase](https://supabase.io) (gratis)
- Node.js terinstall di komputer
- Browser modern (Chrome, Firefox, Safari)

## 🏗️ Langkah 1: Setup Database Supabase

### 1.1 Buat Project Supabase
1. Buka [supabase.io](https://supabase.io) dan klik **"Start your project"**
2. Login dengan akun GitHub/Google Anda
3. Klik **"New Project"**
4. Isi detail project:
   - **Name**: `omaga-ojek-improved`
   - **Database Password**: Buat password yang kuat (simpan baik-baik!)
   - **Region**: Pilih yang terdekat dengan Indonesia (Singapore)
5. Klik **"Create new project"**
6. Tunggu sekitar 2-3 menit sampai project selesai dibuat

### 1.2 Setup Database Schema Baru
1. Di dashboard Supabase, klik **"SQL Editor"** di menu sebelah kiri
2. Copy semua kode dari file `supabase/migrations/create_improved_schema.sql`
3. Paste ke SQL Editor dan klik **"Run"**
4. Pastikan semua query berhasil dijalankan (✅ hijau)

### 1.3 Setup Storage Buckets
1. Klik **"Storage"** di menu sebelah kiri
2. Buat bucket pertama:
   - Klik **"Create Bucket"**
   - Nama: `profile-pictures`
   - **Public bucket**: ☑️ (centang)
   - Klik **"Create bucket"**
3. Buat bucket kedua:
   - Klik **"Create Bucket"**
   - Nama: `order-images`
   - **Public bucket**: ☑️ (centang)
   - Klik **"Create bucket"**

### 1.4 Setup Storage Policies
1. Di Storage, klik bucket **"profile-pictures"**
2. Klik tab **"Policies"**
3. Klik **"New Policy"** dan pilih **"Custom"**
4. Masukkan policy berikut:

```sql
-- Policy untuk upload foto profil
CREATE POLICY "Users can upload own profile picture" ON storage.objects
  FOR INSERT TO authenticated WITH CHECK (
    bucket_id = 'profile-pictures' AND 
    auth.uid()::text = (storage.foldername(name))[1] AND
    (get_user_role(auth.uid()) = 'admin' OR get_user_role(auth.uid()) = 'driver')
  );

-- Policy untuk melihat foto profil
CREATE POLICY "Users can view profile pictures" ON storage.objects
  FOR SELECT TO authenticated USING (bucket_id = 'profile-pictures');

-- Policy untuk update foto profil
CREATE POLICY "Users can update own profile picture" ON storage.objects
  FOR UPDATE TO authenticated USING (
    bucket_id = 'profile-pictures' AND 
    auth.uid()::text = (storage.foldername(name))[1] AND
    (get_user_role(auth.uid()) = 'admin' OR get_user_role(auth.uid()) = 'driver')
  );
```

5. Ulangi untuk bucket **"order-images"** dengan policy:

```sql
-- Policy untuk upload gambar pesanan
CREATE POLICY "Order participants can upload images" ON storage.objects
  FOR INSERT TO authenticated WITH CHECK (bucket_id = 'order-images');

-- Policy untuk melihat gambar pesanan
CREATE POLICY "Everyone can view order images" ON storage.objects
  FOR SELECT TO authenticated USING (bucket_id = 'order-images');
```

### 1.5 Setup Email Authentication
1. Klik **"Authentication"** → **"Settings"**
2. Di tab **"General"**, pastikan:
   - **Enable email confirmations**: ☑️ (centang)
   - **Enable email change confirmations**: ☑️ (centang)
3. Di tab **"Email Templates"**, customize template sesuai kebutuhan

### 1.6 Ambil API Keys
1. Klik **"Settings"** → **"API"**
2. Copy dan simpan:
   - **Project URL** (misal: `https://abcdefgh.supabase.co`)
   - **Project API keys** → **anon public** (misal: `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...`)

## 🔧 Langkah 2: Setup Environment Variables

1. Di folder project, buat file `.env` (tanpa extension):
```env
VITE_SUPABASE_URL=https://abcdefgh.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

2. Ganti dengan URL dan Key dari Supabase Anda!

## 🚀 Langkah 3: Menjalankan Aplikasi

### 3.1 Install Dependencies
Buka terminal/command prompt di folder project dan jalankan:
```bash
npm install
```

### 3.2 Jalankan Development Server
```bash
npm run dev
```

Aplikasi akan berjalan di `http://localhost:5173`

## 👤 Langkah 4: Testing Sistem Baru

### 4.1 Registrasi User Pertama (Calon Admin)
1. Buka aplikasi di browser
2. Klik **"Daftar sekarang"**
3. Isi form registrasi dengan **EMAIL ASLI**:
   - **Nama Lengkap**: Admin OMAGA
   - **Email**: admin@omaga.com (gunakan email asli Anda)
   - **Nomor WhatsApp**: 081234567890
   - **Password**: buatpasswordkuat123
4. Klik **"Daftar"**
5. **PENTING**: Cek email Anda dan klik link verifikasi!

### 4.2 Ubah Role ke Admin
1. Buka Supabase Dashboard → **"Table Editor"** → **"users"**
2. Cari user yang baru saja didaftarkan (berdasarkan wa_number)
3. Klik **"Edit"** pada kolom **role**
4. Ubah dari `pengguna` ke `admin`
5. Klik **"Save"**

### 4.3 Login sebagai Admin
1. Kembali ke aplikasi dan login dengan email dan password
2. Sekarang Anda memiliki akses admin penuh!

## 🧪 Langkah 5: Testing Fitur Baru

### 5.1 Test Upload Foto Profil
1. Login sebagai admin
2. Klik **"Profil"** di sidebar
3. Klik icon kamera di foto profil
4. Upload foto (hanya admin dan driver yang bisa)
5. Foto akan muncul di sidebar dan profil

### 5.2 Test Sistem Email
1. Buat user baru dengan email asli
2. Cek email verifikasi masuk
3. Klik link verifikasi
4. Login dengan email dan password

### 5.3 Test Manajemen User
1. Di admin dashboard, promosi user ke driver
2. User driver sekarang bisa upload foto profil
3. Test demosi driver kembali ke pengguna

### 5.4 Test Trigger Otomatis
1. Registrasi user baru
2. Profil otomatis terbuat di tabel `users`
3. Promosi ke driver → record `drivers` otomatis terbuat
4. Demosi dari driver → record `drivers` otomatis terhapus

## 🔒 Keamanan yang Diperkuat

### Helper Function
Sistem sekarang menggunakan helper function `get_user_role()` yang menghindari infinite recursion dan membuat RLS policies lebih aman.

### Pemisahan Data
- **auth.users**: Data login (email, password) - dikelola Supabase
- **public.users**: Data profil (wa_number, role, foto) - dikelola aplikasi

### Trigger Otomatis
Database sekarang otomatis:
- Membuat profil saat user registrasi
- Membuat/hapus record driver saat role berubah
- Update timestamp saat data berubah

## 🌐 Langkah 6: Deploy ke Production

### 6.1 Build Aplikasi
```bash
npm run build
```

### 6.2 Deploy ke Netlify
1. Buka [netlify.com](https://netlify.com) dan login
2. Drag & drop folder `dist` ke Netlify
3. Setup environment variables di Netlify:
   - `VITE_SUPABASE_URL`
   - `VITE_SUPABASE_ANON_KEY`

### 6.3 Setup Email Production
1. Di Supabase → **"Authentication"** → **"Settings"**
2. Update **"Site URL"** ke domain production Anda
3. Test email verification di production

## 🆕 Fitur Baru yang Ditambahkan

### ✅ **Sistem Authentication Modern**
- Login dengan email asli (bukan nomor telepon)
- Email verification otomatis
- Password reset (built-in Supabase)

### ✅ **Upload Foto Profil**
- Hanya admin dan driver yang bisa upload
- Foto tersimpan di Supabase Storage
- Avatar otomatis dari inisial nama untuk pengguna biasa

### ✅ **Database Triggers**
- Profil otomatis terbuat saat registrasi
- Driver record otomatis dikelola saat role berubah
- Timestamp otomatis terupdate

### ✅ **Keamanan Diperkuat**
- Helper functions untuk RLS
- Pemisahan data auth dan profil
- Storage policies yang ketat

### ✅ **UI/UX Improvements**
- Avatar di sidebar dan profil
- Upload foto dengan preview
- Email field di profil (read-only)
- Better error handling

## 🔍 Troubleshooting Baru

### Problem: "Email not confirmed"
**Solusi**: 
- Cek folder spam email
- Pastikan Site URL benar di Supabase settings
- Resend verification email

### Problem: "Cannot upload profile picture"
**Solusi**:
- Pastikan user role adalah admin atau driver
- Cek storage policies sudah benar
- Cek storage buckets sudah public

### Problem: "Profile not created automatically"
**Solusi**:
- Cek trigger `handle_new_user()` sudah aktif
- Cek function permissions
- Manual insert ke tabel users jika perlu

### Problem: "Helper function not found"
**Solusi**:
- Pastikan function `get_user_role()` sudah dibuat
- Jalankan ulang migration script
- Cek function permissions

## 📊 Perbandingan Versi Lama vs Baru

| Aspek | Versi Lama | Versi Baru |
|-------|------------|------------|
| **Login** | Nomor telepon + password | Email + password |
| **Verifikasi** | Tidak ada | Email verification |
| **Data User** | Semua di satu tabel | Terpisah auth & profil |
| **Foto Profil** | Tidak ada | Upload untuk admin/driver |
| **Database** | Manual insert | Trigger otomatis |
| **Keamanan** | RLS basic | RLS + helper functions |
| **Error Handling** | Minimal | Comprehensive |

---

**Selamat! 🎉 Sistem OMAGA Versi Terbaru Anda sudah siap!**

Sistem ini sekarang lebih aman, modern, dan sesuai dengan best practices Supabase. Semua fitur lama tetap berfungsi dengan tambahan fitur baru yang powerful!

**Upgrade Highlights:**
- ✅ Email authentication yang proper
- ✅ Upload foto profil untuk admin & driver  
- ✅ Database triggers otomatis
- ✅ Keamanan RLS yang diperkuat
- ✅ UI/UX yang lebih baik
- ✅ Error handling yang comprehensive

Silakan test semua fitur dan nikmati pengalaman yang lebih baik! 🚀