import { SkillEvidenceListPageContent } from "@/lib/pages/skill-evidence-list-content";

export default function FacultySkillEvidencePage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  return (
    <SkillEvidenceListPageContent
      role="FACULTY"
      basePath="/faculty/skill-evidence"
      studentsBasePath="/faculty/students"
      searchParams={searchParams}
    />
  );
}
