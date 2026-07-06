import { getSession } from "@/lib/auth";
import { ROLE_DASHBOARD_PATH } from "@/lib/constants";
import { redirect } from "next/navigation";

export const dynamic = "force-dynamic";

export default async function HomePage() {
  const session = await getSession();

  if (session) {
    redirect(ROLE_DASHBOARD_PATH[session.role]);
  }

  redirect("/login");
}
