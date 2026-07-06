import { ReportsPrintPageContent } from "@/lib/pages/reports-print-content";
import { requireRole } from "@/lib/auth";

export default async function TpoReportsPrintPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | undefined>>;
}) {
  const user = await requireRole(["TPO_ADMIN"]);
  return (
    <ReportsPrintPageContent
      role="TPO_ADMIN"
      userId={user.id}
      searchParams={searchParams}
    />
  );
}
