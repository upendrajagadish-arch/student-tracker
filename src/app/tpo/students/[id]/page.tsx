import { StudentDetailPageContent } from "@/lib/pages/student-detail-content";

export default async function TpoStudentDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return (
    <StudentDetailPageContent
      id={id}
      role="TPO_ADMIN"
      basePath="/tpo/students"
    />
  );
}
