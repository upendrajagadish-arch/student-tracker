import { Suspense } from "react";
import { StudentsPageClient } from "@/components/students/StudentsPageClient";
import {
  canExportStudents,
  canImportStudents,
  canManageStudents,
  hasPermission,
} from "@/lib/permissions";
import {
  getDistinctBatches,
  getDistinctBranches,
  getStudents,
} from "@/lib/services/students";
import type { PlacementStatus, UserRole } from "@/types";

interface StudentsListParams {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}

export async function StudentsListPageContent({
  role,
  basePath,
  apiBasePath,
  searchParams,
}: {
  role: UserRole;
  basePath: string;
  apiBasePath: string;
  searchParams: StudentsListParams["searchParams"];
}) {
  const params = await searchParams;
  const search = typeof params.search === "string" ? params.search : undefined;
  const branch = typeof params.branch === "string" ? params.branch : undefined;
  const batch = typeof params.batch === "string" ? params.batch : undefined;
  const placementStatus =
    typeof params.placementStatus === "string"
      ? (params.placementStatus as PlacementStatus)
      : undefined;
  const page = Number(params.page) || 1;

  const [result, branches, batches] = await Promise.all([
    getStudents({ search, branch, batch, placementStatus, page }),
    getDistinctBranches(),
    getDistinctBatches(),
  ]);

  const allBranches = [...new Set([...branches, ...getDefaultBranches()])].sort();
  const allBatches = [...new Set([...batches, ...getDefaultBatches()])].sort().reverse();

  const exportParams = new URLSearchParams();
  if (search) exportParams.set("search", search);
  if (branch) exportParams.set("branch", branch);
  if (batch) exportParams.set("batch", batch);
  if (placementStatus) exportParams.set("placementStatus", placementStatus);

  return (
    <Suspense fallback={<div className="h-96 animate-pulse rounded-xl bg-slate-200/70" />}>
      <StudentsPageClient
        result={result}
        branches={allBranches}
        batches={allBatches}
        basePath={basePath}
        apiBasePath={apiBasePath}
        canCreate={canManageStudents(role)}
        canEdit={hasPermission(role, "students:edit") || hasPermission(role, "students:update_scores")}
        canDelete={hasPermission(role, "students:delete")}
        canImport={canImportStudents(role)}
        canExport={canExportStudents(role)}
        exportQueryString={exportParams.toString()}
      />
    </Suspense>
  );
}

function getDefaultBranches() {
  return [
    "Computer Science",
    "Information Technology",
    "Electronics",
    "Electrical",
    "Mechanical",
    "Civil",
    "Data Science",
    "AI & ML",
  ];
}

function getDefaultBatches() {
  return ["2022-2026", "2023-2027", "2024-2028", "2025-2029"];
}
