import { GitHubListPageContent } from "@/lib/pages/github-list-content";

export default function AdminGitHubPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  return (
    <GitHubListPageContent
      role="SUPER_ADMIN"
      basePath="/admin/github"
      studentsBasePath="/admin/students"
      searchParams={searchParams}
    />
  );
}
