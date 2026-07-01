"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { useRouter, useParams } from "next/navigation";
import { fetchProof, syncProofToErp } from "@/lib/api";
import { ArrowLeft, RefreshCw, Database, AlertCircle } from "lucide-react";
import Link from "next/link";
import { formatDate } from "@/lib/utils";

export default function ProofDetailPage() {
  const [user, setUser] = useState<any>(null);
  const [proof, setProof] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const router = useRouter();
  const params = useParams();
  const proofId = params.id as string;

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!session) { router.push("/login"); return; }
      setUser(session.user);
    });
  }, [router]);

  useEffect(() => {
    if (!user || !proofId) return;
    loadProof();
  }, [user, proofId]);

  async function loadProof() {
    setLoading(true);
    try {
      const token = (await supabase.auth.getSession()).data.session?.access_token || "";
      const data = await fetchProof(proofId, token);
      setProof(data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }

  async function handleSync() {
    setSyncing(true);
    try {
      const token = (await supabase.auth.getSession()).data.session?.access_token || "";
      const result = await syncProofToErp(proofId, token);
      setProof((prev: any) => ({ ...prev, erp_status: result.erp_status, erp_receipt_id: result.erp_receipt_id }));
    } catch (err: any) {
      alert(err.message);
    } finally {
      setSyncing(false);
    }
  }

  if (loading) return <div className="flex min-h-screen items-center justify-center">Loading...</div>;
  if (!proof) return <div className="flex min-h-screen items-center justify-center">Not found</div>;

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="border-b bg-white px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link href="/proofs" className="text-gray-500 hover:text-gray-700"><ArrowLeft size={20} /></Link>
          <h1 className="text-xl font-semibold">{proof.file_name}</h1>
        </div>
        <button onClick={loadProof} className="flex items-center gap-1 text-sm text-gray-500 hover:text-blue-600">
          <RefreshCw size={16} /> Refresh
        </button>
      </header>

      <main className="mx-auto max-w-3xl px-6 py-8 space-y-6">
        <div className="rounded-lg border bg-white p-6 shadow-sm">
          <h2 className="text-lg font-semibold mb-4">Details</h2>
          <dl className="grid grid-cols-2 gap-4 text-sm">
            <div><dt className="text-gray-500">Status</dt><dd className="font-medium">{proof.status}</dd></div>
            <div><dt className="text-gray-500">ERP Status</dt><dd className="font-medium">{proof.erp_status}</dd></div>
            <div><dt className="text-gray-500">Source</dt><dd>{proof.source}</dd></div>
            <div><dt className="text-gray-500">File Size</dt><dd>{proof.file_size ? `${(proof.file_size / 1024).toFixed(1)} KB` : "-"}</dd></div>
            <div><dt className="text-gray-500">Created</dt><dd>{formatDate(proof.created_at)}</dd></div>
            <div><dt className="text-gray-500">ERP Receipt ID</dt><dd>{proof.erp_receipt_id || "-"}</dd></div>
          </dl>
          {proof.error_message && (
            <div className="mt-4 flex items-center gap-2 rounded bg-red-50 p-3 text-sm text-red-600">
              <AlertCircle size={16} /> {proof.error_message}
            </div>
          )}
        </div>

        {proof.extracted_data && (
          <div className="rounded-lg border bg-white p-6 shadow-sm">
            <h2 className="text-lg font-semibold mb-4">Extracted Data</h2>
            <dl className="grid grid-cols-2 gap-4 text-sm">
              <div><dt className="text-gray-500">Amount</dt><dd className="font-medium">{proof.extracted_data.amount ?? "-"}</dd></div>
              <div><dt className="text-gray-500">Currency</dt><dd>{proof.extracted_data.currency || "-"}</dd></div>
              <div><dt className="text-gray-500">Payer</dt><dd>{proof.extracted_data.payer_name || "-"}</dd></div>
              <div><dt className="text-gray-500">Email</dt><dd>{proof.extracted_data.payer_email || "-"}</dd></div>
              <div><dt className="text-gray-500">Receipt #</dt><dd>{proof.extracted_data.receipt_number || "-"}</dd></div>
              <div><dt className="text-gray-500">Payment Date</dt><dd>{proof.extracted_data.payment_date || "-"}</dd></div>
            </dl>
          </div>
        )}

        <div className="flex gap-3">
          <button
            onClick={handleSync}
            disabled={syncing || !proof.extracted_data}
            className="flex items-center gap-2 rounded bg-green-600 px-4 py-2 text-sm text-white hover:bg-green-700 disabled:opacity-50"
          >
            <Database size={16} />
            {syncing ? "Syncing..." : "Sync to ERP"}
          </button>
        </div>
      </main>
    </div>
  );
}
