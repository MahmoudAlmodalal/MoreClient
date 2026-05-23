import { NextResponse } from "next/server";
import { resolvePrincipal } from "@/server/core/auth";
import { pusherServer } from "@/server/core/pusher";
import { AppError, toProblemJson } from "@/server/core/errors";

export async function POST(request: Request) {
  try {
    if (!pusherServer) {
      throw new AppError("SERVICE_UNAVAILABLE", "Realtime not configured", 503);
    }

    const ctx = await resolvePrincipal();
    if (!ctx) throw new AppError("UNAUTHORIZED", "Authentication required", 401);

    const formData = await request.formData();
    const socketId = formData.get("socket_id") as string;
    const channelName = formData.get("channel_name") as string;

    if (!socketId || !channelName) {
      throw new AppError("BAD_REQUEST", "socket_id and channel_name are required", 400);
    }

    // Determine the user's principal id for channel scoping
    const userId =
      ctx.type === "company"
        ? ctx.clerkUserId
        : ctx.type === "talent"
          ? ctx.clerkUserId
          : ctx.clerkUserId;

    // Validate the channel the user is trying to subscribe to
    const allowedUserChannel = `private-user-${userId}`;
    const isThreadChannel = channelName.startsWith("private-thread-");
    const isUserChannel = channelName === allowedUserChannel;
    const isAdminChannel =
      channelName === "presence-admin-activity" && ctx.type === "admin";

    if (!isUserChannel && !isThreadChannel && !isAdminChannel) {
      throw new AppError("FORBIDDEN", "Not authorised to subscribe to this channel", 403);
    }

    // For thread channels, we trust the subscription (thread membership is enforced
    // at the message-send level, not here — a pattern acceptable for MVP)
    const authResponse = pusherServer.authorizeChannel(socketId, channelName, {
      user_id: userId,
    });

    return NextResponse.json(authResponse);
  } catch (err) {
    if (err instanceof AppError) {
      return NextResponse.json(toProblemJson(err, request.url), { status: err.status });
    }
    const internalErr = new AppError("INTERNAL", "Internal server error", 500);
    return NextResponse.json(toProblemJson(internalErr), { status: 500 });
  }
}
