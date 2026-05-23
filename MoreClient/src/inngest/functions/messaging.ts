import { inngest } from "../client";
import { logger } from "@/server/core/logger";
import { moderateMessage } from "@/server/ai/moderation";
import { triggerPusher, pusherChannels } from "@/server/core/pusher";
import { prisma } from "@/server/core/db";

/** Scan a message for policy violations and fan-out via Pusher. */
export const scanMessage = inngest.createFunction(
  { id: "messaging.scan", name: "Scan Message" },
  { event: "message/created" },
  async ({ event, step }) => {
    const { messageId, threadId, recipientClerkUserId } = event.data as {
      messageId: string;
      threadId: string;
      recipientClerkUserId: string;
      senderType: string;
      senderId: string;
    };

    // Step 1: Moderate the message
    const decision = await step.run("moderate", async () => {
      return moderateMessage(messageId);
    });

    logger.info({ messageId, decision: decision?.decision }, "message moderation complete");

    // Step 2: Fan-out to Pusher if not blocked
    if (decision?.decision !== "blocked") {
      await step.run("pusher-fanout", async () => {
        const message = await prisma.message.findUnique({
          where: { id: messageId },
          select: {
            id: true,
            threadId: true,
            senderType: true,
            senderId: true,
            body: true,
            createdAt: true,
            moderationStatus: true,
          },
        });
        if (!message) return;

        await Promise.allSettled([
          // Notify thread channel
          triggerPusher(pusherChannels.thread(threadId), "message.new", message),
          // Notify recipient's user channel
          triggerPusher(pusherChannels.user(recipientClerkUserId), "message.new", {
            ...message,
            threadId,
          }),
        ]);
      });
    }

    return { messageId, decision: decision?.decision };
  },
);
