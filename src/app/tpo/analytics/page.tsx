import { AnalyticsPageContent } from "@/lib/pages/analytics-content";
import { requireRole } from "@/lib/auth";

export default async function TpoAnalyticsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | undefined>>;
}) {
  const user = await requireRole(["TPO_ADMIN"]);
  return (
    <AnalyticsPageContent
      role="TPO_ADMIN"
      userId={user.id}
      searchParams={searchParams}
    />
  );
}
