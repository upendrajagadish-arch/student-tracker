import { SkillEvidenceListPageContent } from "@/lib/pages/skill-evidence-list-content";

export default function AdminSkillEvidencePage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  return (
    <SkillEvidenceListPageContent
      role="SUPER_ADMIN"
      basePath="/admin/skill-evidence"
      studentsBasePath="/admin/students"
      searchParams={searchParams}
    />
  );
}
