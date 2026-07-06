"use client";

import type { ReactNode } from "react";
import {
  RequirementStatusBadge,
} from "@/components/companies/MatchBadges";
import { HrAccessSection } from "@/components/sharing/HrAccessSection";
import { Button } from "@/components/ui/Button";
import { useToast } from "@/components/ui/Toast";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/Card";
import { PageHeader } from "@/components/ui/PageHeader";
import { formatDate } from "@/lib/utils";
import type { CompanyDetail } from "@/types/company";
import { ArrowLeft, Building2, ExternalLink, Pencil, Plus, Sparkles } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";

interface CompanyDetailClientProps {
  company: CompanyDetail;
  basePath: string;
  canManage: boolean;
  canManageHrAccess?: boolean;
}

export function CompanyDetailClient({
  company,
  basePath,
  canManage,
  canManageHrAccess = false,
}: CompanyDetailClientProps) {
  const router = useRouter();
  const { toast } = useToast();

  async function toggleActive() {
    const res = await fetch(`/api/companies/${company.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ isActive: !company.isActive }),
    });
    if (res.ok) {
      toast(
        company.isActive ? "Company deactivated" : "Company activated",
        "success"
      );
      router.refresh();
    } else {
      toast("Failed to update status", "error");
    }
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title={company.name}
        description={company.industry ?? "Recruiting partner"}
        actions={
          <div className="flex gap-2">
            <Link href={basePath}>
              <Button variant="secondary">
                <ArrowLeft className="h-4 w-4" />
                Back
              </Button>
            </Link>
            {canManage && (
              <>
                <Button variant="secondary" onClick={toggleActive}>
                  {company.isActive ? "Deactivate" : "Activate"}
                </Button>
                <Link href={`${basePath}/${company.id}/edit`}>
                  <Button>
                    <Pencil className="h-4 w-4" />
                    Edit
                  </Button>
                </Link>
              </>
            )}
          </div>
        }
      />

      <div className="grid gap-6 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Building2 className="h-5 w-5 text-brand-600" />
              Company Profile
            </CardTitle>
          </CardHeader>
          <CardContent>
            <dl className="grid gap-4 sm:grid-cols-2">
              <DetailItem label="Location" value={company.location ?? "—"} />
              <DetailItem label="Industry" value={company.industry ?? "—"} />
              <DetailItem
                label="Website"
                value={
                  company.website ? (
                    <a
                      href={company.website}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1 text-brand-600 hover:text-brand-700"
                    >
                      {company.website}
                      <ExternalLink className="h-3 w-3" />
                    </a>
                  ) : (
                    "—"
                  )
                }
              />
              <DetailItem
                label="Status"
                value={company.isActive ? "Active" : "Inactive"}
              />
              <DetailItem
                label="Contact"
                value={company.contactPerson ?? "—"}
              />
              <DetailItem
                label="Email"
                value={company.contactEmail ?? "—"}
              />
              <DetailItem
                label="Phone"
                value={company.contactPhone ?? "—"}
              />
              <DetailItem
                label="Updated"
                value={formatDate(company.updatedAt)}
              />
            </dl>
            {company.notes && (
              <p className="mt-4 rounded-lg bg-slate-50 p-3 text-sm text-slate-600">
                {company.notes}
              </p>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Requirements</CardTitle>
            <CardDescription>
              {company.requirements.length} role requirement
              {company.requirements.length !== 1 ? "s" : ""}
            </CardDescription>
          </CardHeader>
          <CardContent>
            {canManage && (
              <div className="mb-4 space-y-2">
                <Link href={`${basePath}/parse-jd?companyId=${company.id}`}>
                  <Button variant="secondary" className="w-full">
                    <Sparkles className="h-4 w-4" />
                    Create Requirement from JD
                  </Button>
                </Link>
                <Link href={`${basePath}/${company.id}/requirements/new`}>
                  <Button className="w-full">
                    <Plus className="h-4 w-4" />
                    Add Requirement
                  </Button>
                </Link>
              </div>
            )}
            <div className="space-y-3">
              {company.requirements.length === 0 ? (
                <p className="text-sm text-slate-500">No requirements yet.</p>
              ) : (
                company.requirements.map((req) => (
                  <Link
                    key={req.id}
                    href={`${basePath}/${company.id}/requirements/${req.id}`}
                    className="block rounded-lg border border-surface-border p-3 transition-colors hover:bg-slate-50"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <p className="font-medium text-slate-900">
                          {req.roleTitle}
                        </p>
                        <p className="mt-1 text-xs text-slate-500">
                          {req.matchCount} matched · {req.strongFitCount} strong
                          fits
                        </p>
                      </div>
                      <RequirementStatusBadge status={req.status} />
                    </div>
                  </Link>
                ))
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      <HrAccessSection companyId={company.id} canManage={canManageHrAccess} />
    </div>
  );
}

function DetailItem({
  label,
  value,
}: {
  label: string;
  value: ReactNode;
}) {
  return (
    <div>
      <dt className="text-xs font-medium uppercase tracking-wide text-slate-500">
        {label}
      </dt>
      <dd className="mt-1 text-sm text-slate-900">{value}</dd>
    </div>
  );
}
