import { StudentDetailPageContent } from "@/lib/pages/student-detail-content";

export default async function FacultyStudentDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return (
    <StudentDetailPageContent
      id={id}
      role="FACULTY"
      basePath="/faculty/students"
    />
  );
}
