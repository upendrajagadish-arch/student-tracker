import { HrDashboardContent } from "@/components/hr/HrDashboardContent";
import { PageHeader } from "@/components/ui/PageHeader";
import { Button } from "@/components/ui/Button";
import { requireRole } from "@/lib/auth";
import { getHrDashboardStats } from "@/lib/services/student-sharing";
import Link from "next/link";

export default async function HrDashboardPage() {
  const user = await requireRole(["HR"]);
  const stats = await getHrDashboardStats(user.id);

  return (
    <div className="space-y-8">
      <PageHeader
        title="HR Dashboard"
        description="Your talent pipeline from the placement office."
        actions={
          <Link href="/hr/talent-room">
            <Button>Open Talent Room</Button>
          </Link>
        }
      />

      <HrDashboardContent stats={stats} />
    </div>
  );
}
