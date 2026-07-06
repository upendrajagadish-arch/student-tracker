import { DashboardPageContent } from "@/lib/pages/dashboard-content";

export default function AdminDashboardPage() {
  return (
    <DashboardPageContent
      title="Admin Dashboard"
      description="Institution-wide placement intelligence and student readiness overview."
      role="SUPER_ADMIN"
    />
  );
}
