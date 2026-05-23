import { inngest } from "../client";
import { logger } from "@/server/core/logger";

/** Stub: score proposal against job requirements using AI (Phase 3). */
export const scoreProposal = inngest.createFunction(
  { id: "proposals.score", name: "Score Proposal" },
  { event: "proposal/submitted" },
  async ({ event, step }) => {
    await step.run("log-receipt", () => {
      logger.info(
        { proposalId: event.data.proposalId, jobId: event.data.jobId },
        "proposals.score received — stub, skipping AI work until Phase 3",
      );
    });
    return { skipped: true, proposalId: event.data.proposalId };
  },
);
