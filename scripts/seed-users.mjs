/**
 * Seed only demo login users (fast). Full demo data: npm run db:seed
 */
import "../scripts/load-env.mjs";
import bcrypt from "bcryptjs";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();
const SALT_ROUNDS = 12;

const users = [
  { email: "admin@placementiq.edu", name: "Super Admin", password: "admin123", role: "SUPER_ADMIN" },
  { email: "tpo@placementiq.edu", name: "Placement Officer", password: "tpo123", role: "TPO_ADMIN" },
  { email: "faculty@placementiq.edu", name: "Dr. Faculty Trainer", password: "faculty123", role: "FACULTY" },
  { email: "hr@placementiq.edu", name: "HR Partner", password: "hr123", role: "HR" },
];

try {
  console.log("Seeding demo users...");
  for (const user of users) {
    const passwordHash = await bcrypt.hash(user.password, SALT_ROUNDS);
    await prisma.user.upsert({
      where: { email: user.email },
      update: { name: user.name, passwordHash, role: user.role, isActive: true },
      create: { email: user.email, name: user.name, passwordHash, role: user.role },
    });
    console.log(`  ✓ ${user.email}`);
  }
  console.log("Done. Use demo buttons on /login or ROLE_LOGIN_HINTS credentials.");
} catch (error) {
  console.error("Seed failed:", error);
  process.exitCode = 1;
} finally {
  await prisma.$disconnect();
}
