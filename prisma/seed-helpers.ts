/** Demo data generators — fake names only, no real student data. */

export const DEMO_BRANCHES = ["CSE", "IT", "ECE", "EEE", "MECH", "CIVIL"] as const;
export const DEMO_BATCHES = ["2022-2026", "2023-2027", "2024-2028"] as const;

const FIRST = [
  "Aarav", "Priya", "Rohan", "Sneha", "Karthik", "Ananya", "Vikram", "Meera",
  "Arjun", "Divya", "Kiran", "Neha", "Aditya", "Pooja", "Rahul", "Isha",
  "Sanjay", "Kavya", "Manish", "Lakshmi", "Nikhil", "Shruti", "Varun", "Anjali",
  "Deepak", "Revathi", "Gaurav", "Nandini", "Harsh", "Swati", "Yash", "Tanvi",
  "Akash", "Preeti", "Suresh", "Madhuri", "Rajesh", "Sunita", "Mohit", "Geeta",
];

const LAST = [
  "Sharma", "Nair", "Mehta", "Reddy", "Iyer", "Patel", "Singh", "Krishnan",
  "Gupta", "Desai", "Joshi", "Menon", "Kapoor", "Verma", "Rao", "Pillai",
  "Choudhury", "Banerjee", "Mishra", "Kulkarni", "Shetty", "Bose", "Agarwal", "Malhotra",
];

const ROLE_INTERESTS = [
  "Software Developer",
  "Full Stack Developer",
  "Data Analyst",
  "DevOps Engineer",
  "Embedded Engineer",
  "QA Engineer",
  "Cloud Engineer",
  "Business Analyst",
];

export function pick<T>(arr: readonly T[], index: number): T {
  return arr[index % arr.length];
}

export function seededFloat(seed: number, min: number, max: number): number {
  const x = Math.sin(seed * 9999) * 10000;
  const r = x - Math.floor(x);
  return Math.round((min + r * (max - min)) * 10) / 10;
}

export function seededInt(seed: number, min: number, max: number): number {
  return Math.floor(seededFloat(seed, min, max + 0.99));
}

export interface GeneratedStudent {
  fullName: string;
  rollNumber: string;
  email: string;
  phone: string;
  branch: string;
  section: string;
  batch: string;
  graduationYear: number;
  cgpa: number | null;
  activeBacklogs: number;
  placementStatus: string;
  linkedinUrl: string | null;
  githubUrl: string | null;
  resumeStatus: string;
  technicalScore: number;
  communicationScore: number;
  readinessScore: number;
}

export function generateStudents(count: number, startIndex = 0): GeneratedStudent[] {
  const students: GeneratedStudent[] = [];
  const branchCodes: Record<string, string> = {
    CSE: "CS",
    IT: "IT",
    ECE: "EC",
    EEE: "EE",
    MECH: "ME",
    CIVIL: "CV",
  };

  for (let i = 0; i < count; i++) {
    const idx = startIndex + i;
    const branch = pick(DEMO_BRANCHES, idx);
    const batch = pick(DEMO_BATCHES, idx + branch.length);
    const gradYear = parseInt(batch.split("-")[1], 10);
    const first = pick(FIRST, idx);
    const last = pick(LAST, idx * 3);
    const slug = `${first}.${last}`.toLowerCase();
    const tech = seededInt(idx, 35, 98);
    const comm = seededInt(idx + 1, 30, 95);
    const backlogs = seededInt(idx + 2, 0, 3);
    const cgpa = seededFloat(idx + 3, 5.5, 9.8);

    let placementStatus = "IN_TRAINING";
    if (tech >= 75 && comm >= 70 && backlogs === 0) placementStatus = "READY";
    else if (tech >= 85 && comm >= 80) placementStatus = "SHORTLISTED";
    else if (tech < 50 || backlogs >= 2) placementStatus = "NEEDS_ATTENTION";
    else if (idx % 17 === 0) placementStatus = "PLACED";
    else if (idx % 11 === 0) placementStatus = "NOT_STARTED";

    const hasProfile = idx % 5 !== 0;
    students.push({
      fullName: `${first} ${last}`,
      rollNumber: `${branchCodes[branch]}${gradYear}${String(idx + 1).padStart(4, "0")}`,
      email: `pilot.${slug}${idx}@demo.college.edu`,
      phone: `+91 9${String(100000000 + i).slice(0, 9)}`,
      branch,
      section: String.fromCharCode(65 + (i % 3)),
      batch,
      graduationYear: gradYear,
      cgpa: backlogs > 2 ? seededFloat(i, 5.0, 6.5) : cgpa,
      activeBacklogs: backlogs,
      placementStatus,
      linkedinUrl: hasProfile ? `https://linkedin.com/in/${slug}${idx}` : null,
      githubUrl: hasProfile && idx % 3 !== 0 ? `https://github.com/${slug}${idx}` : null,
      resumeStatus: idx % 4 === 0 ? "NOT_UPLOADED" : idx % 7 === 0 ? "UPLOADED" : "APPROVED",
      technicalScore: tech,
      communicationScore: comm,
      readinessScore: Math.round((tech + comm) / 2),
    });
  }
  return students;
}

