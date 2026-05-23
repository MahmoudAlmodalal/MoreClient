-- CreateEnum
CREATE TYPE "CompanyStatus" AS ENUM ('active', 'suspended', 'banned', 'closed');

-- CreateEnum
CREATE TYPE "CompanyRole" AS ENUM ('owner', 'admin', 'recruiter', 'viewer');

-- CreateEnum
CREATE TYPE "TalentStatus" AS ENUM ('active', 'suspended', 'banned', 'paused');

-- CreateEnum
CREATE TYPE "VerificationStatus" AS ENUM ('unverified', 'pending', 'verified', 'rejected');

-- CreateEnum
CREATE TYPE "AvailabilityStatus" AS ENUM ('available', 'limited', 'unavailable');

-- CreateEnum
CREATE TYPE "SearchVisibility" AS ENUM ('public', 'hidden');

-- CreateEnum
CREATE TYPE "SkillLevel" AS ENUM ('beginner', 'intermediate', 'advanced', 'expert');

-- CreateEnum
CREATE TYPE "Proficiency" AS ENUM ('basic', 'conversational', 'fluent', 'native');

-- CreateEnum
CREATE TYPE "EngagementType" AS ENUM ('fixed', 'hourly');

-- CreateEnum
CREATE TYPE "JobStatus" AS ENUM ('draft', 'published', 'paused', 'closed', 'cancelled');

-- CreateEnum
CREATE TYPE "ProposalStatus" AS ENUM ('submitted', 'shortlisted', 'accepted', 'rejected', 'withdrawn');

-- CreateEnum
CREATE TYPE "ContractStatus" AS ENUM ('pending_signature', 'active', 'in_dispute', 'completed', 'cancelled');

-- CreateEnum
CREATE TYPE "MilestoneStatus" AS ENUM ('pending', 'funded', 'submitted', 'approved', 'released', 'disputed');

-- CreateEnum
CREATE TYPE "SenderType" AS ENUM ('company_user', 'talent', 'admin', 'system');

-- CreateEnum
CREATE TYPE "ModerationStatus" AS ENUM ('pending', 'approved', 'flagged', 'blocked');

-- CreateEnum
CREATE TYPE "ReportTarget" AS ENUM ('company', 'talent', 'message', 'job', 'profile');

-- CreateEnum
CREATE TYPE "ReportCategory" AS ENUM ('spam', 'fraud', 'harassment', 'inappropriate', 'ip_violation', 'other');

-- CreateEnum
CREATE TYPE "ReportStatus" AS ENUM ('open', 'under_review', 'resolved', 'dismissed');

-- CreateEnum
CREATE TYPE "ModAction" AS ENUM ('warn', 'suspend', 'ban', 'shadow_ban', 'unflag');

-- CreateEnum
CREATE TYPE "AdminRole" AS ENUM ('super_admin', 'admin', 'moderator', 'support');

-- CreateEnum
CREATE TYPE "TicketPriority" AS ENUM ('low', 'normal', 'high', 'urgent');

-- CreateEnum
CREATE TYPE "TicketStatus" AS ENUM ('open', 'in_progress', 'waiting_user', 'closed');

-- CreateEnum
CREATE TYPE "PrincipalType" AS ENUM ('company', 'talent');

