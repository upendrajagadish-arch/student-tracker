import { HrPassportPageClient } from "@/components/passport/HrPassportPageClient";
import { PageHeader } from "@/components/ui/PageHeader";
import { Card, CardContent } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { requireRole } from "@/lib/auth";
import { logAudit } from "@/lib/services/audit";
import { getHrPassportAccess } from "@/lib/services/placement-passport";
import { getPublicBrandingSettings } from "@/lib/services/app-settings";
import { ArrowLeft } from "lucide-react";
import Link from "next/link";

export async function HrPassportPageContent({
  shareId,
}: {
  shareId: string;
}) {
  const user = await requireRole(["HR"]);
  const access = await getHrPassportAccess(user.id, shareId);

  if (!access.allowed) {
    if (access.reason === "not_enabled") {
      await logAudit({
        actorUserId: user.id,
        actorRole: user.role,
        action: "HR_PASSPORT_ACCESS_DENIED",
        entityType: "SharedStudentProfile",
        entityId: shareId,
        description: "HR passport access denied — permission not enabled",
      });

      return (
        <div className="space-y-6">
          <PageHeader title="Placement Passport" />
          <Card>
            <CardContent className="py-16 text-center">
              <p className="text-lg font-medium text-slate-900">
                Placement Passport access has not been enabled for this candidate.
              </p>
              <p className="mt-2 text-sm text-slate-500">
                Contact your placement officer if you need access to the full
                readiness passport.
              </p>
              <Link href={`/hr/talent-room/${shareId}`} className="mt-6 inline-block">
                <Button variant="secondary">
                  <ArrowLeft className="h-4 w-4" />
                  Back to Profile
                </Button>
              </Link>
            </CardContent>
          </Card>
        </div>
      );
    }

    await logAudit({
      actorUserId: user.id,
      actorRole: user.role,
      action: "HR_PASSPORT_ACCESS_DENIED",
      entityType: "SharedStudentProfile",
      entityId: shareId,
      description: "HR passport access denied — share inactive or not assigned",
    });

    return (
      <div className="space-y-6">
        <PageHeader title="Placement Passport" />
        <Card>
          <CardContent className="py-16 text-center">
            <p className="text-lg font-medium text-slate-900">Access denied</p>
            <p className="mt-2 text-sm text-slate-500">
              This share may have expired, been revoked, or is not assigned to
              your account.
            </p>
            <Link href="/hr/talent-room" className="mt-6 inline-block">
              <Button variant="secondary">Back to Talent Room</Button>
            </Link>
          </CardContent>
        </Card>
      </div>
    );
  }

  await logAudit({
    actorUserId: user.id,
    actorRole: user.role,
    action: "PLACEMENT_PASSPORT_VIEWED_BY_HR",
    entityType: "PlacementPassportSnapshot",
    entityId: access.passport.id,
    description: `HR viewed placement passport for ${access.passport.summary.student.fullName}`,
  });

  const branding = await getPublicBrandingSettings();

  return (
    <div className="space-y-6">
      <PageHeader
        title="Placement Passport"
        description={`${branding.institutionName} · ${access.passport.summary.student.fullName}`}
      />
      <HrPassportPageClient
        passport={access.passport}
        branding={branding}
        backHref={`/hr/talent-room/${shareId}`}
        shareId={shareId}
      />
    </div>
  );
}
