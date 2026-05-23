import { AuthShell } from "@/components/auth/auth-shell";
import { Button } from "@/components/ui/button";

export default function SignUpPage() {
  return (
    <AuthShell>
      <div className="rounded-2xl border border-[var(--border)] bg-[var(--card-bg)] p-8 text-center">
        <h1 className="text-xl font-semibold text-white">Create a demo workspace</h1>
        <p className="mt-2 text-sm leading-relaxed text-gray-400">
          Account creation has been removed with the backend. The demo opens directly into the
          dashboard with local sample data.
        </p>
        <div className="mt-6 flex flex-col gap-3">
          <Button href="/dashboard" size="lg" className="w-full">
            Open Demo Dashboard
          </Button>
          <Button href="/" variant="outline" size="lg" className="w-full">
            Back to Home
          </Button>
        </div>
      </div>
    </AuthShell>
  );
}
