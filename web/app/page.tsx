"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { useRouter } from "next/navigation";
import { Upload, FileText, Receipt, LogOut, Eye, RefreshCw, ExternalLink, DollarSign, User, Hash, Calendar, Building2, CheckCircle, AlertCircle, UploadCloud } from "lucide-react";
import Link from "next/link";

const TABS = ["Dashboard", "Proofs", "Receipts"] as const;
type Tab = typeof TABS[number];

export default function HomePage() {
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<Tab>("Dashboard");
  const router = useRouter();

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!session) { router.push("/login"); return; }
      setUser(session.user);
      setLoading(false);
    });
  }, [router]);

  async function handleLogout() {
    await supabase.auth.signOut();
    router.push("/login");
  }

  if (loading) return <div className="flex min-h-screen items-center justify-center">Loading...</div>;
  if (!user) return null;

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="border-b bg-white px-6 py-3 flex items-center justify-between sticky top-0 z-10">
        <h1 className="text-lg font-semibold">tolmaiERP</h1>
        <div className="flex items-center gap-3">
          <span className="text-xs text-gray-500">{user.email}</span>
          <button onClick={handleLogout} className="flex items-center gap-1 text-xs text-gray-500 hover:text-red-600">
            <LogOut size={14} /> Sign Out
          </button>
        </div>
      </header>

      <div className="border-b bg-white px-6 flex">
        {TABS.map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`px-5 py-3 text-sm font-medium border-b-2 transition-colors ${
              tab === t
                ? "border-blue-600 text-blue-600"
                : "border-transparent text-gray-500 hover:text-gray-700"
            }`}
          >
            {t === "Dashboard" && <Upload size={14} className="inline mr-1.5" />}
            {t === "Proofs" && <FileText size={14} className="inline mr-1.5" />}
            {t === "Receipts" && <Receipt size={14} className="inline mr-1.5" />}
            {t}
          </button>
        ))}
      </div>

      <main className="mx-auto max-w-6xl px-6 py-6">
        {tab === "Dashboard" && <DashboardTab user={user} />}
        {tab === "Proofs" && <ProofsTab />}
        {tab === "Receipts" && <ReceiptsTab />}
      </main>
    </div>
  );
}

function DashboardTab({ user }: { user: any }) {
  return (
    <div className="space-y-6">
      <h2 className="text-xl font-bold">Dashboard</h2>
      <div className="grid gap-5 sm:grid-cols-3">
        <Link href="/upload" className="flex items-center gap-4 rounded-lg border bg-white p-6 shadow-sm hover:shadow-md transition-shadow">
          <UploadCloud size={36} className="text-blue-600" />
          <div>
            <div className="text-lg font-medium">Upload Proof</div>
            <div className="text-sm text-gray-500">Upload a payment PDF</div>
          </div>
        </Link>
        <div className="flex items-center gap-4 rounded-lg border bg-white p-6 shadow-sm">
          <Eye size={36} className="text-green-600" />
          <div>
            <div className="text-lg font-medium">View Proofs</div>
            <div className="text-sm text-gray-500">Go to Proofs tab</div>
          </div>
        </div>
        <div className="flex items-center gap-4 rounded-lg border bg-white p-6 shadow-sm">
          <Receipt size={36} className="text-purple-600" />
          <div>
            <div className="text-lg font-medium">View Receipts</div>
            <div className="text-sm text-gray-500">Go to Receipts tab</div>
          </div>
        </div>
      </div>
    </div>
  );
}

