import { Webhook } from "svix";
import { headers } from "next/headers";
import { prisma } from "@/server/core/db";
import { generateId } from "@/server/core/ids";
import { logger } from "@/server/core/logger";
import { TalentRepo } from "@/server/talent/repo";
import { CompanyRepo } from "@/server/companies/repo";

type ClerkEvent = {
  type: string;
  data: Record<string, unknown>;
};

/** Generate a URL-safe handle from a display name + random suffix. */
function generateHandle(displayName: string): string {
  const base = displayName
    .toLowerCase()
    .replace(/[^a-z0-9]/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 20);
  const suffix = Math.random().toString(36).slice(2, 7);
  return `${base}-${suffix}`;
}

/** Generate a URL-safe slug from an org name. */
function generateSlug(name: string): string {
  const base = name
    .toLowerCase()
    .replace(/[^a-z0-9]/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 40);
  const suffix = Math.random().toString(36).slice(2, 6);
  return `${base}-${suffix}`;
}

export async function POST(request: Request) {
  const webhookSecret = process.env.CLERK_WEBHOOK_SECRET;
  if (!webhookSecret) {
    logger.error("CLERK_WEBHOOK_SECRET not set");
    return new Response("Webhook secret not configured", { status: 500 });
  }

  const headerMap = await headers();
  const svixId = headerMap.get("svix-id");
  const svixTimestamp = headerMap.get("svix-timestamp");
  const svixSignature = headerMap.get("svix-signature");

  if (!svixId || !svixTimestamp || !svixSignature) {
    return new Response("Missing Svix headers", { status: 400 });
  }

  const rawBody = await request.text();

  let event: ClerkEvent;
  try {
    const wh = new Webhook(webhookSecret);
    event = wh.verify(rawBody, {
      "svix-id": svixId,
      "svix-timestamp": svixTimestamp,
      "svix-signature": svixSignature,
    }) as ClerkEvent;
  } catch (err) {
    logger.warn({ err }, "Clerk webhook signature verification failed");
    return new Response("Invalid signature", { status: 400 });
  }

  const { type, data } = event;
  logger.info({ type }, "Processing Clerk webhook event");

  try {
    switch (type) {
      // ─── Organization created → Company ──────────────────────────────────
      case "organization.created": {
        const orgId = data.id as string;
        const name = (data.name as string) || "Unnamed Company";
        const slug = generateSlug(name);
        const creatorUserId = data.created_by as string;

        const existing = await CompanyRepo.findByClerkOrg(orgId);
        if (!existing) {
          const company = await CompanyRepo.create(orgId, {
            name,
            slug,
            country: "SA", // default; updated during onboarding
            locale: "en",
          });

          // Add the creator as owner
          if (creatorUserId) {
            await CompanyRepo.createMember(company.id, creatorUserId, "owner");
          }

          logger.info({ companyId: company.id, orgId }, "Company created from Clerk org");
        }
        break;
      }

      // ─── User created → Talent (if not in an org context) ────────────────
      case "user.created": {
        const clerkUserId = data.id as string;
        const firstName = (data.first_name as string) || "";
        const lastName = (data.last_name as string) || "";
        const displayName = `${firstName} ${lastName}`.trim() || "New User";

        // Only create a talent row if the user is not part of any org yet
        // (org members get their CompanyUser row via organizationMembership events)
        const existing = await TalentRepo.findByClerkUser(clerkUserId);
        if (!existing) {
          let handle = generateHandle(displayName);

          // Ensure handle uniqueness
          let attempts = 0;
          while (await TalentRepo.findByHandle(handle) && attempts < 5) {
            handle = generateHandle(displayName);
            attempts++;
          }

          await TalentRepo.create({
            clerkUserId,
            handle,
            displayName,
            country: "SA", // default; updated during onboarding
            locale: "en",
          });

          logger.info({ clerkUserId, handle }, "Talent created from Clerk user");
        }
        break;
      }

      // ─── Org membership created → CompanyUser ────────────────────────────
      case "organizationMembership.created": {
        const clerkUserId = (data.public_user_data as Record<string, unknown>)?.user_id as string;
        const orgId = (data.organization as Record<string, unknown>)?.id as string;
        const clerkRole = data.role as string;

        const company = await CompanyRepo.findByClerkOrg(orgId);
        if (company && clerkUserId) {
          const role = clerkRole === "org:admin" ? "admin" : "viewer";
          await CompanyRepo.createMember(company.id, clerkUserId, role);
          logger.info({ companyId: company.id, clerkUserId }, "CompanyUser synced from Clerk membership");
        }
        break;
      }

      // ─── Org membership deleted → Remove CompanyUser ─────────────────────
      case "organizationMembership.deleted": {
        const clerkUserId = (data.public_user_data as Record<string, unknown>)?.user_id as string;
        const orgId = (data.organization as Record<string, unknown>)?.id as string;

        const company = await CompanyRepo.findByClerkOrg(orgId);
        if (company && clerkUserId) {
          await CompanyRepo.removeMember(company.id, clerkUserId).catch(() => {
            // Member may already be removed
          });
        }
        break;
      }

      default:
        logger.debug({ type }, "Unhandled Clerk webhook event type");
    }
  } catch (err) {
    logger.error({ err, type }, "Error processing Clerk webhook event");
    return new Response("Internal server error", { status: 500 });
  }

  return new Response("OK", { status: 200 });
}
