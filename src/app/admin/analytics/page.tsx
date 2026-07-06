import { AnalyticsPageContent } from "@/lib/pages/analytics-content";
import { requireRole } from "@/lib/auth";

export default async function AdminAnalyticsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | undefined>>;
}) {
  const user = await requireRole(["SUPER_ADMIN"]);
  return (
    <AnalyticsPageContent
      role="SUPER_ADMIN"
      userId={user.id}
      searchParams={searchParams}
    />
  );
}
