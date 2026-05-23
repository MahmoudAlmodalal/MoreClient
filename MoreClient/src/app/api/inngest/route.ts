import { serve } from "inngest/next";
import { inngest } from "@/inngest/client";
import { embedJobPosting, rematchJob } from "@/inngest/functions/jobs";
import { scoreProposalFn } from "@/inngest/functions/proposals";
import { embedTalentProfile, enrichTalentProfileFn } from "@/inngest/functions/talent";
import { scanMessage } from "@/inngest/functions/messaging";
import { rollupDailyAnalytics } from "@/inngest/functions/analytics";
import { syncSubscriptionFn, reconcileCommissions } from "@/inngest/functions/billing";
import { triageReport } from "@/inngest/functions/moderation";
import {
  weeklyDigest,
  notifyNewProposal,
  notifyContractSigned,
  notifyMilestoneFunded,
  notifyMilestoneReleased,
  notifyMessageReceived,
  notifyVerification,
  notifyAccountSuspended,
} from "@/inngest/functions/notifications";
import { gdprExport, gdprDelete } from "@/inngest/functions/gdpr";
import { scanUploadedFile } from "@/inngest/functions/uploads";

export const { GET, POST, PUT } = serve({
  client: inngest,
  functions: [
    embedJobPosting,
    rematchJob,
    scoreProposalFn,
    embedTalentProfile,
    enrichTalentProfileFn,
    scanMessage,
    rollupDailyAnalytics,
    syncSubscriptionFn,
    reconcileCommissions,
    triageReport,
    weeklyDigest,
    notifyNewProposal,
    notifyContractSigned,
    notifyMilestoneFunded,
    notifyMilestoneReleased,
    notifyMessageReceived,
    notifyVerification,
    notifyAccountSuspended,
    gdprExport,
    gdprDelete,
    scanUploadedFile,
  ],
});
