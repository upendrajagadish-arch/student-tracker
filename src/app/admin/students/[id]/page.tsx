import {
  StudentDetailPageContent,
  StudentFormPageContent,
} from "@/lib/pages/student-detail-content";

export default async function AdminStudentDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return (
    <StudentDetailPageContent
      id={id}
      role="SUPER_ADMIN"
      basePath="/admin/students"
    />
  );
}
