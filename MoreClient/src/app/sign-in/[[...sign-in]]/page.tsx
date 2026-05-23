import { AuthShell } from "@/components/auth/auth-shell";
import { Button } from "@/components/ui/button";

export default function SignInPage() {
  return (
    <AuthShell>
      <div className="rounded-2xl border border-[var(--border)] bg-[var(--card-bg)] p-8 text-center">
        <h1 className="text-xl font-semibold text-white">Sign in to demo mode</h1>
        <p className="mt-2 text-sm leading-relaxed text-gray-400">
          Authentication has been removed for the frontend-only demo. Continue straight to the
          dashboard to explore the product UI.
        </p>
        <div className="mt-6 flex flex-col gap-3">
          <Button href="/dashboard" size="lg" className="w-full">
            Continue to Dashboard
          </Button>
          <Button href="/" variant="outline" size="lg" className="w-full">
            Back to Home
          </Button>
        </div>
      </div>
    </AuthShell>
  );
}
