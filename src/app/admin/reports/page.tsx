import { ReportsPageContent } from "@/lib/pages/reports-content";
import { requireRole } from "@/lib/auth";

export default async function AdminReportsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | undefined>>;
}) {
  const user = await requireRole(["SUPER_ADMIN"]);
  return (
    <ReportsPageContent
      role="SUPER_ADMIN"
      userId={user.id}
      searchParams={searchParams}
    />
  );
}
