import React, { useEffect, useState } from "react";
import { useAuth } from "../contexts/AuthContext";
import { supabase, type Driver, type Order, type User } from "../lib/supabase";
import {
  Car,
  Package,
  MapPin,
  Clock,
  User as UserIcon,
  Plus,
  History,
  MessageCircle,
} from "lucide-react";

// Definisikan kembali tipe data driver yang dikembalikan oleh fungsi RPC
interface RpcDriverResponse {
  id: string;
  user_id: string;
  status: "online" | "offline";
  created_at: string;
  updated_at: string;
  user: User;
}

// --- PERUBAHAN 1: Tambahkan 'drivers' ke dalam props untuk modal ---
interface OrderFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  userId: string;
  drivers: RpcDriverResponse[]; // Prop baru untuk menerima daftar driver
}

// Komponen Modal yang dimodifikasi
function OrderFormModal({
  isOpen,
  onClose,
  onSuccess,
  userId,
  drivers,
}: OrderFormModalProps): JSX.Element | null {
  const [orderType, setOrderType] = useState<"delivery" | "ride">("delivery");
  const [formData, setFormData] = useState({
    pickup_addr: "",
    dest_addr: "",
    notes: "",
  });
  // --- PERUBAHAN 2: State baru untuk menyimpan ID driver yang dipilih ---
  const [selectedDriverId, setSelectedDriverId] = useState<string>("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    // Validasi sederhana untuk memastikan driver telah dipilih
    if (!selectedDriverId) {
      setError("Silakan pilih driver terlebih dahulu.");
      return;
    }
    setLoading(true);

    try {
      // --- PERUBAHAN 3: Sertakan `driver_id` saat membuat pesanan ---
      const { error } = await supabase.from("orders").insert({
        user_id: userId,
        type: orderType,
        pickup_addr: formData.pickup_addr,
        dest_addr: formData.dest_addr,
        notes: formData.notes,
        status: "pending",
        driver_id: selectedDriverId, // Menambahkan ID driver yang dipilih
      });

      if (error) throw error;
      onSuccess();
    } catch (error: any) {
      console.error("Error creating order:", error);
      setError("Gagal membuat pesanan: " + error.message);
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      <div className="flex items-center justify-center min-h-screen px-4 pt-4 pb-20 text-center sm:block sm:p-0">
        <div
          className="fixed inset-0 transition-opacity bg-black bg-opacity-50"
          onClick={onClose}
        />

        <div className="inline-block w-full max-w-md p-6 my-8 overflow-hidden text-left align-middle transition-all transform bg-white shadow-xl rounded-2xl">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-lg font-medium text-gray-900">
              Buat Pesanan Baru
            </h3>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600"
            >
              <Plus className="w-5 h-5 transform rotate-45" />
            </button>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            {/* ... Form Jenis Layanan, Alamat, dll tetap sama ... */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Jenis Layanan
              </label>
              <div className="grid grid-cols-2 gap-3">
                <button
                  type="button"
                  onClick={() => setOrderType("delivery")}
                  className={`flex items-center justify-center space-x-2 p-3 rounded-lg border-2 transition-colors ${
                    orderType === "delivery"
                      ? "border-orange-500 bg-orange-50 text-orange-700"
                      : "border-gray-200 hover:border-gray-300"
                  }`}
                >
                  <Package className="w-4 h-4" />
                  <span>Delivery</span>
                </button>
                <button
                  type="button"
                  onClick={() => setOrderType("ride")}
                  className={`flex items-center justify-center space-x-2 p-3 rounded-lg border-2 transition-colors ${
                    orderType === "ride"
                      ? "border-blue-500 bg-blue-50 text-blue-700"
                      : "border-gray-200 hover:border-gray-300"
                  }`}
                >
                  <Car className="w-4 h-4" />
                  <span>Ride</span>
                </button>
              </div>
            </div>

            {/* --- PERUBAHAN 4: Dropdown untuk memilih driver --- */}
            <div>
              <label
                htmlFor="driver-select"
                className="block text-sm font-medium text-gray-700 mb-2"
              >
                Pilih Driver
              </label>
              <select
                id="driver-select"
                value={selectedDriverId}
                onChange={(e) => setSelectedDriverId(e.target.value)}
                required
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="" disabled>
                  -- Pilih driver yang online --
                </option>
                {drivers.map((driver) => (
                  <option key={driver.id} value={driver.id}>
                    {driver.user.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                {orderType === "delivery"
                  ? "Alamat Pickup"
                  : "Alamat Penjemputan"}
              </label>
              <input
                type="text"
                required
                value={formData.pickup_addr}
                onChange={(e) =>
                  setFormData({ ...formData, pickup_addr: e.target.value })
                }
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="Masukkan alamat lengkap"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Alamat Tujuan
              </label>
              <input
                type="text"
                required
                value={formData.dest_addr}
                onChange={(e) =>
                  setFormData({ ...formData, dest_addr: e.target.value })
                }
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="Masukkan alamat tujuan"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Catatan (Opsional)
              </label>
              <textarea
                value={formData.notes}
                onChange={(e) =>
                  setFormData({ ...formData, notes: e.target.value })
                }
                rows={3}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="Tambahkan catatan jika diperlukan"
              />
            </div>

            {error && <p className="text-red-600 text-sm mt-2">{error}</p>}

            <div className="flex space-x-3 pt-4">
              <button
                type="button"
                onClick={onClose}
                className="flex-1 px-4 py-2 text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors"
              >
                Batal
              </button>
              <button
                type="submit"
                disabled={loading}
                className="flex-1 px-4 py-2 bg-gradient-to-r from-blue-900 to-blue-800 hover:from-blue-800 hover:to-blue-700 text-white rounded-lg transition-all disabled:opacity-50"
              >
                {loading ? "Memproses..." : "Pesan Sekarang"}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}

export default function UserDashboard() {
  const { user } = useAuth();
  const [drivers, setDrivers] = useState<RpcDriverResponse[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);
  const [showOrderForm, setShowOrderForm] = useState(false);
  const [loading, setLoading] = useState(true);

  // ... (useEffect dan fungsi fetch data lainnya tidak berubah) ...
  useEffect(() => {
    async function getInitialData() {
      if (!user) return;
      setLoading(true);
      try {
        await Promise.all([fetchDrivers(), fetchMyOrders(user.id)]);
      } catch (error) {
        console.error("Gagal memuat data dasbor:", error);
      } finally {
        setLoading(false);
      }
    }

    getInitialData();
  }, [user]);

  async function fetchDrivers() {
    const { data, error } = await supabase.rpc("get_online_drivers");

    if (error) {
      console.error("Error fetching drivers via RPC:", error);
      throw error;
    }
    setDrivers(data || []);
  }

  async function fetchMyOrders(userId: string) {
    const { data, error } = await supabase
      .from("orders")
      .select(`*, driver:drivers(*, user:users(*))`)
      .eq("user_id", userId)
      .order("created_at", { ascending: false });

    if (error) {
      console.error("Error fetching orders:", error);
      throw error;
    }
    setOrders(data || []);
  }

  const openWhatsApp = (waNumber: string, driverName: string) => {
    const message = `Halo ${driverName}, saya ingin memesan ojek melalui aplikasi OMAGA. Terima kasih!`;
    const url = `https://wa.me/${waNumber.replace(
      /^0/,
      "62"
    )}?text=${encodeURIComponent(message)}`;
    window.open(url, "_blank");
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "pending":
        return "text-yellow-600 bg-yellow-50";
      case "accepted":
        return "text-blue-600 bg-blue-50";
      case "in_progress":
        return "text-orange-600 bg-orange-50";
      case "completed":
        return "text-green-600 bg-green-50";
      case "cancelled":
        return "text-red-600 bg-red-50";
      default:
        return "text-gray-600 bg-gray-50";
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case "pending":
        return "Menunggu";
      case "accepted":
        return "Diterima";
      case "in_progress":
        return "Dalam Perjalanan";
      case "completed":
        return "Selesai";
      case "cancelled":
        return "Dibatalkan";
      default:
        return status;
    }
  };

  if (loading) {
    // ... (Indikator loading tidak berubah) ...
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
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">
          Dashboard Pengguna
        </h1>
        <p className="text-gray-600">Pesan ojek dan pantau perjalanan Anda</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* ... (Tampilan Driver Online tidak berubah) ... */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100">
          <div className="p-6 border-b border-gray-200">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <Car className="w-5 h-5 text-blue-600" />
                <h2 className="text-xl font-semibold text-gray-900">
                  Driver Online
                </h2>
              </div>
              <span className="text-sm text-gray-500">
                {drivers.length} driver tersedia
              </span>
            </div>
          </div>
          <div className="p-6 max-h-96 overflow-y-auto">
            {drivers.length === 0 ? (
              <div className="text-center py-8">
                <Car className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                <p className="text-gray-500">
                  Tidak ada driver online saat ini
                </p>
              </div>
            ) : (
              <div className="space-y-4">
                {drivers.map((driver) => (
                  <div
                    key={driver.id}
                    className="flex items-center justify-between p-4 bg-gray-50 rounded-lg"
                  >
                    <div className="flex items-center space-x-3">
                      {driver.user?.profile_picture_url ? (
                        <img
                          src={driver.user.profile_picture_url}
                          alt="Profile"
                          className="w-10 h-10 rounded-full object-cover"
                        />
                      ) : (
                        <div className="w-10 h-10 bg-blue-900 rounded-full flex items-center justify-center">
                          <span className="text-white font-medium">
                            {driver.user?.name?.charAt(0)?.toUpperCase() || "D"}
                          </span>
                        </div>
                      )}
                      <div>
                        <p className="font-medium text-gray-900">
                          {driver.user?.name}
                        </p>
                        <p className="text-sm text-gray-500">
                          {driver.user?.wa_number}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center space-x-2">
                      <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-green-50 text-green-600">
                        Online
                      </span>
                      <button
                        onClick={() =>
                          openWhatsApp(
                            driver.user?.wa_number || "",
                            driver.user?.name || ""
                          )
                        }
                        className="flex items-center space-x-1 px-3 py-1 bg-green-500 hover:bg-green-600 text-white text-sm rounded-lg transition-colors"
                      >
                        <MessageCircle className="w-4 h-4" />
                        <span>WhatsApp</span>
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
        {/* ... (Tampilan Histori Pesanan tidak berubah) ... */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100">
          <div className="p-6 border-b border-gray-200">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <History className="w-5 h-5 text-orange-600" />
                <h2 className="text-xl font-semibold text-gray-900">
                  Histori Pesanan
                </h2>
              </div>
              <button
                onClick={() => setShowOrderForm(true)}
                className="flex items-center space-x-2 px-4 py-2 bg-gradient-to-r from-blue-900 to-blue-800 hover:from-blue-800 hover:to-blue-700 text-white rounded-lg transition-all"
              >
                <Plus className="w-4 h-4" />
                <span>Pesan Baru</span>
              </button>
            </div>
          </div>
          <div className="p-6 max-h-96 overflow-y-auto">
            {orders.length === 0 ? (
              <div className="text-center py-8">
                <Package className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                <p className="text-gray-500">Belum ada pesanan</p>
              </div>
            ) : (
              <div className="space-y-4">
                {orders.map((order) => (
                  <div
                    key={order.id}
                    className="p-4 border border-gray-200 rounded-lg"
                  >
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center space-x-2">
                        {order.type === "delivery" ? (
                          <Package className="w-4 h-4 text-orange-600" />
                        ) : (
                          <Car className="w-4 h-4 text-blue-600" />
                        )}
                        <span className="font-medium text-gray-900 capitalize">
                          {order.type === "delivery" ? "Delivery" : "Ride"}
                        </span>
                      </div>
                      <span
                        className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(
                          order.status
                        )}`}
                      >
                        {getStatusText(order.status)}
                      </span>
                    </div>
                    <div className="space-y-1 text-sm text-gray-600">
                      <div className="flex items-center space-x-2">
                        <MapPin className="w-3 h-3" />
                        <span>Dari: {order.pickup_addr}</span>
                      </div>
                      <div className="flex items-center space-x-2">
                        <MapPin className="w-3 h-3" />
                        <span>Ke: {order.dest_addr}</span>
                      </div>
                      {order.driver && (
                        <div className="flex items-center space-x-2">
                          <UserIcon className="w-3 h-3" />
                          <span>Driver: {order.driver.users?.name}</span>
                        </div>
                      )}
                      <div className="flex items-center space-x-2">
                        <Clock className="w-3 h-3" />
                        <span>
                          {new Date(order.created_at).toLocaleDateString(
                            "id-ID"
                          )}
                        </span>
                      </div>
                    </div>
                    {order.notes && (
                      <div className="mt-2 text-sm text-gray-600">
                        <span className="font-medium">Catatan:</span>{" "}
                        {order.notes}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* --- PERUBAHAN 5: Teruskan 'drivers' ke modal saat dipanggil --- */}
      {showOrderForm && (
        <OrderFormModal
          isOpen={showOrderForm}
          onClose={() => setShowOrderForm(false)}
          onSuccess={() => {
            setShowOrderForm(false);
            if (user) fetchMyOrders(user.id);
          }}
          userId={user?.id || ""}
          drivers={drivers} // <-- Prop baru ditambahkan di sini
        />
      )}
    </div>
  );
}
