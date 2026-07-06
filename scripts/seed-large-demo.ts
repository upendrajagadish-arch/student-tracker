/**
 * Large pilot load seed — adds 5,000 students WITHOUT clearing normal demo seed.
 * Usage: npm run seed:large
 * Recommended: run `npm run db:seed` first for users/companies, then this script.
 */

import { PrismaClient } from "@prisma/client";
import fs from "fs";
import path from "path";
import {
  DEMO_COMPANIES,
  DEMO_REQUIREMENTS,
  generateStudents,
  pick,
  ROLE_INTERESTS,
  seededInt,
} from "../prisma/seed-helpers";

const prisma = new PrismaClient();

const TARGET_STUDENTS = 5000;
const BATCH_SIZE = 100;
const START_INDEX = 5000;

const SEED_SKILLS = [
  "C", "C++", "Java", "Python", "JavaScript", "HTML", "CSS", "React", "Node.js",
  "Express.js", "MySQL", "PostgreSQL", "MongoDB", "Git", "GitHub", "AWS", "Excel",
  "Machine Learning", "Networking", "Cybersecurity Basics",
];

function log(msg: string) {
  console.log(`[seed:large] ${msg}`);
}

function ensureDemoResumeFile(): string {
  const dir = path.join(process.cwd(), "uploads", "demo");
  fs.mkdirSync(dir, { recursive: true });
  const filePath = path.join(dir, "demo-resume.pdf");
  if (!fs.existsSync(filePath)) {
    fs.writeFileSync(filePath, "%PDF-1.4 demo placeholder");
  }
  return filePath;
}

async function ensureTechSkills(): Promise<Map<string, string>> {
  const categories: Record<string, string> = {
    C: "PROGRAMMING_LANGUAGE", Java: "PROGRAMMING_LANGUAGE", Python: "PROGRAMMING_LANGUAGE",
    JavaScript: "PROGRAMMING_LANGUAGE", React: "WEB_TECHNOLOGY", Node.js: "WEB_TECHNOLOGY",
    MySQL: "DATABASE", Git: "TOOL", AWS: "CLOUD", Excel: "DATA_ANALYTICS",
    "Machine Learning": "AI_ML", Networking: "CYBERSECURITY",
  };
  for (const name of SEED_SKILLS) {
    await prisma.techSkill.upsert({
      where: { name },
      update: {},
      create: {
        name,
        category: (categories[name] ?? "OTHER") as never,
      },
    });
  }
  return new Map((await prisma.techSkill.findMany()).map((s) => [s.name, s.id]));
}

async function ensureCompaniesAndRequirements(tpoUserId: string) {
  let companies = await prisma.company.findMany({ take: 6 });
  if (companies.length < 4) {
    for (const c of DEMO_COMPANIES) {
      const existing = await prisma.company.findFirst({ where: { name: c.name } });
      if (!existing) {
        companies.push(
          await prisma.company.create({
            data: {
              name: c.name,
              industry: c.industry,
              location: c.location,
              isActive: true,
            },
          })
        );
      }
    }
    companies = await prisma.company.findMany({ take: 6 });
  }

  let requirements = await prisma.companyRequirement.findMany({
    where: { status: "ACTIVE" },
    take: 20,
  });

  if (requirements.length < 6) {
    for (const req of DEMO_REQUIREMENTS) {
      const company = companies[req.companyIdx];
      if (!company) continue;
      const exists = await prisma.companyRequirement.findFirst({
        where: { companyId: company.id, roleTitle: req.roleTitle },
      });
      if (!exists) {
        await prisma.companyRequirement.create({
          data: {
            companyId: company.id,
            roleTitle: req.roleTitle,
            jobType: "Full-time",
            eligibleBranchesJson: JSON.stringify(req.branches),
            eligibleBatchesJson: JSON.stringify(["2022-2026", "2023-2027", "2024-2028"]),
            graduationYear: 2026,
            minCgpa: 6.0,
            requiredSkillsJson: JSON.stringify(req.skills),
            preferredSkillsJson: JSON.stringify(req.preferred),
            minTechnicalScore: req.minTech,
            minCommunicationScore: req.minComm,
            minReadinessScore: 45,
            status: "ACTIVE",
            createdByUserId: tpoUserId,
          },
        });
      }
    }
    requirements = await prisma.companyRequirement.findMany({
      where: { status: "ACTIVE" },
      take: 20,
    });
  }

  return { companies, requirements };
}

