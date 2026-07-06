import { HrTalentRoomClient } from "@/components/hr/HrTalentRoomClient";
import { requireRole } from "@/lib/auth";
import { getHrCompaniesForUser } from "@/lib/services/hr-access";
import { getHrTalentRoom } from "@/lib/services/student-sharing";
import type { HRDecision } from "@/types/sharing";

export default async function HrTalentRoomPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const user = await requireRole(["HR"]);
  const params = await searchParams;

  const [result, companies] = await Promise.all([
    getHrTalentRoom(user.id, {
      companyId: typeof params.companyId === "string" ? params.companyId : undefined,
      requirementId:
        typeof params.requirementId === "string" ? params.requirementId : undefined,
      matchStatus:
        typeof params.matchStatus === "string" ? params.matchStatus : undefined,
      readinessStatus:
        typeof params.readinessStatus === "string"
          ? params.readinessStatus
          : undefined,
      hrDecision:
        typeof params.hrDecision === "string"
          ? (params.hrDecision as HRDecision)
          : undefined,
      branch: typeof params.branch === "string" ? params.branch : undefined,
      skill: typeof params.skill === "string" ? params.skill : undefined,
      search: typeof params.search === "string" ? params.search : undefined,
      page: Number(params.page) || 1,
    }),
    getHrCompaniesForUser(user.id),
  ]);

  return (
    <HrTalentRoomClient
      result={result}
      companies={companies.map((c) => ({ id: c.id, name: c.name }))}
    />
  );
}
