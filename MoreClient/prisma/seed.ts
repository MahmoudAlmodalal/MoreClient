import { PrismaClient } from "@prisma/client";
import { randomUUID } from "crypto";

const prisma = new PrismaClient();

const SKILLS = [
  // Engineering
  { slug: "react", nameEn: "React", nameAr: "ريآكت", category: "Frontend" },
  { slug: "nextjs", nameEn: "Next.js", nameAr: "نكست جي إس", category: "Frontend" },
  { slug: "typescript", nameEn: "TypeScript", nameAr: "تايب سكريبت", category: "Frontend" },
  { slug: "tailwindcss", nameEn: "Tailwind CSS", nameAr: "تيلويند CSS", category: "Frontend" },
  { slug: "vue", nameEn: "Vue.js", nameAr: "فيو جي إس", category: "Frontend" },
  { slug: "nodejs", nameEn: "Node.js", nameAr: "نود جي إس", category: "Backend" },
  { slug: "python", nameEn: "Python", nameAr: "بايثون", category: "Backend" },
  { slug: "postgresql", nameEn: "PostgreSQL", nameAr: "بوستجري إس كيو إل", category: "Backend" },
  { slug: "prisma", nameEn: "Prisma ORM", nameAr: "أورم بريزما", category: "Backend" },
  { slug: "graphql", nameEn: "GraphQL", nameAr: "جراف كيو إل", category: "Backend" },
  { slug: "rest-api", nameEn: "REST API", nameAr: "REST API", category: "Backend" },
  { slug: "docker", nameEn: "Docker", nameAr: "دوكر", category: "DevOps" },
  { slug: "aws", nameEn: "AWS", nameAr: "أمازون ويب سيرفيسز", category: "DevOps" },
  { slug: "git", nameEn: "Git", nameAr: "جيت", category: "DevOps" },
  { slug: "ci-cd", nameEn: "CI/CD", nameAr: "CI/CD", category: "DevOps" },
  // Design
  { slug: "figma", nameEn: "Figma", nameAr: "فيجما", category: "Design" },
  { slug: "ui-ux", nameEn: "UI/UX Design", nameAr: "تصميم UI/UX", category: "Design" },
  { slug: "brand-identity", nameEn: "Brand Identity", nameAr: "هوية بصرية", category: "Design" },
  { slug: "motion-design", nameEn: "Motion Design", nameAr: "تصميم حركي", category: "Design" },
  // Marketing & Content
  { slug: "content-writing", nameEn: "Content Writing", nameAr: "كتابة المحتوى", category: "Marketing" },
  { slug: "seo", nameEn: "SEO", nameAr: "تحسين محركات البحث", category: "Marketing" },
  { slug: "social-media", nameEn: "Social Media", nameAr: "وسائل التواصل الاجتماعي", category: "Marketing" },
  { slug: "copywriting", nameEn: "Copywriting", nameAr: "الكتابة الإعلانية", category: "Marketing" },
  { slug: "arabic-content", nameEn: "Arabic Content", nameAr: "محتوى عربي", category: "Marketing" },
  // Finance & Legal
  { slug: "accounting", nameEn: "Accounting", nameAr: "محاسبة", category: "Finance" },
  { slug: "financial-modeling", nameEn: "Financial Modeling", nameAr: "النمذجة المالية", category: "Finance" },
  { slug: "legal-drafting", nameEn: "Legal Drafting", nameAr: "الصياغة القانونية", category: "Legal" },
  // Project Management
  { slug: "project-management", nameEn: "Project Management", nameAr: "إدارة المشاريع", category: "Management" },
  { slug: "agile-scrum", nameEn: "Agile / Scrum", nameAr: "أجايل / سكروم", category: "Management" },
  // Data & AI
  { slug: "data-analysis", nameEn: "Data Analysis", nameAr: "تحليل البيانات", category: "Data" },
  { slug: "machine-learning", nameEn: "Machine Learning", nameAr: "تعلم الآلة", category: "Data" },
  { slug: "llm-prompting", nameEn: "LLM Prompting", nameAr: "هندسة البرومبت", category: "Data" },
  // Translation
  { slug: "translation-ar-en", nameEn: "Translation (AR↔EN)", nameAr: "ترجمة (عربي↔إنجليزي)", category: "Translation" },
];

