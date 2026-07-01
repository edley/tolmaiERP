"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { useRouter } from "next/navigation";
import { fetchProofs } from "@/lib/api";
import { ArrowLeft, RefreshCw, ExternalLink } from "lucide-react";
import Link from "next/link";
import { formatFileSize, formatDate } from "@/lib/utils";

interface Proof {
  id: string;
  file_name: string;
  file_size: number;
  source: string;
  status: string;
  erp_status: string;
  created_at: string;
  error_message?: string;
}

export default function ProofsPage() {
  const [user, setUser] = useState<any>(null);
  const [proofs, setProofs] = useState<Proof[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState("");
  const router = useRouter();

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!session) { router.push("/login"); return; }
      setUser(session.user);
    });
  }, [router]);

  useEffect(() => {
    if (!user) return;
    loadProofs();
  }, [user, statusFilter]);

  async function loadProofs() {
    setLoading(true);
    try {
      const data = await fetchProofs(statusFilter || undefined);
      setProofs(data.items);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }

  if (!user) return null;

  const statusColors: Record<string, string> = {
    pending: "bg-yellow-100 text-yellow-800",
    processing: "bg-blue-100 text-blue-800",
    completed: "bg-green-100 text-green-800",
    failed: "bg-red-100 text-red-800",
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="border-b bg-white px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link href="/" className="text-gray-500 hover:text-gray-700"><ArrowLeft size={20} /></Link>
          <h1 className="text-xl font-semibold">Payment Proofs</h1>
        </div>
        <button onClick={loadProofs} className="flex items-center gap-1 text-sm text-gray-500 hover:text-blue-600">
          <RefreshCw size={16} /> Refresh
        </button>
      </header>

      <main className="mx-auto max-w-5xl px-6 py-8">
        <div className="mb-4 flex gap-2">
          {["", "pending", "completed", "failed"].map((s) => (
            <button
              key={s}
              onClick={() => setStatusFilter(s)}
              className={`rounded-full px-4 py-1 text-sm ${
                statusFilter === s ? "bg-blue-600 text-white" : "bg-white border text-gray-600 hover:bg-gray-50"
              }`}
            >
              {s || "All"}
            </button>
          ))}
        </div>

        {loading ? (
          <div className="text-center py-12 text-gray-500">Loading...</div>
        ) : proofs.length === 0 ? (
          <div className="text-center py-12 text-gray-500">No proofs found. Upload one first.</div>
        ) : (
          <div className="overflow-hidden rounded-lg border bg-white shadow-sm">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 border-b">
                <tr>
                  <th className="px-4 py-3 text-left font-medium text-gray-600">File</th>
                  <th className="px-4 py-3 text-left font-medium text-gray-600">Size</th>
                  <th className="px-4 py-3 text-left font-medium text-gray-600">Status</th>
                  <th className="px-4 py-3 text-left font-medium text-gray-600">ERP</th>
                  <th className="px-4 py-3 text-left font-medium text-gray-600">Date</th>
                  <th className="px-4 py-3"></th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {proofs.map((p) => (
                  <tr key={p.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3 font-medium">{p.file_name}</td>
                    <td className="px-4 py-3 text-gray-500">{p.file_size ? formatFileSize(p.file_size) : "-"}</td>
                    <td className="px-4 py-3">
                      <span className={`inline-block rounded-full px-2 py-0.5 text-xs font-medium ${statusColors[p.status] || ""}`}>
                        {p.status}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <span className={`inline-block rounded-full px-2 py-0.5 text-xs font-medium ${
                        p.erp_status === "synced" ? "bg-green-100 text-green-800" :
                        p.erp_status === "failed" ? "bg-red-100 text-red-800" :
                        "bg-gray-100 text-gray-600"
                      }`}>
                        {p.erp_status}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-gray-500">{formatDate(p.created_at)}</td>
                    <td className="px-4 py-3">
                      <Link href={`/proofs/${p.id}`} className="text-blue-600 hover:text-blue-800">
                        <ExternalLink size={16} />
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </main>
    </div>
  );
}
