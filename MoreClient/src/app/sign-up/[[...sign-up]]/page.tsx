import { SignUp } from "@clerk/nextjs";
import { AuthShell, clerkAppearance } from "@/components/auth/auth-shell";

export default function SignUpPage() {
  return (
    <AuthShell>
      <SignUp
        appearance={clerkAppearance}
        signInUrl="/sign-in"
        forceRedirectUrl="/dashboard"
      />
    </AuthShell>
  );
}
