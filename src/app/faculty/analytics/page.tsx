import { AnalyticsPageContent } from "@/lib/pages/analytics-content";
import { requireRole } from "@/lib/auth";

export default async function FacultyAnalyticsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | undefined>>;
}) {
  const user = await requireRole(["FACULTY"]);
  return (
    <AnalyticsPageContent
      role="FACULTY"
      userId={user.id}
      searchParams={searchParams}
    />
  );
}
