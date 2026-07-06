import { StudentFormPageContent } from "@/lib/pages/student-detail-content";

export default async function TpoStudentEditPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return (
    <StudentFormPageContent
      id={id}
      role="TPO_ADMIN"
      basePath="/tpo/students"
      apiBasePath="/api/students"
      mode="edit"
    />
  );
}
