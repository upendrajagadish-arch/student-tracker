import { ReportsPrintPageContent } from "@/lib/pages/reports-print-content";
import { requireRole } from "@/lib/auth";

export default async function FacultyReportsPrintPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | undefined>>;
}) {
  const user = await requireRole(["FACULTY"]);
  return (
    <ReportsPrintPageContent
      role="FACULTY"
      userId={user.id}
      searchParams={searchParams}
    />
  );
}
