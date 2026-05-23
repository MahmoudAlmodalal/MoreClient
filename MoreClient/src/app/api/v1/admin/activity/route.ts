import { requireAdmin } from "@/server/core/auth";
import { prisma } from "@/server/core/db";
import { toProblemJson, AppError } from "@/server/core/errors";
import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

/**
 * SSE stream of AdminActivity events for the admin live activity dashboard.
 * Polls DB every 5 seconds and emits new events.
 */
export async function GET(request: Request) {
  try {
    await requireAdmin("support");
  } catch (err) {
    const appErr = err instanceof AppError ? err : new AppError("FORBIDDEN", "Admin required", 403);
    return NextResponse.json(toProblemJson(appErr, request.url), { status: appErr.status });
  }

  const encoder = new TextEncoder();
  let lastId = "";
  let closed = false;

  const stream = new ReadableStream({
    async start(controller) {
      const send = (data: unknown) => {
        try {
          controller.enqueue(encoder.encode(`data: ${JSON.stringify(data)}\n\n`));
        } catch {
          closed = true;
        }
      };

      // Send initial heartbeat
      send({ type: "connected", timestamp: new Date().toISOString() });

      // Poll for new activity every 5 seconds
      const interval = setInterval(async () => {
        if (closed) {
          clearInterval(interval);
          return;
        }
        try {
          const activities = await prisma.adminActivity.findMany({
            where: lastId ? { id: { gt: lastId } } : undefined,
            orderBy: { createdAt: "asc" },
            take: 20,
          });

          for (const activity of activities) {
            send({ type: "activity", payload: activity });
            lastId = activity.id;
          }
        } catch {
          // DB error — send heartbeat
          send({ type: "heartbeat", timestamp: new Date().toISOString() });
        }
      }, 5000);

      request.signal.addEventListener("abort", () => {
        closed = true;
        clearInterval(interval);
        try { controller.close(); } catch { }
      });
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      Connection: "keep-alive",
      "X-Accel-Buffering": "no",
    },
  });
}
