import { NextResponse } from "next/server";
import { prisma } from "@/server/core/db";
import { verifyUnsubscribeToken } from "@/server/notifications/service";
import { logger } from "@/server/core/logger";

/**
 * Public one-click unsubscribe endpoint linked from digest emails. Verifies the
 * HMAC token and flips the principal's `notifyDigest` preference off.
 */
export async function GET(request: Request) {
  const token = new URL(request.url).searchParams.get("token") ?? "";
  const verified = verifyUnsubscribeToken(token);

  if (!verified) {
    return new NextResponse("Invalid or expired unsubscribe link.", {
      status: 400,
      headers: { "content-type": "text/plain; charset=utf-8" },
    });
  }

  try {
    if (verified.principalType === "talent") {
      await prisma.talent.update({ where: { id: verified.principalId }, data: { notifyDigest: false } });
    } else {
      await prisma.company.update({ where: { id: verified.principalId }, data: { notifyDigest: false } });
    }
  } catch (err) {
    logger.warn({ err: (err as Error).message }, "unsubscribe failed");
    return new NextResponse("Could not process unsubscribe.", {
      status: 500,
      headers: { "content-type": "text/plain; charset=utf-8" },
    });
  }

  return new NextResponse(
    "You have been unsubscribed from clientMORE digest emails. You can re-enable them anytime in your settings.",
    { status: 200, headers: { "content-type": "text/plain; charset=utf-8" } },
  );
}
