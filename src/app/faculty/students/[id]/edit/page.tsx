import { StudentFormPageContent } from "@/lib/pages/student-detail-content";

export default async function FacultyStudentEditPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return (
    <StudentFormPageContent
      id={id}
      role="FACULTY"
      basePath="/faculty/students"
      apiBasePath="/api/students"
      mode="edit"
    />
  );
}