export const DEMO_COMPANIES = [
  { name: "TechNova Solutions", industry: "IT Services", location: "Bangalore" },
  { name: "CloudBridge Systems", industry: "Cloud & DevOps", location: "Hyderabad" },
  { name: "DataPulse Analytics", industry: "Data & AI", location: "Pune" },
  { name: "SecureNet Corp", industry: "Cybersecurity", location: "Chennai" },
  { name: "Infostream Technologies", industry: "Product", location: "Mumbai" },
  { name: "AutoCore Engineering", industry: "Automotive", location: "Coimbatore" },
];

export const DEMO_REQUIREMENTS = [
  { companyIdx: 0, roleTitle: "Software Engineer", skills: ["Java", "Python", "SQL"], preferred: ["React", "Git"], branches: ["CSE", "IT"], minTech: 65, minComm: 60 },
  { companyIdx: 0, roleTitle: "Full Stack Developer", skills: ["JavaScript", "React", "Node.js"], preferred: ["MongoDB", "Git"], branches: ["CSE", "IT"], minTech: 70, minComm: 65 },
  { companyIdx: 1, roleTitle: "Cloud DevOps Engineer", skills: ["AWS", "Git", "Linux"], preferred: ["Docker", "Python"], branches: ["CSE", "IT", "ECE"], minTech: 68, minComm: 58 },
  { companyIdx: 2, roleTitle: "Data Analyst", skills: ["Python", "SQL", "Excel"], preferred: ["Power BI", "Tableau"], branches: ["CSE", "IT", "ECE"], minTech: 60, minComm: 62 },
  { companyIdx: 2, roleTitle: "ML Engineer Intern", skills: ["Python", "Machine Learning"], preferred: ["Deep Learning", "SQL"], branches: ["CSE", "IT"], minTech: 72, minComm: 60 },
  { companyIdx: 3, roleTitle: "Security Analyst", skills: ["Networking", "Cybersecurity Basics"], preferred: ["Ethical Hacking"], branches: ["CSE", "IT", "ECE"], minTech: 65, minComm: 55 },
  { companyIdx: 4, roleTitle: "QA Automation Engineer", skills: ["Java", "Python"], preferred: ["Git", "Postman"], branches: ["CSE", "IT"], minTech: 58, minComm: 60 },
  { companyIdx: 5, roleTitle: "Embedded Systems Engineer", skills: ["C", "C++"], preferred: ["Python", "Networking"], branches: ["ECE", "EEE", "CSE"], minTech: 62, minComm: 55 },
  { companyIdx: 5, roleTitle: "Mechanical Design Trainee", skills: ["Excel"], preferred: ["Power BI"], branches: ["MECH", "CIVIL"], minTech: 50, minComm: 50 },
];

export { ROLE_INTERESTS };
