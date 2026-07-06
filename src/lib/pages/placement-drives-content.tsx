import { PlacementDrivesPageClient } from "@/components/placement-drives/PlacementDrivesPageClient";
import {
  canManageDrives,
  canViewDrives,
  getRolePrefix,
} from "@/lib/permissions";
import { getPlacementDriveList } from "@/lib/services/placement-drives";
import type { UserRole } from "@/types";
import type { DriveStatus } from "@/types/placement-drive";
import { notFound } from "next/navigation";

export async function PlacementDrivesListPageContent({
  role,
  basePath,
  searchParams,
}: {
  role: UserRole;
  basePath: string;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  if (!canViewDrives(role)) notFound();

  const params = await searchParams;
  const result = await getPlacementDriveList({
    search: typeof params.search === "string" ? params.search : undefined,
    status: typeof params.status === "string" ? (params.status as DriveStatus) : undefined,
    page: Number(params.page) || 1,
  });

  return (
    <PlacementDrivesPageClient
      result={result}
      basePath={basePath}
      canManage={canManageDrives(role)}
    />
  );
}

export async function PlacementDriveDetailPageContent({
  role,
  basePath,
  id,
  searchParams,
}: {
  role: UserRole;
  basePath: string;
  id: string;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  if (!canViewDrives(role)) notFound();

  const params = await searchParams;
  const { getPlacementDriveById, getDriveFunnel, getDriveStages } = await import(
    "@/lib/services/placement-drives"
  );
  const { getDistinctBatches, getDistinctBranches } = await import(
    "@/lib/services/students"
  );

  const drive = await getPlacementDriveById(id);
  if (!drive) notFound();

  const [funnel, stages, branches, batches] = await Promise.all([
    getDriveFunnel(id),
    getDriveStages(id, {
      search: typeof params.search === "string" ? params.search : undefined,
      branch: typeof params.branch === "string" ? params.branch : undefined,
      batch: typeof params.batch === "string" ? params.batch : undefined,
      currentStage: typeof params.currentStage === "string" ? (params.currentStage as never) : undefined,
      finalOutcome: typeof params.finalOutcome === "string" ? (params.finalOutcome as never) : undefined,
      attendanceStatus: typeof params.attendanceStatus === "string" ? (params.attendanceStatus as never) : undefined,
      page: Number(params.page) || 1,
    }),
    getDistinctBranches(),
    getDistinctBatches(),
  ]);

  const { PlacementDriveDetailClient } = await import(
    "@/components/placement-drives/PlacementDriveDetailClient"
  );
  const {
    canExportDrives,
    canManageDrives,
    canUpdateDriveStage,
    canUpdateDriveTechnical,
  } = await import("@/lib/permissions");

  return (
    <PlacementDriveDetailClient
      drive={drive}
      funnel={funnel}
      stages={stages}
      basePath={basePath}
      studentsBasePath={`${getRolePrefix(role)}/students`}
      branches={branches}
      batches={batches}
      canManage={canManageDrives(role)}
      canExport={canExportDrives(role)}
      canUpdateStage={canUpdateDriveStage(role)}
      canUpdateTechnical={canUpdateDriveTechnical(role)}
    />
  );
}

export async function PlacementDriveFormPageContent({
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
  if (mode === "create" && !canManageDrives(role)) notFound();
  if (mode === "edit" && !canManageDrives(role)) notFound();

  const { prisma } = await import("@/lib/db");
  const { getPlacementDriveById } = await import("@/lib/services/placement-drives");
  const { PlacementDriveForm } = await import(
    "@/components/placement-drives/PlacementDriveForm"
  );
  const { PageHeader } = await import("@/components/ui/PageHeader");

  const initialData = id ? await getPlacementDriveById(id) : undefined;
  if (mode === "edit" && !initialData) notFound();

  const [companies, requirements] = await Promise.all([
    prisma.company.findMany({
      where: { isActive: true },
      select: { id: true, name: true },
      orderBy: { name: "asc" },
    }),
    prisma.companyRequirement.findMany({
      where: { status: { in: ["ACTIVE", "DRAFT"] } },
      include: { company: { select: { name: true } } },
      orderBy: { createdAt: "desc" },
    }),
  ]);

  return (
    <div className="space-y-6">
      <PageHeader
        title={mode === "create" ? "Create Placement Drive" : "Edit Drive"}
        description="Link a company visit or hiring event to track student outcomes."
      />
      <PlacementDriveForm
        companies={companies}
        requirements={requirements.map((r) => ({
          id: r.id,
          companyId: r.companyId,
          label: `${r.company.name} — ${r.roleTitle}`,
        }))}
        initialData={initialData ?? undefined}
        redirectPath={
          mode === "create" ? basePath : `${basePath}/${id}`
        }
        mode={mode}
      />
    </div>
  );
}
