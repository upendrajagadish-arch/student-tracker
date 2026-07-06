import { HrPassportPageContent } from "@/lib/pages/hr-passport-content";

export default async function HrPassportPage({
  params,
}: {
  params: Promise<{ shareId: string }>;
}) {
  const { shareId } = await params;
  return <HrPassportPageContent shareId={shareId} />;
}
