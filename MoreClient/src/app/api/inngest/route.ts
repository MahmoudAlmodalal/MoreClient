import { serve } from "inngest/next";
import { inngest } from "@/inngest/client";
import { embedJobPosting } from "@/inngest/functions/jobs";
import { scoreProposal } from "@/inngest/functions/proposals";
import { rollupDailyAnalytics } from "@/inngest/functions/analytics";

export const { GET, POST, PUT } = serve({
  client: inngest,
  functions: [embedJobPosting, scoreProposal, rollupDailyAnalytics],
});
