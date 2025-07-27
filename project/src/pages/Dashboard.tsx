import React, { useEffect, useState } from 'react'
import { useAuth } from '../contexts/AuthContext'
import { supabase } from '../lib/supabase'
import { Users, Car, Package, TrendingUp, Clock, CheckCircle } from 'lucide-react'

interface Stats {
  totalUsers: number
  activeDrivers: number
  totalOrders: number
  completedOrders: number
  pendingOrders: number
  todayOrders: number
}

export default function Dashboard() {
  const { user } = useAuth()
  const [stats, setStats] = useState<Stats>({
    totalUsers: 0,
    activeDrivers: 0,
    totalOrders: 0,
    completedOrders: 0,
    pendingOrders: 0,
    todayOrders: 0
  })
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchStats()
  }, [])

  async function fetchStats() {
    try {
      // Get total users
      const { count: totalUsers } = await supabase
        .from('users')
        .select('*', { count: 'exact', head: true })

      // Get active drivers
      const { count: activeDrivers } = await supabase
        .from('drivers')
        .select('*', { count: 'exact', head: true })
        .eq('status', 'online')

      // Get total orders
      const { count: totalOrders } = await supabase
        .from('orders')
        .select('*', { count: 'exact', head: true })

      // Get completed orders
      const { count: completedOrders } = await supabase
        .from('orders')
        .select('*', { count: 'exact', head: true })
        .eq('status', 'completed')

      // Get pending orders
      const { count: pendingOrders } = await supabase
        .from('orders')
        .select('*', { count: 'exact', head: true })
        .in('status', ['pending', 'accepted', 'in_progress'])

      // Get today's orders
      const today = new Date().toISOString().split('T')[0]
      const { count: todayOrders } = await supabase
        .from('orders')
        .select('*', { count: 'exact', head: true })
        .gte('created_at', `${today}T00:00:00`)
        .lt('created_at', `${today}T23:59:59`)

      setStats({
        totalUsers: totalUsers || 0,
        activeDrivers: activeDrivers || 0,
        totalOrders: totalOrders || 0,
        completedOrders: completedOrders || 0,
        pendingOrders: pendingOrders || 0,
        todayOrders: todayOrders || 0
      })
    } catch (error) {
      console.error('Error fetching stats:', error)
    } finally {
      setLoading(false)
    }
  }

  const statCards = [
    {
      title: 'Total Pengguna',
      value: stats.totalUsers,
      icon: Users,
      color: 'from-blue-500 to-blue-600',
      bgColor: 'bg-blue-50',
      iconColor: 'text-blue-600'
    },
    {
      title: 'Driver Aktif',
      value: stats.activeDrivers,
      icon: Car,
      color: 'from-green-500 to-green-600',
      bgColor: 'bg-green-50',
      iconColor: 'text-green-600'
    },
    {
      title: 'Total Pesanan',
      value: stats.totalOrders,
      icon: Package,
      color: 'from-orange-500 to-orange-600',
      bgColor: 'bg-orange-50',
      iconColor: 'text-orange-600'
    },
    {
      title: 'Pesanan Selesai',
      value: stats.completedOrders,
      icon: CheckCircle,
      color: 'from-purple-500 to-purple-600',
      bgColor: 'bg-purple-50',
      iconColor: 'text-purple-600'
    },
    {
      title: 'Pesanan Pending',
      value: stats.pendingOrders,
      icon: Clock,
      color: 'from-yellow-500 to-yellow-600',
      bgColor: 'bg-yellow-50',
      iconColor: 'text-yellow-600'
    },
    {
      title: 'Pesanan Hari Ini',
      value: stats.todayOrders,
      icon: TrendingUp,
      color: 'from-indigo-500 to-indigo-600',
      bgColor: 'bg-indigo-50',
      iconColor: 'text-indigo-600'
    }
  ]

  if (loading) {
    return (
      <div className="p-6">
        <div className="animate-pulse">
          <div className="h-8 bg-gray-200 rounded w-1/4 mb-6"></div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[...Array(6)].map((_, i) => (
              <div key={i} className="bg-white p-6 rounded-lg shadow h-32"></div>
            ))}
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="p-6">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">
          Selamat datang, {user?.name}!
        </h1>
        <p className="text-gray-600">
          {user?.role === 'admin' && 'Kelola sistem OMAGA dari dashboard admin'}
          {user?.role === 'driver' && 'Lihat pesanan masuk dan kelola status Anda'}
          {user?.role === 'pengguna' && 'Pesan ojek dan pantau histori perjalanan Anda'}
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
        {statCards.map((card, index) => {
          const Icon = card.icon
          return (
            <div
              key={index}
              className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 hover:shadow-md transition-shadow"
            >
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-gray-600 text-sm font-medium mb-1">{card.title}</p>
                  <p className="text-3xl font-bold text-gray-900">{card.value}</p>
                </div>
                <div className={`w-12 h-12 ${card.bgColor} rounded-lg flex items-center justify-center`}>
                  <Icon className={`w-6 h-6 ${card.iconColor}`} />
                </div>
              </div>
            </div>
          )
        })}
      </div>

      {/* Quick Actions */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
        <h2 className="text-xl font-semibold text-gray-900 mb-4">Aksi Cepat</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {user?.role === 'pengguna' && (
            <>
              <button className="flex items-center space-x-3 p-4 bg-blue-50 hover:bg-blue-100 rounded-lg transition-colors">
                <Package className="w-5 h-5 text-blue-600" />
                <span className="text-blue-900 font-medium">Pesan Delivery</span>
              </button>
              <button className="flex items-center space-x-3 p-4 bg-orange-50 hover:bg-orange-100 rounded-lg transition-colors">
                <Car className="w-5 h-5 text-orange-600" />
                <span className="text-orange-900 font-medium">Pesan Ride</span>
              </button>
            </>
          )}
          {user?.role === 'driver' && (
            <>
              <button className="flex items-center space-x-3 p-4 bg-green-50 hover:bg-green-100 rounded-lg transition-colors">
                <Clock className="w-5 h-5 text-green-600" />
                <span className="text-green-900 font-medium">Pesanan Baru</span>
              </button>
              <button className="flex items-center space-x-3 p-4 bg-purple-50 hover:bg-purple-100 rounded-lg transition-colors">
                <TrendingUp className="w-5 h-5 text-purple-600" />
                <span className="text-purple-900 font-medium">Status Online</span>
              </button>
            </>
          )}
          {user?.role === 'admin' && (
            <>
              <button className="flex items-center space-x-3 p-4 bg-blue-50 hover:bg-blue-100 rounded-lg transition-colors">
                <Users className="w-5 h-5 text-blue-600" />
                <span className="text-blue-900 font-medium">Kelola User</span>
              </button>
              <button className="flex items-center space-x-3 p-4 bg-orange-50 hover:bg-orange-100 rounded-lg transition-colors">
                <Package className="w-5 h-5 text-orange-600" />
                <span className="text-orange-900 font-medium">Kelola Pesanan</span>
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  )
}