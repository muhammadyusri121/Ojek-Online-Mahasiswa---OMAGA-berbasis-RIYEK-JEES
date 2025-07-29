# 🚀 Panduan Setup OMAGA - Sistem Ojek Mahasiswa

Panduan lengkap untuk setup dan deploy aplikasi OMAGA dari awal sampai selesai.

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
   - **Name**: `omaga-ojek`
   - **Database Password**: Buat password yang kuat (simpan baik-baik!)
   - **Region**: Pilih yang terdekat dengan Indonesia (Singapore)
5. Klik **"Create new project"**
6. Tunggu sekitar 2-3 menit sampai project selesai dibuat

### 1.2 Setup Database Schema
1. Di dashboard Supabase, klik **"SQL Editor"** di menu sebelah kiri
2. Copy semua kode dari file `database-schema.sql` yang sudah dibuat
3. Paste ke SQL Editor dan klik **"Run"**
4. Pastikan semua query berhasil dijalankan (✅ hijau)

### 1.3 Setup Storage untuk Upload Gambar
1. Klik **"Storage"** di menu sebelah kiri
2. Klik **"Create Bucket"**
3. Nama bucket: `order-images`
4. **Public bucket**: ☑️ (centang)
5. Klik **"Create bucket"**

### 1.4 Ambil API Keys
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

## 👤 Langkah 4: Buat Akun Admin Pertama

### 4.1 Registrasi User Pertama
1. Buka aplikasi di browser
2. Klik **"Daftar sekarang"**
3. Isi form registrasi:
   - **Nama Lengkap**: Admin OMAGA
   - **Nomor Telepon**: 081234567890
   - **Nomor WhatsApp**: 081234567890
   - **Password**: buatpasswordkuat123
4. Klik **"Daftar"**

### 4.2 Ubah Role ke Admin
1. Buka Supabase Dashboard → **"Table Editor"** → **"users"**
2. Cari user yang baru saja didaftarkan
3. Klik **"Edit"** pada kolom **role**
4. Ubah dari `pengguna` ke `admin`
5. Klik **"Save"**

### 4.3 Login sebagai Admin
1. Logout dari aplikasi
2. Login kembali dengan kredensial admin
3. Sekarang Anda memiliki akses ke semua fitur!

## 🧪 Langkah 5: Testing Aplikasi

### 5.1 Test sebagai Admin
1. Login sebagai admin
2. Cek halaman **"Admin"** - harus bisa diakses
3. Test create user baru dari dashboard admin
4. Test promosi user ke driver

### 5.2 Test sebagai Pengguna
1. Buat akun pengguna baru
2. Login dan cek dashboard pengguna
3. Test buat pesanan (delivery/ride)
4. Cek histori pesanan

### 5.3 Test sebagai Driver
1. Di admin dashboard, promosi user ke driver
2. Login sebagai driver
3. Test toggle status online/offline
4. Test terima pesanan
5. Test update status pesanan

### 5.4 Test Integrasi WhatsApp
1. Pastikan nomor WA diisi dengan format yang benar (08xxx atau 62xxx)
2. Klik tombol WhatsApp - harus membuka chat WA
3. Test dari berbagai role (pengguna ke driver, driver ke pengguna)

## 🌐 Langkah 6: Deploy ke Production

### 6.1 Build Aplikasi
```bash
npm run build
```

### 6.2 Deploy ke Netlify (Recommended)
1. Buka [netlify.com](https://netlify.com) dan login
2. Drag & drop folder `dist` ke Netlify
3. Atau gunakan Netlify CLI:
```bash
npm install -g netlify-cli
netlify login
netlify deploy --prod --dir=dist
```

### 6.3 Setup Environment Variables di Production
1. Di Netlify dashboard → **"Site settings"** → **"Environment variables"**
2. Tambahkan:
   - `VITE_SUPABASE_URL`: URL Supabase Anda
   - `VITE_SUPABASE_ANON_KEY`: Anon key Supabase Anda

### 6.4 Setup Custom Domain (Opsional)
1. Beli domain (misal: omaga-ojek.com)  
2. Di Netlify → **"Domain settings"** → **"Add custom domain"**
3. Ikuti instruksi untuk setup DNS

## 🤖 Langkah 7: Setup Telegram Bot (Opsional)

### 7.1 Buat Bot Telegram
1. Chat [@BotFather](https://t.me/botfather) di Telegram
2. Ketik `/newbot`
3. Ikuti instruksi untuk membuat bot
4. Simpan Bot Token yang diberikan

### 7.2 Implementasi Notifikasi Telegram
Untuk fitur lanjutan ini, Anda perlu:
1. Buat Supabase Edge Function untuk webhook
2. Implementasi fungsi kirim pesan Telegram
3. Setup trigger database untuk auto-notifikasi

## 🔍 Troubleshooting

### Problem: "Invalid API Key"
**Solusi**: 
- Cek file `.env` sudah benar
- Pastikan tidak ada spasi extra di URL/Key
- Restart development server setelah ubah `.env`

### Problem: "Row Level Security" Error
**Solusi**:
- Pastikan database schema sudah dijalankan lengkap
- Cek RLS policies sudah aktif di Supabase

### Problem: Tidak bisa upload gambar
**Solusi**:
- Pastikan Storage bucket sudah dibuat
- Cek bucket bersifat public
- Cek RLS policies untuk storage

### Problem: WhatsApp link tidak berfungsi
**Solusi**:
- Pastikan format nomor WA benar (08xxx atau 62xxx)
- Test di device yang ada WhatsApp
- Cek browser mengizinkan popup/redirect

## 📱 Fitur yang Sudah Diimplementasi

✅ **Authentication & Authorization**
- User registration/login
- Role-based access control (admin, driver, pengguna)
- Profile management

✅ **Dashboard System**
- Dashboard berbeda untuk setiap role
- Real-time statistics
- Responsive design

✅ **Order Management**
- Create order (delivery/ride)
- Order tracking dengan status
- Order history
- Driver assignment

✅ **Driver Features**
- Online/offline status toggle
- Accept/reject orders
- Update order status
- Order management

✅ **Admin Features**
- User management
- Driver promotion/demotion
- Order monitoring
- Data export (CSV)
- System statistics

✅ **WhatsApp Integration**
- Direct WhatsApp link ke driver
- Automated message template

✅ **UI/UX**
- Modern design dengan color scheme biru-oranye
- Mobile-responsive
- Smooth animations
- Intuitive navigation

## 🎯 Fitur Tambahan yang Bisa Dikembangkan

💡 **Enhancement Ideas**:
- Real-time notifications dengan WebSocket
- GPS tracking untuk driver
- Payment integration
- Rating & review system
- Push notifications
- Advanced analytics dashboard
- Mobile app (React Native)

## 📞 Support

Jika ada masalah atau pertanyaan:
1. Cek error di browser console (F12)
2. Cek logs di Supabase dashboard
3. Pastikan semua langkah setup sudah diikuti
4. Test dengan data dummy dulu sebelum production

---

**Selamat! 🎉 Sistem OMAGA Anda sudah siap digunakan!**

Aplikasi ini sudah production-ready dengan semua fitur yang diminta. Silakan test semua fitur dan lakukan penyesuaian sesuai kebutuhan kampus Anda.