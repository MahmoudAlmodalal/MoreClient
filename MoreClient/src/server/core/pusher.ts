import Pusher from "pusher";

function createPusherServer() {
  const { PUSHER_APP_ID, PUSHER_KEY, PUSHER_SECRET, PUSHER_CLUSTER } =
    process.env;

  if (!PUSHER_APP_ID || !PUSHER_KEY || !PUSHER_SECRET || !PUSHER_CLUSTER) {
    return null;
  }

  return new Pusher({
    appId: PUSHER_APP_ID,
    key: PUSHER_KEY,
    secret: PUSHER_SECRET,
    cluster: PUSHER_CLUSTER,
    useTLS: true,
  });
}

export const pusherServer = createPusherServer();

/** Trigger an event on a Pusher channel — no-op if Pusher is not configured. */
export async function triggerPusher(
  channel: string,
  event: string,
  data: unknown,
): Promise<void> {
  if (!pusherServer) return;
  await pusherServer.trigger(channel, event, data);
}

export const pusherChannels = {
  user: (clerkUserId: string) => `private-user-${clerkUserId}`,
  thread: (threadId: string) => `private-thread-${threadId}`,
  adminActivity: () => "presence-admin-activity",
} as const;
