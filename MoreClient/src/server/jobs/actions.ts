"use server";

import { requireRole } from "../core/auth";
import { JobService } from "./service";
import { toAppError } from "../core/errors";
import { createJobSchema, updateJobSchema } from "@/schemas/job";
import { writeAudit, auditContextFromPrincipal } from "../audit";
import { checkRateLimit } from "../core/rate-limit";

type ActionResult<T = void> = { success: true; data?: T } | { success: false; error: string };

export async function createJobAction(rawInput: unknown): Promise<ActionResult<{ id: string }>> {
  try {
    const ctx = await requireRole("recruiter");
    const input = createJobSchema.parse(rawInput);
    const job = await JobService.createJob(ctx, input);
    await writeAudit(auditContextFromPrincipal(ctx), "job.create", "Job", job.id);
    return { success: true, data: { id: job.id } };
  } catch (err) {
    return { success: false, error: toAppError(err).message };
  }
}

export async function updateJobAction(
  jobId: string,
  rawInput: unknown,
): Promise<ActionResult> {
  try {
    const ctx = await requireRole("recruiter");
    const input = updateJobSchema.parse(rawInput);
    await JobService.updateJob(ctx, jobId, input);
    await writeAudit(auditContextFromPrincipal(ctx), "job.update", "Job", jobId);
    return { success: true };
  } catch (err) {
    return { success: false, error: toAppError(err).message };
  }
}

export async function publishJobAction(jobId: string): Promise<ActionResult> {
  try {
    const ctx = await requireRole("recruiter");
    await JobService.publishJob(ctx, jobId);
    await writeAudit(auditContextFromPrincipal(ctx), "job.publish", "Job", jobId);
    return { success: true };
  } catch (err) {
    return { success: false, error: toAppError(err).message };
  }
}

export async function pauseJobAction(jobId: string): Promise<ActionResult> {
  try {
    const ctx = await requireRole("recruiter");
    await JobService.pauseJob(ctx, jobId);
    await writeAudit(auditContextFromPrincipal(ctx), "job.pause", "Job", jobId);
    return { success: true };
  } catch (err) {
    return { success: false, error: toAppError(err).message };
  }
}

export async function closeJobAction(jobId: string): Promise<ActionResult> {
  try {
    const ctx = await requireRole("recruiter");
    await JobService.closeJob(ctx, jobId);
    await writeAudit(auditContextFromPrincipal(ctx), "job.close", "Job", jobId);
    return { success: true };
  } catch (err) {
    return { success: false, error: toAppError(err).message };
  }
}

export async function deleteJobAction(jobId: string): Promise<ActionResult> {
  try {
    const ctx = await requireRole("admin");
    await JobService.deleteJob(ctx, jobId);
    await writeAudit(auditContextFromPrincipal(ctx), "job.delete", "Job", jobId);
    return { success: true };
  } catch (err) {
    return { success: false, error: toAppError(err).message };
  }
}
