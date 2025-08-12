// src/pages/AdminDashboard.tsx

import { useEffect, useState, useCallback } from "react";
import { supabase, type User, type Order, type Report } from "../lib/supabase";
import {
  Users,
  Car,
  Package,
  Download,
  UserCheck,
  UserX,
  BarChart3,
  Clock,
  CheckCircle,
  ShieldAlert, // <-- Ditambahkan
  CheckSquare, // <-- Ditambahkan
} from "lucide-react";

// Tipe untuk data statistik admin
interface AdminDashboardStats {
  total_users: number;
  total_drivers: number;
  active_drivers: number;
  total_orders: number;
  completed_orders: number;
  pending_orders: number;
}

// Tipe gabungan untuk Laporan dengan detail tambahan
interface CombinedReport extends Report {
  status: 'baru' | 'selesai';
  user: { name: string | null } | null;
  order: { pickup_addr: string; dest_addr: string } | null;
}

export default function AdminDashboard() {
  const [users, setUsers] = useState<User[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);
  const [reports, setReports] = useState<CombinedReport[]>([]); // <-- State baru untuk laporan
  const [stats, setStats] = useState<AdminDashboardStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<"overview" | "users" | "orders" | "reports">(
    "overview"
  );

  const fetchUsers = useCallback(async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("users")
        .select("*")
        .order("created_at", { ascending: false });
      if (error) throw error;
      setUsers(data || []);
    } catch (e) {
      console.error("Gagal mengambil data pengguna:", e);
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchOrders = useCallback(async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("orders")
        .select(`*, user:users(*), driver:drivers(*, user:users(*))`)
        .order("created_at", { ascending: false });
      if (error) throw error;
      setOrders(data || []);
    } catch (e) {
      console.error("Gagal mengambil data pesanan:", e);
    } finally {
      setLoading(false);
    }
  }, []);

  // <-- Fungsi baru untuk mengambil data laporan
  const fetchReports = useCallback(async () => {
    setLoading(true);
    try {
        const { data, error } = await supabase
            .from('reports')
            .select(`
                *,
                user:users(name),
                order:orders(pickup_addr, dest_addr)
            `)
            .order('created_at', { ascending: false });
        
        if (error) throw error;

        // Pastikan setiap laporan memiliki status
        const formattedData = (data || []).map(r => ({
            ...r,
            status: r.status || 'baru' 
        })) as CombinedReport[];

        setReports(formattedData);
    } catch (e) {
        console.error("Gagal mengambil data laporan:", e);
    } finally {
        setLoading(false);
    }
  }, []);


  const fetchOverview = useCallback(async () => {
    setLoading(true);
    try {
      const { data: statsData, error: statsError } = await supabase
        .rpc("get_admin_dashboard_overview")
        .single<AdminDashboardStats>();
      if (statsError) throw statsError;
      setStats(statsData);

      const { data: recentOrders, error: ordersError } = await supabase
        .from("orders")
        .select(`*, user:users(name)`)
        .order("created_at", { ascending: false })
        .limit(5);
      if (ordersError) throw ordersError;
      setOrders((recentOrders as Order[]) || []);
    } catch (e) {
      console.error("Gagal mengambil data overview:", e);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (activeTab === "overview") fetchOverview();
    else if (activeTab === "users") fetchUsers();
    else if (activeTab === "orders") fetchOrders();
    else if (activeTab === "reports") fetchReports(); // <-- Panggil fetchReports
  }, [activeTab, fetchOverview, fetchUsers, fetchOrders, fetchReports]);

  const refreshCurrentTab = () => {
    if (activeTab === "users") fetchUsers();
    else if (activeTab === "orders") fetchOrders();
    else if (activeTab === "reports") fetchReports();
    else fetchOverview();
  };
  
  // <-- Fungsi baru untuk menandai laporan selesai
  const handleMarkReportAsResolved = async (reportId: string) => {
    try {
        const { error } = await supabase
            .from('reports')
            .update({ status: 'selesai' })
            .eq('id', reportId);

        if (error) throw error;
      
        // Memperbarui tampilan UI secara langsung tanpa perlu fetch ulang
        setReports(currentReports => 
            currentReports.map(report => 
                report.id === reportId ? { ...report, status: 'selesai' } : report
            )
        );
    } catch (error) {
        console.error("Gagal memperbarui status laporan:", error);
        alert("Gagal memperbarui status laporan.");
    }
  };

  async function promoteToDriver(userId: string) {
    const { error } = await supabase
      .from("users")
      .update({ role: "driver" })
      .eq("id", userId);
    if (error) console.error(error);
    else refreshCurrentTab();
  }

  async function demoteFromDriver(userId: string) {
    const { error } = await supabase
      .from("users")
      .update({ role: "pengguna" })
      .eq("id", userId);
    if (error) console.error(error);
    else refreshCurrentTab();
  }

  const exportData = () => {
    const csvContent =
      "data:text/csv;charset=utf-8," +
      "ID,Nama,Email,WhatsApp,Role,Tanggal Daftar\n" +
      users
        .map((user) =>
          [
            user.id,
            user.name,
            user.email,
            user.wa_number,
            user.role,
            new Date(user.created_at).toLocaleDateString("id-ID"),
          ].join(",")
        )
        .join("\n");

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", "omaga_users.csv");
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
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

  const getRoleColor = (role: string) => {
    switch (role) {
      case "admin":
        return "text-purple-600 bg-purple-50";
      case "driver":
        return "text-blue-600 bg-blue-50";
      case "pengguna":
        return "text-green-600 bg-green-50";
      default:
        return "text-gray-600 bg-gray-50";
    }
  };

  if (loading) {
    return (
      <div className="p-6">
        <div className="animate-pulse space-y-6">
          <div className="h-8 bg-gray-200 rounded w-1/4"></div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {[...Array(6)].map((_, i) => (
              <div
                key={i}
                className="bg-white p-6 rounded-lg shadow h-32"
              ></div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">
          Dashboard Admin
        </h1>
        <p className="text-gray-600">Kelola sistem OMAGA secara menyeluruh</p>
      </div>

      {/* Tabs */}
      <div className="mb-6">
        <div className="border-b border-gray-200">
          <nav className="-mb-px flex space-x-8">
            {[
              { id: "overview", name: "Overview", icon: BarChart3 },
              { id: "users", name: "Pengguna", icon: Users },
              { id: "orders", name: "Pesanan", icon: Package },
              { id: "reports", name: "Laporan", icon: ShieldAlert }, // <-- Tab Laporan
            ].map((tab) => {
              const Icon = tab.icon;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id as any)}
                  className={`flex items-center space-x-2 py-2 px-1 border-b-2 font-medium text-sm ${
                    activeTab === tab.id
                      ? "border-blue-500 text-blue-600"
                      : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
                  }`}
                >
                  <Icon className="w-4 h-4" />
                  <span>{tab.name}</span>
                </button>
              );
            })}
          </nav>
        </div>
      </div>

      {/* Overview Tab */}
      {activeTab === "overview" && (
        <div className="space-y-6">
          {/* Stats Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[
              {
                title: "Total Pengguna",
                value: stats?.total_users,
                icon: Users,
                color: "from-blue-500 to-blue-600",
                bgColor: "bg-blue-50",
                iconColor: "text-blue-600",
              },
              {
                title: "Total Driver",
                value: stats?.total_drivers,
                icon: Car,
                color: "from-green-500 to-green-600",
                bgColor: "bg-green-50",
                iconColor: "text-green-600",
              },
              {
                title: "Driver Aktif",
                value: stats?.active_drivers,
                icon: UserCheck,
                color: "from-emerald-500 to-emerald-600",
                bgColor: "bg-emerald-50",
                iconColor: "text-emerald-600",
              },
              {
                title: "Total Pesanan",
                value: stats?.total_orders,
                icon: Package,
                color: "from-orange-500 to-orange-600",
                bgColor: "bg-orange-50",
                iconColor: "text-orange-600",
              },
              {
                title: "Pesanan Selesai",
                value: stats?.completed_orders,
                icon: CheckCircle,
                color: "from-purple-500 to-purple-600",
                bgColor: "bg-purple-50",
                iconColor: "text-purple-600",
              },
              {
                title: "Pesanan Pending",
                value: stats?.pending_orders,
                icon: Clock,
                color: "from-yellow-500 to-yellow-600",
                bgColor: "bg-yellow-50",
                iconColor: "text-yellow-600",
              },
            ].map((card, index) => {
              const Icon = card.icon;
              return (
                <div
                  key={index}
                  className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 hover:shadow-md transition-shadow"
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-gray-600 text-sm font-medium mb-1">
                        {card.title}
                      </p>
                      <p className="text-3xl font-bold text-gray-900">
                        {card.value ?? 0}
                      </p>
                    </div>
                    <div
                      className={`w-12 h-12 ${card.bgColor} rounded-lg flex items-center justify-center`}
                    >
                      <Icon className={`w-6 h-6 ${card.iconColor}`} />
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Recent Orders */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-100">
            <div className="p-6 border-b border-gray-200">
              <h2 className="text-xl font-semibold text-gray-900">
                Pesanan Terbaru
              </h2>
            </div>
            <div className="p-6">
              <div className="space-y-4">
                {orders.slice(0, 5).map((order) => (
                  <div
                    key={order.id}
                    className="flex items-center justify-between p-4 bg-gray-50 rounded-lg"
                  >
                    <div className="flex items-center space-x-4">
                      {order.type === "delivery" ? (
                        <Package className="w-5 h-5 text-orange-600" />
                      ) : (
                        <Car className="w-5 h-5 text-blue-600" />
                      )}
                      <div>
                        <p className="font-medium text-gray-900">
                          {order.user?.name}
                        </p>
                        <p className="text-sm text-gray-500">
                          {order.pickup_addr} → {order.dest_addr}
                        </p>
                      </div>
                    </div>
                    <div className="text-right">
                      <span
                        className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(
                          order.status
                        )}`}
                      >
                        {getStatusText(order.status)}
                      </span>
                      <p className="text-xs text-gray-500 mt-1">
                        {new Date(order.created_at).toLocaleDateString("id-ID")}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Users Tab */}
      {activeTab === "users" && (
        <div className="bg-white rounded-xl shadow-sm border border-gray-100">
          <div className="p-6 border-b border-gray-200">
            <div className="flex items-center justify-between">
              <h2 className="text-xl font-semibold text-gray-900">
                Manajemen Pengguna
              </h2>
              <button
                onClick={exportData}
                className="flex items-center space-x-2 px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg transition-colors"
              >
                <Download className="w-4 h-4" />
                <span>Export CSV</span>
              </button>
            </div>
          </div>
          <div className="p-6">
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Pengguna
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Kontak
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Role
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Tanggal Daftar
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Aksi
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {users.map((user) => (
                    <tr key={user.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center">
                          {user.profile_picture_url ? (
                            <img
                              src={user.profile_picture_url}
                              alt="Profile"
                              className="w-10 h-10 rounded-full object-cover"
                            />
                          ) : (
                            <div className="w-10 h-10 bg-blue-900 rounded-full flex items-center justify-center">
                              <span className="text-white font-medium">
                                {user.name?.charAt(0)?.toUpperCase() || "U"}
                              </span>
                            </div>
                          )}
                          <div className="ml-4">
                            <div className="text-sm font-medium text-gray-900">
                              {user.name}
                            </div>
                            <div className="text-sm text-gray-500">
                              {user.email}
                            </div>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        <div>
                          <div>WA: {user.wa_number}</div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span
                          className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium capitalize ${getRoleColor(
                            user.role
                          )}`}
                        >
                          {user.role}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {new Date(user.created_at).toLocaleDateString("id-ID")}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                        {user.role === "pengguna" && (
                          <button
                            onClick={() => promoteToDriver(user.id)}
                            className="flex items-center space-x-1 text-green-600 hover:text-green-800"
                          >
                            <UserCheck className="w-4 h-4" />
                            <span>Jadikan Driver</span>
                          </button>
                        )}
                        {user.role === "driver" && (
                          <button
                            onClick={() => demoteFromDriver(user.id)}
                            className="flex items-center space-x-1 text-red-600 hover:text-red-800"
                          >
                            <UserX className="w-4 h-4" />
                            <span>Hapus Driver</span>
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* Orders Tab */}
      {activeTab === "orders" && (
        <div className="bg-white rounded-xl shadow-sm border border-gray-100">
          <div className="p-6 border-b border-gray-200">
            <h2 className="text-xl font-semibold text-gray-900">
              Manajemen Pesanan
            </h2>
          </div>
          <div className="p-6">
            <div className="space-y-4">
              {orders.map((order) => (
                <div
                  key={order.id}
                  className="p-4 border border-gray-200 rounded-lg"
                >
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center space-x-3">
                      {order.type === "delivery" ? (
                        <Package className="w-5 h-5 text-orange-600" />
                      ) : (
                        <Car className="w-5 h-5 text-blue-600" />
                      )}
                      <div>
                        <p className="font-medium text-gray-900">
                          {order.user?.name} -{" "}
                          {order.type === "delivery" ? "Delivery" : "Ride"}
                        </p>
                        <p className="text-sm text-gray-500">
                          {new Date(order.created_at).toLocaleDateString(
                            "id-ID"
                          )}{" "}
                          -
                          {new Date(order.created_at).toLocaleTimeString(
                            "id-ID"
                          )}
                        </p>
                      </div>
                    </div>
                    <span
                      className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${getStatusColor(
                        order.status
                      )}`}
                    >
                      {getStatusText(order.status)}
                    </span>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-3">
                    <div>
                      <p className="text-sm font-medium text-gray-700">Rute:</p>
                      <p className="text-sm text-gray-600">
                        {order.pickup_addr} → {order.dest_addr}
                      </p>
                    </div>
                    {order.driver?.user && (
                      <div>
                        <p className="text-sm font-medium text-gray-700">
                          Driver:
                        </p>
                        <p className="text-sm text-gray-600">
                          {order.driver.user.name}
                        </p>
                      </div>
                    )}
                  </div>

                  {order.notes && (
                    <div className="mt-2 p-2 bg-gray-50 rounded text-sm text-gray-600">
                      <strong>Catatan:</strong> {order.notes}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Konten untuk Tab Laporan */}
      {activeTab === 'reports' && (
        <div className="bg-white rounded-xl shadow-sm border border-gray-100">
          <div className="p-6 border-b border-gray-200">
            <h2 className="text-xl font-semibold text-gray-900">
              Laporan Masuk dari Pengguna
            </h2>
            <p className="text-sm text-gray-500 mt-1">
              Kelola dan tindak lanjuti laporan dari pengguna.
            </p>
          </div>
          <div className="p-6">
            {reports.length > 0 ? (
              <div className="space-y-4">
                {reports.map((report) => (
                  <div 
                    key={report.id} 
                    className={`p-4 border rounded-lg transition-all ${
                      report.status === 'selesai' 
                        ? 'border-gray-200 bg-gray-50 opacity-70' 
                        : 'border-gray-200'
                    }`}
                  >
                    <div className="flex flex-col sm:flex-row justify-between sm:items-start gap-2 mb-3">
                      <div>
                        <div className="flex items-center gap-3">
                          <p className="font-bold text-gray-800">
                            {report.is_anonymous ? 
                              <span className="italic text-gray-500">Pelapor Anonim</span> : 
                              (report.user?.name || 'Nama Tidak Tersedia')
                            }
                          </p>
                          {/* Badge Status Laporan */}
                          <span className={`px-2 py-0.5 text-xs font-semibold rounded-full capitalize ${
                            report.status === 'baru' 
                              ? 'bg-yellow-100 text-yellow-800' 
                              : 'bg-green-100 text-green-800'
                          }`}>
                            {report.status}
                          </span>
                        </div>
                        <p className="text-xs text-gray-500 mt-1">
                          {new Date(report.created_at).toLocaleString('id-ID', { dateStyle: 'long', timeStyle: 'short' })}
                        </p>
                      </div>
                      <div className="text-left sm:text-right bg-gray-100 p-2 rounded-md">
                         <p className="text-xs text-gray-600 font-medium">Pesanan Terkait</p>
                         <p className="text-xs text-gray-500 truncate max-w-xs">
                           {report.order?.pickup_addr} → {report.order?.dest_addr}
                         </p>
                      </div>
                    </div>
                    <div className={`mt-2 p-3 border-l-4 rounded-r-md ${
                        report.status === 'selesai' ? 'border-gray-300' : 'bg-yellow-50 border-yellow-400'
                    }`}>
                        <p className="text-gray-800 whitespace-pre-wrap text-sm">{report.report_message}</p>
                    </div>

                    {/* Tombol Aksi untuk Admin */}
                    {/* {report.status === 'baru' && (
                      <div className="mt-4 pt-4 border-t border-gray-200 flex justify-end">
                        <button 
                          onClick={() => handleMarkReportAsResolved(report.id)}
                          className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white text-sm font-medium rounded-lg hover:bg-green-700 transition-colors"
                        >
                          <CheckSquare size={16} />
                          Tandai Selesai
                        </button>
                      </div>
                    )} */}
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-12 text-gray-500">
                <ShieldAlert className="w-16 h-16 mx-auto text-gray-300 mb-4" />
                <p className="font-semibold">Belum ada laporan yang masuk.</p>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}