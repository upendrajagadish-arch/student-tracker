import { ReportsPageContent } from "@/lib/pages/reports-content";
import { requireRole } from "@/lib/auth";

export default async function FacultyReportsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | undefined>>;
}) {
  const user = await requireRole(["FACULTY"]);
  return (
    <ReportsPageContent
      role="FACULTY"
      userId={user.id}
      searchParams={searchParams}
    />
  );
}
