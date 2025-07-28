// Ganti isi file src/pages/Dashboard.tsx dengan kode ini

import React, { useEffect, useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../lib/supabase';
import { Users, Car, Package, TrendingUp, Clock, CheckCircle } from 'lucide-react';

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
      setLoading(true);
      try {
        const { data, error } = await supabase.rpc('get_dashboard_stats').single<DashboardStats>();
        if (error) throw error;
        setStats(data);
      } catch (error) {
        console.error('Error fetching dashboard stats:', error);
      } finally {
        setLoading(false);
      }
    }
    fetchStats();
  }, []);

  const statCards = [
    { title: 'Total Pengguna', value: stats?.total_users, icon: Users, bgColor: 'bg-blue-50', iconColor: 'text-blue-600' },
    { title: 'Driver Aktif', value: stats?.active_drivers, icon: Car, bgColor: 'bg-green-50', iconColor: 'text-green-600' },
    { title: 'Total Pesanan', value: stats?.total_orders, icon: Package, bgColor: 'bg-orange-50', iconColor: 'text-orange-600' },
    { title: 'Pesanan Selesai', value: stats?.completed_orders, icon: CheckCircle, bgColor: 'bg-purple-50', iconColor: 'text-purple-600' },
    { title: 'Pesanan Pending', value: stats?.pending_orders, icon: Clock, bgColor: 'bg-yellow-50', iconColor: 'text-yellow-600' },
    { title: 'Pesanan Hari Ini', value: stats?.today_orders, icon: TrendingUp, bgColor: 'bg-indigo-50', iconColor: 'text-indigo-600' }
  ];

  if (loading) {
    return (
      <div className="p-6">
        <div className="animate-pulse">
          <div className="h-8 bg-gray-200 rounded w-1/4 mb-6"></div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[...Array(6)].map((_, i) => <div key={i} className="bg-white p-6 rounded-lg shadow h-32"></div>)}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">Selamat datang, {user?.name}!</h1>
        <p className="text-gray-600">
          {user?.role === 'admin' && 'Kelola sistem OMAGA dari dashboard admin'}
          {user?.role === 'driver' && 'Lihat pesanan masuk dan kelola status Anda'}
          {user?.role === 'pengguna' && 'Pesan ojek dan pantau histori perjalanan Anda'}
        </p>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
        {statCards.map((card, index) => {
          const Icon = card.icon;
          return (
            <div key={index} className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 hover:shadow-md transition-shadow">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-gray-600 text-sm font-medium mb-1">{card.title}</p>
                  <p className="text-3xl font-bold text-gray-900">{card.value ?? 0}</p>
                </div>
                <div className={`w-12 h-12 ${card.bgColor} rounded-lg flex items-center justify-center`}>
                  <Icon className={`w-6 h-6 ${card.iconColor}`} />
                </div>
              </div>
            </div>
          );
        })}
      </div>
       {/* ... Sisa komponen Quick Actions ... */}
    </div>
  );
}