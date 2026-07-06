"use client";

import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { EmptyState } from "@/components/ui/EmptyState";
import { PageHeader } from "@/components/ui/PageHeader";
import { Button } from "@/components/ui/Button";
import { FilterBar } from "@/components/students/FilterBar";
import { StudentTable } from "@/components/students/StudentTable";
import { useToast } from "@/components/ui/Toast";
import type { PaginatedResult, StudentListItem } from "@/types";
import { Download, Plus, Upload, Users } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Suspense, useState } from "react";
import { TableSkeleton } from "@/components/ui/LoadingSkeleton";

interface StudentsPageClientProps {
  result: PaginatedResult<StudentListItem>;
  branches: string[];
  batches: string[];
  basePath: string;
  apiBasePath: string;
  canCreate: boolean;
  canEdit: boolean;
  canDelete: boolean;
  canImport: boolean;
  canExport: boolean;
  exportQueryString?: string;
}

export function StudentsPageClient({
  result,
  branches,
  batches,
  basePath,
  apiBasePath,
  canCreate,
  canEdit,
  canDelete,
  canImport,
  canExport,
  exportQueryString = "",
}: StudentsPageClientProps) {
  const router = useRouter();
  const { toast } = useToast();
  const [deleteTarget, setDeleteTarget] = useState<StudentListItem | null>(
    null
  );
  const [isDeleting, setIsDeleting] = useState(false);
  const [isExporting, setIsExporting] = useState(false);

  async function handleDelete() {
    if (!deleteTarget) return;
    setIsDeleting(true);
    try {
      const res = await fetch(`${apiBasePath}/${deleteTarget.id}`, {
        method: "DELETE",
      });
      if (res.ok) {
        setDeleteTarget(null);
        toast("Student deleted successfully", "success");
        router.refresh();
      } else {
        toast("Failed to delete student", "error");
      }
    } finally {
      setIsDeleting(false);
    }
  }

  async function handleExport() {
    setIsExporting(true);
    try {
      const res = await fetch(
        `/api/students/export${exportQueryString ? `?${exportQueryString}` : ""}`
      );
      if (!res.ok) {
        toast("Export failed", "error");
        return;
      }
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download =
        res.headers.get("Content-Disposition")?.match(/filename="(.+)"/)?.[1] ??
        "students.xlsx";
      a.click();
      URL.revokeObjectURL(url);
      toast("Export downloaded successfully", "success");
    } catch {
      toast("Export failed", "error");
    } finally {
      setIsExporting(false);
    }
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Students"
        description="Manage student profiles, readiness scores, and placement status."
        actions={
          <div className="flex flex-wrap gap-2">
            {canExport && (
              <Button
                variant="secondary"
                onClick={handleExport}
                isLoading={isExporting}
              >
                <Download className="h-4 w-4" />
                Export
              </Button>
            )}
            {canImport && (
              <Link href={`${basePath}/import`}>
                <Button variant="secondary">
                  <Upload className="h-4 w-4" />
                  Import
                </Button>
              </Link>
            )}
            {canCreate && (
              <Link href={`${basePath}/new`}>
                <Button>
                  <Plus className="h-4 w-4" />
                  Add Student
                </Button>
              </Link>
            )}
          </div>
        }
      />

      <Suspense fallback={<div className="h-24 animate-pulse rounded-xl bg-slate-200/70" />}>
        <FilterBar branches={branches} batches={batches} basePath={basePath} />
      </Suspense>

      {result.data.length === 0 ? (
        <EmptyState
          icon={Users}
          title="No students found"
          description="Try adjusting your filters or add a new student to get started."
          action={
            canCreate ? (
              <Link href={`${basePath}/new`}>
                <Button>Add Student</Button>
              </Link>
            ) : undefined
          }
        />
      ) : (
        <>
          <p className="text-sm text-slate-500">
            Showing {result.data.length} of {result.total} students
          </p>
          <Suspense fallback={<TableSkeleton />}>
            <StudentTable
              students={result.data}
              basePath={basePath}
              page={result.page}
              totalPages={result.totalPages}
              canEdit={canEdit}
              canDelete={canDelete}
              onDelete={setDeleteTarget}
            />
          </Suspense>
        </>
      )}

      <ConfirmDialog
        open={!!deleteTarget}
        title="Delete student"
        description={`Are you sure you want to delete ${deleteTarget?.fullName}? This action cannot be undone.`}
        confirmLabel="Delete"
        isLoading={isDeleting}
        onConfirm={handleDelete}
        onCancel={() => setDeleteTarget(null)}
      />
    </div>
  );
}
