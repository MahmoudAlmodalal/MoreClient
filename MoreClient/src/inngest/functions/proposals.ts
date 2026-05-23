import { inngest } from "../client";
import { logger } from "@/server/core/logger";
import { scoreProposal } from "@/server/ai/scoring";

/** Score a proposal using an LLM when it is submitted. */
export const scoreProposalFn = inngest.createFunction(
  { id: "proposals.score", name: "Score Proposal" },
  { event: "proposal/submitted" },
  async ({ event, step }) => {
    const { proposalId } = event.data as { proposalId: string; jobId: string; talentId: string };

    const result = await step.run("score", async () => {
      return scoreProposal(proposalId);
    });

    logger.info({ proposalId, score: result?.score }, "proposal scored");

    return { proposalId, score: result?.score, recommendation: result?.recommendation };
  },
);