function ProofsTab() {
  const [proofs, setProofs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState("");

  useEffect(() => { loadProofs(); }, [statusFilter]);

  async function loadProofs() {
    setLoading(true);
    try {
      const params = new URLSearchParams({ page: "1" });
      if (statusFilter) params.set("status", statusFilter);
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000"}/api/proofs?${params}`);
      const data = await res.json();
      setProofs(data.items || []);
    } catch (e) { console.error(e); } finally { setLoading(false); }
  }

  const statusColors: Record<string, string> = {
    pending: "bg-yellow-100 text-yellow-800", processing: "bg-blue-100 text-blue-800",
    completed: "bg-green-100 text-green-800", failed: "bg-red-100 text-red-800",
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-xl font-bold">Proofs</h2>
        <button onClick={loadProofs} className="flex items-center gap-1 text-sm text-gray-500 hover:text-blue-600"><RefreshCw size={14} /> Refresh</button>
      </div>
      <div className="mb-4 flex gap-2 flex-wrap">
        {["", "pending", "completed", "failed"].map((s) => (
          <button key={s} onClick={() => setStatusFilter(s)}
            className={`rounded-full px-3 py-1 text-xs ${statusFilter === s ? "bg-blue-600 text-white" : "bg-white border text-gray-600 hover:bg-gray-50"}`}>
            {s || "All"}
          </button>
        ))}
      </div>
      {loading ? <div className="text-center py-8 text-gray-500 text-sm">Loading...</div>
      : proofs.length === 0 ? <div className="text-center py-8 text-gray-500 text-sm">No proofs found.</div>
      : <div className="overflow-hidden rounded-lg border bg-white shadow-sm">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b">
              <tr><th className="px-3 py-2 text-left font-medium text-gray-600">File</th><th className="px-3 py-2 text-left font-medium text-gray-600">Status</th><th className="px-3 py-2 text-left font-medium text-gray-600">ERP</th><th className="px-3 py-2 text-left font-medium text-gray-600">Date</th><th className="px-3 py-2"></th></tr>
            </thead>
            <tbody className="divide-y">
              {proofs.map((p) => (
                <tr key={p.id} className="hover:bg-gray-50">
                  <td className="px-3 py-2 font-medium">{p.file_name}</td>
                  <td className="px-3 py-2"><span className={`inline-block rounded-full px-2 py-0.5 text-xs font-medium ${statusColors[p.status] || ""}`}>{p.status}</span></td>
                  <td className="px-3 py-2"><span className={`inline-block rounded-full px-2 py-0.5 text-xs font-medium ${p.erp_status === "synced" ? "bg-green-100 text-green-800" : p.erp_status === "failed" ? "bg-red-100 text-red-800" : "bg-gray-100 text-gray-600"}`}>{p.erp_status}</span></td>
                  <td className="px-3 py-2 text-gray-500 text-xs">{p.created_at ? new Date(p.created_at).toLocaleString() : "-"}</td>
                  <td className="px-3 py-2"><Link href={`/proofs/${p.id}`} className="text-blue-600 hover:text-blue-800"><ExternalLink size={14} /></Link></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      }
    </div>
  );
}

function ReceiptsTab() {
  const [receipts, setReceipts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState("");

  useEffect(() => { loadReceipts(); }, [statusFilter]);

  async function loadReceipts() {
    setLoading(true);
    try {
      const params = new URLSearchParams({ page: "1" });
      if (statusFilter) params.set("status", statusFilter);
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000"}/api/receipts?${params}`);
      const data = await res.json();
      setReceipts(data.items || []);
    } catch (e) { console.error(e); } finally { setLoading(false); }
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-xl font-bold">Receipts</h2>
        <button onClick={loadReceipts} className="flex items-center gap-1 text-sm text-gray-500 hover:text-blue-600"><RefreshCw size={14} /> Refresh</button>
      </div>
      <div className="mb-4 flex gap-2 flex-wrap">
        {["", "extracted", "synced", "failed"].map((s) => (
          <button key={s} onClick={() => setStatusFilter(s)}
            className={`rounded-full px-3 py-1 text-xs ${statusFilter === s ? "bg-blue-600 text-white" : "bg-white border text-gray-600 hover:bg-gray-50"}`}>
            {s || "All"}
          </button>
        ))}
      </div>
      {loading ? <div className="text-center py-8 text-gray-500 text-sm">Loading...</div>
      : receipts.length === 0 ? <div className="text-center py-8 text-gray-500 text-sm">No receipts found.</div>
      : <div className="space-y-3">
          {receipts.map((r) => (
            <div key={r.id} className="rounded-lg border bg-white p-4 shadow-sm hover:shadow-md transition-shadow">
              <div className="flex items-start justify-between">
                <div className="space-y-1.5 flex-1 min-w-0">
                  <div className="flex items-center gap-3 text-xs">
                    {r.receipt_number && <span className="flex items-center gap-1 text-gray-600"><Hash size={12} /> {r.receipt_number}</span>}
                    <span className={`inline-block rounded-full px-2 py-0.5 text-xs font-medium ${r.status === "extracted" ? "bg-yellow-100 text-yellow-800" : r.status === "synced" ? "bg-green-100 text-green-800" : "bg-red-100 text-red-800"}`}>{r.status}</span>
                  </div>
                  <div className="flex flex-wrap gap-x-4 gap-y-1 text-sm">
                    {r.amount && <span className="flex items-center gap-1 font-semibold"><DollarSign size={14} className="text-green-600" /> {r.amount.toFixed(2)} {r.currency}</span>}
                    {r.payer_name && <span className="flex items-center gap-1 text-gray-600"><User size={13} /> {r.payer_name}</span>}
                    {r.bank_issuer && <span className="flex items-center gap-1 text-gray-600"><Building2 size={13} /> {r.bank_issuer}</span>}
                    {r.description && <span className="flex items-center gap-1 text-gray-600 truncate max-w-[200px]"><Receipt size={13} /> {r.description}</span>}
                    {r.payment_date && <span className="flex items-center gap-1 text-gray-600"><Calendar size={13} /> {r.payment_date}</span>}
                  </div>
                  <div className="text-xs text-gray-400">{r.created_at ? new Date(r.created_at).toLocaleString() : ""}</div>
                </div>
                <Link href={`/receipts/${r.id}`} className="text-blue-600 hover:text-blue-800 ml-3 shrink-0"><ExternalLink size={14} /></Link>
              </div>
            </div>
          ))}
        </div>
      }
    </div>
  );
}
