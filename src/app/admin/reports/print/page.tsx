import { ReportsPrintPageContent } from "@/lib/pages/reports-print-content";
import { requireRole } from "@/lib/auth";

export default async function AdminReportsPrintPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | undefined>>;
}) {
  const user = await requireRole(["SUPER_ADMIN"]);
  return (
    <ReportsPrintPageContent
      role="SUPER_ADMIN"
      userId={user.id}
      searchParams={searchParams}
    />
  );
}
