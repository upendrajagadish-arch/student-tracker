import { JdParserPageContent } from "@/lib/pages/jd-parser-page-content";

export default async function TpoParseJdPage({
  searchParams,
}: {
  searchParams: Promise<{ companyId?: string }>;
}) {
  const { companyId } = await searchParams;
  return (
    <JdParserPageContent
      role="TPO_ADMIN"
      companiesBasePath="/tpo/companies"
      companyId={companyId}
    />
  );
}
