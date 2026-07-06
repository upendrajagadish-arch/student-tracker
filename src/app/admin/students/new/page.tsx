import { StudentFormPageContent } from "@/lib/pages/student-detail-content";

export default function AdminStudentNewPage() {
  return (
    <StudentFormPageContent
      role="SUPER_ADMIN"
      basePath="/admin/students"
      apiBasePath="/api/students"
      mode="create"
    />
  );
}
