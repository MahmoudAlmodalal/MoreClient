import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Pricing — clientMORE",
  description:
    "clientMORE pricing plans for the bilingual AI customer-support agent that answers from your documents across Web, Telegram, and WhatsApp.",
};

export default function PricingLayout({ children }: { children: React.ReactNode }) {
  return children;
}
