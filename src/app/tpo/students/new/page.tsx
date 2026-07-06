import { StudentFormPageContent } from "@/lib/pages/student-detail-content";

export default function TpoStudentNewPage() {
  return (
    <StudentFormPageContent
      role="TPO_ADMIN"
      basePath="/tpo/students"
      apiBasePath="/api/students"
      mode="create"
    />
  );
}