const PLAN_CATALOG = [
  // ── Company plans ────────────────────────────────────────────────────────────
  {
    code: "free",
    principalType: "company" as const,
    nameEn: "Free",
    nameAr: "مجاني",
    monthlyCents: 0,
    yearlyCents: 0,
    active: true,
    stripePriceMonthly: null,
    stripePriceYearly: null,
    features: {
      jobPostings: 1,
      featuredPosts: 0,
      aiMatching: false,
      teamMembers: 1,
      analyticsRetentionDays: 7,
      supportLevel: "community",
    },
  },
  {
    code: "pro",
    principalType: "company" as const,
    nameEn: "Pro",
    nameAr: "برو",
    monthlyCents: 9900,  // $99/mo
    yearlyCents: 95040,  // $792/yr (~20% off)
    active: true,
    stripePriceMonthly: process.env.STRIPE_PRICE_COMPANY_PRO_MONTHLY ?? null,
    stripePriceYearly: process.env.STRIPE_PRICE_COMPANY_PRO_YEARLY ?? null,
    features: {
      jobPostings: 10,
      featuredPosts: 3,
      aiMatching: true,
      teamMembers: 5,
      analyticsRetentionDays: 90,
      supportLevel: "email",
    },
  },
  {
    code: "scale",
    principalType: "company" as const,
    nameEn: "Scale",
    nameAr: "سكيل",
    monthlyCents: 29900,  // $299/mo
    yearlyCents: 287040,  // $2390/yr (~20% off)
    active: true,
    stripePriceMonthly: process.env.STRIPE_PRICE_COMPANY_SCALE_MONTHLY ?? null,
    stripePriceYearly: process.env.STRIPE_PRICE_COMPANY_SCALE_YEARLY ?? null,
    features: {
      jobPostings: -1, // unlimited
      featuredPosts: -1, // unlimited
      aiMatching: true,
      teamMembers: -1, // unlimited
      analyticsRetentionDays: 365,
      supportLevel: "dedicated",
      customContract: true,
      apiAccess: true,
    },
  },
  // ── Talent plans ─────────────────────────────────────────────────────────────
  {
    code: "talent-free",
    principalType: "talent" as const,
    nameEn: "Free",
    nameAr: "مجاني",
    monthlyCents: 0,
    yearlyCents: 0,
    active: true,
    stripePriceMonthly: null,
    stripePriceYearly: null,
    features: {
      profileBoost: false,
      aiProfileEnrichment: 1,    // monthly enrichment credits
      proposalsPerMonth: 5,
      featuredBadge: false,
      prioritySearch: false,
    },
  },
  {
    code: "talent-pro",
    principalType: "talent" as const,
    nameEn: "Talent Pro",
    nameAr: "موهبة برو",
    monthlyCents: 1900,  // $19/mo
    yearlyCents: 18240,  // $152/yr (~20% off)
    active: true,
    stripePriceMonthly: process.env.STRIPE_PRICE_TALENT_PRO_MONTHLY ?? null,
    stripePriceYearly: process.env.STRIPE_PRICE_TALENT_PRO_YEARLY ?? null,
    features: {
      profileBoost: true,
      aiProfileEnrichment: -1,   // unlimited
      proposalsPerMonth: -1,     // unlimited
      featuredBadge: true,
      prioritySearch: true,
      portfolioVideoUpload: true,
    },
  },
];

async function main() {
  console.log("Seeding skill catalog…");

  for (const skill of SKILLS) {
    await prisma.skill.upsert({
      where: { slug: skill.slug },
      create: { id: randomUUID(), ...skill },
      update: { nameEn: skill.nameEn, nameAr: skill.nameAr, category: skill.category },
    });
  }

  console.log(`✅ Seeded ${SKILLS.length} skills`);

  console.log("Seeding plan catalog…");

  for (const plan of PLAN_CATALOG) {
    await prisma.planCatalog.upsert({
      where: { code: plan.code },
      create: {
        id: randomUUID(),
        ...plan,
        features: plan.features as object,
      },
      update: {
        nameEn: plan.nameEn,
        nameAr: plan.nameAr,
        monthlyCents: plan.monthlyCents,
        yearlyCents: plan.yearlyCents,
        active: plan.active,
        stripePriceMonthly: plan.stripePriceMonthly,
        stripePriceYearly: plan.stripePriceYearly,
        features: plan.features as object,
      },
    });
  }

  console.log(`✅ Seeded ${PLAN_CATALOG.length} plans`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
