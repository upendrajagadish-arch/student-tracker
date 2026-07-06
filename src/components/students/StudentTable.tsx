"use client";

import { ReadinessBadge } from "@/components/ui/ReadinessBadge";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { Button } from "@/components/ui/Button";
import { PremiumTableWrapper } from "@/components/ui/premium/PremiumTableWrapper";
import { formatScore } from "@/lib/utils";
import type { StudentListItem } from "@/types";
import { ChevronLeft, ChevronRight, Eye, Pencil, Trash2 } from "lucide-react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";

interface StudentTableProps {
  students: StudentListItem[];
  basePath: string;
  page: number;
  totalPages: number;
  canEdit?: boolean;
  canDelete?: boolean;
  onDelete?: (student: StudentListItem) => void;
}

export function StudentTable({
  students,
  basePath,
  page,
  totalPages,
  canEdit = false,
  canDelete = false,
  onDelete,
}: StudentTableProps) {
  const searchParams = useSearchParams();

  function buildPageUrl(newPage: number) {
    const params = new URLSearchParams(searchParams.toString());
    params.set("page", String(newPage));
    return `${basePath}?${params.toString()}`;
  }

  return (
    <div className="space-y-0">
      <PremiumTableWrapper>
        <table className="premium-table w-full min-w-[800px] text-left text-sm">
          <thead>
            <tr>
              <th>Student</th>
              <th>Branch</th>
              <th>Batch</th>
              <th>CGPA</th>
              <th>Technical</th>
              <th>Status</th>
              <th>Placement Readiness</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {students.map((student) => (
              <tr key={student.id}>
                <td>
                  <div>
                    <p className="font-medium text-slate-900">
                      {student.fullName}
                    </p>
                    <p className="text-xs text-slate-500">
                      {student.rollNumber}
                    </p>
                  </div>
                </td>
                <td className="text-slate-600">{student.branch}</td>
                <td className="text-slate-600">{student.batch}</td>
                <td className="text-slate-600">
                  {student.cgpa != null ? formatScore(student.cgpa) : "—"}
                </td>
                <td className="text-slate-600">
                  {formatScore(student.technicalScore)}
                </td>
                <td>
                  <StatusBadge status={student.placementStatus} />
                </td>
                <td>
                  {student.readinessScore > 0 ? (
                    <ReadinessBadge score={student.readinessScore} />
                  ) : (
                    <span className="text-xs text-slate-400">—</span>
                  )}
                </td>
                <td>
                  <div className="flex items-center gap-1">
                    <Link href={`${basePath}/${student.id}`}>
                      <Button variant="ghost" size="sm" aria-label="View">
                        <Eye className="h-4 w-4" />
                      </Button>
                    </Link>
                    {canEdit && (
                      <Link href={`${basePath}/${student.id}/edit`}>
                        <Button variant="ghost" size="sm" aria-label="Edit">
                          <Pencil className="h-4 w-4" />
                        </Button>
                      </Link>
                    )}
                    {canDelete && onDelete && (
                      <Button
                        variant="ghost"
                        size="sm"
                        aria-label="Delete"
                        onClick={() => onDelete(student)}
                        className="text-red-600 hover:bg-red-50 hover:text-red-700"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    )}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </PremiumTableWrapper>

      {totalPages > 1 && (
        <div className="flex items-center justify-between rounded-b-2xl border border-t-0 border-surface-border/80 bg-white/90 px-4 py-3">
          <p className="text-xs text-slate-500">
            Page {page} of {totalPages}
          </p>
          <div className="flex gap-1">
            <Link href={buildPageUrl(page - 1)}>
              <Button variant="secondary" size="sm" disabled={page <= 1}>
                <ChevronLeft className="h-4 w-4" />
                Previous
              </Button>
            </Link>
            <Link href={buildPageUrl(page + 1)}>
              <Button
                variant="secondary"
                size="sm"
                disabled={page >= totalPages}
              >
                Next
                <ChevronRight className="h-4 w-4" />
              </Button>
            </Link>
          </div>
        </div>
      )}
    </div>
  );
}
