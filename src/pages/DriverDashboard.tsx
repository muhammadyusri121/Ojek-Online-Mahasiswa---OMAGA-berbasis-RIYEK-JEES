// src/pages/DriverDashboard.tsx

import { useEffect, useState, useCallback } from "react";
import { useAuth } from "../contexts/AuthContext";
import { supabase, type Order, type Driver, type User } from "../lib/supabase";
import {

  Package,
  MapPin,
  User as UserIcon,
  CheckCircle,
  Power,
  MessageCircle,
  Phone,
  XCircle,
  History,
  Eye,
  Bike,
  ShoppingBag,
} from "lucide-react";

// Tipe data untuk pesanan yang digabungkan dengan detail pengguna
interface OrderWithUser extends Omit<Order, "user"> {
  user: User;
}

// Komponen Ilustrasi
const DriverIllustration = () => (
  <svg
    width="200"
    height="200"
    viewBox="0 0 200 200"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
  >
    <circle cx="100" cy="100" r="90" fill="#E8F5E9" />
    <path d="M100 40L125 65H75L100 40Z" fill="#2E7D32" />
    <rect x="70" y="65" width="60" height="70" rx="10" fill="#4CAF50" />
    <circle cx="100" cy="100" r="15" fill="white" />
    <path
      d="M100 90V110"
      stroke="#28a745"
      strokeWidth="4"
      strokeLinecap="round"
    />
    <path
      d="M90 100H110"
      stroke="#28a745"
      strokeWidth="4"
      strokeLinecap="round"
    />
    <circle cx="80" cy="145" r="10" fill="#2E7D32" />
    <circle cx="120" cy="145" r="10" fill="#2E7D32" />
  </svg>
);

