import * as React from "react";
import { Body, Container, Head, Heading, Hr, Html, Link, Preview, Section, Text } from "@react-email/components";

export interface EmailLayoutProps {
  preview: string;
  heading: string;
  children: React.ReactNode;
  unsubscribeUrl?: string;
}

const main = { backgroundColor: "#f4f4f7", fontFamily: "Helvetica, Arial, sans-serif", padding: "24px 0" };
const container = { backgroundColor: "#ffffff", borderRadius: "12px", margin: "0 auto", maxWidth: "560px", padding: "32px" };
const brand = { color: "#7c3aed", fontSize: "20px", fontWeight: 700 as const, margin: "0 0 16px" };
const headingStyle = { color: "#0f0f17", fontSize: "20px", fontWeight: 600 as const, margin: "0 0 16px" };
const footer = { color: "#8a8a99", fontSize: "12px", margin: "24px 0 0" };
const link = { color: "#7c3aed" };

/** Shared clientMORE-branded shell for all transactional emails. */
export function EmailLayout({ preview, heading, children, unsubscribeUrl }: EmailLayoutProps) {
  return (
    <Html>
      <Head />
      <Preview>{preview}</Preview>
      <Body style={main}>
        <Container style={container}>
          <Text style={brand}>clientMORE</Text>
          <Heading style={headingStyle}>{heading}</Heading>
          <Section>{children}</Section>
          <Hr style={{ borderColor: "#eaeaef", margin: "24px 0" }} />
          <Text style={footer}>
            You are receiving this email because of activity on your clientMORE account.
            {unsubscribeUrl ? (
              <>
                {" "}
                <Link href={unsubscribeUrl} style={link}>
                  Unsubscribe from these emails
                </Link>
                .
              </>
            ) : null}
          </Text>
        </Container>
      </Body>
    </Html>
  );
}

const paragraph = { color: "#33333d", fontSize: "14px", lineHeight: "22px", margin: "0 0 12px" };
const button = {
  backgroundColor: "#7c3aed",
  borderRadius: "8px",
  color: "#ffffff",
  display: "inline-block",
  fontSize: "14px",
  fontWeight: 600 as const,
  padding: "10px 20px",
  textDecoration: "none",
};

export function EmailText({ children }: { children: React.ReactNode }) {
  return <Text style={paragraph}>{children}</Text>;
}

export function EmailButton({ href, children }: { href: string; children: React.ReactNode }) {
  return (
    <Link href={href} style={button}>
      {children}
    </Link>
  );
}