async function seedStudentBatch(
  batchIndex: number,
  skillMap: Map<string, string>,
  adminUserId: string,
  facultyUserId: string,
  tpoUserId: string,
  demoResumePath: string
): Promise<string[]> {
  const offset = START_INDEX + batchIndex * BATCH_SIZE;
  const payloads = generateStudents(BATCH_SIZE, offset);

  await prisma.student.createMany({
    data: payloads.map((p) => ({
      ...p,
      placementStatus: p.placementStatus as never,
      resumeStatus: p.resumeStatus as never,
    })),
    skipDuplicates: true,
  });

  const rollNumbers = payloads.map((p) => p.rollNumber);
  const students = await prisma.student.findMany({
    where: { rollNumber: { in: rollNumbers } },
    select: { id: true, rollNumber: true, fullName: true, linkedinUrl: true, githubUrl: true, resumeStatus: true, technicalScore: true, communicationScore: true },
  });

  const techSkillRows: Parameters<typeof prisma.studentTechSkill.createMany>[0]["data"] = [];
  const roleRows: Parameters<typeof prisma.studentRoleInterest.createMany>[0]["data"] = [];
  const resumeRows: Parameters<typeof prisma.resume.createMany>[0]["data"] = [];
  const readinessRows: Parameters<typeof prisma.readinessSnapshot.createMany>[0]["data"] = [];

  for (let i = 0; i < students.length; i++) {
    const student = students[i];
    const globalIdx = offset + i;
    const skillNames = [
      pick(["Python", "Java", "JavaScript", "C", "SQL", "Git"], globalIdx),
      pick(["React", "Node.js", "MySQL", "AWS", "Excel", "Networking"], globalIdx + 1),
    ];
    for (let j = 0; j < skillNames.length; j++) {
      const techSkillId = skillMap.get(skillNames[j]);
      if (!techSkillId) continue;
      techSkillRows.push({
        studentId: student.id,
        techSkillId,
        proficiencyLevel: pick(["BEGINNER", "INTERMEDIATE", "ADVANCED"], globalIdx + j) as never,
        verificationStatus: j === 0 && globalIdx % 3 !== 0 ? "FACULTY_VERIFIED" : "SELF_DECLARED",
        addedByUserId: adminUserId,
        verifiedByUserId: j === 0 && globalIdx % 3 !== 0 ? facultyUserId : null,
      });
    }

    roleRows.push({
      studentId: student.id,
      roleName: pick(ROLE_INTERESTS, globalIdx),
      interestLevel: pick(["LOW", "MEDIUM", "HIGH"], globalIdx) as never,
      readinessLevel: pick(["NOT_READY", "LEARNING", "NEAR_READY", "READY"], globalIdx) as never,
    });

    if (student.resumeStatus !== "NOT_UPLOADED") {
      resumeRows.push({
        studentId: student.id,
        fileName: `resume-${student.rollNumber}.pdf`,
        originalFileName: `${student.fullName.replace(/\s/g, "_")}_Resume.pdf`,
        filePath: demoResumePath,
        mimeType: "application/pdf",
        fileSize: 120000,
        uploadedByUserId: tpoUserId,
        reviewStatus: globalIdx % 5 === 0 ? "NEEDS_IMPROVEMENT" : "APPROVED",
        atsFriendly: globalIdx % 4 !== 0,
        resumeScore: seededInt(globalIdx, 45, 95),
        hasLinkedIn: Boolean(student.linkedinUrl),
        hasGitHub: Boolean(student.githubUrl),
        hasProjects: globalIdx % 3 !== 0,
        hasCertifications: globalIdx % 4 === 0,
        version: 1,
        isActive: true,
      });
    }

    const overall = Math.round((student.technicalScore + student.communicationScore) / 2);
    readinessRows.push({
      studentId: student.id,
      overallScore: overall,
      technicalReadiness: student.technicalScore,
      communicationReadiness: student.communicationScore,
      resumeReadiness: student.resumeStatus === "APPROVED" ? 75 : 40,
      techStackReadiness: 60,
      profileReadiness: student.linkedinUrl ? 70 : 30,
      academicReadiness: 65,
      riskLevel: overall < 50 ? "HIGH" : overall < 70 ? "MEDIUM" : "LOW",
      readinessStatus: overall >= 80 ? "PLACEMENT_READY" : overall >= 65 ? "NEAR_READY" : "NEEDS_IMPROVEMENT",
      nextRecommendedAction: "Continue placement preparation.",
      scoreBreakdownJson: "{}",
    });

    await prisma.student.update({
      where: { id: student.id },
      data: { readinessScore: overall },
    });
  }

  if (techSkillRows.length) await prisma.studentTechSkill.createMany({ data: techSkillRows });
  if (roleRows.length) await prisma.studentRoleInterest.createMany({ data: roleRows });
  if (resumeRows.length) await prisma.resume.createMany({ data: resumeRows });
  if (readinessRows.length) await prisma.readinessSnapshot.createMany({ data: readinessRows });

  return students.map((s) => s.id);
}

