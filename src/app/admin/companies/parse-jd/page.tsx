import { JdParserPageContent } from "@/lib/pages/jd-parser-page-content";

export default async function AdminParseJdPage({
  searchParams,
}: {
  searchParams: Promise<{ companyId?: string }>;
}) {
  const { companyId } = await searchParams;
  return (
    <JdParserPageContent
      role="SUPER_ADMIN"
      companiesBasePath="/admin/companies"
      companyId={companyId}
    />
  );
}
