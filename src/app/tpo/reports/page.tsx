import { ReportsPageContent } from "@/lib/pages/reports-content";
import { requireRole } from "@/lib/auth";

export default async function TpoReportsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | undefined>>;
}) {
  const user = await requireRole(["TPO_ADMIN"]);
  return (
    <ReportsPageContent
      role="TPO_ADMIN"
      userId={user.id}
      searchParams={searchParams}
    />
  );
}
