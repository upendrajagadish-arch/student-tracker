"use client";

import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { PageHeader } from "@/components/ui/PageHeader";
import { Button } from "@/components/ui/Button";
import { useToast } from "@/components/ui/Toast";
import type { ImportSummary, PreviewImportRow } from "@/types/import";
import { cn } from "@/lib/utils";
import { LARGE_IMPORT_JOB_THRESHOLD } from "@/lib/job-constants";
import { parseApiErrorMessage } from "@/lib/api-errors";
import {
  AlertTriangle,
  ArrowLeft,
  CheckCircle2,
  FileSpreadsheet,
  Upload,
  XCircle,
} from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useRef, useState } from "react";
import { JobProgressPanel } from "@/components/jobs/JobProgressPanel";

interface StudentImportClientProps {
  basePath: string;
  jobsBasePath: string;
}

export function StudentImportClient({ basePath, jobsBasePath }: StudentImportClientProps) {
  const router = useRouter();
  const { toast } = useToast();
  const fileRef = useRef<HTMLInputElement>(null);

  const [file, setFile] = useState<File | null>(null);
  const [updateMode, setUpdateMode] = useState(false);
  const [isParsing, setIsParsing] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [summary, setSummary] = useState<ImportSummary | null>(null);
  const [rows, setRows] = useState<PreviewImportRow[]>([]);
  const [activeJobId, setActiveJobId] = useState<string | null>(null);

  async function handlePreview(selectedFile?: File) {
    const target = selectedFile ?? file;
    if (!target) return;

    setError(null);
    setIsParsing(true);

    try {
      const formData = new FormData();
      formData.append("file", target);
      formData.append("updateMode", String(updateMode));

      const res = await fetch("/api/students/import/preview", {
        method: "POST",
        body: formData,
      });

      const data = await res.json();
      if (!res.ok) {
        setError(parseApiErrorMessage(data, "Failed to parse file"));
        setSummary(null);
        setRows([]);
        return;
      }

      setSummary(data.summary);
      setRows(data.rows);
    } catch {
      setError("Failed to upload file. Please try again.");
    } finally {
      setIsParsing(false);
    }
  }

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const selected = e.target.files?.[0];
    if (!selected) return;
    setFile(selected);
    handlePreview(selected);
  }

  async function handleImport() {
    const importable = rows.filter(
      (r) =>
        r.status === "valid" || (updateMode && r.status === "update")
    );

    if (importable.length === 0) {
      toast("No valid rows to import", "error");
      return;
    }

    setIsImporting(true);
    try {
      const res = await fetch("/api/students/import/confirm", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          updateMode,
          rows: importable.map((r) => r.data ?? r.raw),
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        toast(parseApiErrorMessage(data, "Import failed"), "error");
        return;
      }

      if (data.jobId) {
        setActiveJobId(data.jobId);
        toast(data.message ?? "Import job started", "success");
        setShowConfirm(false);
        return;
      }

      toast(
        `Import complete: ${data.created} created, ${data.updated} updated`,
        "success"
      );
      router.push(basePath);
      router.refresh();
    } catch {
      toast("Import failed. Please try again.", "error");
    } finally {
      setIsImporting(false);
      setShowConfirm(false);
    }
  }

  const importableCount =
    (summary?.valid ?? 0) + (updateMode ? summary?.update ?? 0 : 0);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Import Students"
        description="Upload a CSV or Excel file to bulk add student records. Preview and validate before saving."
        actions={
          <Link href={basePath}>
            <Button variant="secondary">
              <ArrowLeft className="h-4 w-4" />
              Back to list
            </Button>
          </Link>
        }
      />

      <div className="rounded-xl border border-surface-border bg-white p-6 shadow-card">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div className="space-y-2">
            <p className="text-sm font-medium text-slate-900">Upload file</p>
            <p className="text-xs text-slate-500">
              Supported: .csv, .xlsx · Max 5,000 rows · Imports of{" "}
              {LARGE_IMPORT_JOB_THRESHOLD}+ rows run as background jobs
            </p>
            <input
              ref={fileRef}
              type="file"
              accept=".csv,.xlsx,.xls"
              className="hidden"
              onChange={handleFileChange}
            />
            <Button
              variant="secondary"
              onClick={() => fileRef.current?.click()}
              isLoading={isParsing}
            >
              <Upload className="h-4 w-4" />
              {file ? file.name : "Choose file"}
            </Button>
          </div>

          <label className="flex cursor-pointer items-center gap-2 text-sm text-slate-700">
            <input
              type="checkbox"
              checked={updateMode}
              onChange={(e) => {
                setUpdateMode(e.target.checked);
                if (file) handlePreview(file);
              }}
              className="h-4 w-4 rounded border-surface-border text-brand-600 focus:ring-brand-500"
            />
            Update existing students by roll number
          </label>
        </div>

        {error && (
          <div className="mt-4 flex items-start gap-2 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            <XCircle className="mt-0.5 h-4 w-4 shrink-0" />
            {error}
          </div>
        )}
      </div>

      {summary && (
        <div className="grid gap-4 sm:grid-cols-5">
          <SummaryCard label="Total rows" value={summary.total} />
          <SummaryCard
            label="Valid"
            value={summary.valid}
            className="text-emerald-700"
          />
          <SummaryCard
            label="Updates"
            value={summary.update}
            className="text-blue-700"
          />
          <SummaryCard
            label="Duplicates"
            value={summary.duplicate}
            className="text-amber-700"
          />
          <SummaryCard
            label="Invalid"
            value={summary.invalid}
            className="text-red-700"
          />
        </div>
      )}

      {rows.length > 0 && (
        <div className="overflow-hidden rounded-xl border border-surface-border bg-white shadow-card">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[900px] text-left text-sm">
              <thead>
                <tr className="border-b border-surface-border bg-slate-50/80">
                  <th className="px-4 py-3 font-medium text-slate-600">Row</th>
                  <th className="px-4 py-3 font-medium text-slate-600">Name</th>
                  <th className="px-4 py-3 font-medium text-slate-600">
                    Roll No
                  </th>
                  <th className="px-4 py-3 font-medium text-slate-600">
                    Email
                  </th>
                  <th className="px-4 py-3 font-medium text-slate-600">
                    Branch
                  </th>
                  <th className="px-4 py-3 font-medium text-slate-600">
                    Status
                  </th>
                  <th className="px-4 py-3 font-medium text-slate-600">
                    Issues
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-surface-border">
                {rows.map((row) => (
                  <tr key={row.rowNumber} className="hover:bg-slate-50/50">
                    <td className="px-4 py-3 text-slate-500">{row.rowNumber}</td>
                    <td className="px-4 py-3 font-medium text-slate-900">
                      {row.data?.fullName ?? row.raw.fullName ?? "—"}
                    </td>
                    <td className="px-4 py-3 text-slate-600">
                      {row.data?.rollNumber ?? row.raw.rollNumber ?? "—"}
                    </td>
                    <td className="px-4 py-3 text-slate-600">
                      {row.data?.email ?? row.raw.email ?? "—"}
                    </td>
                    <td className="px-4 py-3 text-slate-600">
                      {row.data?.branch ?? row.raw.branch ?? "—"}
                    </td>
                    <td className="px-4 py-3">
                      <StatusPill status={row.status} />
                    </td>
                    <td className="px-4 py-3 text-xs text-red-600">
                      {row.errors.length > 0
                        ? row.errors.join("; ")
                        : row.duplicateReason ?? "—"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {rows.length === 0 && !isParsing && !error && (
        <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-surface-border bg-white py-16 text-center">
          <FileSpreadsheet className="mb-3 h-10 w-10 text-slate-400" />
          <p className="text-sm font-medium text-slate-900">
            Upload a file to preview import
          </p>
          <p className="mt-1 max-w-md text-xs text-slate-500">
            Required columns: fullName, rollNumber, email, branch, batch,
            graduationYear
          </p>
        </div>
      )}

      {importableCount > 0 && (
        <div className="flex justify-end">
          <Button onClick={() => setShowConfirm(true)}>
            Import {importableCount} student{importableCount !== 1 ? "s" : ""}
          </Button>
        </div>
      )}

      <ConfirmDialog
        open={showConfirm}
        title="Confirm import"
        description={`This will import ${importableCount} student record${importableCount !== 1 ? "s" : ""}. Invalid and duplicate rows will be skipped.${updateMode ? " Existing roll numbers will be updated." : ""}`}
        confirmLabel="Import"
        variant="primary"
        isLoading={isImporting}
        onConfirm={handleImport}
        onCancel={() => setShowConfirm(false)}
      />

      {activeJobId && (
        <JobProgressPanel
          jobId={activeJobId}
          jobsBasePath={jobsBasePath}
          title="Student import"
          onComplete={(job) => {
            if (job.status === "COMPLETED") {
              toast("Student import completed", "success");
              router.push(basePath);
            } else if (job.status === "FAILED") {
              toast(job.errorMessage ?? "Import failed", "error");
            }
          }}
        />
      )}
    </div>
  );
}

function SummaryCard({
  label,
  value,
  className,
}: {
  label: string;
  value: number;
  className?: string;
}) {
  return (
    <div className="rounded-xl border border-surface-border bg-white p-4 shadow-card">
      <p className="text-xs font-medium text-slate-500">{label}</p>
      <p className={cn("mt-1 text-2xl font-semibold text-slate-900", className)}>
        {value}
      </p>
    </div>
  );
}

function StatusPill({ status }: { status: PreviewImportRow["status"] }) {
  const styles = {
    valid: "bg-emerald-50 text-emerald-700",
    update: "bg-blue-50 text-blue-700",
    duplicate: "bg-amber-50 text-amber-800",
    invalid: "bg-red-50 text-red-700",
  };
  const labels = {
    valid: "Valid",
    update: "Update",
    duplicate: "Duplicate",
    invalid: "Invalid",
  };
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-medium",
        styles[status]
      )}
    >
      {status === "valid" && <CheckCircle2 className="h-3 w-3" />}
      {status === "invalid" && <XCircle className="h-3 w-3" />}
      {status === "duplicate" && <AlertTriangle className="h-3 w-3" />}
      {labels[status]}
    </span>
  );
}
