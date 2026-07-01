"use client";

import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/lib/supabase";
import { useRouter } from "next/navigation";
import { uploadProof } from "@/lib/api";
import { Upload, CheckCircle, AlertCircle, ArrowLeft } from "lucide-react";
import Link from "next/link";

export default function UploadPage() {
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [file, setFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [result, setResult] = useState<{ id: string; status: string } | null>(null);
  const [error, setError] = useState("");
  const [dragOver, setDragOver] = useState(false);
  const router = useRouter();

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!session) { router.push("/login"); return; }
      setUser(session.user);
      setLoading(false);
    });
  }, [router]);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    const f = e.dataTransfer.files[0];
    if (f && f.type === "application/pdf") setFile(f);
    else setError("Only PDF files are accepted");
  }, []);

  async function handleUpload() {
    if (!file || !user) return;
    setUploading(true);
    setError("");
    try {
      const token = (await supabase.auth.getSession()).data.session?.access_token || "";
      const res = await uploadProof(file, user.id, token);
      setResult(res);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setUploading(false);
    }
  }

  if (loading) return <div className="flex min-h-screen items-center justify-center">Loading...</div>;
  if (!user) return null;

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="border-b bg-white px-6 py-4 flex items-center gap-4">
        <Link href="/" className="text-gray-500 hover:text-gray-700"><ArrowLeft size={20} /></Link>
        <h1 className="text-xl font-semibold">Upload Payment Proof</h1>
      </header>

      <main className="mx-auto max-w-lg px-6 py-12">
        {result ? (
          <div className="rounded-lg border bg-white p-8 text-center shadow-sm">
            <CheckCircle size={48} className="mx-auto text-green-500 mb-4" />
            <h2 className="text-lg font-semibold mb-2">Upload Successful</h2>
            <p className="text-sm text-gray-500 mb-4">ID: {result.id}</p>
            <Link href="/proofs" className="text-blue-600 hover:underline text-sm">View all proofs</Link>
          </div>
        ) : (
          <div className="space-y-6">
            <div
              onDrop={handleDrop}
              onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
              onDragLeave={() => setDragOver(false)}
              className={`rounded-lg border-2 border-dashed p-12 text-center cursor-pointer transition-colors ${
                dragOver ? "border-blue-500 bg-blue-50" : "border-gray-300 hover:border-blue-400"
              }`}
            >
              <Upload size={40} className="mx-auto text-gray-400 mb-4" />
              <p className="text-sm text-gray-600 mb-2">Drag & drop a PDF here</p>
              <p className="text-xs text-gray-400">or</p>
              <label className="mt-2 inline-block cursor-pointer rounded bg-blue-600 px-4 py-2 text-sm text-white hover:bg-blue-700">
                Browse Files
                <input type="file" accept=".pdf" className="hidden" onChange={(e) => setFile(e.target.files?.[0] || null)} />
              </label>
              {file && <p className="mt-4 text-sm text-gray-700">Selected: {file.name} ({(file.size / 1024).toFixed(1)} KB)</p>}
            </div>

            {error && (
              <div className="flex items-center gap-2 rounded bg-red-50 p-3 text-sm text-red-600">
                <AlertCircle size={16} /> {error}
              </div>
            )}

            <button
              onClick={handleUpload}
              disabled={!file || uploading}
              className="w-full rounded bg-blue-600 px-4 py-3 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
            >
              {uploading ? "Uploading..." : "Upload & Process"}
            </button>
          </div>
        )}
      </main>
    </div>
  );
}
