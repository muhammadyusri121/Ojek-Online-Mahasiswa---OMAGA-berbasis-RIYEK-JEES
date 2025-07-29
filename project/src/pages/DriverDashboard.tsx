import React, { useEffect, useState, useCallback } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { supabase, type Order, type Driver } from '../lib/supabase';
import {
  Car,
  Package,
  MapPin,
  Clock,
  User,
  CheckCircle,
  AlertCircle,
  Power,
  MessageCircle,
  Phone,
  XCircle,
  History,
  Eye
} from 'lucide-react';

export default function DriverDashboard() {
  const { user } = useAuth();
  const [driver, setDriver] = useState<Driver | null>(null);
  const [driverStatus, setDriverStatus] = useState<'online' | 'offline'>('offline');
  const [activeOrders, setActiveOrders] = useState<Order[]>([]);
  const [orderHistory, setOrderHistory] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [previewOrder, setPreviewOrder] = useState<Order | null>(null);

  // Pastikan select membawa wa_number di user!
  const fetchData = useCallback(async () => {
    if (!user) return;
    setLoading(true);

    try {
      // Ambil data driver
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
      setDriver(currentDriver);
      setDriverStatus(currentDriver?.status || 'offline');

      // Ambil semua pesanan untuk driver
      const orderSelect = '*, user:users(id, name, wa_number)';
      if (currentDriver) {
        const { data, error } = await supabase
          .from('orders')
          .select(orderSelect)
          .or(`driver_id.eq.${currentDriver.id},and(status.eq.pending,driver_id.is.null)`)
          .order('created_at', { ascending: false });

        if (error) throw error;
        
        const active: Order[] = [];
        const history: Order[] = [];
        (data || []).forEach(order => {
          if (order.status === 'completed' || order.status === 'cancelled') {
            history.push(order);
          } else {
            active.push(order);
          }
        });

        setActiveOrders(active);
        setOrderHistory(history);
      } else {
        // Jika driver baru, hanya ambil pesanan yang tersedia
        const { data: availableData, error: availableError } = await supabase
          .from('orders')
          .select(orderSelect)
          .eq('status', 'pending')
          .is('driver_id', null)
          .order('created_at', { ascending: false });
        if (availableError) throw availableError;
        setActiveOrders(availableData || []);
      }
    } catch (error) {
      console.error('Error fetching driver data:', error);
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

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
    if(!user) return;
    const newStatus = driverStatus === 'online' ? 'offline' : 'online';
    const { error } = await supabase.from('drivers').update({ status: newStatus }).eq('user_id', user.id);
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
  }

  const getStatusText = (status: string) => {
    switch (status) {
      case 'pending': return 'Menunggu';
      case 'accepted': return 'Diterima';
      case 'in_progress': return 'Dalam Perjalanan';
      case 'completed': return 'Selesai';
      case 'cancelled': return 'Dibatalkan';
      default: return status;
    }
  }

  // Modal Preview
  const PreviewModal = ({ order, onClose }: { order: Order, onClose: () => void }) => {
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
              <User className="w-4 h-4" />
              <span><strong>Pemesan:</strong> {order.user?.name}</span>
            </div>
            <div className="flex items-center space-x-2">
              <Phone className="w-4 h-4" />
              <span>
                <strong>No. WA:</strong>{" "}
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
      {/* ...rest of your UI unchanged ... */}
      {/* ... */}
      {/* Modal Preview */}
      {previewOrder && (
        <PreviewModal
          order={previewOrder}
          onClose={() => setPreviewOrder(null)}
        />
      )}
    </div>
  );
}