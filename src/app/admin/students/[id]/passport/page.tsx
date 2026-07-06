import { PlacementPassportPageContent } from "@/lib/pages/placement-passport-content";
import { requireRole } from "@/lib/auth";

export default async function AdminStudentPassportPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ requirementId?: string; snapshotId?: string }>;
}) {
  const user = await requireRole(["SUPER_ADMIN"]);
  const { id } = await params;
  const query = await searchParams;

  return (
    <PlacementPassportPageContent
      studentId={id}
      role="SUPER_ADMIN"
      userId={user.id}
      requirementId={query.requirementId}
      snapshotId={query.snapshotId}
    />
  );
}
