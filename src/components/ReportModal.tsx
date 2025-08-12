// src/components/ReportModal.tsx

import { useState } from "react";
import { supabase, type Order } from "../lib/supabase";
import { Send, X } from "lucide-react";

interface ReportModalProps {
  order: Order;
  onClose: () => void;
  onSuccess: () => void;
}

export default function ReportModal({
  order,
  onClose,
  onSuccess,
}: ReportModalProps) {
  const [reportMessage, setReportMessage] = useState("");
  const [isAnonymous, setIsAnonymous] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    if (!reportMessage.trim()) {
      setError("Laporan tidak boleh kosong.");
      return;
    }
    setLoading(true);

    try {
      const { error: insertError } = await supabase.from("reports").insert({
        order_id: order.id,
        user_id: order.user_id,
        report_message: reportMessage,
        is_anonymous: isAnonymous,
      });

      if (insertError) throw insertError;

      onSuccess(); // Panggil onSuccess untuk menutup modal dan refresh data
    } catch (err: any) {
      setError("Gagal mengirim laporan: " + err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-60 backdrop-blur-sm">
      <div className="relative w-full max-w-md p-6 bg-white rounded-lg shadow-xl">
        <div className="flex items-start justify-between mb-4">
          <h2 className="text-xl font-bold text-gray-900">
            Buat Laporan Perjalanan
          </h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600"
          >
            <X size={24} />
          </button>
        </div>
        <form onSubmit={handleSubmit}>
          <div className="mb-4">
            <label
              htmlFor="reportMessage"
              className="block mb-2 text-sm font-medium text-gray-700"
            >
              Detail Laporan
            </label>
            <textarea
              id="reportMessage"
              className="w-full p-3 border border-gray-300 rounded-lg focus:ring-blue-500 focus:border-blue-500"
              rows={5}
              placeholder="Tuliskan detail kejadian atau masalah yang ingin Anda laporkan..."
              value={reportMessage}
              onChange={(e) => setReportMessage(e.target.value)}
              required
            />
          </div>
          <div className="flex items-center my-4">
            <input
              type="checkbox"
              id="anonymous"
              checked={isAnonymous}
              onChange={(e) => setIsAnonymous(e.target.checked)}
              className="w-4 h-4 text-blue-600 bg-gray-100 border-gray-300 rounded focus:ring-blue-500"
            />
            <label htmlFor="anonymous" className="ml-2 text-sm text-gray-600">
              Kirim sebagai anonim (nama Anda tidak akan ditampilkan ke admin)
            </label>
          </div>
          {error && <p className="text-sm text-red-600 mb-4">{error}</p>}
          <div className="flex justify-end gap-3">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 border border-gray-300 rounded-lg hover:bg-gray-200"
            >
              Batal
            </button>
            <button
              type="submit"
              disabled={loading}
              className="inline-flex items-center px-4 py-2 text-sm font-medium text-white bg-blue-600 border border-transparent rounded-lg shadow-sm hover:bg-blue-700 disabled:opacity-50"
            >
              <Send size={16} className="mr-2" />
              {loading ? "Mengirim..." : "Kirim Laporan"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
