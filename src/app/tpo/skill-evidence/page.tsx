import { SkillEvidenceListPageContent } from "@/lib/pages/skill-evidence-list-content";

export default function TpoSkillEvidencePage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  return (
    <SkillEvidenceListPageContent
      role="TPO_ADMIN"
      basePath="/tpo/skill-evidence"
      studentsBasePath="/tpo/students"
      searchParams={searchParams}
    />
  );
}
