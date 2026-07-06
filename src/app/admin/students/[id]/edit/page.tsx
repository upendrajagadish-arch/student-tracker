import { StudentFormPageContent } from "@/lib/pages/student-detail-content";

export default async function AdminStudentEditPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return (
    <StudentFormPageContent
      id={id}
      role="SUPER_ADMIN"
      basePath="/admin/students"
      apiBasePath="/api/students"
      mode="edit"
    />
  );
}
