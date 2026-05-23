import { inngest } from "../client";
import { logger } from "@/server/core/logger";

/** Stub: embed the job posting text into Pinecone for vector search (Phase 3). */
export const embedJobPosting = inngest.createFunction(
  { id: "jobs.embed-posting", name: "Embed Job Posting" },
  { event: "job/published" },
  async ({ event, step }) => {
    await step.run("log-receipt", () => {
      logger.info({ jobId: event.data.jobId }, "jobs.embed-posting received — stub, skipping AI work until Phase 3");
    });
    return { skipped: true, jobId: event.data.jobId };
  },
);
