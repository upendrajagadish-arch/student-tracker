import { AuditLogsTable } from "@/components/admin/AuditLogsTable";
import { AuditLogsEmptyState } from "@/components/admin/AuditLogsEmptyState";
import { PageHeader } from "@/components/ui/PageHeader";
import { getAuditLogs } from "@/lib/services/audit";

export async function AuditLogsPageContent({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const params = await searchParams;
  const page = Number(params.page) || 1;

  const result = await getAuditLogs({ page, pageSize: 25 });

  return (
    <div className="space-y-6">
      <PageHeader
        title="Audit Logs"
        description="Track important actions across the placement system."
      />

      {result.data.length === 0 ? (
        <AuditLogsEmptyState />
      ) : (
        <>
          <p className="text-sm text-slate-500">
            Showing {result.data.length} of {result.total} log entries
          </p>
          <AuditLogsTable
            logs={result.data.map((log) => ({
              ...log,
              createdAt: log.createdAt.toISOString(),
            }))}
            page={result.page}
            totalPages={result.totalPages}
            basePath="/admin/audit-logs"
          />
        </>
      )}
    </div>
  );
}
