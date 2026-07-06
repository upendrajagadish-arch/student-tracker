import { HrTalentDetailClient } from "@/components/hr/HrTalentDetailClient";
import { Button } from "@/components/ui/Button";
import { PageHeader } from "@/components/ui/PageHeader";
import { requireRole } from "@/lib/auth";
import { logAudit } from "@/lib/services/audit";
import { getHrSharedStudentDetail } from "@/lib/services/student-sharing";
import { ArrowLeft } from "lucide-react";
import Link from "next/link";
import { notFound } from "next/navigation";

export async function HrTalentDetailPageContent({
  shareId,
}: {
  shareId: string;
}) {
  const user = await requireRole(["HR"]);
  const detail = await getHrSharedStudentDetail(shareId, user.id);
  if (!detail) notFound();

  await logAudit({
    actorUserId: user.id,
    actorRole: user.role,
    action: "SHARE_VIEWED_BY_HR",
    entityType: "SharedStudentProfile",
    entityId: shareId,
    description: `HR viewed shared profile for ${detail.student.fullName}`,
  });

  return (
    <div className="space-y-6">
      <PageHeader
        title=""
        description=""
        actions={
          <Link href="/hr/talent-room">
            <Button variant="secondary">
              <ArrowLeft className="h-4 w-4" />
              Back to Talent Room
            </Button>
          </Link>
        }
      />
      <HrTalentDetailClient detail={detail} shareId={shareId} />
    </div>
  );
}