export default function DriverDashboard() {
  const { user } = useAuth();
  const [driver, setDriver] = useState<Driver | null>(null);
  const [driverStatus, setDriverStatus] = useState<"online" | "offline">(
    "offline"
  );
  const [activeOrders, setActiveOrders] = useState<OrderWithUser[]>([]);
  const [orderHistory, setOrderHistory] = useState<OrderWithUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [previewOrder, setPreviewOrder] = useState<OrderWithUser | null>(null);

  // Logika pengambilan data tetap sama
  const fetchData = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    try {
      const { data: driverData, error: driverError } = await supabase
        .from("drivers")
        .select("*")
        .eq("user_id", user.id)
        .single();
      let currentDriver = driverData;
      if (driverError && driverError.code === "PGRST116") {
        const { data: newDriverData } = await supabase
          .from("drivers")
          .insert({ user_id: user.id })
          .select()
          .single();
        currentDriver = newDriverData;
      }
      if (currentDriver) {
        setDriver(currentDriver);
        setDriverStatus(currentDriver.status);
      }
      const { data, error } = await supabase.rpc("get_driver_orders", {
        p_driver_user_id: user.id,
      });
      if (error) throw error;
      const orders: OrderWithUser[] = data || [];
      const active: OrderWithUser[] = [];
      const history: OrderWithUser[] = [];
      orders.forEach((order) => {
        if (order.status === "completed" || order.status === "cancelled")
          history.push(order);
        else active.push(order);
      });
      setActiveOrders(active);
      setOrderHistory(history);
    } catch (error) {
      console.error("Error fetching driver data:", error);
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Logika untuk aksi-aksi driver tetap sama
  async function acceptOrder(orderId: string) {
    if (!driver) return;
    await supabase
      .from("orders")
      .update({ driver_id: driver.id, status: "accepted" })
      .eq("id", orderId);
    fetchData();
  }

  async function updateOrderStatus(
    orderId: string,
    status: "in_progress" | "completed" | "cancelled"
  ) {
    const updates: Partial<Order> = { status };
    if (status === "completed" || status === "cancelled") {
      updates.completed_at = new Date().toISOString();
    }
    await supabase.from("orders").update(updates).eq("id", orderId);
    fetchData();
  }

  async function toggleDriverStatus() {
    if (!user || !driver) return;
    const newStatus = driverStatus === "online" ? "offline" : "online";
    await supabase
      .from("drivers")
      .update({ status: newStatus })
      .eq("id", driver.id);
    setDriverStatus(newStatus);
  }

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

  // Modal Preview (dengan sedikit penyesuaian desain)
  const PreviewModal = ({
    order,
    onClose,
  }: {
    order: OrderWithUser;
    onClose: () => void;
  }) => {
    if (!order) return null;
    return (
      <div
        className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50"
        onClick={onClose}
      >
        <div
          className="bg-white rounded-2xl shadow-lg max-w-md w-full p-6 m-4 relative border border-gray-100"
          onClick={(e) => e.stopPropagation()}
        >
          <div className="flex items-center mb-4">
            {order.type === "delivery" ? (
              <ShoppingBag className="w-6 h-6 text-orange-600" />
            ) : (
              <Bike className="w-6 h-6 text-green-600" />
            )}
            <span className="font-bold text-xl ml-3 capitalize text-gray-800">
              {order.type}
            </span>
            <span
              className={`ml-auto inline-flex items-center px-3 py-1 rounded-full text-sm font-semibold ${getStatusColor(
                order.status
              )}`}
            >
              {getStatusText(order.status)}
            </span>
          </div>
          <div className="space-y-3 text-sm text-gray-700 mb-4 border-t border-gray-200 pt-4">
            <div className="flex items-start space-x-3">
              <MapPin className="w-5 h-5 mt-0.5 text-green-600" />
              <div>
                <strong>Dari:</strong>
                <p>{order.pickup_addr}</p>
              </div>
            </div>
            <div className="flex items-start space-x-3">
              <MapPin className="w-5 h-5 mt-0.5 text-red-600" />
              <div>
                <strong>Ke:</strong>
                <p>{order.dest_addr}</p>
              </div>
            </div>
            <div className="flex items-center space-x-3">
              <UserIcon className="w-5 h-5 text-gray-500" />
              <span>
                <strong>Pemesan:</strong> {order.user?.name}
              </span>
            </div>
            <div className="flex items-center space-x-3">
              <Phone className="w-5 h-5 text-gray-500" />
              <a
                href={`https://wa.me/${order.user.wa_number?.replace(
                  /^0/,
                  "62"
                )}`}
                target="_blank"
                rel="noopener noreferrer"
                className="text-green-600 hover:underline flex items-center"
              >
                {order.user.wa_number}{" "}
                <MessageCircle className="w-4 h-4 ml-2" />
              </a>
            </div>
            {order.notes && (
              <div className="mt-2 p-3 bg-gray-50 rounded-lg text-sm text-gray-600">
                <strong>Catatan:</strong> {order.notes}
              </div>
            )}
          </div>
          <button
            className="w-full bg-gray-100 text-gray-700 py-2 rounded-lg hover:bg-gray-200"
            onClick={onClose}
          >
            Tutup
          </button>
        </div>
      </div>
    );
  };

  if (loading) {
    return (
      <div className="p-6 bg-gray-50 min-h-screen animate-pulse">
        <div className="h-24 bg-gray-200 rounded-xl mb-8"></div>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="h-96 bg-gray-200 rounded-xl"></div>
          <div className="h-96 bg-gray-200 rounded-xl"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-gray-50 min-h-screen">
      <main className="p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto">
        {/* Header dan Tombol Status */}
        <div
          className={`relative p-8 rounded-2xl shadow-lg overflow-hidden mb-8 flex flex-col md:flex-row items-center justify-between transition-colors ${
            driverStatus === "online"
              ? "bg-green-600 text-white"
              : "bg-gray-700 text-white"
          }`}
        >
          <div className="z-10">
            <h1 className="text-3xl sm:text-4xl font-bold mb-2">
              Dashboard Driver
            </h1>
            <p
              className={
                driverStatus === "online" ? "text-green-100" : "text-gray-300"
              }
            >
              {driverStatus === "online"
                ? "Anda sedang aktif dan siap menerima pesanan."
                : "Anda sedang offline. Aktifkan untuk mulai bekerja."}
            </p>
          </div>
          <button
            onClick={toggleDriverStatus}
            className={`mt-6 md:mt-0 z-10 flex items-center space-x-3 px-8 py-4 rounded-full font-bold transition-transform transform hover:scale-105 ${
              driverStatus === "online"
                ? "bg-white text-green-700"
                : "bg-green-500 text-white"
            }`}
          >
            <Power className="w-6 h-6" />
            <span>
              {driverStatus === "online" ? "Go Offline" : "Go Online"}
            </span>
          </button>
          <div className="absolute -right-12 -bottom-12 opacity-10 z-0">
            <DriverIllustration />
          </div>
        </div>

        {/* Konten Dashboard */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Pesanan Aktif & Tersedia */}
          <div className="bg-white rounded-2xl shadow-sm border border-gray-200">
            <div className="p-6 border-b border-gray-200">
              <h2 className="text-xl font-bold text-gray-800">Daftar Tugas</h2>
              <p className="text-gray-500">Pesanan yang perlu perhatian Anda</p>
            </div>
            <div className="p-6 max-h-[600px] overflow-y-auto space-y-4">
              {activeOrders.length === 0 ? (
                <div className="text-center py-12">
                  <Package className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                  <p className="font-semibold text-gray-600">Belum ada tugas</p>
                  <p className="text-gray-400">
                    Pastikan status Anda online untuk menerima pesanan.
                  </p>
                </div>
              ) : (
                activeOrders.map((order) => (
                  <div
                    key={order.id}
                    className="p-4 border border-gray-200 rounded-xl hover:shadow-md transition-shadow"
                  >
                    <div className="flex justify-between items-start mb-3">
                      <div className="flex items-center space-x-3">
                        <div
                          className={`w-10 h-10 rounded-lg flex items-center justify-center ${
                            order.type === "delivery"
                              ? "bg-orange-100"
                              : "bg-green-100"
                          }`}
                        >
                          {order.type === "delivery" ? (
                            <ShoppingBag className="w-5 h-5 text-orange-600" />
                          ) : (
                            <Bike className="w-5 h-5 text-green-600" />
                          )}
                        </div>
                        <div>
                          <p className="font-bold text-gray-800">
                            {order.user.name}
                          </p>
                          <p className="text-xs text-gray-500">
                            {new Date(order.created_at).toLocaleTimeString(
                              "id-ID",
                              { hour: "2-digit", minute: "2-digit" }
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
                    <div className="space-y-2 text-sm text-gray-600 mb-4 border-l-2 border-gray-100 pl-4 ml-5">
                      <p>
                        <b>Dari:</b> {order.pickup_addr}
                      </p>
                      <p>
                        <b>Ke:</b> {order.dest_addr}
                      </p>
                    </div>
                    <div className="flex space-x-2">
                      {order.status === "pending" && (
                        <button
                          onClick={() => acceptOrder(order.id)}
                          className="flex-1 bg-green-500 text-white px-3 py-2 rounded-lg text-sm font-bold hover:bg-green-600 transition-colors"
                        >
                          Terima
                        </button>
                      )}
                      {order.status === "accepted" && (
                        <button
                          onClick={() =>
                            updateOrderStatus(order.id, "in_progress")
                          }
                          className="flex-1 bg-blue-500 text-white px-3 py-2 rounded-lg text-sm font-bold hover:bg-blue-600 transition-colors"
                        >
                          Mulai Jalan
                        </button>
                      )}
                      {order.status === "in_progress" && (
                        <button
                          onClick={() =>
                            updateOrderStatus(order.id, "completed")
                          }
                          className="flex-1 bg-emerald-500 text-white px-3 py-2 rounded-lg text-sm font-bold hover:bg-emerald-600 transition-colors"
                        >
                          Selesaikan
                        </button>
                      )}
                      {(order.status === "accepted" ||
                        order.status === "in_progress") && (
                        <button
                          onClick={() =>
                            updateOrderStatus(order.id, "cancelled")
                          }
                          className="flex-1 bg-gray-200 text-gray-700 px-3 py-2 rounded-lg text-sm font-medium hover:bg-gray-300"
                        >
                          Batalkan
                        </button>
                      )}
                      <button
                        onClick={() => setPreviewOrder(order)}
                        className="p-2 bg-gray-100 text-gray-600 rounded-lg hover:bg-gray-200 transition-colors"
                      >
                        <Eye className="w-5 h-5" />
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Histori Pesanan */}
          <div className="bg-white rounded-2xl shadow-sm border border-gray-200">
            <div className="p-6 border-b border-gray-200">
              <h2 className="text-xl font-bold text-gray-800">
                Riwayat Selesai
              </h2>
              <p className="text-gray-500">
                Daftar pesanan yang telah selesai atau dibatalkan.
              </p>
            </div>
            <div className="p-6 max-h-[600px] overflow-y-auto space-y-3">
              {orderHistory.length === 0 ? (
                <div className="text-center py-12">
                  <History className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                  <p className="font-semibold text-gray-600">
                    Belum ada riwayat
                  </p>
                  <p className="text-gray-400">
                    Selesaikan pesanan untuk melihatnya di sini.
                  </p>
                </div>
              ) : (
                orderHistory.map((order) => (
                  <div
                    key={order.id}
                    className="p-3 flex items-center justify-between bg-gray-50 rounded-xl"
                  >
                    <div className="flex items-center space-x-3">
                      <div
                        className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 ${
                          order.status === "completed"
                            ? "bg-green-100"
                            : "bg-red-100"
                        }`}
                      >
                        {order.status === "completed" ? (
                          <CheckCircle className="w-4 h-4 text-green-600" />
                        ) : (
                          <XCircle className="w-4 h-4 text-red-600" />
                        )}
                      </div>
                      <div>
                        <p className="font-semibold text-gray-800 text-sm">
                          {order.user.name}
                        </p>
                        <p className="text-xs text-gray-500">
                          {new Date(
                            order.completed_at || order.created_at
                          ).toLocaleString("id-ID")}
                        </p>
                      </div>
                    </div>
                    <button
                      onClick={() => setPreviewOrder(order)}
                      className="text-sm text-green-600 hover:underline"
                    >
                      Detail
                    </button>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>

        {previewOrder && (
          <PreviewModal
            order={previewOrder}
            onClose={() => setPreviewOrder(null)}
          />
        )}
      </main>
    </div>
  );
}
