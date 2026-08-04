import { requireAdmin } from "@/lib/session";
import { AppHeader } from "@/components/AppHeader";
import { AdminNav } from "@/components/AdminNav";

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const admin = await requireAdmin();

  return (
    <div className="min-h-dvh">
      <AppHeader nombre={admin.name ?? "Administrador"} rol={admin.role} />
      <div className="border-b border-slate-200 bg-white">
        <AdminNav />
      </div>
      <main className="mx-auto max-w-6xl px-4 py-8 sm:px-6">{children}</main>
    </div>
  );
}
