import Sidebar from "@/components/dashboard/sidebar";
import { DashboardShell } from "@/components/dashboard/dashboard-shell";
import { AuthGuard } from "@/components/auth/auth-guard";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <AuthGuard>
      <div className="flex">
        <Sidebar />
        <DashboardShell>{children}</DashboardShell>
      </div>
    </AuthGuard>
  );
}
