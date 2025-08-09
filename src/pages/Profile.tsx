// src/pages/Profile.tsx

import React, { useState } from 'react'
import { useAuth } from '../contexts/AuthContext'
import { supabase } from '../lib/supabase'
import { User, Phone, Save, AlertCircle, CheckCircle, Camera, Mail, Lock } from 'lucide-react'

export default function Profile() {
  const { user, updateProfile, updatePassword } = useAuth() // Ambil fungsi updatePassword
  
  // State untuk form profil
  const [formData, setFormData] = useState({
    name: user?.name || '',
    wa_number: user?.wa_number || ''
  })
  const [loadingProfile, setLoadingProfile] = useState(false)
  const [uploadingImage, setUploadingImage] = useState(false)
  const [profileMessage, setProfileMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null)

  // --- State baru untuk form ubah password ---
  const [passwordData, setPasswordData] = useState({ newPassword: '', confirmPassword: '' });
  const [loadingPassword, setLoadingPassword] = useState(false);
  const [passwordMessage, setPasswordMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null);
  
  const canUploadPhoto = user?.role === 'admin' || user?.role === 'driver'

  const handleProfileSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoadingProfile(true);
    setProfileMessage(null);
    try {
      await updateProfile({ name: formData.name, wa_number: formData.wa_number });
      setProfileMessage({ type: 'success', text: 'Profil berhasil diperbarui!' });
    } catch (error: any) {
      setProfileMessage({ type: 'error', text: error.message });
    } finally {
      setLoadingProfile(false);
    }
  }
  
  // --- Fungsi baru untuk menangani submit ubah password ---
  const handlePasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setPasswordMessage(null);

    if (passwordData.newPassword.length < 6) {
      setPasswordMessage({ type: 'error', text: 'Password baru minimal harus 6 karakter.' });
      return;
    }
    if (passwordData.newPassword !== passwordData.confirmPassword) {
      setPasswordMessage({ type: 'error', text: 'Konfirmasi password tidak cocok.' });
      return;
    }
    
    setLoadingPassword(true);
    const { error } = await updatePassword(passwordData.newPassword);
    
    if (error) {
      setPasswordMessage({ type: 'error', text: `Gagal mengubah password: ${error}` });
    } else {
      setPasswordMessage({ type: 'success', text: 'Password berhasil diubah!' });
      setPasswordData({ newPassword: '', confirmPassword: '' }); // Kosongkan form
    }
    setLoadingPassword(false);
  }

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !user) return;
    setUploadingImage(true);
    setProfileMessage(null);
    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `${user.id}/profile.${fileExt}`;
      const { error: uploadError } = await supabase.storage.from('profile-pictures').upload(fileName, file, { upsert: true });
      if (uploadError) throw uploadError;

      const { data } = supabase.storage.from('profile-pictures').getPublicUrl(fileName);
      await updateProfile({ profile_picture_url: `${data.publicUrl}?t=${new Date().getTime()}` }); // Tambahkan timestamp untuk bust cache
      setProfileMessage({ type: 'success', text: 'Foto profil berhasil diperbarui!' });
    } catch (error: any) {
      setProfileMessage({ type: 'error', text: error.message });
    } finally {
      setUploadingImage(false);
    }
  }

  const MessageComponent = ({ message }: { message: { type: 'success' | 'error', text: string } | null }) => {
    if (!message) return null;
    return (
      <div className={`mb-6 p-4 rounded-lg flex items-center space-x-2 ${
        message.type === 'success' 
          ? 'bg-green-50 border border-green-200' 
          : 'bg-red-50 border border-red-200'
      }`}>
        {message.type === 'success' ? <CheckCircle className="w-5 h-5 text-green-600" /> : <AlertCircle className="w-5 h-5 text-red-600" />}
        <span className={`text-sm ${message.type === 'success' ? 'text-green-700' : 'text-red-700'}`}>{message.text}</span>
      </div>
    );
  };

  return (
    <div className="p-6 max-w-2xl mx-auto space-y-8">
      <div>
        <h1 className="text-3xl font-bold text-gray-900 mb-2">Profil Saya</h1>
        <p className="text-gray-600">Kelola informasi profil dan keamanan akun Anda.</p>
      </div>

      {/* Form Profil */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
        <div className="flex items-center space-x-6 mb-6">
          <div className="relative">
            {user?.profile_picture_url ? (
              <img
                src={user.profile_picture_url}
                alt="Profile"
                className="w-20 h-20 rounded-full object-cover border-4 border-gray-200"
              />
            ) : (
              <div className="w-20 h-20 bg-gradient-to-r from-blue-900 to-orange-500 rounded-full flex items-center justify-center">
                <span className="text-white font-bold text-2xl">
                  {user?.name?.charAt(0)?.toUpperCase() || 'U'}
                </span>
              </div>
            )}
            
            {canUploadPhoto && (
              <label className="absolute bottom-0 right-0 bg-blue-600 hover:bg-blue-700 text-white p-2 rounded-full cursor-pointer transition-colors">
                <Camera className="w-4 h-4" />
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleImageUpload}
                  className="hidden"
                  disabled={uploadingImage}
                />
              </label>
            )}
            
            {uploadingImage && (
              <div className="absolute inset-0 bg-black bg-opacity-50 rounded-full flex items-center justify-center">
                <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-white"></div>
              </div>
            )}
          </div>
          
          <div>
            <h2 className="text-xl font-semibold text-gray-900">{user?.name}</h2>
            <p className="text-gray-600 capitalize mb-1">{user?.role}</p>
            <p className="text-sm text-gray-500">{user?.email}</p>
          </div>
        </div>
        
        <MessageComponent message={profileMessage} />
        
        <form onSubmit={handleProfileSubmit} className="space-y-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Email
              </label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
                <input
                  type="email"
                  value={user?.email || ''}
                  disabled
                  className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg bg-gray-50 text-gray-500 cursor-not-allowed"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Nama Lengkap
              </label>
              <div className="relative">
                <User className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
                <input
                  type="text"
                  required
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Nomor WhatsApp
              </label>
              <div className="relative">
                <Phone className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
                <input
                  type="tel"
                  required
                  value={formData.wa_number}
                  onChange={(e) => setFormData({ ...formData, wa_number: e.target.value })}
                  className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors"
                />
              </div>
            </div>

            <div className="flex space-x-4">
              <button
                type="submit"
                disabled={loadingProfile}
                className="flex items-center space-x-2 px-6 py-3 bg-gradient-to-r from-blue-900 to-blue-800 hover:from-blue-800 hover:to-blue-700 text-white font-medium rounded-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <Save className="w-4 h-4" />
                <span>{loadingProfile ? 'Menyimpan...' : 'Simpan Profil'}</span>
              </button>
            </div>
        </form>
      </div>

      {/* --- FORM UBAH PASSWORD BARU --- */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
        <h2 className="text-xl font-semibold text-gray-900 mb-4">Ubah Password</h2>
        <MessageComponent message={passwordMessage} />
        <form onSubmit={handlePasswordSubmit} className="space-y-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Password Baru
            </label>
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
              <input
                type="password"
                required
                value={passwordData.newPassword}
                onChange={(e) => setPasswordData({ ...passwordData, newPassword: e.target.value })}
                className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors"
                placeholder="Masukkan password baru"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Konfirmasi Password Baru
            </label>
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
              <input
                type="password"
                required
                value={passwordData.confirmPassword}
                onChange={(e) => setPasswordData({ ...passwordData, confirmPassword: e.target.value })}
                className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors"
                placeholder="Ketik ulang password baru"
              />
            </div>
          </div>
          
          <div className="flex space-x-4">
            <button
              type="submit"
              disabled={loadingPassword}
              className="flex items-center space-x-2 px-6 py-3 bg-green-600 hover:bg-green-700 text-white font-medium rounded-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Save className="w-4 h-4" />
              <span>{loadingPassword ? 'Menyimpan...' : 'Ubah Password'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}