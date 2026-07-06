import { AuditLogsPageContent } from "@/lib/pages/audit-logs-content";

export default function AdminAuditLogsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  return <AuditLogsPageContent searchParams={searchParams} />;
}
