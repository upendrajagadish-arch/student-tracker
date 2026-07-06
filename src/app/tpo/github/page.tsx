import { GitHubListPageContent } from "@/lib/pages/github-list-content";

export default function TpoGitHubPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  return (
    <GitHubListPageContent
      role="TPO_ADMIN"
      basePath="/tpo/github"
      studentsBasePath="/tpo/students"
      searchParams={searchParams}
    />
  );
}
