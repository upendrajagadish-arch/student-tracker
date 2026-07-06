import { RequirementCreateWithJd } from "@/components/companies/RequirementCreateWithJd";
import { RequirementForm } from "@/components/companies/RequirementForm";
import { PageHeader } from "@/components/ui/PageHeader";
import { Button } from "@/components/ui/Button";
import { canManageRequirements } from "@/lib/permissions";
import { getCompanyById, getRequirementById } from "@/lib/services/companies";
import type { UserRole } from "@/types";
import { ArrowLeft } from "lucide-react";
import Link from "next/link";
import { notFound } from "next/navigation";

export async function RequirementFormPageContent({
  companyId,
  requirementId,
  role,
  companiesBasePath,
  mode,
}: {
  companyId: string;
  requirementId?: string;
  role: UserRole;
  companiesBasePath: string;
  mode: "create" | "edit";
}) {
  if (!canManageRequirements(role)) notFound();

  const company = await getCompanyById(companyId);
  if (!company) notFound();

  const requirement =
    mode === "edit" && requirementId
      ? await getRequirementById(requirementId)
      : null;
  if (
    mode === "edit" &&
    (!requirement || requirement.companyId !== companyId)
  ) {
    notFound();
  }

  const redirectPath =
    mode === "edit"
      ? `${companiesBasePath}/${companyId}/requirements/${requirementId}`
      : `${companiesBasePath}/${companyId}`;

  return (
    <div className="space-y-6">
      <PageHeader
        title={
          mode === "create" ? "Create Requirement" : "Edit Requirement"
        }
        description={`${company.name} · Define eligibility and matching criteria`}
        actions={
          <Link href={redirectPath}>
            <Button variant="secondary">
              <ArrowLeft className="h-4 w-4" />
              Back
            </Button>
          </Link>
        }
      />
      {mode === "create" ? (
        <RequirementCreateWithJd
          companyId={companyId}
          companyName={company.name}
          redirectPath={redirectPath}
        />
      ) : (
        <RequirementForm
          mode="edit"
          companyId={companyId}
          companyName={company.name}
          initialData={requirement ?? undefined}
          redirectPath={redirectPath}
        />
      )}
    </div>
  );
}
