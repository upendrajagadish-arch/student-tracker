import "../scripts/load-env.mjs";
import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";
import fs from "fs";
import path from "path";
import {
  DEMO_COMPANIES,
  DEMO_REQUIREMENTS,
  generateStudents,
  pick,
  ROLE_INTERESTS,
  seededInt,
} from "./seed-helpers";

const prisma = new PrismaClient();
const SALT_ROUNDS = 12;
const STUDENT_COUNT = 100;

const SEED_SKILLS = [
  { name: "C", category: "PROGRAMMING_LANGUAGE" as const },
  { name: "C++", category: "PROGRAMMING_LANGUAGE" as const },
  { name: "Java", category: "PROGRAMMING_LANGUAGE" as const },
  { name: "Python", category: "PROGRAMMING_LANGUAGE" as const },
  { name: "JavaScript", category: "PROGRAMMING_LANGUAGE" as const },
  { name: "HTML", category: "WEB_TECHNOLOGY" as const },
  { name: "CSS", category: "WEB_TECHNOLOGY" as const },
  { name: "React", category: "WEB_TECHNOLOGY" as const },
  { name: "Node.js", category: "WEB_TECHNOLOGY" as const },
  { name: "Express.js", category: "FRAMEWORK" as const },
  { name: "MySQL", category: "DATABASE" as const },
  { name: "PostgreSQL", category: "DATABASE" as const },
  { name: "MongoDB", category: "DATABASE" as const },
  { name: "Git", category: "TOOL" as const },
  { name: "GitHub", category: "TOOL" as const },
  { name: "VS Code", category: "TOOL" as const },
  { name: "Postman", category: "TOOL" as const },
  { name: "AWS", category: "CLOUD" as const },
  { name: "Azure", category: "CLOUD" as const },
  { name: "Google Cloud", category: "CLOUD" as const },
  { name: "Excel", category: "DATA_ANALYTICS" as const },
  { name: "Power BI", category: "DATA_ANALYTICS" as const },
  { name: "SQL", category: "DATA_ANALYTICS" as const },
  { name: "Tableau", category: "DATA_ANALYTICS" as const },
  { name: "Machine Learning", category: "AI_ML" as const },
  { name: "Deep Learning", category: "AI_ML" as const },
  { name: "NLP", category: "AI_ML" as const },
  { name: "Networking", category: "CYBERSECURITY" as const },
  { name: "Ethical Hacking", category: "CYBERSECURITY" as const },
  { name: "Cybersecurity Basics", category: "CYBERSECURITY" as const },
];

const users = [
  { email: "admin@placementiq.edu", name: "Super Admin", password: "admin123", role: "SUPER_ADMIN" as const },
  { email: "tpo@placementiq.edu", name: "Placement Officer", password: "tpo123", role: "TPO_ADMIN" as const },
  { email: "faculty@placementiq.edu", name: "Dr. Faculty Trainer", password: "faculty123", role: "FACULTY" as const },
  { email: "hr@placementiq.edu", name: "HR Partner", password: "hr123", role: "HR" as const },
];

async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, SALT_ROUNDS);
}

