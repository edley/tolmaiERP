const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

export async function uploadProof(file: File, tenantId: string) {
  const form = new FormData();
  form.append("file", file);
  form.append("tenant_id", tenantId);

  const res = await fetch(`${API_URL}/api/upload`, { method: "POST", body: form });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: "Upload failed" }));
    throw new Error(err.detail || "Upload failed");
  }
  return res.json();
}

export async function fetchProofs(status?: string, page = 1) {
  const params = new URLSearchParams({ page: String(page) });
  if (status) params.set("status", status);
  const res = await fetch(`${API_URL}/api/proofs?${params}`);
  if (!res.ok) throw new Error("Failed to fetch proofs");
  return res.json();
}

export async function fetchProof(proofId: string) {
  const res = await fetch(`${API_URL}/api/proofs/${proofId}`);
  if (!res.ok) throw new Error("Failed to fetch proof");
  return res.json();
}

export async function fetchReceipts(status?: string, page = 1) {
  const params = new URLSearchParams({ page: String(page) });
  if (status) params.set("status", status);
  const res = await fetch(`${API_URL}/api/receipts?${params}`);
  if (!res.ok) throw new Error("Failed to fetch receipts");
  return res.json();
}

export async function fetchReceipt(receiptId: string) {
  const res = await fetch(`${API_URL}/api/receipts/${receiptId}`);
  if (!res.ok) throw new Error("Failed to fetch receipt");
  return res.json();
}

export async function syncProofToErp(proofId: string) {
  const res = await fetch(`${API_URL}/api/proofs/${proofId}/sync`, { method: "POST" });
  if (!res.ok) throw new Error("Sync failed");
  return res.json();
}

export async function updateReceipt(receiptId: string, data: Record<string, any>) {
  const res = await fetch(`${API_URL}/api/receipts/${receiptId}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });
  if (!res.ok) throw new Error("Update failed");
  return res.json();
}
