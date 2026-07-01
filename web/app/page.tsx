"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { useRouter } from "next/navigation";
import { Upload, FileText, Receipt, LogOut } from "lucide-react";
import Link from "next/link";

export default function Dashboard() {
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!session) {
        router.push("/login");
      } else {
        setUser(session.user);
      }
      setLoading(false);
    });
  }, [router]);

  async function handleLogout() {
    await supabase.auth.signOut();
    router.push("/login");
  }

  if (loading) return <div className="flex min-h-screen items-center justify-center">Loading...</div>;
  if (!user) return null;

  const stats = [
    { label: "Upload Proof", icon: Upload, href: "/upload", color: "text-blue-600" },
      { label: "View Proofs", icon: FileText, href: "/proofs", color: "text-green-600" },
      { label: "View Receipts", icon: Receipt, href: "/receipts", color: "text-purple-600" },
  ];

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="border-b bg-white px-6 py-4 flex items-center justify-between">
        <h1 className="text-xl font-semibold">Payment Proofs</h1>
        <div className="flex items-center gap-4">
          <span className="text-sm text-gray-500">{user.email}</span>
          <button onClick={handleLogout} className="flex items-center gap-1 text-sm text-gray-500 hover:text-red-600">
            <LogOut size={16} /> Sign Out
          </button>
        </div>
      </header>

      <main className="mx-auto max-w-4xl px-6 py-12">
        <h2 className="text-2xl font-bold mb-8">Dashboard</h2>
        <div className="grid gap-6 sm:grid-cols-2">
          {stats.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="flex items-center gap-4 rounded-lg border bg-white p-6 shadow-sm hover:shadow-md transition-shadow"
            >
              <item.icon size={32} className={item.color} />
              <span className="text-lg font-medium">{item.label}</span>
            </Link>
          ))}
        </div>
      </main>
    </div>
  );
}
