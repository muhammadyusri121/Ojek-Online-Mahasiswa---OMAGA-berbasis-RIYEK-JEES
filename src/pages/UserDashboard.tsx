// src/pages/UserDashboard.tsx

import React, { useEffect, useState, useCallback } from "react";
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
  ArrowRight,
  ChevronRight,
  Bike,
  ShoppingBag,
  Info,
} from "lucide-react";

// Ilustrasi Kustom (dalam format komponen React)
const HeroIllustration = () => (
  <svg
    width="200"
    height="200"
    viewBox="0 0 200 200"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
  >
    <path
      d="M100 190C149.706 190 190 149.706 190 100C190 50.2944 149.706 10 100 10C50.2944 10 10 50.2944 10 100C10 149.706 50.2944 190 100 190Z"
      fill="#E8F5E9"
    />
    <path
      d="M141.429 111.429C147.11 111.429 151.429 107.11 151.429 101.429C151.429 95.7475 147.11 91.4287 141.429 91.4287C135.747 91.4287 131.429 95.7475 131.429 101.429C131.429 107.11 135.747 111.429 141.429 111.429Z"
      fill="#4CAF50"
    />
    <path d="M129.5 130H72.5L62.5 105H112.5L120 130H129.5Z" fill="#2E7D32" />
    <path d="M130 130L120 105L132.5 97.5L145 120L130 130Z" fill="#28a745" />
    <path d="M80 105L70 80L55 90L62.5 105H80Z" fill="#28a745" />
    <path
      d="M90 92.5C90 96.6421 86.6421 100 82.5 100C78.3579 100 75 96.6421 75 92.5C75 88.3579 78.3579 85 82.5 85C86.6421 85 90 88.3579 90 92.5Z"
      fill="#FFFFFF"
    />
    <path
      d="M122.5 92.5C122.5 96.6421 119.142 100 115 100C110.858 100 107.5 96.6421 107.5 92.5C107.5 88.3579 110.858 85 115 85C119.142 85 122.5 88.3579 122.5 92.5Z"
      fill="#FFFFFF"
    />
  </svg>
);

// Tipe data untuk driver dari RPC
interface RpcDriverResponse {
  id: string;
  user_id: string;
  status: "online" | "offline";
  created_at: string;
  updated_at: string;
  user: User;
}

// Data Tarif
const antarJemputRates = [
  { from: "Kampus", to: "Telang", price: 5000 },
  { from: "Kampus", to: "Graha Kamal", price: 7000 },
  { from: "Kampus", to: "Perumnas Kamal", price: 10000 },
  { from: "Kampus", to: "Socah", price: 10000 },
  { from: "Kampus", to: "Pelabuhan Kamal", price: 15000 },
  { from: "Kampus", to: "Alang-Alang", price: 25000 },
  { from: "Terminal", to: "Bangkalan", price: 25000 },
  { from: "Bangkalan", to: "Kota", price: 30000 },
  { from: "Stasiun", to: "Gubeng", price: 55000 },
  { from: "Stasiun", to: "Pasar Turi", price: 60000 },
  { from: "Terminal", to: "Bungurasih", price: 100000 },
];
const deliveryRates = [
  { to: "Telang", price: 5000 },
  { to: "Graha Kamal", price: 7000 },
  { to: "Perumnas Kamal", price: 10000 },
];

