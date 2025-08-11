import React from "react";
import { useAuth } from "../contexts/AuthContext";
import { AlertTriangle } from "lucide-react";

interface ProtectedRouteProps {
  children: React.ReactNode;
  allowedRoles: string[];
  fallbackMessage?: string;
}

export default function ProtectedRoute({
  children,
  allowedRoles,
  fallbackMessage = "Anda tidak memiliki akses ke halaman ini.",
}: ProtectedRouteProps) {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-900"></div>
      </div>
    );
  }

  if (!user || !allowedRoles.includes(user.role)) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="max-w-md w-full bg-white rounded-lg shadow-lg p-6 text-center">
          <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <AlertTriangle className="w-8 h-8 text-red-600" />
          </div>
          <h2 className="text-xl font-semibold text-gray-900 mb-2">
            Akses Ditolak
          </h2>
          <p className="text-gray-600 mb-4">{fallbackMessage}</p>
          <p className="text-sm text-gray-500">
            Role Anda:{" "}
            <span className="font-medium capitalize">
              {user?.role || "Tidak diketahui"}
            </span>
          </p>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}