async function clearDemoData() {
  await prisma.placementPassportSnapshot.deleteMany();
  await prisma.sharedStudentProfile.deleteMany();
  await prisma.companyMatchSnapshot.deleteMany();
  await prisma.companyRequirement.deleteMany();
  await prisma.hRCompanyAccess.deleteMany();
  await prisma.company.deleteMany();
  await prisma.readinessSnapshot.deleteMany();
  await prisma.resume.deleteMany();
  await prisma.studentTechSkill.deleteMany();
  await prisma.studentRoleInterest.deleteMany();
  await prisma.student.deleteMany();
  await prisma.techSkill.deleteMany();
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

async function main() {
  console.log("Seeding PlacementIQ demo database...");

  const { ensureCodingPlatformsSeeded } = await import(
    "../src/lib/services/coding-platforms"
  );
  await ensureCodingPlatformsSeeded();

  for (const user of users) {
    const passwordHash = await hashPassword(user.password);
    await prisma.user.upsert({
      where: { email: user.email },
      update: { name: user.name, passwordHash, role: user.role },
      create: { email: user.email, name: user.name, passwordHash, role: user.role },
    });
  }

  await clearDemoData();

  for (const skill of SEED_SKILLS) {
    await prisma.techSkill.create({ data: skill });
  }
  const skillMap = new Map(
    (await prisma.techSkill.findMany()).map((s) => [s.name, s.id])
  );

  const adminUser = await prisma.user.findUniqueOrThrow({
    where: { email: "admin@placementiq.edu" },
  });
  const tpoUser = await prisma.user.findUniqueOrThrow({
    where: { email: "tpo@placementiq.edu" },
  });
  const facultyUser = await prisma.user.findUniqueOrThrow({
    where: { email: "faculty@placementiq.edu" },
  });
  const hrUser = await prisma.user.findUniqueOrThrow({
    where: { email: "hr@placementiq.edu" },
  });

  const demoResumePath = ensureDemoResumeFile();
  const studentPayloads = generateStudents(STUDENT_COUNT);
  const createdStudents = [];

  for (let i = 0; i < studentPayloads.length; i++) {
    const payload = studentPayloads[i];
    const student = await prisma.student.create({
      data: {
        ...payload,
        placementStatus: payload.placementStatus as never,
        resumeStatus: payload.resumeStatus as never,
      },
    });
    createdStudents.push(student);

    const skillNames = [
      pick(["Python", "Java", "JavaScript", "C", "SQL", "Git"], i),
      pick(["React", "Node.js", "MySQL", "AWS", "Excel", "Networking"], i + 1),
      pick(["HTML", "CSS", "MongoDB", "Machine Learning", "Postman"], i + 2),
    ];
    for (let j = 0; j < skillNames.length; j++) {
      const techSkillId = skillMap.get(skillNames[j]);
      if (!techSkillId) continue;
      const verified = j === 0 && i % 3 !== 0;
      await prisma.studentTechSkill.create({
        data: {
          studentId: student.id,
          techSkillId,
          proficiencyLevel: pick(["BEGINNER", "INTERMEDIATE", "ADVANCED"], i + j),
          verificationStatus: verified ? "FACULTY_VERIFIED" : i % 2 === 0 ? "SELF_DECLARED" : "NOT_VERIFIED",
          addedByUserId: adminUser.id,
          verifiedByUserId: verified ? facultyUser.id : null,
          verifiedAt: verified ? new Date() : null,
          evidenceSource: verified ? "Faculty assessment" : null,
        },
      });
    }

    await prisma.studentRoleInterest.create({
      data: {
        studentId: student.id,
        roleName: pick(ROLE_INTERESTS, i),
        interestLevel: pick(["LOW", "MEDIUM", "HIGH"], i),
        readinessLevel: pick(["NOT_READY", "LEARNING", "NEAR_READY", "READY"], i),
      },
    });

    if (payload.resumeStatus !== "NOT_UPLOADED") {
      const reviewStatus =
        i % 7 === 0
          ? "NEEDS_IMPROVEMENT"
          : i % 5 === 0
            ? "UNDER_REVIEW"
            : i % 3 === 0
              ? "REVIEWED"
              : "APPROVED";
      await prisma.resume.create({
        data: {
          studentId: student.id,
          fileName: `resume-${student.rollNumber}.pdf`,
          originalFileName: `${student.fullName.replace(/\s/g, "_")}_Resume.pdf`,
          filePath: demoResumePath,
          mimeType: "application/pdf",
          fileSize: 120000,
          uploadedByUserId: tpoUser.id,
          reviewedByUserId: reviewStatus !== "UNDER_REVIEW" ? facultyUser.id : null,
          reviewStatus,
          atsFriendly: i % 4 !== 0,
          resumeScore: seededInt(i, 45, 95),
          hasLinkedIn: Boolean(student.linkedinUrl),
          hasGitHub: Boolean(student.githubUrl),
          hasProjects: i % 3 !== 0,
          hasCertifications: i % 4 === 0,
          reviewerComments:
            reviewStatus === "NEEDS_IMPROVEMENT"
              ? "Improve project descriptions and quantify achievements."
              : null,
          version: 1,
          isActive: true,
        },
      });
    }
  }

  console.log(`Created ${createdStudents.length} students with skills and resumes.`);

  const { recalculateBulkReadiness } = await import("../src/lib/services/readiness");
  const { count: readinessCount } = await recalculateBulkReadiness({
    actorUserId: adminUser.id,
    actorRole: "SUPER_ADMIN",
  });
  console.log(`Readiness snapshots: ${readinessCount}`);

  const companies = [];
  for (const c of DEMO_COMPANIES) {
    companies.push(
      await prisma.company.create({
        data: {
          name: c.name,
          industry: c.industry,
          location: c.location,
          contactEmail: `hiring@${c.name.toLowerCase().replace(/\s/g, "")}.demo`,
          isActive: true,
        },
      })
    );
  }

  const requirements = [];
  for (const req of DEMO_REQUIREMENTS) {
    requirements.push(
      await prisma.companyRequirement.create({
        data: {
          companyId: companies[req.companyIdx].id,
          roleTitle: req.roleTitle,
          jobType: "Full-time",
          eligibleBranchesJson: JSON.stringify(req.branches),
          eligibleBatchesJson: JSON.stringify(["2022-2026", "2023-2027"]),
          graduationYear: 2026,
          minCgpa: 6.0,
          allowActiveBacklogs: false,
          maxActiveBacklogs: 0,
          requiredSkillsJson: JSON.stringify(req.skills),
          preferredSkillsJson: JSON.stringify(req.preferred),
          minTechnicalScore: req.minTech,
          minCommunicationScore: req.minComm,
          minResumeScore: 50,
          minReadinessScore: 45,
          requireResumeApproved: false,
          status: "ACTIVE",
          createdByUserId: tpoUser.id,
        },
      })
    );
  }
  console.log(`Created ${companies.length} companies and ${requirements.length} requirements.`);

  const { runRequirementMatching } = await import("../src/lib/services/company-matching");
  for (const req of requirements) {
    const result = await runRequirementMatching(req.id);
    console.log(`Matching ${req.roleTitle}: ${result.count} students evaluated.`);
  }

  for (const company of companies.slice(0, 4)) {
    await prisma.hRCompanyAccess.create({
      data: {
        userId: hrUser.id,
        companyId: company.id,
        accessRole: "HR_RECRUITER",
        isActive: true,
        createdByUserId: tpoUser.id,
      },
    });
  }

  const primaryReq = requirements[0];
  const strongMatches = await prisma.companyMatchSnapshot.findMany({
    where: {
      companyRequirementId: primaryReq.id,
      matchStatus: { in: ["STRONG_FIT", "GOOD_FIT"] },
    },
    orderBy: { matchScore: "desc" },
    take: 12,
  });

  const hrDecisions = [
    "PENDING",
    "INTERESTED",
    "INTERESTED",
    "SHORTLISTED",
    "SHORTLISTED",
    "NOT_INTERESTED",
    "NEEDS_MORE_INFO",
  ] as const;

  const { generatePassportSnapshot } = await import("../src/lib/services/placement-passport");

  for (let i = 0; i < strongMatches.length; i++) {
    const match = strongMatches[i];
    const decision = hrDecisions[i % hrDecisions.length];
    const shareStatus =
      decision === "SHORTLISTED"
        ? "SHORTLISTED"
        : decision === "NOT_INTERESTED"
          ? "REJECTED"
          : i === 0
            ? "SHARED"
            : "VIEWED";

    const share = await prisma.sharedStudentProfile.create({
      data: {
        companyId: primaryReq.companyId,
        companyRequirementId: primaryReq.id,
        studentId: match.studentId,
        sharedByUserId: tpoUser.id,
        sharedWithUserId: hrUser.id,
        shareStatus,
        allowResumeDownload: i % 2 === 0,
        allowPlacementPassport: i % 3 !== 0,
        hrDecision: decision,
        hrComments:
          decision === "SHORTLISTED"
            ? "Strong technical fit — schedule interview."
            : decision === "INTERESTED"
              ? "Good profile, reviewing further."
              : null,
        sharedAt: new Date(Date.now() - i * 86400000),
      },
    });

    if (share.allowPlacementPassport) {
      await generatePassportSnapshot({
        studentId: match.studentId,
        generatedByUserId: tpoUser.id,
        companyId: primaryReq.companyId,
        companyRequirementId: primaryReq.id,
        sharedStudentProfileId: share.id,
      });
    }
  }

  const secondaryReq = requirements[1];
  const secondaryMatches = await prisma.companyMatchSnapshot.findMany({
    where: { companyRequirementId: secondaryReq.id, matchStatus: "STRONG_FIT" },
    take: 5,
  });
  for (const match of secondaryMatches) {
    await prisma.sharedStudentProfile.create({
      data: {
        companyId: secondaryReq.companyId,
        companyRequirementId: secondaryReq.id,
        studentId: match.studentId,
        sharedByUserId: tpoUser.id,
        shareStatus: "SHARED",
        allowResumeDownload: true,
        allowPlacementPassport: true,
        hrDecision: "PENDING",
      },
    });
  }

  await generatePassportSnapshot({
    studentId: createdStudents[0].id,
    generatedByUserId: adminUser.id,
    companyRequirementId: primaryReq.id,
    companyId: primaryReq.companyId,
  });

  console.log("Demo seed complete.");
  console.log(`Users: ${users.length} | Students: ${STUDENT_COUNT} | Companies: ${companies.length}`);
  console.log("Demo passwords are bcrypt-hashed. See README for credentials.");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
