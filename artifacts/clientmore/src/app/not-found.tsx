import Link from "@/lib/next-shim/link";
import { Home } from "lucide-react";

export default function NotFound() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-background px-4 text-center">
      <p className="text-7xl font-bold tracking-tight text-gradient-brand sm:text-8xl">404</p>
      <h1 className="mt-4 text-xl font-semibold text-foreground">Page not found</h1>
      <p className="mt-2 max-w-sm text-muted-fg">
        The page you are looking for does not exist or has been moved.
      </p>
      <Link
        href="/"
        className="mt-8 inline-flex items-center justify-center gap-2 rounded-xl gradient-brand px-5 py-2.5 text-sm font-semibold text-white shadow-[var(--shadow-brand)] transition-all hover:brightness-110 focus:outline-none focus-visible:ring-2 focus-visible:ring-ring"
      >
        <Home className="h-4 w-4" aria-hidden="true" />
        Return home
      </Link>
    </div>
  );
}
