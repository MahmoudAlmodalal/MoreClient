import { LandingFooter } from "@/components/landing/landing-footer";
import { LandingNav } from "@/components/landing/landing-nav";
import { Container } from "@/components/ui/container";

export default function TermsPage() {
  return (
    <main className="min-h-screen bg-[#050508]">
      <LandingNav />
      <section className="py-16 sm:py-24">
        <Container className="max-w-3xl">
          <p className="text-sm font-semibold uppercase text-brand-400">Legal</p>
          <h1 className="mt-3 text-4xl font-bold text-white">Terms of Service</h1>
          <p className="mt-4 text-sm leading-7 text-gray-400">
            These terms describe the basic expectations for using clientMORE as a
            business support automation platform.
          </p>

          <div className="mt-10 space-y-8 text-sm leading-7 text-gray-400">
            <section>
              <h2 className="text-lg font-semibold text-white">Acceptable Use</h2>
              <p className="mt-2">
                You are responsible for the documents, prompts, channel credentials, and
                customer conversations connected to your workspace. Do not use the
                service for unlawful, abusive, or deceptive activity.
              </p>
            </section>

            <section>
              <h2 className="text-lg font-semibold text-white">AI Responses</h2>
              <p className="mt-2">
                AI-generated answers should be reviewed for critical workflows. The
                platform includes human handoff tools for conversations that need human
                judgment or fall below confidence thresholds.
              </p>
            </section>

            <section>
              <h2 className="text-lg font-semibold text-white">Subscriptions</h2>
              <p className="mt-2">
                Plan limits control monthly AI message capacity and support features.
                Subscription details may change as packaging is finalized.
              </p>
            </section>

            <section>
              <h2 className="text-lg font-semibold text-white">Contact</h2>
              <p className="mt-2">
                For service questions, contact support@moreclient.com.
              </p>
            </section>
          </div>
        </Container>
      </section>
      <LandingFooter />
    </main>
  );
}
