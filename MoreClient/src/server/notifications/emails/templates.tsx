import * as React from "react";
import { EmailLayout, EmailText, EmailButton } from "./Layout";

const APP_URL = process.env.NEXT_PUBLIC_APP_URL ?? "https://clientmore.com";
const dashboardUrl = (path = "") => `${APP_URL}/dashboard${path}`;

export function NewProposalEmail({ jobTitle, talentName }: { jobTitle: string; talentName: string }) {
  return (
    <EmailLayout preview={`New proposal for ${jobTitle}`} heading="You received a new proposal">
      <EmailText>
        <strong>{talentName}</strong> submitted a proposal for your job <strong>{jobTitle}</strong>.
      </EmailText>
      <EmailButton href={dashboardUrl("/proposals")}>Review proposal</EmailButton>
    </EmailLayout>
  );
}

export function ContractSignedEmail({ jobTitle }: { jobTitle: string }) {
  return (
    <EmailLayout preview={`Contract signed for ${jobTitle}`} heading="Your contract is now active">
      <EmailText>
        Both parties have signed the contract for <strong>{jobTitle}</strong>. Work can now begin.
      </EmailText>
      <EmailButton href={dashboardUrl("/contracts")}>View contract</EmailButton>
    </EmailLayout>
  );
}

export function MilestoneFundedEmail({ milestoneTitle, amount }: { milestoneTitle: string; amount: string }) {
  return (
    <EmailLayout preview={`Milestone funded: ${milestoneTitle}`} heading="A milestone was funded">
      <EmailText>
        The milestone <strong>{milestoneTitle}</strong> ({amount}) has been funded into escrow. You can start work
        with confidence that payment is secured.
      </EmailText>
      <EmailButton href={dashboardUrl("/contracts")}>View milestone</EmailButton>
    </EmailLayout>
  );
}

export function MilestoneReleasedEmail({ milestoneTitle, amount }: { milestoneTitle: string; amount: string }) {
  return (
    <EmailLayout preview={`Payment released: ${milestoneTitle}`} heading="A payment was released to you">
      <EmailText>
        The milestone <strong>{milestoneTitle}</strong> ({amount}) has been approved and released. Funds are on their
        way to your connected payout account.
      </EmailText>
      <EmailButton href={dashboardUrl("/contracts")}>View details</EmailButton>
    </EmailLayout>
  );
}

export function MessageReceivedEmail({ senderName }: { senderName: string }) {
  return (
    <EmailLayout preview={`New message from ${senderName}`} heading="You have a new message">
      <EmailText>
        <strong>{senderName}</strong> sent you a new message on clientMORE.
      </EmailText>
      <EmailButton href={dashboardUrl("/messages")}>Read message</EmailButton>
    </EmailLayout>
  );
}

export function VerificationApprovedEmail() {
  return (
    <EmailLayout preview="Your account is verified" heading="Verification approved 🎉">
      <EmailText>
        Good news — your clientMORE account has been verified. The verified badge now appears on your profile,
        increasing trust with the people you work with.
      </EmailText>
      <EmailButton href={dashboardUrl()}>Go to dashboard</EmailButton>
    </EmailLayout>
  );
}

export function VerificationRejectedEmail({ reason }: { reason?: string }) {
  return (
    <EmailLayout preview="Verification update" heading="Verification could not be completed">
      <EmailText>
        We were unable to verify your account at this time.
        {reason ? (
          <>
            {" "}
            Reason: <strong>{reason}</strong>.
          </>
        ) : null}{" "}
        You can review your details and try again.
      </EmailText>
      <EmailButton href={dashboardUrl("/settings")}>Review details</EmailButton>
    </EmailLayout>
  );
}

export function AccountSuspendedEmail({ reason, banned }: { reason?: string; banned?: boolean }) {
  return (
    <EmailLayout
      preview={banned ? "Your account has been banned" : "Your account has been suspended"}
      heading={banned ? "Your account has been banned" : "Your account has been suspended"}
    >
      <EmailText>
        Your clientMORE account has been {banned ? "banned" : "suspended"} following a review.
        {reason ? (
          <>
            {" "}
            Reason: <strong>{reason}</strong>.
          </>
        ) : null}
      </EmailText>
      <EmailText>If you believe this was a mistake, please contact support.</EmailText>
    </EmailLayout>
  );
}

export interface DigestJob {
  id: string;
  title: string;
  budget?: string | null;
}
export interface DigestTalent {
  id: string;
  handle: string;
  displayName: string;
  headline?: string | null;
}

export function WeeklyDigestEmail({
  audience,
  jobs,
  talent,
  unsubscribeUrl,
}: {
  audience: "talent" | "company";
  jobs?: DigestJob[];
  talent?: DigestTalent[];
  unsubscribeUrl: string;
}) {
  const heading = audience === "talent" ? "New jobs matching your skills" : "New talent matching your jobs";
  return (
    <EmailLayout preview={heading} heading={heading} unsubscribeUrl={unsubscribeUrl}>
      {audience === "talent" ? (
        <>
          {(jobs ?? []).map((j) => (
            <EmailText key={j.id}>
              <strong>{j.title}</strong>
              {j.budget ? ` — ${j.budget}` : ""}
            </EmailText>
          ))}
          <EmailButton href={`${APP_URL}/dashboard`}>Browse jobs</EmailButton>
        </>
      ) : (
        <>
          {(talent ?? []).map((t) => (
            <EmailText key={t.id}>
              <strong>{t.displayName}</strong>
              {t.headline ? ` — ${t.headline}` : ""}
            </EmailText>
          ))}
          <EmailButton href={`${APP_URL}/dashboard`}>Discover talent</EmailButton>
        </>
      )}
    </EmailLayout>
  );
}
