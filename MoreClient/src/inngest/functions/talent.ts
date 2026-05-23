import { inngest } from "../client";
import { logger } from "@/server/core/logger";
import { embedAndUpsertTalent } from "@/server/ai/embedding";
import { enrichTalentProfile } from "@/server/ai/enrichment";

/** Embed a talent profile into Pinecone when it is updated. */
export const embedTalentProfile = inngest.createFunction(
  { id: "talent.embed-profile", name: "Embed Talent Profile" },
  { event: "talent/profile-updated" },
  async ({ event, step }) => {
    const { talentId } = event.data as { talentId: string };

    const result = await step.run("embed", async () => {
      return embedAndUpsertTalent(talentId);
    });

    logger.info({ talentId, embedded: result.embedded }, "talent profile embedding done");
    return { talentId, embedded: result.embedded, hash: result.hash };
  },
);

/** Enrich a talent profile using OpenAI when it is first created or significantly updated. */
export const enrichTalentProfileFn = inngest.createFunction(
  { id: "talent.enrich-profile", name: "Enrich Talent Profile" },
  { event: "talent/created" },
  async ({ event, step }) => {
    const { talentId } = event.data as { talentId: string };

    const result = await step.run("enrich", async () => {
      return enrichTalentProfile(talentId);
    });

    logger.info({ talentId, enriched: !!result }, "talent profile enrichment done");
    return { talentId, enriched: !!result };
  },
);
