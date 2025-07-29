import React, { useEffect, useState, useCallback } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { supabase, type Order, type Driver, type User } from '../lib/supabase';
import {
  Car,
  Package,
  MapPin,
  Clock,
  User as UserIcon,
  CheckCircle,
  AlertCircle,
  Power,
  MessageCircle,
  Phone,
  XCircle,
  History,
  Eye
} from 'lucide-react';

// PERBAIKAN: Definisikan tipe data yang sesuai dengan hasil RPC
// Tipe ini menggabungkan Order dengan user yang berbentuk JSON
interface OrderWithUser extends Omit<Order, 'user'> {
  user: User;
}

export default function DriverDashboard() {
  const { user } = useAuth();
  const [driver, setDriver] = useState<Driver | null>(null);
  const [driverStatus, setDriverStatus] = useState<'online' | 'offline'>('offline');
  const [activeOrders, setActiveOrders] = useState<OrderWithUser[]>([]);
  const [orderHistory, setOrderHistory] = useState<OrderWithUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [previewOrder, setPreviewOrder] = useState<OrderWithUser | null>(null);

  const fetchData = useCallback(async () => {
    if (!user) return;
    setLoading(true);

    try {
      // 1. Ambil data driver (tidak berubah)
      const { data: driverData, error: driverError } = await supabase
        .from('drivers')
        .select('*')
        .eq('user_id', user.id)
        .single();
      
      let currentDriver = driverData;
      if (driverError && driverError.code === 'PGRST116') {
        const { data: newDriverData } = await supabase.from('drivers').insert({ user_id: user.id }).select().single();
        currentDriver = newDriverData;
      }
      if (currentDriver) {
        setDriver(currentDriver);
        setDriverStatus(currentDriver.status);
      }
      
      // 2. PERBAIKAN: Panggil fungsi RPC untuk mendapatkan data pesanan
      const { data, error } = await supabase.rpc('get_driver_orders', { p_driver_user_id: user.id });

      if (error) throw error;
      
      const orders: OrderWithUser[] = data || [];
      const active: OrderWithUser[] = [];
      const history: OrderWithUser[] = [];

      orders.forEach(order => {
        if (order.status === 'completed' || order.status === 'cancelled') {
          history.push(order);
        } else {
          active.push(order);
        }
      });

      setActiveOrders(active);
      setOrderHistory(history);

    } catch (error) {
      console.error('Error fetching driver data:', error);
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Sisa fungsi (acceptOrder, updateOrderStatus, dll.) tidak perlu diubah
  // karena mereka hanya melakukan update, bukan select data gabungan.
  
  async function acceptOrder(orderId: string) {
    if (!driver) return;
    const { error } = await supabase.from('orders').update({ driver_id: driver.id, status: 'accepted' }).eq('id', orderId);
    if (error) console.error('Gagal menerima pesanan:', error);
    else await fetchData(); 
  }

  async function updateOrderStatus(orderId: string, status: 'in_progress' | 'completed' | 'cancelled') {
    const updates: Partial<Order> = { status };
    if (status === 'completed' || status === 'cancelled') {
      updates.completed_at = new Date().toISOString();
    }
    const { error } = await supabase.from('orders').update(updates).eq('id', orderId);
    if (error) console.error('Gagal mengubah status pesanan:', error);
    else await fetchData();
  }
  
  async function toggleDriverStatus() {
    if(!user || !driver) return;
    const newStatus = driverStatus === 'online' ? 'offline' : 'online';
    const { error } = await supabase.from('drivers').update({ status: newStatus }).eq('id', driver.id);
    if (error) console.error('Error updating driver status:', error);
    else setDriverStatus(newStatus);
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending': return 'text-yellow-600 bg-yellow-50';
      case 'accepted': return 'text-blue-600 bg-blue-50';
      case 'in_progress': return 'text-orange-600 bg-orange-50';
      case 'completed': return 'text-green-600 bg-green-50';
      case 'cancelled': return 'text-red-600 bg-red-50';
      default: return 'text-gray-600 bg-gray-50';
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'pending': return 'Menunggu';
      case 'accepted': return 'Diterima';
      case 'in_progress': return 'Dalam Perjalanan';
      case 'completed': return 'Selesai';
      case 'cancelled': return 'Dibatalkan';
      default: return status;
    }
  };
  
  // Modal Preview tidak perlu diubah karena struktur data `order.user` tetap sama.
  const PreviewModal = ({ order, onClose }: { order: OrderWithUser, onClose: () => void }) => {
    if (!order) return null;
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-30">
        <div className="bg-white rounded-xl shadow-lg max-w-md w-full p-6 relative border border-gray-100">
          <button className="absolute top-2 right-2 text-gray-500 hover:text-gray-700" onClick={onClose}>
            <XCircle className="w-6 h-6" />
          </button>
          <div className="flex items-center mb-4">
            {order.type === 'delivery' ? <Package className="w-6 h-6 text-orange-600" /> : <Car className="w-6 h-6 text-blue-600" />}
            <span className="font-semibold text-xl ml-2 capitalize">{order.type}</span>
          </div>
          <div className="mb-3">
            <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(order.status)}`}>{getStatusText(order.status)}</span>
          </div>
          <div className="space-y-2 text-sm text-gray-700 mb-2">
            <div className="flex items-start space-x-2">
              <MapPin className="w-4 h-4 mt-0.5 text-green-600" />
              <span><strong>Dari:</strong> {order.pickup_addr}</span>
            </div>
            <div className="flex items-start space-x-2">
              <MapPin className="w-4 h-4 mt-0.5 text-red-600" />
              <span><strong>Ke:</strong> {order.dest_addr}</span>
            </div>
            <div className="flex items-center space-x-2">
              <UserIcon className="w-4 h-4" />
              {/* Data ini sekarang akan tampil dengan benar */}
              <span><strong>Pemesan:</strong> {order.user?.name}</span>
            </div>
            <div className="flex items-center space-x-2">
              <Phone className="w-4 h-4" />
              <span>
                <strong>No. WA:</strong>{" "}
                {/* Data ini sekarang akan tampil dengan benar */}
                {order.user?.wa_number ? (
                  <a
                    className="text-green-600 underline flex items-center"
                    href={`https://wa.me/${order.user.wa_number.replace(/^0/, '62')}`}
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    {order.user.wa_number}
                    <MessageCircle className="w-4 h-4 ml-1" />
                  </a>
                ) : (
                  <span className="text-gray-400">Tidak tersedia</span>
                )}
              </span>
            </div>
            {order.notes && (
              <div className="p-2 bg-gray-50 rounded text-sm text-gray-600">
                <strong>Catatan:</strong> {order.notes}
              </div>
            )}
            <div className="flex items-center space-x-2">
              <Clock className="w-4 h-4" />
              <span>
                <strong>Dibuat:</strong> {new Date(order.created_at).toLocaleString()}
              </span>
            </div>
            {order.completed_at && (
              <div className="flex items-center space-x-2">
                <CheckCircle className="w-4 h-4 text-green-500" />
                <span>
                  <strong>Selesai:</strong> {new Date(order.completed_at).toLocaleString()}
                </span>
              </div>
            )}
          </div>
        </div>
      </div>
    );
  };
  
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
    );
  }

  return (
    <div className="p-6 max-w-7xl mx-auto">
      {/* Header dan Tombol Status */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-8">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Dashboard Driver</h1>
          <p className="text-gray-600">Kelola pesanan dan status online Anda.</p>
        </div>
        <button
          onClick={toggleDriverStatus}
          className={`flex items-center space-x-2 px-6 py-3 rounded-lg font-medium transition-all text-white ${
            driverStatus === 'online'
              ? 'bg-gradient-to-r from-green-500 to-emerald-500 hover:from-green-600 hover:to-emerald-600'
              : 'bg-gradient-to-r from-red-500 to-rose-500 hover:from-red-600 hover:to-rose-600'
          }`}
        >
          <Power className="w-5 h-5" />
          <span>{driverStatus === 'online' ? 'Anda Online' : 'Anda Offline'}</span>
        </button>
      </div>
      
      {/* Konten Dashboard */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Pesanan Aktif & Tersedia */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100">
          <div className="p-6 border-b border-gray-200">
            <h2 className="text-xl font-semibold text-gray-900">Pesanan Aktif & Tersedia</h2>
          </div>
          <div className="p-6 max-h-[600px] overflow-y-auto space-y-4">
            {activeOrders.length === 0 ? (
              <div className="text-center py-8">
                <Package className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                <p className="text-gray-500">Tidak ada pesanan aktif saat ini.</p>
              </div>
            ) : (
              activeOrders.map(order => (
                <div key={order.id} className="p-4 border rounded-lg hover:shadow-md transition-shadow">
                  {/* ... UI Kartu Pesanan ... */}
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center space-x-3">
                      {order.type === 'delivery' ? <Package className="w-5 h-5 text-orange-600" /> : <Car className="w-5 h-5 text-blue-600" />}
                      <div>
                        {/* PERBAIKAN: data user sekarang akan tampil */}
                        <p className="font-medium text-gray-800">{order.user.name}</p>
                        <p className="text-sm text-gray-500">{order.user.wa_number}</p>
                      </div>
                    </div>
                    <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(order.status)}`}>
                      {getStatusText(order.status)}
                    </span>
                  </div>
                  <div className="space-y-1 text-sm text-gray-600 mb-4">
                    <div className="flex items-start"><MapPin className="w-4 h-4 mr-2 mt-0.5 text-green-500" /><span>Dari: {order.pickup_addr}</span></div>
                    <div className="flex items-start"><MapPin className="w-4 h-4 mr-2 mt-0.5 text-red-500" /><span>Ke: {order.dest_addr}</span></div>
                  </div>
                  <div className="flex space-x-2">
                    {order.status === 'pending' && <button onClick={() => acceptOrder(order.id)} className="flex-1 bg-green-500 text-white px-3 py-1.5 rounded-md text-sm font-medium hover:bg-green-600">Terima</button>}
                    {order.status === 'accepted' && <button onClick={() => updateOrderStatus(order.id, 'in_progress')} className="flex-1 bg-blue-500 text-white px-3 py-1.5 rounded-md text-sm font-medium hover:bg-blue-600">Mulai Perjalanan</button>}
                    {order.status === 'in_progress' && <button onClick={() => updateOrderStatus(order.id, 'completed')} className="flex-1 bg-emerald-500 text-white px-3 py-1.5 rounded-md text-sm font-medium hover:bg-emerald-600">Selesaikan</button>}
                    {(order.status === 'accepted' || order.status === 'in_progress') && <button onClick={() => updateOrderStatus(order.id, 'cancelled')} className="flex-1 bg-red-500 text-white px-3 py-1.5 rounded-md text-sm font-medium hover:bg-red-600">Batalkan</button>}
                    <button onClick={() => setPreviewOrder(order)} className="bg-gray-200 text-gray-700 px-3 py-1.5 rounded-md text-sm font-medium hover:bg-gray-300"><Eye className="w-4 h-4"/></button>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Histori Pesanan */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100">
          <div className="p-6 border-b border-gray-200">
            <h2 className="text-xl font-semibold text-gray-900">Histori Pesanan</h2>
          </div>
          <div className="p-6 max-h-[600px] overflow-y-auto space-y-4">
             {orderHistory.length === 0 ? (
              <div className="text-center py-8">
                <History className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                <p className="text-gray-500">Belum ada riwayat pesanan.</p>
              </div>
            ) : (
              orderHistory.map(order => (
                <div key={order.id} className="p-4 border rounded-lg bg-gray-50">
                   <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center space-x-3">
                      {order.type === 'delivery' ? <Package className="w-5 h-5 text-orange-600" /> : <Car className="w-5 h-5 text-blue-600" />}
                      <div>
                        <p className="font-medium text-gray-800">{order.user.name}</p>
                        <p className="text-xs text-gray-500">{new Date(order.completed_at || order.created_at).toLocaleString('id-ID')}</p>
                      </div>
                    </div>
                    <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(order.status)}`}>
                      {getStatusText(order.status)}
                    </span>
                  </div>
                  <button onClick={() => setPreviewOrder(order)} className="w-full mt-2 text-sm text-blue-600 hover:underline">Lihat Detail</button>
                </div>
              ))
             )}
          </div>
        </div>
      </div>
      
      {/* Modal Preview */}
      {previewOrder && <PreviewModal order={previewOrder} onClose={() => setPreviewOrder(null)} />}
    </div>
  );
}