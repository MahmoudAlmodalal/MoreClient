import Link from "next/link";
import { Logo } from "@/components/ui/logo";

export default function PublicLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-white">
      <header className="border-b border-gray-100 px-4 py-3 flex items-center justify-between max-w-4xl mx-auto">
        <Link href="/" aria-label="clientMORE home" className="rounded-lg focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-400/60">
          <Logo variant="light" size="sm" />
        </Link>
        <div className="flex items-center gap-3 text-sm">
          <Link
            href="/welcome"
            className="rounded-lg px-1 py-1 text-gray-600 transition-colors hover:text-gray-900 focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-400/60"
          >
            Sign in
          </Link>
          <Link
            href="/sign-up"
            className="rounded-lg gradient-brand px-3.5 py-1.5 font-semibold text-white shadow-[var(--shadow-brand)] transition-all hover:brightness-110 focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-400/60"
          >
            Get started
          </Link>
        </div>
      </header>
      {children}
      <footer className="border-t border-gray-100 mt-16 px-4 py-6 text-center text-sm text-gray-400">
        <p>
          © {new Date().getFullYear()} clientMORE. All rights reserved.{" "}
          <a href="/legal/privacy" className="rounded hover:underline focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-400/60">Privacy</a>
          {" · "}
          <a href="/legal/terms" className="rounded hover:underline focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-400/60">Terms</a>
        </p>
      </footer>
    </div>
  );
}