function OrderFormModal({
  isOpen,
  onClose,
  onSuccess,
  userId,
  drivers,
}: {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  userId: string;
  drivers: RpcDriverResponse[];
}): JSX.Element | null {
  const [orderType, setOrderType] = useState<"delivery" | "ride">("delivery");
  const [formData, setFormData] = useState({
    pickup_addr: "",
    dest_addr: "",
    notes: "",
  });
  const [selectedDriverId, setSelectedDriverId] = useState<string>("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    if (!selectedDriverId) {
      setError("Silakan pilih driver terlebih dahulu.");
      return;
    }
    setLoading(true);

    try {
      const { error } = await supabase.from("orders").insert({
        user_id: userId,
        type: orderType,
        pickup_addr: formData.pickup_addr,
        dest_addr: formData.dest_addr,
        notes: formData.notes,
        status: "pending",
        driver_id: selectedDriverId,
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
                placeholder="misal: Toko Abell"
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

  const fetchData = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    try {
      const [driversRes, ordersRes] = await Promise.all([
        supabase.rpc("get_online_drivers"),
        supabase
          .from("orders")
          .select(`*, driver:drivers(*, user:users(*))`)
          .eq("user_id", user.id)
          .order("created_at", { ascending: false }),
      ]);
      if (driversRes.error) throw driversRes.error;
      if (ordersRes.error) throw ordersRes.error;
      setDrivers(driversRes.data || []);
      setOrders(ordersRes.data || []);
    } catch (error) {
      console.error("Gagal memuat data dasbor:", error);
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const getStatusColor = (status: string) =>
    ({
      pending: "text-yellow-800 bg-yellow-100",
      accepted: "text-blue-800 bg-blue-100",
      in_progress: "text-orange-800 bg-orange-100",
      completed: "text-green-800 bg-green-100",
      cancelled: "text-red-800 bg-red-100",
    }[status] || "text-gray-800 bg-gray-100");

  const getStatusText = (status: string) =>
    ({
      pending: "Menunggu",
      accepted: "Diterima",
      in_progress: "Dalam Perjalanan",
      completed: "Selesai",
      cancelled: "Dibatalkan",
    }[status] || status);

  if (loading) {
    return (
      <div className="p-6 bg-gray-50 min-h-screen animate-pulse">
        <div className="h-24 bg-gray-200 rounded-xl mb-8"></div>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 h-64 bg-gray-200 rounded-xl"></div>
          <div className="h-64 bg-gray-200 rounded-xl"></div>
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
            <h1 className="text-3xl sm:text-4xl font-bold mb-2">
              Selamat Datang, {user?.name}!
            </h1>
            <p className="text-green-100 max-w-md">
              Siap untuk pergi atau butuh sesuatu diantar? Pesan sekarang dengan
              mudah dan cepat.
            </p>
            <button
              onClick={() => setShowOrderForm(true)}
              className="mt-6 bg-white text-green-700 font-bold py-3 px-6 rounded-lg shadow-md hover:bg-gray-100 transition-transform transform hover:scale-105 flex items-center space-x-2"
            >
              <span>Pesan Sekarang</span>
              <ArrowRight className="w-5 h-5" />
            </button>
          </div>
          <div className="absolute -right-12 -bottom-12 opacity-20 z-0">
            <HeroIllustration />
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Kolom Kiri: Driver & Histori */}
          <div className="lg:col-span-2 space-y-8">
            {/* Daftar Driver Online */}
            <div className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden">
              <div className="p-6 border-b border-gray-200">
                <h2 className="text-xl font-bold text-gray-800">
                  Driver Siap Jalan
                </h2>
                <p className="text-gray-500">
                  {drivers.length} driver sedang online
                </p>
              </div>
              <div className="p-6 max-h-96 overflow-y-auto">
                {drivers.length > 0 ? (
                  <div className="space-y-4">
                    {drivers.map((driver) => (
                      <div
                        key={driver.id}
                        className="flex items-center justify-between p-4 bg-gray-50 rounded-xl hover:bg-gray-100 transition-colors"
                      >
                        <div className="flex items-center space-x-4">
                          {/* === PENYESUAIAN DI SINI === */}
                          {driver.user?.profile_picture_url ? (
                            <img
                              src={driver.user.profile_picture_url}
                              alt={driver.user.name || "Driver"}
                              className="w-12 h-12 rounded-full object-cover"
                            />
                          ) : (
                            <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center">
                              <span className="text-xl font-bold text-green-700">
                                {driver.user?.name?.charAt(0)?.toUpperCase() ||
                                  "D"}
                              </span>
                            </div>
                          )}
                          <div>
                            <p className="font-semibold text-gray-900">
                              {driver.user?.name}
                            </p>
                            <p className="text-sm text-gray-500">
                              {driver.user?.wa_number}
                            </p>
                          </div>
                        </div>
                        <a
                          href={`https://wa.me/${driver.user.wa_number?.replace(
                            /^0/,
                            "62"
                          )}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="bg-green-500 text-white px-4 py-2 rounded-lg shadow-sm hover:bg-green-600 transition-all flex items-center space-x-2"
                        >
                          <MessageCircle className="w-4 h-4" />
                          <span>Chat</span>
                        </a>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-12">
                    <Car className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                    <p className="font-semibold text-gray-600">
                      Yah, belum ada driver yang online
                    </p>
                    <p className="text-gray-400">
                      Coba cek lagi beberapa saat nanti.
                    </p>
                  </div>
                )}
              </div>
            </div>

            {/* Histori Pesanan */}
            <div className="bg-white rounded-2xl shadow-sm border border-gray-200">
              <div className="p-6 border-b border-gray-200">
                <h2 className="text-xl font-bold text-gray-800">
                  Riwayat Pesanan Anda
                </h2>
              </div>
              <div className="p-6 max-h-96 overflow-y-auto">
                {orders.length > 0 ? (
                  <div className="space-y-4">
                    {orders.map((order) => (
                      <div
                        key={order.id}
                        className="p-4 border border-gray-200 rounded-xl"
                      >
                        <div className="flex justify-between items-start mb-3">
                          <div className="flex items-center space-x-3">
                            <div
                              className={`w-10 h-10 rounded-lg flex items-center justify-center ${
                                order.type === "delivery"
                                  ? "bg-orange-100"
                                  : "bg-blue-100"
                              }`}
                            >
                              {order.type === "delivery" ? (
                                <ShoppingBag className="w-5 h-5 text-orange-600" />
                              ) : (
                                <Bike className="w-5 h-5 text-blue-600" />
                              )}
                            </div>
                            <div>
                              <p className="font-bold text-gray-800 capitalize">
                                {order.type}
                              </p>
                              <p className="text-xs text-gray-500">
                                {new Date(order.created_at).toLocaleDateString(
                                  "id-ID"
                                )}
                              </p>
                            </div>
                          </div>
                          <span
                            className={`px-3 py-1 text-xs font-semibold rounded-full ${getStatusColor(
                              order.status
                            )}`}
                          >
                            {getStatusText(order.status)}
                          </span>
                        </div>
                        <div className="space-y-2 text-sm text-gray-600 border-l-2 border-gray-100 pl-4 ml-5">
                          <p>
                            <b>Dari:</b> {order.pickup_addr}
                          </p>
                          <p>
                            <b>Ke:</b> {order.dest_addr}
                          </p>
                          {order.driver && (
                            <p>
                              <b>Driver:</b> {order.driver.user?.name}
                            </p>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-12">
                    <History className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                    <p className="font-semibold text-gray-600">
                      Anda belum pernah memesan
                    </p>
                    <p className="text-gray-400">Ayo buat pesanan pertamamu!</p>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Kolom Kanan: Daftar Harga */}
          <div className="space-y-8">
            {/* Tarif Antar-Jemput */}
            <div className="bg-white rounded-2xl shadow-sm border border-gray-200">
              <div className="p-6 border-b border-gray-200 flex items-center space-x-3">
                <Bike className="w-6 h-6 text-green-600" />
                <h3 className="text-lg font-bold text-gray-800">
                  Tarif Antar - Jemput
                </h3>
              </div>
              <div className="p-6 space-y-3">
                {antarJemputRates.slice(0, 5).map((rate, index) => (
                  <div
                    key={index}
                    className="flex justify-between items-center text-sm"
                  >
                    <p className="text-gray-600">
                      {rate.from} - {rate.to}
                    </p>
                    <p className="font-bold text-green-700">
                      Rp {rate.price.toLocaleString("id-ID")}
                    </p>
                  </div>
                ))}
                <div className="pt-2 text-center text-xs text-gray-400">
                  ... dan banyak lagi
                </div>
              </div>
            </div>

            {/* Tarif Delivery */}
            <div className="bg-white rounded-2xl shadow-sm border border-gray-200">
              <div className="p-6 border-b border-gray-200 flex items-center space-x-3">
                <ShoppingBag className="w-6 h-6 text-orange-500" />
                <h3 className="text-lg font-bold text-gray-800">
                  Tarif Delivery Order (DO)
                </h3>
              </div>
              <div className="p-6 space-y-3">
                {deliveryRates.map((rate, index) => (
                  <div
                    key={index}
                    className="flex justify-between items-center text-sm"
                  >
                    <p className="text-gray-600">Area {rate.to}</p>
                    <p className="font-bold text-green-700">
                      Rp {rate.price.toLocaleString("id-ID")}
                    </p>
                  </div>
                ))}
              </div>
            </div>

            {/* Aturan Tambahan */}
            <div className="bg-green-50 border-l-4 border-green-500 p-4 rounded-r-lg">
              <div className="flex items-start">
                <Info className="w-5 h-5 text-green-600 mr-3 mt-1 flex-shrink-0" />
                <div>
                  <h4 className="font-bold text-green-800">Info Tambahan</h4>
                  <ul className="list-disc list-inside text-sm text-green-700 mt-2 space-y-1">
                    <li>
                      Tarif di luar daftar: <strong>Rp 2,200/km</strong>
                    </li>
                    <li>
                      Biaya parkir (jika ada): <strong>+Rp 2,000</strong>
                    </li>
                  </ul>
                </div>
              </div>
            </div>
          </div>
        </div>
      </main>

      {/* Modal Pemesanan */}
      {showOrderForm && (
        <OrderFormModal
          isOpen={showOrderForm}
          onClose={() => setShowOrderForm(false)}
          onSuccess={() => {
            setShowOrderForm(false);
            if (user) fetchData();
          }}
          userId={user?.id || ""}
          drivers={drivers}
        />
      )}
    </div>
  );
}
