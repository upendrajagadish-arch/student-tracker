import { StudentImportClient } from "@/components/students/StudentImportClient";

export default function AdminStudentImportPage() {
  return (
    <StudentImportClient
      basePath="/admin/students"
      jobsBasePath="/admin/jobs"
    />
  );
}
