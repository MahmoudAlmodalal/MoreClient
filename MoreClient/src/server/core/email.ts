import type { ReactElement } from "react";
import { logger } from "./logger";

const FROM_ADDRESS = "clientMORE <noreply@clientmore.com>";

export interface SendEmailArgs {
  to: string;
  subject: string;
  react: ReactElement;
}

/**
 * Render a React Email component and send it via Resend.
 *
 * Mirrors the graceful degradation used elsewhere: if `RESEND_API_KEY` is not
 * configured (dev without secrets) this is a no-op that logs a warning, and any
 * delivery failure is logged rather than thrown — callers (Inngest functions)
 * should never crash because an email could not be sent.
 *
 * @returns true if the email was handed off to Resend, false otherwise.
 */
export async function sendEmail({ to, subject, react }: SendEmailArgs): Promise<boolean> {
  const resendKey = process.env.RESEND_API_KEY;
  if (!resendKey) {
    logger.warn({ to, subject }, "RESEND_API_KEY not configured; email skipped");
    return false;
  }

  try {
    const { render } = await import("@react-email/components");
    const { Resend } = await import("resend");

    const html = await render(react);
    const resend = new Resend(resendKey);
    await resend.emails.send({ from: FROM_ADDRESS, to, subject, html });

    logger.info({ to, subject }, "email sent via Resend");
    return true;
  } catch (err) {
    logger.warn({ to, subject, err: (err as Error).message }, "Resend delivery failed");
    return false;
  }
}
