-- GDPR hard-delete support: allow Company/Talent deletion to cascade through
-- Job, Proposal, Contract, and Review. Re-create the affected foreign keys
-- with ON DELETE CASCADE (previously ON DELETE RESTRICT).

-- DropForeignKey
ALTER TABLE "Job" DROP CONSTRAINT "Job_companyId_fkey";
ALTER TABLE "Proposal" DROP CONSTRAINT "Proposal_jobId_fkey";
ALTER TABLE "Proposal" DROP CONSTRAINT "Proposal_talentId_fkey";
ALTER TABLE "Contract" DROP CONSTRAINT "Contract_companyId_fkey";
ALTER TABLE "Contract" DROP CONSTRAINT "Contract_talentId_fkey";
ALTER TABLE "Contract" DROP CONSTRAINT "Contract_jobId_fkey";
ALTER TABLE "Review" DROP CONSTRAINT "Review_contractId_fkey";

-- AddForeignKey
ALTER TABLE "Job" ADD CONSTRAINT "Job_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Proposal" ADD CONSTRAINT "Proposal_jobId_fkey" FOREIGN KEY ("jobId") REFERENCES "Job"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Proposal" ADD CONSTRAINT "Proposal_talentId_fkey" FOREIGN KEY ("talentId") REFERENCES "Talent"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Contract" ADD CONSTRAINT "Contract_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Contract" ADD CONSTRAINT "Contract_talentId_fkey" FOREIGN KEY ("talentId") REFERENCES "Talent"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Contract" ADD CONSTRAINT "Contract_jobId_fkey" FOREIGN KEY ("jobId") REFERENCES "Job"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Review" ADD CONSTRAINT "Review_contractId_fkey" FOREIGN KEY ("contractId") REFERENCES "Contract"("id") ON DELETE CASCADE ON UPDATE CASCADE;
