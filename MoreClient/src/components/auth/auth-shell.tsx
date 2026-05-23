import type { ReactNode } from "react";
import Link from "next/link";
import { Logo } from "@/components/ui/logo";

export function AuthShell({ children }: { children: ReactNode }) {
  return (
    <div className="relative flex min-h-screen flex-col items-center justify-center overflow-hidden bg-[#050508] px-5 py-12">
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute left-1/2 top-0 h-[360px] w-[640px] -translate-x-1/2 rounded-full bg-brand-700/25 blur-[120px]" />
      </div>

      <Link href="/" aria-label="clientMORE" className="relative z-10 mb-8">
        <Logo variant="dark" size="md" />
      </Link>

      <div className="relative z-10 w-full max-w-md">
        {children}
      </div>
    </div>
  );
}
