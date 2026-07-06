import { PlacementPassportPageContent } from "@/lib/pages/placement-passport-content";
import { requireRole } from "@/lib/auth";

export default async function FacultyStudentPassportPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ requirementId?: string; snapshotId?: string }>;
}) {
  const user = await requireRole(["FACULTY"]);
  const { id } = await params;
  const query = await searchParams;

  return (
    <PlacementPassportPageContent
      studentId={id}
      role="FACULTY"
      userId={user.id}
      requirementId={query.requirementId}
      snapshotId={query.snapshotId}
    />
  );
}
