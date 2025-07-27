import React, { useEffect, useState } from 'react'
import { useAuth } from '../contexts/AuthContext'
import { supabase, type Order, type Driver } from '../lib/supabase'
import { 
  Car, 
  Package, 
  MapPin, 
  Clock, 
  User, 
  CheckCircle,
  AlertCircle,
  Power,
  MessageCircle
} from 'lucide-react'

export default function DriverDashboard() {
  const { user } = useAuth()
  const [driverStatus, setDriverStatus] = useState<'online' | 'offline'>('offline')
  const [orders, setOrders] = useState<Order[]>([])
  const [myOrders, setMyOrders] = useState<Order[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (user) {
      checkDriverStatus()
      fetchAvailableOrders()
      fetchMyOrders()
    }
  }, [user])

  async function checkDriverStatus() {
    try {
      const { data, error } = await supabase
        .from('drivers')
        .select('status')
        .eq('user_id', user?.id)
        .single()

      if (error) {
        // If driver record doesn't exist, create one
        if (error.code === 'PGRST116') {
          await supabase.from('drivers').insert({
            user_id: user?.id,
            status: 'offline'
          })
          setDriverStatus('offline')
        }
      } else {
        setDriverStatus(data.status)
      }
    } catch (error) {
      console.error('Error checking driver status:', error)
    }
  }

  async function fetchAvailableOrders() {
    try {
      const { data, error } = await supabase
        .from('orders')
        .select(`
          *,
          user:users(*)
        `)
        .eq('status', 'pending')
        .is('driver_id', null)
        .order('created_at', { ascending: false })

      if (error) throw error
      setOrders(data || [])
    } catch (error) {
      console.error('Error fetching orders:', error)
    }
  }

  async function fetchMyOrders() {
    try {
      const { data: driverData } = await supabase
        .from('drivers')
        .select('id')
        .eq('user_id', user?.id)
        .single()

      if (driverData) {
        const { data, error } = await supabase
          .from('orders')
          .select(`
            *,
            user:users(*)
          `)
          .eq('driver_id', driverData.id)
          .order('created_at', { ascending: false })

        if (error) throw error
        setMyOrders(data || [])
      }
    } catch (error) {
      console.error('Error fetching my orders:', error)
    } finally {
      setLoading(false)
    }
  }

  async function toggleDriverStatus() {
    try {
      const newStatus = driverStatus === 'online' ? 'offline' : 'online'
      
      const { error } = await supabase
        .from('drivers')
        .update({ status: newStatus })
        .eq('user_id', user?.id)

      if (error) throw error
      setDriverStatus(newStatus)
    } catch (error) {
      console.error('Error updating driver status:', error)
    }
  }

  async function acceptOrder(orderId: string) {
    try {
      const { data: driverData } = await supabase
        .from('drivers')
        .select('id')
        .eq('user_id', user?.id)
        .single()

      if (driverData) {
        const { error } = await supabase
          .from('orders')
          .update({ 
            driver_id: driverData.id,
            status: 'accepted'
          })
          .eq('id', orderId)

        if (error) throw error
        
        await fetchAvailableOrders()
        await fetchMyOrders()
      }
    } catch (error) {
      console.error('Error accepting order:', error)
    }
  }

  async function updateOrderStatus(orderId: string, status: string) {
    try {
      const updates: any = { status }
      if (status === 'completed') {
        updates.completed_at = new Date().toISOString()
      }

      const { error } = await supabase
        .from('orders')
        .update(updates)
        .eq('id', orderId)

      if (error) throw error
      await fetchMyOrders()
    } catch (error) {
      console.error('Error updating order status:', error)
    }
  }

  const openWhatsApp = (waNumber: string, userName: string) => {
    const message = `Halo ${userName}, saya driver OMAGA yang akan menangani pesanan Anda. Terima kasih!`
    const url = `https://wa.me/${waNumber.replace(/^0/, '62')}?text=${encodeURIComponent(message)}`
    window.open(url, '_blank')
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending': return 'text-yellow-600 bg-yellow-50'
      case 'accepted': return 'text-blue-600 bg-blue-50'
      case 'in_progress': return 'text-orange-600 bg-orange-50'
      case 'completed': return 'text-green-600 bg-green-50'
      case 'cancelled': return 'text-red-600 bg-red-50'
      default: return 'text-gray-600 bg-gray-50'
    }
  }

  const getStatusText = (status: string) => {
    switch (status) {
      case 'pending': return 'Menunggu'
      case 'accepted': return 'Diterima'
      case 'in_progress': return 'Dalam Perjalanan'
      case 'completed': return 'Selesai'
      case 'cancelled': return 'Dibatalkan'
      default: return status
    }
  }

  if (loading) {
    return (
      <div className="p-6">
        <div className="animate-pulse space-y-6">
          <div className="h-8 bg-gray-200 rounded w-1/4"></div>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="bg-white p-6 rounded-lg shadow h-64"></div>
            <div className="bg-white p-6 rounded-lg shadow h-64"></div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">Dashboard Driver</h1>
        <p className="text-gray-600">Kelola pesanan dan status ketersediaan Anda</p>
      </div>

      {/* Status Control */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 mb-8">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className={`w-3 h-3 rounded-full ${driverStatus === 'online' ? 'bg-green-500' : 'bg-gray-400'}`}></div>
            <span className="text-lg font-medium text-gray-900">
              Status: <span className={`capitalize ${driverStatus === 'online' ? 'text-green-600' : 'text-gray-600'}`}>
                {driverStatus}
              </span>
            </span>
          </div>
          <button
            onClick={toggleDriverStatus}
            className={`flex items-center space-x-2 px-4 py-2 rounded-lg font-medium transition-colors ${
              driverStatus === 'online'
                ? 'bg-red-500 hover:bg-red-600 text-white'
                : 'bg-green-500 hover:bg-green-600 text-white'
            }`}
          >
            <Power className="w-4 h-4" />
            <span>{driverStatus === 'online' ? 'Set Offline' : 'Set Online'}</span>
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Available Orders */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100">
          <div className="p-6 border-b border-gray-200">
            <div className="flex items-center space-x-2">
              <AlertCircle className="w-5 h-5 text-orange-600" />
              <h2 className="text-xl font-semibold text-gray-900">Pesanan Tersedia</h2>
              <span className="text-sm text-gray-500">({orders.length})</span>
            </div>
          </div>
          <div className="p-6 max-h-96 overflow-y-auto">
            {orders.length === 0 ? (
              <div className="text-center py-8">
                <Package className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                <p className="text-gray-500">Tidak ada pesanan baru</p>
              </div>
            ) : (
              <div className="space-y-4">
                {orders.map((order) => (
                  <div key={order.id} className="p-4 border border-gray-200 rounded-lg hover:border-blue-300 transition-colors">
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center space-x-2">
                        {order.type === 'delivery' ? (
                          <Package className="w-4 h-4 text-orange-600" />
                        ) : (
                          <Car className="w-4 h-4 text-blue-600" />
                        )}
                        <span className="font-medium text-gray-900 capitalize">
                          {order.type === 'delivery' ? 'Delivery' : 'Ride'}
                        </span>
                      </div>
                      <div className="flex items-center space-x-2">
                        <Clock className="w-3 h-3 text-gray-400" />
                        <span className="text-xs text-gray-500">
                          {new Date(order.created_at).toLocaleTimeString('id-ID', { 
                            hour: '2-digit', 
                            minute: '2-digit' 
                          })}
                        </span>
                      </div>
                    </div>
                    
                    <div className="space-y-2 text-sm text-gray-600 mb-3">
                      <div className="flex items-start space-x-2">
                        <MapPin className="w-3 h-3 mt-0.5 text-green-600" />
                        <span><strong>Dari:</strong> {order.pickup_addr}</span>
                      </div>
                      <div className="flex items-start space-x-2">
                        <MapPin className="w-3 h-3 mt-0.5 text-red-600" />
                        <span><strong>Ke:</strong> {order.dest_addr}</span>
                      </div>
                      <div className="flex items-center space-x-2">
                        <User className="w-3 h-3" />
                        <span><strong>Pemesan:</strong> {order.user?.name}</span>
                      </div>
                    </div>

                    {order.notes && (
                      <div className="mb-3 p-2 bg-gray-50 rounded text-sm text-gray-600">
                        <strong>Catatan:</strong> {order.notes}
                      </div>
                    )}

                    <div className="flex space-x-2">
                      <button
                        onClick={() => acceptOrder(order.id)}
                        disabled={driverStatus === 'offline'}
                        className="flex-1 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 text-white px-3 py-2 rounded text-sm font-medium transition-colors"
                      >
                        Terima Pesanan
                      </button>
                      {order.user?.wa_number && (
                        <button
                          onClick={() => openWhatsApp(order.user.wa_number, order.user.name)}
                          className="flex items-center justify-center space-x-1 bg-green-500 hover:bg-green-600 text-white px-3 py-2 rounded text-sm transition-colors"
                        >
                          <MessageCircle className="w-3 h-3" />
                          <span>WA</span>
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* My Orders */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100">
          <div className="p-6 border-b border-gray-200">
            <div className="flex items-center space-x-2">
              <CheckCircle className="w-5 h-5 text-green-600" />
              <h2 className="text-xl font-semibold text-gray-900">Pesanan Saya</h2>
              <span className="text-sm text-gray-500">({myOrders.length})</span>
            </div>
          </div>
          <div className="p-6 max-h-96 overflow-y-auto">
            {myOrders.length === 0 ? (
              <div className="text-center py-8">
                <Car className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                <p className="text-gray-500">Belum ada pesanan yang diterima</p>
              </div>
            ) : (
              <div className="space-y-4">
                {myOrders.map((order) => (
                  <div key={order.id} className="p-4 border border-gray-200 rounded-lg">
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center space-x-2">
                        {order.type === 'delivery' ? (
                          <Package className="w-4 h-4 text-orange-600" />
                        ) : (
                          <Car className="w-4 h-4 text-blue-600" />
                        )}
                        <span className="font-medium text-gray-900 capitalize">
                          {order.type === 'delivery' ? 'Delivery' : 'Ride'}
                        </span>
                      </div>
                      <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(order.status)}`}>
                        {getStatusText(order.status)}
                      </span>
                    </div>
                    
                    <div className="space-y-2 text-sm text-gray-600 mb-3">
                      <div className="flex items-start space-x-2">
                        <MapPin className="w-3 h-3 mt-0.5 text-green-600" />
                        <span><strong>Dari:</strong> {order.pickup_addr}</span>
                      </div>
                      <div className="flex items-start space-x-2">
                        <MapPin className="w-3 h-3 mt-0.5 text-red-600" />
                        <span><strong>Ke:</strong> {order.dest_addr}</span>
                      </div>
                      <div className="flex items-center space-x-2">
                        <User className="w-3 h-3" />
                        <span><strong>Pemesan:</strong> {order.user?.name}</span>
                      </div>
                    </div>

                    {order.notes && (
                      <div className="mb-3 p-2 bg-gray-50 rounded text-sm text-gray-600">
                        <strong>Catatan:</strong> {order.notes}
                      </div>
                    )}

                    <div className="flex space-x-2">
                      {order.status === 'accepted' && (
                        <button
                          onClick={() => updateOrderStatus(order.id, 'in_progress')}
                          className="flex-1 bg-orange-600 hover:bg-orange-700 text-white px-3 py-2 rounded text-sm font-medium transition-colors"
                        >
                          Mulai Perjalanan
                        </button>
                      )}
                      {order.status === 'in_progress' && (
                        <button
                          onClick={() => updateOrderStatus(order.id, 'completed')}
                          className="flex-1 bg-green-600 hover:bg-green-700 text-white px-3 py-2 rounded text-sm font-medium transition-colors"
                        >
                          Selesaikan Pesanan
                        </button>
                      )}
                      {order.user?.wa_number && (
                        <button
                          onClick={() => openWhatsApp(order.user.wa_number, order.user.name)}
                          className="flex items-center justify-center space-x-1 bg-green-500 hover:bg-green-600 text-white px-3 py-2 rounded text-sm transition-colors"
                        >
                          <MessageCircle className="w-3 h-3" />
                          <span>WA</span>
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}