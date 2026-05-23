import { NextResponse } from "next/server";
import { createHmac, timingSafeEqual } from "crypto";
import { prisma } from "@/server/core/db";
import { logger } from "@/server/core/logger";
import { toProblemJson, AppError } from "@/server/core/errors";
import { inngest } from "@/inngest/client";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

interface PersonaEvent {
  data: {
    type: string;
    attributes: {
      status: string;
      "reference-id"?: string;
    };
    id: string;
  };
  included?: unknown[];
}

function verifyPersonaSignature(body: string, signature: string, secret: string): boolean {
  try {
    // Persona uses t=timestamp,v1=signature format
    const parts = signature.split(",").reduce<Record<string, string>>((acc, part) => {
      const [k, v] = part.split("=");
      if (k && v) acc[k] = v;
      return acc;
    }, {});

    const timestamp = parts["t"];
    const receivedSig = parts["v1"];
    if (!timestamp || !receivedSig) return false;

    const signed = `${timestamp}.${body}`;
    const expected = createHmac("sha256", secret).update(signed).digest("hex");
    return timingSafeEqual(Buffer.from(receivedSig, "hex"), Buffer.from(expected, "hex"));
  } catch {
    return false;
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.text();
    const signature = request.headers.get("persona-signature") ?? "";
    const secret = process.env.PERSONA_WEBHOOK_SECRET ?? "";

    if (secret && !verifyPersonaSignature(body, signature, secret)) {
      const err = new AppError("UNAUTHORIZED", "Invalid Persona webhook signature", 401);
      return NextResponse.json(toProblemJson(err, request.url), { status: 401 });
    }

    const event: PersonaEvent = JSON.parse(body);
    const eventType = event.data?.type;
    const status = event.data?.attributes?.status;
    const referenceId = event.data?.attributes?.["reference-id"];

    logger.info({ eventType, status, referenceId }, "kyc webhook received");

    if (referenceId && eventType?.includes("inquiry")) {
      let verificationStatus: "pending" | "verified" | "rejected" = "pending";
      if (status === "completed" || status === "approved") verificationStatus = "verified";
      else if (status === "failed" || status === "declined") verificationStatus = "rejected";

      if (verificationStatus !== "pending") {
        const matches = await prisma.talent.findMany({
          where: { kycReference: referenceId },
          select: { id: true },
        });
        await prisma.talent.updateMany({
          where: { kycReference: referenceId },
          data: {
            verificationStatus,
            kycProvider: "persona",
          },
        });
        for (const { id } of matches) {
          await inngest.send({
            name: "verification/status-changed",
            data: { principalType: "talent", principalId: id, decision: verificationStatus },
          });
        }
        logger.info({ referenceId, verificationStatus }, "talent kyc status updated");
      }
    }

    return NextResponse.json({ received: true });
  } catch (err) {
    logger.error({ err }, "kyc webhook error");
    return NextResponse.json({ received: false }, { status: 200 }); // Always 200 to Persona
  }
}