async function seedPlacementAndHr(
  requirements: { id: string; companyId: string; roleTitle: string }[],
  companies: { id: string; name: string }[],
  tpoUserId: string,
  hrUserId: string
) {
  const primaryReq = requirements[0];
  if (!primaryReq) return;

  let drive = await prisma.placementDrive.findFirst({
    where: { driveTitle: { contains: "Pilot Load Drive" } },
  });
  if (!drive) {
    drive = await prisma.placementDrive.create({
      data: {
        companyId: primaryReq.companyId,
        companyRequirementId: primaryReq.id,
        driveTitle: `${companies[0]?.name ?? "Pilot"} — Pilot Load Drive`,
        driveDate: new Date(),
        mode: "HYBRID",
        status: "ONGOING",
        createdByUserId: tpoUserId,
      },
    });
  }

  const stages = [
    "REGISTERED", "ELIGIBLE", "SHORTLISTED", "TECHNICAL_ROUND",
    "SELECTED", "OFFERED", "JOINED", "REJECTED",
  ] as const;

  const matchSample = await prisma.companyMatchSnapshot.findMany({
    where: { companyRequirementId: primaryReq.id },
    orderBy: { matchScore: "desc" },
    take: 400,
    select: { studentId: true },
  });

  const stageRows = matchSample.map((m, i) => ({
    placementDriveId: drive!.id,
    studentId: m.studentId,
    currentStage: stages[i % stages.length] as never,
    finalOutcome: i % 8 === 7 ? "REJECTED" as const : i % 6 === 5 ? "JOINED" as const : "PENDING" as const,
    attendanceStatus: i % 3 === 0 ? "PASSED" as const : "PENDING" as const,
    updatedByUserId: tpoUserId,
  }));

  await prisma.studentPlacementStage.createMany({
    data: stageRows,
    skipDuplicates: true,
  });

  const shareSample = matchSample.slice(0, 80);
  for (let i = 0; i < shareSample.length; i++) {
    await prisma.sharedStudentProfile.create({
      data: {
        companyId: primaryReq.companyId,
        companyRequirementId: primaryReq.id,
        studentId: shareSample[i].studentId,
        sharedByUserId: tpoUserId,
        sharedWithUserId: hrUserId,
        shareStatus: i % 5 === 0 ? "SHORTLISTED" : "VIEWED",
        hrDecision: i % 4 === 0 ? "INTERESTED" : i % 7 === 0 ? "SHORTLISTED" : "PENDING",
        allowResumeDownload: true,
        allowPlacementPassport: i % 2 === 0,
      },
    }).catch(() => undefined);
  }
}

async function main() {
  log("Starting large pilot seed (5,000 students)...");

  const existingPilot = await prisma.student.count({
    where: { email: { contains: "pilot." } },
  });
  if (existingPilot >= TARGET_STUDENTS) {
    log(`Already have ${existingPilot} pilot students. Skipping student creation.`);
  }

  const adminUser = await prisma.user.findUnique({ where: { email: "admin@placementiq.edu" } });
  const tpoUser = await prisma.user.findUnique({ where: { email: "tpo@placementiq.edu" } });
  const facultyUser = await prisma.user.findUnique({ where: { email: "faculty@placementiq.edu" } });
  const hrUser = await prisma.user.findUnique({ where: { email: "hr@placementiq.edu" } });

  if (!adminUser || !tpoUser || !facultyUser) {
    throw new Error("Run npm run db:seed first to create demo users.");
  }

  const skillMap = await ensureTechSkills();
  const demoResumePath = ensureDemoResumeFile();
  const { companies, requirements } = await ensureCompaniesAndRequirements(tpoUser.id);

  const batches = Math.ceil(TARGET_STUDENTS / BATCH_SIZE);
  const toCreate = TARGET_STUDENTS - existingPilot;

  if (toCreate > 0) {
    const startBatch = Math.floor(existingPilot / BATCH_SIZE);
    for (let b = startBatch; b < batches; b++) {
      if ((b - startBatch) * BATCH_SIZE >= toCreate) break;
      await seedStudentBatch(b, skillMap, adminUser.id, facultyUser.id, tpoUser.id, demoResumePath);
      log(`Students batch ${b + 1}/${batches} done`);
    }
  }

  log("Running matching on active requirements (this may take a few minutes)...");
  const { runRequirementMatching } = await import("../src/lib/services/company-matching");
  for (const req of requirements.slice(0, 6)) {
    const result = await runRequirementMatching(req.id);
    log(`Matched ${req.roleTitle}: ${result.count} students`);
  }

  if (hrUser) {
    await seedPlacementAndHr(requirements, companies, tpoUser.id, hrUser.id);
    log("Placement drives and HR shares seeded.");
  }

  const total = await prisma.student.count();
  log(`Complete. Total students in database: ${total}`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
