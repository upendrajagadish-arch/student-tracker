import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/db";
import { getServerEnv } from "@/lib/env";
import { ROLE_DASHBOARD_PATH } from "@/lib/constants";
import { verifyPassword } from "@/lib/password";
import {
  SESSION_COOKIE,
  signSessionToken,
  verifySessionToken,
} from "@/lib/session-token";
import type { SessionUser, UserRole } from "@/types";

const SESSION_MAX_AGE_SECONDS = 60 * 60 * 24 * 7;

function sessionCookieOptions() {
  const env = getServerEnv();
  return {
    httpOnly: true,
    secure: env.NODE_ENV === "production",
    sameSite: "lax" as const,
    path: "/",
    maxAge: SESSION_MAX_AGE_SECONDS,
  };
}

export async function createSession(userId: string): Promise<void> {
  const cookieStore = await cookies();
  cookieStore.set(
    SESSION_COOKIE,
    signSessionToken(userId),
    sessionCookieOptions()
  );
}

export async function destroySession(): Promise<void> {
  const cookieStore = await cookies();
  cookieStore.set(SESSION_COOKIE, "", {
    ...sessionCookieOptions(),
    maxAge: 0,
  });
}

export async function getSession(): Promise<SessionUser | null> {
  const cookieStore = await cookies();
  const token = cookieStore.get(SESSION_COOKIE)?.value;
  const userId = verifySessionToken(token);

  if (!userId) {
    return null;
  }

  const user = await prisma.user.findUnique({
    where: { id: userId, isActive: true },
    select: { id: true, email: true, name: true, role: true },
  });

  if (!user) return null;

  return {
    id: user.id,
    email: user.email,
    name: user.name,
    role: user.role as UserRole,
  };
}

export async function requireSession(): Promise<SessionUser> {
  const session = await getSession();
  if (!session) {
    redirect("/login");
  }
  return session;
}

export async function requireRole(allowedRoles: UserRole[]): Promise<SessionUser> {
  const session = await requireSession();
  if (!allowedRoles.includes(session.role)) {
    redirect(ROLE_DASHBOARD_PATH[session.role]);
  }
  return session;
}

export async function authenticateUser(
  email: string,
  password: string
): Promise<SessionUser | null> {
  const user = await prisma.user.findUnique({
    where: { email: email.toLowerCase(), isActive: true },
  });

  if (!user) return null;

  const valid = await verifyPassword(password, user.passwordHash);
  if (!valid) return null;

  return {
    id: user.id,
    email: user.email,
    name: user.name,
    role: user.role as UserRole,
  };
}

/** Safe fields for client responses — never includes passwordHash. */
export function toPublicSessionUser(user: SessionUser) {
  return {
    id: user.id,
    name: user.name,
    role: user.role,
    email: user.email,
  };
}
