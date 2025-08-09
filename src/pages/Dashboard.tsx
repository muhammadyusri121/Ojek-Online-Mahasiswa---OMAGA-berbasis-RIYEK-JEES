// src/pages/Dashboard.tsx

import React, { useEffect, useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../lib/supabase';
import { Users, Car, Package, TrendingUp, Clock, CheckCircle, ArrowRight, UserPlus, ListOrdered } from 'lucide-react';
import { Link } from 'react-router-dom';

// Ilustrasi Kustom untuk Dashboard Utama
const DashboardIllustration = () => (
    <svg width="200" height="200" viewBox="0 0 200 200" fill="none" xmlns="http://www.w3.org/2000/svg">
        <circle cx="100" cy="100" r="90" fill="#E8F5E9"/>
        <rect x="40" y="60" width="120" height="80" rx="10" fill="white" stroke="#A5D6A7" strokeWidth="4"/>
        <rect x="55" y="75" width="30" height="8" rx="4" fill="#A5D6A7"/>
        <rect x="55" y="95" width="60" height="8" rx="4" fill="#A5D6A7"/>
        <rect x="55" y="115" width="40" height="8" rx="4" fill="#A5D6A7"/>
        <path d="M120 80L140 90L120 100V80Z" fill="#28a745"/>
        <circle cx="130" cy="120" r="15" fill="#2E7D32"/>
        <circle cx="130" cy="120" r="7" fill="white"/>
    </svg>
);

// Tipe data untuk hasil RPC
interface DashboardStats {
  total_users: number;
  active_drivers: number;
  total_orders: number;
  completed_orders: number;
  pending_orders: number;
  today_orders: number;
}

export default function Dashboard() {
  const { user } = useAuth();
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchStats() {
      if (user?.role === 'pengguna') {
        setLoading(false);
        return; 
      }
      setLoading(true);
      try {
        // Hanya admin dan driver yang butuh RPC ini
        const rpcName = user?.role === 'admin' ? 'get_admin_dashboard_overview' : 'get_dashboard_stats';
        const { data, error } = await supabase.rpc(rpcName).single<DashboardStats>();
        if (error) throw error;
        setStats(data);
      } catch (error) {
        console.error('Error fetching dashboard stats:', error);
      } finally {
        setLoading(false);
      }
    }
    fetchStats();
  }, [user]);

  // Kartu statistik dengan desain baru
  const statCards = [
    { title: 'Total Pengguna', value: stats?.total_users, icon: Users, color: 'green' },
    { title: 'Driver Aktif', value: stats?.active_drivers, icon: Car, color: 'green' },
    { title: 'Total Pesanan', value: stats?.total_orders, icon: Package, color: 'blue' },
    { title: 'Pesanan Selesai', value: stats?.completed_orders, icon: CheckCircle, color: 'blue' },
    { title: 'Pesanan Pending', value: stats?.pending_orders, icon: Clock, color: 'yellow' },
    { title: 'Pesanan Hari Ini', value: stats?.today_orders, icon: TrendingUp, color: 'yellow' }
  ];

  const getColorClasses = (color: string) => {
      switch (color) {
          case 'green': return { bg: 'bg-green-100', text: 'text-green-700' };
          case 'blue': return { bg: 'bg-blue-100', text: 'text-blue-700' };
          case 'yellow': return { bg: 'bg-yellow-100', text: 'text-yellow-700' };
          default: return { bg: 'bg-gray-100', text: 'text-gray-700' };
      }
  }

  if (loading) {
    return (
      <div className="p-6 bg-gray-50 min-h-screen animate-pulse">
        <div className="h-24 bg-gray-200 rounded-xl mb-8"></div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[...Array(6)].map((_, i) => <div key={i} className="bg-gray-200 rounded-xl h-32"></div>)}
        </div>
      </div>
    );
  }

  return (
    <div className="bg-gray-50 min-h-screen">
      <main className="p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto">
        {/* Welcome Banner */}
        <div className="relative bg-green-600 text-white p-8 rounded-2xl shadow-lg overflow-hidden mb-8 flex flex-col md:flex-row items-center justify-between">
            <div className="z-10">
                <h1 className="text-3xl sm:text-4xl font-bold mb-2">Selamat Datang, {user?.name}!</h1>
                <p className="text-green-100 max-w-md">
                  {user?.role === 'admin' ? 'Anda memiliki akses penuh untuk mengelola sistem OMAGA.' : 'Kelola status dan pesanan Anda di sini.'}
                </p>
            </div>
             <div className="absolute -right-12 -bottom-12 opacity-20 z-0">
                <DashboardIllustration />
            </div>
        </div>

      {/* Kartu Statistik */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
        {statCards.map((card, index) => {
          const Icon = card.icon;
          const colors = getColorClasses(card.color);
          return (
            <div key={index} className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6 hover:shadow-lg hover:-translate-y-1 transition-all">
              <div className="flex items-start justify-between">
                <div className="space-y-1">
                  <p className="text-gray-500 text-sm font-medium">{card.title}</p>
                  <p className="text-4xl font-bold text-gray-800">{card.value ?? 0}</p>
                </div>
                <div className={`w-12 h-12 ${colors.bg} rounded-xl flex items-center justify-center`}>
                  <Icon className={`w-6 h-6 ${colors.text}`} />
                </div>
              </div>
            </div>
          );
        })}
      </div>

       {/* Quick Actions (Hanya untuk Admin) */}
       {user?.role === 'admin' && (
         <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6">
            <h2 className="text-xl font-bold text-gray-800 mb-4">Aksi Cepat</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              <Link to="/admin" className="p-4 bg-gray-50 rounded-xl hover:bg-gray-100 transition-colors flex items-center justify-between">
                <div>
                  <h3 className="font-semibold text-gray-800">Manajemen Pengguna</h3>
                  <p className="text-sm text-gray-500">Lihat dan kelola semua user</p>
                </div>
                <UserPlus className="w-6 h-6 text-green-600" />
              </Link>
              <Link to="/admin" className="p-4 bg-gray-50 rounded-xl hover:bg-gray-100 transition-colors flex items-center justify-between">
                 <div>
                  <h3 className="font-semibold text-gray-800">Manajemen Pesanan</h3>
                  <p className="text-sm text-gray-500">Pantau semua pesanan</p>
                </div>
                <ListOrdered className="w-6 h-6 text-green-600" />
              </Link>
            </div>
         </div>
       )}
      </main>
    </div>
  );
}