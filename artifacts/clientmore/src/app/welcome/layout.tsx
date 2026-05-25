import type { Metadata } from "@/lib/next-shim";

export const metadata: Metadata = {
  title: "Sign in — clientMORE",
  description: "Sign in to your clientMORE dashboard.",
};

export default function WelcomeLayout({ children }: { children: React.ReactNode }) {
  return children;
}
