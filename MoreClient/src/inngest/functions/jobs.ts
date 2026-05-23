import { inngest } from "../client";
import { logger } from "@/server/core/logger";
import { embedAndUpsertJob } from "@/server/ai/embedding";
import { matchTalentForJob } from "@/server/ai/matching";

/** Embed the job posting and run talent matching. */
export const embedJobPosting = inngest.createFunction(
  { id: "jobs.embed-posting", name: "Embed Job Posting" },
  { event: "job/published" },
  async ({ event, step }) => {
    const { jobId } = event.data as { jobId: string; companyId: string };

    const embedResult = await step.run("embed-job", async () => {
      return embedAndUpsertJob(jobId);
    });

    logger.info({ jobId, embedded: embedResult.embedded }, "job posting embedded");

    const matches = await step.run("match-talent", async () => {
      return matchTalentForJob(jobId, { topK: 100, topN: 25 });
    });

    logger.info({ jobId, matchCount: matches.length }, "talent matching complete");

    return { jobId, embedded: embedResult.embedded, matchCount: matches.length };
  },
);

/** Refresh matching when a job is updated but not re-published. */
export const rematchJob = inngest.createFunction(
  { id: "jobs.rematch", name: "Rematch Job on Update" },
  { event: "job/updated" },
  async ({ event, step }) => {
    const { jobId } = event.data as { jobId: string };

    await step.run("embed-job", () => embedAndUpsertJob(jobId));
    const matches = await step.run("match-talent", () => matchTalentForJob(jobId));

    return { jobId, matchCount: matches.length };
  },
);
