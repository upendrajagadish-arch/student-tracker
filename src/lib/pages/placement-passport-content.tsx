import { PlacementPassportPageClient } from "@/components/passport/PlacementPassportPageClient";
import { PageHeader } from "@/components/ui/PageHeader";
import { logAudit } from "@/lib/services/audit";
import {
  canGeneratePassport,
  canPrintPassport,
  canViewPassport,
  getRolePrefix,
} from "@/lib/permissions";
import {
  getLatestPassportForStudent,
  getPassportSnapshotById,
} from "@/lib/services/placement-passport";
import { getPublicBrandingSettings } from "@/lib/services/app-settings";
import { getStudentById } from "@/lib/services/students";
import type { UserRole } from "@/types";
import { notFound } from "next/navigation";

export async function PlacementPassportPageContent({
  studentId,
  role,
  userId,
  requirementId,
  snapshotId,
}: {
  studentId: string;
  role: UserRole;
  userId: string;
  requirementId?: string | null;
  snapshotId?: string | null;
}) {
  if (!canViewPassport(role)) notFound();

  const student = await getStudentById(studentId);
  if (!student) notFound();

  const passport = snapshotId
    ? await getPassportSnapshotById(snapshotId, false)
    : await getLatestPassportForStudent({
        studentId,
        companyRequirementId: requirementId ?? null,
      });

  if (passport && passport.studentId !== studentId) notFound();

  if (passport) {
    await logAudit({
      actorUserId: userId,
      actorRole: role,
      action: "PLACEMENT_PASSPORT_VIEWED_INTERNAL",
      entityType: "PlacementPassportSnapshot",
      entityId: passport.id,
      description: `Viewed placement passport for ${student.fullName}`,
    });
  }

  const basePath = `${getRolePrefix(role)}/students`;
  const branding = await getPublicBrandingSettings();

  return (
    <div className="space-y-6">
      <PageHeader
        title="Placement Passport"
        description={`${branding.institutionName} · ${student.fullName} · ${student.rollNumber}`}
      />
      <PlacementPassportPageClient
        passport={passport}
        branding={branding}
        backHref={`${basePath}/${studentId}`}
        studentId={studentId}
        requirementId={requirementId}
        canGenerate={canGeneratePassport(role)}
        canPrint={canPrintPassport(role)}
        onPrintAuditUrl={
          passport
            ? `/api/students/${studentId}/passport/print?snapshotId=${passport.id}`
            : undefined
        }
      />
    </div>
  );
}
