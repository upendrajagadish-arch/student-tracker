import { GitHubListPageContent } from "@/lib/pages/github-list-content";

export default function FacultyGitHubPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  return (
    <GitHubListPageContent
      role="FACULTY"
      basePath="/faculty/github"
      studentsBasePath="/faculty/students"
      searchParams={searchParams}
    />
  );
}
