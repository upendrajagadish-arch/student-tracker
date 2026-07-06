import { CompanyForm } from "@/components/companies/CompanyForm";
import { PageHeader } from "@/components/ui/PageHeader";
import { Button } from "@/components/ui/Button";
import { canManageCompanies } from "@/lib/permissions";
import { getCompanyById } from "@/lib/services/companies";
import type { UserRole } from "@/types";
import { ArrowLeft } from "lucide-react";
import Link from "next/link";
import { notFound } from "next/navigation";

export async function CompanyFormPageContent({
  role,
  basePath,
  id,
  mode,
}: {
  role: UserRole;
  basePath: string;
  id?: string;
  mode: "create" | "edit";
}) {
  if (!canManageCompanies(role)) notFound();

  const company =
    mode === "edit" && id ? await getCompanyById(id) : null;
  if (mode === "edit" && !company) notFound();

  return (
    <div className="space-y-6">
      <PageHeader
        title={mode === "create" ? "Add Company" : "Edit Company"}
        description={
          mode === "create"
            ? "Register a new recruiting partner."
            : `Update profile for ${company!.name}`
        }
        actions={
          <Link href={mode === "edit" ? `${basePath}/${id}` : basePath}>
            <Button variant="secondary">
              <ArrowLeft className="h-4 w-4" />
              Back
            </Button>
          </Link>
        }
      />
      <CompanyForm
        mode={mode}
        initialData={company ?? undefined}
        redirectPath={mode === "edit" ? `${basePath}/${id}` : basePath}
      />
    </div>
  );
}
