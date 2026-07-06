import { HrTalentDetailPageContent } from "@/lib/pages/hr-talent-detail-content";

export default async function HrTalentDetailPage({
  params,
}: {
  params: Promise<{ shareId: string }>;
}) {
  const { shareId } = await params;
  return <HrTalentDetailPageContent shareId={shareId} />;
}