-- CreateTable
CREATE TABLE "Company" (
    "id" UUID NOT NULL,
    "clerkOrgId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "legalName" TEXT,
    "country" TEXT NOT NULL,
    "locale" TEXT NOT NULL DEFAULT 'en',
    "websiteUrl" TEXT,
    "logoUrl" TEXT,
    "status" "CompanyStatus" NOT NULL DEFAULT 'active',
    "verificationStatus" "VerificationStatus" NOT NULL DEFAULT 'unverified',
    "stripeCustomerId" TEXT,
    "planCode" TEXT NOT NULL DEFAULT 'free',
    "featuredUntil" TIMESTAMP(3),
    "suspendedAt" TIMESTAMP(3),
    "suspendedReason" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "Company_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CompanyUser" (
    "companyId" UUID NOT NULL,
    "clerkUserId" TEXT NOT NULL,
    "role" "CompanyRole" NOT NULL DEFAULT 'viewer',
    "invitedAt" TIMESTAMP(3),
    "joinedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CompanyUser_pkey" PRIMARY KEY ("companyId","clerkUserId")
);

-- CreateTable
CREATE TABLE "Talent" (
    "id" UUID NOT NULL,
    "clerkUserId" TEXT NOT NULL,
    "handle" TEXT NOT NULL,
    "displayName" TEXT NOT NULL,
    "headline" TEXT,
    "bio" TEXT,
    "country" TEXT NOT NULL,
    "locale" TEXT NOT NULL DEFAULT 'en',
    "avatarUrl" TEXT,
    "hourlyRate" INTEGER,
    "currency" TEXT NOT NULL DEFAULT 'USD',
    "availability" "AvailabilityStatus" NOT NULL DEFAULT 'available',
    "yearsExperience" INTEGER,
    "status" "TalentStatus" NOT NULL DEFAULT 'active',
    "verificationStatus" "VerificationStatus" NOT NULL DEFAULT 'unverified',
    "kycProvider" TEXT,
    "kycReference" TEXT,
    "stripeAccountId" TEXT,
    "payoutsEnabled" BOOLEAN NOT NULL DEFAULT false,
    "planCode" TEXT NOT NULL DEFAULT 'free',
    "featuredUntil" TIMESTAMP(3),
    "searchVisibility" "SearchVisibility" NOT NULL DEFAULT 'public',
    "suspendedAt" TIMESTAMP(3),
    "suspendedReason" TEXT,
    "profileEmbeddingId" TEXT,
    "profileEmbeddingHash" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "Talent_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Skill" (
    "id" UUID NOT NULL,
    "slug" TEXT NOT NULL,
    "nameEn" TEXT NOT NULL,
    "nameAr" TEXT NOT NULL,
    "category" TEXT NOT NULL,

    CONSTRAINT "Skill_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TalentSkill" (
    "talentId" UUID NOT NULL,
    "skillId" UUID NOT NULL,
    "level" "SkillLevel" NOT NULL DEFAULT 'intermediate',
    "yearsExp" INTEGER,

    CONSTRAINT "TalentSkill_pkey" PRIMARY KEY ("talentId","skillId")
);

-- CreateTable
CREATE TABLE "PortfolioItem" (
    "id" UUID NOT NULL,
    "talentId" UUID NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "mediaUrls" TEXT[],
    "url" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PortfolioItem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ExperienceItem" (
    "id" UUID NOT NULL,
    "talentId" UUID NOT NULL,
    "company" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "startDate" TIMESTAMP(3) NOT NULL,
    "endDate" TIMESTAMP(3),
    "description" TEXT,

    CONSTRAINT "ExperienceItem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TalentLanguage" (
    "talentId" UUID NOT NULL,
    "locale" TEXT NOT NULL,
    "proficiency" "Proficiency" NOT NULL,

    CONSTRAINT "TalentLanguage_pkey" PRIMARY KEY ("talentId","locale")
);

-- CreateTable
CREATE TABLE "Job" (
    "id" UUID NOT NULL,
    "companyId" UUID NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "locale" TEXT NOT NULL,
    "budgetMin" INTEGER,
    "budgetMax" INTEGER,
    "currency" TEXT NOT NULL DEFAULT 'USD',
    "engagementType" "EngagementType" NOT NULL,
    "durationWeeks" INTEGER,
    "remote" BOOLEAN NOT NULL DEFAULT true,
    "country" TEXT,
    "status" "JobStatus" NOT NULL DEFAULT 'draft',
    "publishedAt" TIMESTAMP(3),
    "closedAt" TIMESTAMP(3),
    "embeddingId" TEXT,
    "embeddingHash" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "Job_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "JobSkill" (
    "jobId" UUID NOT NULL,
    "skillId" UUID NOT NULL,
    "required" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "JobSkill_pkey" PRIMARY KEY ("jobId","skillId")
);

-- CreateTable
CREATE TABLE "JobMatch" (
    "jobId" UUID NOT NULL,
    "talentId" UUID NOT NULL,
    "score" DOUBLE PRECISION NOT NULL,
    "reasons" JSONB NOT NULL,
    "generatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "JobMatch_pkey" PRIMARY KEY ("jobId","talentId")
);

-- CreateTable
CREATE TABLE "Proposal" (
    "id" UUID NOT NULL,
    "jobId" UUID NOT NULL,
    "talentId" UUID NOT NULL,
    "coverLetter" TEXT NOT NULL,
    "bidAmount" INTEGER NOT NULL,
    "bidCurrency" TEXT NOT NULL DEFAULT 'USD',
    "durationWeeks" INTEGER,
    "attachments" TEXT[],
    "status" "ProposalStatus" NOT NULL DEFAULT 'submitted',
    "aiScore" DOUBLE PRECISION,
    "aiReasons" JSONB,
    "shortlistedAt" TIMESTAMP(3),
    "rejectedAt" TIMESTAMP(3),
    "withdrawnAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Proposal_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Contract" (
    "id" UUID NOT NULL,
    "jobId" UUID NOT NULL,
    "companyId" UUID NOT NULL,
    "talentId" UUID NOT NULL,
    "termsMarkdown" TEXT NOT NULL,
    "amount" INTEGER NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'USD',
    "engagementType" "EngagementType" NOT NULL,
    "platformFeeBps" INTEGER NOT NULL DEFAULT 1000,
    "status" "ContractStatus" NOT NULL DEFAULT 'pending_signature',
    "signedAtCompany" TIMESTAMP(3),
    "signedAtTalent" TIMESTAMP(3),
    "startedAt" TIMESTAMP(3),
    "completedAt" TIMESTAMP(3),
    "cancelledAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Contract_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Milestone" (
    "id" UUID NOT NULL,
    "contractId" UUID NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "amount" INTEGER NOT NULL,
    "status" "MilestoneStatus" NOT NULL DEFAULT 'pending',
    "fundedAt" TIMESTAMP(3),
    "releasedAt" TIMESTAMP(3),
    "stripePaymentIntent" TEXT,
    "stripeTransfer" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Milestone_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Thread" (
    "id" UUID NOT NULL,
    "companyId" UUID NOT NULL,
    "talentId" UUID NOT NULL,
    "jobId" UUID,
    "contractId" UUID,
    "lastMessageAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Thread_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Message" (
    "id" UUID NOT NULL,
    "threadId" UUID NOT NULL,
    "senderType" "SenderType" NOT NULL,
    "senderId" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "attachments" TEXT[],
    "moderationStatus" "ModerationStatus" NOT NULL DEFAULT 'pending',
    "moderationReason" TEXT,
    "readAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Message_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Review" (
    "id" UUID NOT NULL,
    "contractId" UUID NOT NULL,
    "reviewerType" "SenderType" NOT NULL,
    "reviewerId" TEXT NOT NULL,
    "targetType" "SenderType" NOT NULL,
    "targetId" TEXT NOT NULL,
    "rating" INTEGER NOT NULL,
    "comment" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Review_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Subscription" (
    "principalType" "PrincipalType" NOT NULL,
    "principalId" UUID NOT NULL,
    "stripeSubId" TEXT NOT NULL,
    "planCode" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "currentPeriodStart" TIMESTAMP(3) NOT NULL,
    "currentPeriodEnd" TIMESTAMP(3) NOT NULL,
    "cancelAtPeriodEnd" BOOLEAN NOT NULL DEFAULT false,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Subscription_pkey" PRIMARY KEY ("principalType","principalId")
);

-- CreateTable
CREATE TABLE "UsageCounter" (
    "principalType" "PrincipalType" NOT NULL,
    "principalId" UUID NOT NULL,
    "periodStart" DATE NOT NULL,
    "jobsPosted" INTEGER NOT NULL DEFAULT 0,
    "proposalsSubmitted" INTEGER NOT NULL DEFAULT 0,
    "aiMatchRequests" INTEGER NOT NULL DEFAULT 0,
    "aiChatTokensInput" INTEGER NOT NULL DEFAULT 0,
    "aiChatTokensOutput" INTEGER NOT NULL DEFAULT 0,
    "storageBytes" BIGINT NOT NULL DEFAULT 0,

    CONSTRAINT "UsageCounter_pkey" PRIMARY KEY ("principalType","principalId","periodStart")
);

-- CreateTable
CREATE TABLE "PlatformAdmin" (
    "id" UUID NOT NULL,
    "clerkUserId" TEXT NOT NULL,
    "role" "AdminRole" NOT NULL,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdBy" TEXT,

    CONSTRAINT "PlatformAdmin_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Report" (
    "id" UUID NOT NULL,
    "reporterType" "SenderType" NOT NULL,
    "reporterId" TEXT NOT NULL,
    "targetType" "ReportTarget" NOT NULL,
    "targetCompanyId" UUID,
    "targetTalentId" UUID,
    "targetMessageId" UUID,
    "category" "ReportCategory" NOT NULL,
    "description" TEXT NOT NULL,
    "status" "ReportStatus" NOT NULL DEFAULT 'open',
    "decidedBy" TEXT,
    "decidedAt" TIMESTAMP(3),
    "decision" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Report_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ModerationAction" (
    "id" UUID NOT NULL,
    "targetType" "ReportTarget" NOT NULL,
    "targetId" TEXT NOT NULL,
    "action" "ModAction" NOT NULL,
    "reason" TEXT NOT NULL,
    "durationDays" INTEGER,
    "performedBy" TEXT NOT NULL,
    "reportId" UUID,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ModerationAction_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SupportTicket" (
    "id" UUID NOT NULL,
    "openerType" "SenderType" NOT NULL,
    "openerId" TEXT NOT NULL,
    "subject" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "priority" "TicketPriority" NOT NULL DEFAULT 'normal',
    "status" "TicketStatus" NOT NULL DEFAULT 'open',
    "assignedTo" TEXT,
    "closedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SupportTicket_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SupportMessage" (
    "id" UUID NOT NULL,
    "ticketId" UUID NOT NULL,
    "senderType" "SenderType" NOT NULL,
    "senderId" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "attachments" TEXT[],
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SupportMessage_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "FeatureFlag" (
    "key" TEXT NOT NULL,
    "description" TEXT,
    "enabled" BOOLEAN NOT NULL DEFAULT false,
    "rules" JSONB,
    "updatedBy" TEXT,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "FeatureFlag_pkey" PRIMARY KEY ("key")
);

-- CreateTable
CREATE TABLE "PlanCatalog" (
    "code" TEXT NOT NULL,
    "principalType" "PrincipalType" NOT NULL,
    "nameEn" TEXT NOT NULL,
    "nameAr" TEXT NOT NULL,
    "monthlyCents" INTEGER NOT NULL,
    "yearlyCents" INTEGER NOT NULL,
    "features" JSONB NOT NULL,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "stripePriceMonthly" TEXT,
    "stripePriceYearly" TEXT,

    CONSTRAINT "PlanCatalog_pkey" PRIMARY KEY ("code")
);

-- CreateTable
CREATE TABLE "FeaturedPlacement" (
    "id" UUID NOT NULL,
    "principalType" "PrincipalType" NOT NULL,
    "principalId" UUID NOT NULL,
    "position" INTEGER NOT NULL,
    "startsAt" TIMESTAMP(3) NOT NULL,
    "endsAt" TIMESTAMP(3) NOT NULL,
    "createdBy" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "FeaturedPlacement_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AuditLog" (
    "id" UUID NOT NULL,
    "actorType" "SenderType" NOT NULL,
    "actorId" TEXT NOT NULL,
    "principalType" "PrincipalType",
    "principalId" UUID,
    "action" TEXT NOT NULL,
    "resourceType" TEXT NOT NULL,
    "resourceId" TEXT,
    "metadata" JSONB,
    "ipAddress" TEXT,
    "userAgent" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AuditLog_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AdminActivity" (
    "id" UUID NOT NULL,
    "adminId" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "payload" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AdminActivity_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PlatformDailyMetrics" (
    "day" DATE NOT NULL,
    "signupsTalent" INTEGER NOT NULL,
    "signupsCompany" INTEGER NOT NULL,
    "jobsPublished" INTEGER NOT NULL,
    "proposalsSubmitted" INTEGER NOT NULL,
    "contractsSigned" INTEGER NOT NULL,
    "gmvCents" BIGINT NOT NULL,
    "commissionCents" BIGINT NOT NULL,
    "aiCostCents" INTEGER NOT NULL,
    "activeTalent" INTEGER NOT NULL,
    "activeCompanies" INTEGER NOT NULL,

    CONSTRAINT "PlatformDailyMetrics_pkey" PRIMARY KEY ("day")
);

-- CreateIndex
CREATE UNIQUE INDEX "Company_clerkOrgId_key" ON "Company"("clerkOrgId");

-- CreateIndex
CREATE UNIQUE INDEX "Company_slug_key" ON "Company"("slug");

-- CreateIndex
CREATE UNIQUE INDEX "Company_stripeCustomerId_key" ON "Company"("stripeCustomerId");

-- CreateIndex
CREATE INDEX "Company_status_createdAt_idx" ON "Company"("status", "createdAt" DESC);

-- CreateIndex
CREATE INDEX "Company_slug_idx" ON "Company"("slug");

-- CreateIndex
CREATE INDEX "CompanyUser_clerkUserId_idx" ON "CompanyUser"("clerkUserId");

-- CreateIndex
CREATE UNIQUE INDEX "Talent_clerkUserId_key" ON "Talent"("clerkUserId");

-- CreateIndex
CREATE UNIQUE INDEX "Talent_handle_key" ON "Talent"("handle");

-- CreateIndex
CREATE UNIQUE INDEX "Talent_stripeAccountId_key" ON "Talent"("stripeAccountId");

-- CreateIndex
CREATE INDEX "Talent_status_featuredUntil_idx" ON "Talent"("status", "featuredUntil" DESC);

-- CreateIndex
CREATE INDEX "Talent_country_status_idx" ON "Talent"("country", "status");

-- CreateIndex
CREATE INDEX "Talent_handle_idx" ON "Talent"("handle");

-- CreateIndex
CREATE UNIQUE INDEX "Skill_slug_key" ON "Skill"("slug");

-- CreateIndex
CREATE INDEX "TalentSkill_skillId_idx" ON "TalentSkill"("skillId");

-- CreateIndex
CREATE INDEX "PortfolioItem_talentId_idx" ON "PortfolioItem"("talentId");

-- CreateIndex
CREATE INDEX "ExperienceItem_talentId_idx" ON "ExperienceItem"("talentId");

-- CreateIndex
CREATE INDEX "Job_status_publishedAt_idx" ON "Job"("status", "publishedAt" DESC);

-- CreateIndex
CREATE INDEX "Job_companyId_status_idx" ON "Job"("companyId", "status");

-- CreateIndex
CREATE INDEX "JobSkill_skillId_idx" ON "JobSkill"("skillId");

-- CreateIndex
CREATE INDEX "JobMatch_jobId_score_idx" ON "JobMatch"("jobId", "score" DESC);

-- CreateIndex
CREATE INDEX "Proposal_talentId_createdAt_idx" ON "Proposal"("talentId", "createdAt" DESC);

-- CreateIndex
CREATE INDEX "Proposal_jobId_status_idx" ON "Proposal"("jobId", "status");

-- CreateIndex
CREATE UNIQUE INDEX "Proposal_jobId_talentId_key" ON "Proposal"("jobId", "talentId");

-- CreateIndex
CREATE UNIQUE INDEX "Contract_jobId_key" ON "Contract"("jobId");

-- CreateIndex
CREATE INDEX "Contract_companyId_status_idx" ON "Contract"("companyId", "status");

-- CreateIndex
CREATE INDEX "Contract_talentId_status_idx" ON "Contract"("talentId", "status");

-- CreateIndex
CREATE INDEX "Milestone_contractId_idx" ON "Milestone"("contractId");

-- CreateIndex
CREATE INDEX "Thread_companyId_lastMessageAt_idx" ON "Thread"("companyId", "lastMessageAt" DESC);

-- CreateIndex
CREATE INDEX "Thread_talentId_lastMessageAt_idx" ON "Thread"("talentId", "lastMessageAt" DESC);

-- CreateIndex
CREATE UNIQUE INDEX "Thread_companyId_talentId_jobId_key" ON "Thread"("companyId", "talentId", "jobId");

-- CreateIndex
CREATE INDEX "Message_threadId_createdAt_idx" ON "Message"("threadId", "createdAt");

-- CreateIndex
CREATE INDEX "Review_targetType_targetId_createdAt_idx" ON "Review"("targetType", "targetId", "createdAt" DESC);

-- CreateIndex
CREATE UNIQUE INDEX "Subscription_stripeSubId_key" ON "Subscription"("stripeSubId");

-- CreateIndex
CREATE UNIQUE INDEX "PlatformAdmin_clerkUserId_key" ON "PlatformAdmin"("clerkUserId");

-- CreateIndex
CREATE INDEX "Report_status_createdAt_idx" ON "Report"("status", "createdAt" DESC);

-- CreateIndex
CREATE INDEX "ModerationAction_targetType_targetId_createdAt_idx" ON "ModerationAction"("targetType", "targetId", "createdAt" DESC);

-- CreateIndex
CREATE INDEX "SupportTicket_status_createdAt_idx" ON "SupportTicket"("status", "createdAt" DESC);

-- CreateIndex
CREATE INDEX "SupportTicket_assignedTo_status_idx" ON "SupportTicket"("assignedTo", "status");

-- CreateIndex
CREATE INDEX "SupportMessage_ticketId_createdAt_idx" ON "SupportMessage"("ticketId", "createdAt");

-- CreateIndex
CREATE INDEX "FeaturedPlacement_principalType_endsAt_idx" ON "FeaturedPlacement"("principalType", "endsAt");

-- CreateIndex
CREATE INDEX "AuditLog_principalType_principalId_createdAt_idx" ON "AuditLog"("principalType", "principalId", "createdAt" DESC);

-- CreateIndex
CREATE INDEX "AuditLog_actorId_createdAt_idx" ON "AuditLog"("actorId", "createdAt" DESC);

-- CreateIndex
CREATE INDEX "AuditLog_action_createdAt_idx" ON "AuditLog"("action", "createdAt" DESC);

-- CreateIndex
CREATE INDEX "AdminActivity_createdAt_idx" ON "AdminActivity"("createdAt" DESC);

-- AddForeignKey
ALTER TABLE "CompanyUser" ADD CONSTRAINT "CompanyUser_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TalentSkill" ADD CONSTRAINT "TalentSkill_talentId_fkey" FOREIGN KEY ("talentId") REFERENCES "Talent"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TalentSkill" ADD CONSTRAINT "TalentSkill_skillId_fkey" FOREIGN KEY ("skillId") REFERENCES "Skill"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PortfolioItem" ADD CONSTRAINT "PortfolioItem_talentId_fkey" FOREIGN KEY ("talentId") REFERENCES "Talent"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ExperienceItem" ADD CONSTRAINT "ExperienceItem_talentId_fkey" FOREIGN KEY ("talentId") REFERENCES "Talent"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TalentLanguage" ADD CONSTRAINT "TalentLanguage_talentId_fkey" FOREIGN KEY ("talentId") REFERENCES "Talent"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Job" ADD CONSTRAINT "Job_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "JobSkill" ADD CONSTRAINT "JobSkill_jobId_fkey" FOREIGN KEY ("jobId") REFERENCES "Job"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "JobSkill" ADD CONSTRAINT "JobSkill_skillId_fkey" FOREIGN KEY ("skillId") REFERENCES "Skill"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Proposal" ADD CONSTRAINT "Proposal_jobId_fkey" FOREIGN KEY ("jobId") REFERENCES "Job"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Proposal" ADD CONSTRAINT "Proposal_talentId_fkey" FOREIGN KEY ("talentId") REFERENCES "Talent"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Contract" ADD CONSTRAINT "Contract_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Contract" ADD CONSTRAINT "Contract_talentId_fkey" FOREIGN KEY ("talentId") REFERENCES "Talent"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Contract" ADD CONSTRAINT "Contract_jobId_fkey" FOREIGN KEY ("jobId") REFERENCES "Job"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Milestone" ADD CONSTRAINT "Milestone_contractId_fkey" FOREIGN KEY ("contractId") REFERENCES "Contract"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Message" ADD CONSTRAINT "Message_threadId_fkey" FOREIGN KEY ("threadId") REFERENCES "Thread"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Review" ADD CONSTRAINT "Review_contractId_fkey" FOREIGN KEY ("contractId") REFERENCES "Contract"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Report" ADD CONSTRAINT "Report_targetCompanyId_fkey" FOREIGN KEY ("targetCompanyId") REFERENCES "Company"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Report" ADD CONSTRAINT "Report_targetTalentId_fkey" FOREIGN KEY ("targetTalentId") REFERENCES "Talent"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SupportMessage" ADD CONSTRAINT "SupportMessage_ticketId_fkey" FOREIGN KEY ("ticketId") REFERENCES "SupportTicket"("id") ON DELETE CASCADE ON UPDATE CASCADE;
