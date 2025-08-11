import React from "react";
import { Link, useLocation } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";
import {
  Home,
  User,
  Car,
  Settings,
  LogOut,
  Menu,
  X,
  Instagram, // <-- 1. Tambahkan impor ikon Instagram
} from "lucide-react";

interface LayoutProps {
  children: React.ReactNode;
}

export default function Layout({ children }: LayoutProps) {
  const { user, signOut } = useAuth();
  const location = useLocation();
  const [sidebarOpen, setSidebarOpen] = React.useState(false);

  const navigation = [
    {
      name: "Dashboard",
      href: "/",
      icon: Home,
      roles: ["admin", "driver", "pengguna"],
    },
    {
      name: "Profil",
      href: "/profile",
      icon: User,
      roles: ["admin", "driver", "pengguna"],
    },
    { name: "Driver", href: "/driver", icon: Car, roles: ["admin", "driver"] },
    { name: "Admin", href: "/admin", icon: Settings, roles: ["admin"] },
  ];

  const filteredNavigation = navigation.filter(
    (item) => user && item.roles.includes(user.role)
  );

  const handleSignOut = async () => {
    await signOut();
  };

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      <div className="flex flex-1">
        {/* Mobile sidebar */}
        <div
          className={`fixed inset-0 z-50 lg:hidden ${
            sidebarOpen ? "block" : "hidden"
          }`}
        >
          <div
            className="fixed inset-0 bg-black/20"
            onClick={() => setSidebarOpen(false)}
          />
          <div className="fixed inset-y-0 left-0 w-64 bg-white shadow-xl flex flex-col">
            <div className="flex h-16 items-center justify-between px-4 border-b border-gray-200 flex-shrink-0">
              <div className="flex items-center space-x-2">
                <img
                  src="/logo-omaga.png"
                  alt="OMAGA Logo"
                  className="w-8 h-8"
                  style={{ width: "50px", height: "30px", marginTop: "-10px" }}
                />
                <span className="text-xl font-bold bg-gradient-to-r from-blue-900 to-orange-500 bg-clip-text text-transparent">
                  OMAGA
                </span>
              </div>
              <button onClick={() => setSidebarOpen(false)}>
                <X className="w-6 h-6 text-gray-500" />
              </button>
            </div>
            <nav className="flex-1 px-4 py-4 space-y-2 overflow-y-auto">
              {filteredNavigation.map((item) => {
                const Icon = item.icon;
                const isActive = location.pathname === item.href;
                return (
                  <Link
                    key={item.name}
                    to={item.href}
                    onClick={() => setSidebarOpen(false)}
                    className={`flex items-center space-x-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                      isActive
                        ? "bg-blue-900 text-white"
                        : "text-gray-700 hover:bg-green-50 hover:text-green-800"
                    }`}
                  >
                    <Icon className="w-5 h-5" />
                    <span>{item.name}</span>
                  </Link>
                );
              })}
            </nav>
            <div className="border-t border-gray-200 p-4 flex-shrink-0">
              <div className="flex items-center space-x-3 mb-3">
                {user?.profile_picture_url ? (
                  <img
                    src={user.profile_picture_url}
                    alt="Profile"
                    className="w-8 h-8 rounded-full object-cover"
                  />
                ) : (
                  <div className="w-8 h-8 bg-blue-900 rounded-full flex items-center justify-center">
                    <span className="text-white text-sm font-medium">
                      {user?.name?.charAt(0)?.toUpperCase() || "U"}
                    </span>
                  </div>
                )}
                <div>
                  <p className="text-sm font-medium text-gray-900">
                    {user?.name}
                  </p>
                  <p className="text-xs text-gray-500 capitalize">
                    {user?.role}
                  </p>
                </div>
              </div>
              <button
                onClick={handleSignOut}
                className="flex items-center space-x-2 w-full px-3 py-2 text-sm text-red-600 hover:bg-red-50 rounded-lg transition-colors"
              >
                <LogOut className="w-4 h-4" />
                <span>Keluar</span>
              </button>
            </div>
          </div>
        </div>

        {/* Desktop sidebar */}
        <div className="hidden lg:fixed lg:inset-y-0 lg:flex lg:w-64 lg:flex-col">
          <div className="flex flex-col flex-grow bg-white border-r border-gray-200">
            <div className="flex h-16 items-center px-4 border-b border-gray-200 flex-shrink-0">
              <div className="flex items-center space-x-2">
                <img
                  src="/logo-omaga.png"
                  alt="OMAGA Logo"
                  className="w-8 h-8"
                  style={{ width: "50px", height: "30px", marginTop: "-10px" }}
                />
                <span className="text-xl font-bold bg-gradient-to-r from-blue-900 to-orange-500 bg-clip-text text-transparent">
                  OMAGA
                </span>
              </div>
            </div>
            <nav className="flex-1 px-4 py-4 space-y-2 overflow-y-auto">
              {filteredNavigation.map((item) => {
                const Icon = item.icon;
                const isActive = location.pathname === item.href;
                return (
                  <Link
                    key={item.name}
                    to={item.href}
                    className={`flex items-center space-x-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                      isActive
                        ? "bg-blue-900 text-white"
                        : // Menggunakan warna hijau dari desain baru
                          "text-gray-700 hover:bg-green-50 hover:text-green-800"
                    }`}
                  >
                    <Icon className="w-5 h-5" />
                    <span>{item.name}</span>
                  </Link>
                );
              })}
            </nav>
            <div className="border-t border-gray-200 p-4 flex-shrink-0">
              <div className="flex items-center space-x-3 mb-3">
                {user?.profile_picture_url ? (
                  <img
                    src={user.profile_picture_url}
                    alt="Profile"
                    className="w-8 h-8 rounded-full object-cover"
                  />
                ) : (
                  <div className="w-8 h-8 bg-blue-900 rounded-full flex items-center justify-center">
                    <span className="text-white text-sm font-medium">
                      {user?.name?.charAt(0)?.toUpperCase() || "U"}
                    </span>
                  </div>
                )}
                <div>
                  <p className="text-sm font-medium text-gray-900">
                    {user?.name}
                  </p>
                  <p className="text-xs text-gray-500 capitalize">
                    {user?.role}
                  </p>
                </div>
              </div>
              <button
                onClick={handleSignOut}
                className="flex items-center space-x-2 w-full px-3 py-2 text-sm text-red-600 hover:bg-red-50 rounded-lg transition-colors"
              >
                <LogOut className="w-4 h-4" />
                <span>Keluar</span>
              </button>
            </div>
          </div>
        </div>

        {/* Main content */}
        <div className="lg:pl-64 flex flex-col flex-1">
          {/* Top header */}
          <div className="sticky top-0 z-40 bg-white border-b border-gray-200 lg:hidden flex-shrink-0">
            <div className="flex h-16 items-center justify-between px-4">
              <button onClick={() => setSidebarOpen(true)}>
                <Menu className="w-6 h-6 text-gray-500" />
              </button>
              <div className="flex items-center space-x-2">
                {/* geser logo sedikit ke atas */}
                <img
                  src="/logo-omaga.png"
                  alt="OMAGA Logo"
                  className="w-8 h-8"
                  style={{ width: "50px", height: "30px", marginTop: "-10px" }}
                />
                <span className="text-lg font-bold bg-gradient-to-r from-blue-900 to-orange-500 bg-clip-text text-transparent">
                  OMAGA
                </span>
              </div>
              <div className="w-6 h-6" />
            </div>
          </div>

          {/* Page content */}
          <main className="flex-1">{children}</main>

          {/* Footer */}
          <footer className="bg-white text-center p-3 border-t border-gray-200 mt-auto">
            <div className="text-sm text-gray-500 flex flex-col sm:flex-row items-center justify-center gap-1">
              {" "}
              <span>
                © {new Date().getFullYear()} Ojek Mahasiswa (OMAGA) v1.0.0 Beta
                testing
              </span>
              <span className="hidden sm:inline">|</span>
              <span>
                Dibuat dengan ❤ oleh
                <a
                  href="https://www.instagram.com/y_usr1"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="font-medium text-green-600 hover:underline ml-1 inline-flex items-center"
                >
                  M Y
                  <Instagram className="w-4 h-4 ml-1" />
                </a>
              </span>
            </div>
          </footer>

          {/* ========================================================== */}
        </div>
      </div>
    </div>
  );
}
