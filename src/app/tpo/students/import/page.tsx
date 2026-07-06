import { StudentImportClient } from "@/components/students/StudentImportClient";

export default function TpoStudentImportPage() {
  return (
    <StudentImportClient basePath="/tpo/students" jobsBasePath="/tpo/jobs" />
  );
}
