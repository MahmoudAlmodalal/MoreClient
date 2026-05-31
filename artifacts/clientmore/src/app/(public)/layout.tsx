import Link from "@/lib/next-shim/link";
import { Logo } from "@/components/ui/logo";

export default function PublicLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border px-4 py-3 flex items-center justify-between max-w-4xl mx-auto">
        <Link href="/" aria-label="clientMORE home" className="rounded-lg focus:outline-none focus-visible:ring-2 focus-visible:ring-ring/60">
          <Logo variant="light" size="sm" />
        </Link>
        <div className="flex items-center gap-3 text-sm">
          <Link
            href="/welcome"
            className="rounded-lg px-1 py-1 text-muted-fg transition-colors hover:text-foreground focus:outline-none focus-visible:ring-2 focus-visible:ring-ring/60"
          >
            Sign in
          </Link>
          <Link
            href="/sign-up"
            className="rounded-lg gradient-brand px-3.5 py-1.5 font-semibold text-primary-foreground shadow-[var(--shadow-brand)] transition-all hover:brightness-110 focus:outline-none focus-visible:ring-2 focus-visible:ring-ring/60"
          >
            Get started
          </Link>
        </div>
      </header>
      {children}
      <footer className="border-t border-border mt-16 px-4 py-6 text-center text-sm text-muted-fg">
        <p>
          © {new Date().getFullYear()} clientMORE. All rights reserved.{" "}
          <a href="/legal/privacy" className="rounded transition-colors hover:text-foreground hover:underline focus:outline-none focus-visible:ring-2 focus-visible:ring-ring/60">Privacy</a>
          {" · "}
          <a href="/legal/terms" className="rounded transition-colors hover:text-foreground hover:underline focus:outline-none focus-visible:ring-2 focus-visible:ring-ring/60">Terms</a>
        </p>
      </footer>
    </div>
  );
}
