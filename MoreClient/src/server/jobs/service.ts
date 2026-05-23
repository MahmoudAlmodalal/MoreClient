import type { Job } from "@prisma/client";
import { JobRepo, type JobWithSkills } from "./repo";
import { AppError } from "../core/errors";
import { checkJobPostEntitlement, incrementJobPostCounter } from "../core/entitlements";
import { inngest } from "@/inngest/client";
import type { CompanyContext } from "../core/auth";
import type { CreateJobInput, UpdateJobInput, ListJobsQuery } from "@/schemas/job";

export class JobService {
  static async getJob(id: string): Promise<JobWithSkills> {
    const job = await JobRepo.findById(id);
    if (!job) throw new AppError("NOT_FOUND", "Job not found", 404);
    return job;
  }

  static async listJobs(
    query: ListJobsQuery,
  ): Promise<{ items: JobWithSkills[]; hasMore: boolean; nextCursor: string | null }> {
    return JobRepo.list(query);
  }

  static async createJob(ctx: CompanyContext, input: CreateJobInput): Promise<JobWithSkills> {
    return JobRepo.create(ctx.company.id, input);
  }

  static async updateJob(ctx: CompanyContext, jobId: string, input: UpdateJobInput): Promise<JobWithSkills> {
    const job = await JobRepo.findById(jobId);
    if (!job) throw new AppError("NOT_FOUND", "Job not found", 404);
    if (job.companyId !== ctx.company.id) throw new AppError("FORBIDDEN", "Access denied", 403);
    if (job.status === "closed" || job.status === "cancelled") {
      throw new AppError("UNPROCESSABLE", "Cannot edit a closed or cancelled job", 422);
    }
    return JobRepo.update(jobId, input);
  }

  static async publishJob(ctx: CompanyContext, jobId: string): Promise<Job> {
    const job = await JobRepo.findById(jobId);
    if (!job) throw new AppError("NOT_FOUND", "Job not found", 404);
    if (job.companyId !== ctx.company.id) throw new AppError("FORBIDDEN", "Access denied", 403);
    if (job.status !== "draft" && job.status !== "paused") {
      throw new AppError("UNPROCESSABLE", "Only draft or paused jobs can be published", 422);
    }

    await checkJobPostEntitlement(ctx.company.id, ctx.company.planCode);

    const published = await JobRepo.setStatus(jobId, "published", {
      publishedAt: new Date(),
    });

    await incrementJobPostCounter(ctx.company.id);

    await inngest.send({ name: "job/published", data: { jobId, companyId: ctx.company.id } });

    return published;
  }

  static async pauseJob(ctx: CompanyContext, jobId: string): Promise<Job> {
    const job = await JobRepo.findById(jobId);
    if (!job) throw new AppError("NOT_FOUND", "Job not found", 404);
    if (job.companyId !== ctx.company.id) throw new AppError("FORBIDDEN", "Access denied", 403);
    if (job.status !== "published") {
      throw new AppError("UNPROCESSABLE", "Only published jobs can be paused", 422);
    }
    return JobRepo.setStatus(jobId, "paused");
  }

  static async closeJob(ctx: CompanyContext, jobId: string): Promise<Job> {
    const job = await JobRepo.findById(jobId);
    if (!job) throw new AppError("NOT_FOUND", "Job not found", 404);
    if (job.companyId !== ctx.company.id) throw new AppError("FORBIDDEN", "Access denied", 403);
    if (job.status === "cancelled" || job.status === "closed") {
      throw new AppError("UNPROCESSABLE", "Job is already closed", 422);
    }
    return JobRepo.setStatus(jobId, "closed", { closedAt: new Date() });
  }

  static async deleteJob(ctx: CompanyContext, jobId: string): Promise<void> {
    const job = await JobRepo.findById(jobId);
    if (!job) throw new AppError("NOT_FOUND", "Job not found", 404);
    if (job.companyId !== ctx.company.id) throw new AppError("FORBIDDEN", "Access denied", 403);
    if (job.status === "active" || job.proposals.length > 0) {
      throw new AppError("UNPROCESSABLE", "Cannot delete a job with active proposals", 422);
    }
    await JobRepo.softDelete(jobId);
  }
}
