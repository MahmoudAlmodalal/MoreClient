import { LandingFooter } from "@/components/landing/landing-footer";
import { LandingNav } from "@/components/landing/landing-nav";
import { Container } from "@/components/ui/container";

export default function PrivacyPage() {
  return (
    <main className="min-h-screen bg-[#050508]">
      <LandingNav />
      <section className="py-16 sm:py-24">
        <Container className="max-w-3xl">
          <p className="text-sm font-semibold uppercase text-brand-400">Legal</p>
          <h1 className="mt-3 text-4xl font-bold text-white">Privacy Policy</h1>
          <p className="mt-4 text-sm leading-7 text-gray-400">
            clientMORE is designed for business customer support. Uploaded documents,
            channel messages, analytics, and tenant settings are used to provide the
            support experience for your workspace.
          </p>

          <div className="mt-10 space-y-8 text-sm leading-7 text-gray-400">
            <section>
              <h2 className="text-lg font-semibold text-white">Data We Handle</h2>
              <p className="mt-2">
                We may process account details, support conversations, uploaded
                knowledge-base files, integration settings, and product analytics needed
                to run the platform.
              </p>
            </section>

            <section>
              <h2 className="text-lg font-semibold text-white">How Data Is Used</h2>
              <p className="mt-2">
                Data is used to answer customer questions, route human handoffs, measure
                support performance, and maintain the service. Customer data is not used
                to train shared models.
              </p>
            </section>

            <section>
              <h2 className="text-lg font-semibold text-white">Security</h2>
              <p className="mt-2">
                Workspaces are treated as separate tenants. Production deployments
                should enable encrypted credentials, access controls, audit logs, and
                operational monitoring before handling sensitive live data.
              </p>
            </section>

            <section>
              <h2 className="text-lg font-semibold text-white">Contact</h2>
              <p className="mt-2">
                For privacy questions, contact support@moreclient.com.
              </p>
            </section>
          </div>
        </Container>
      </section>
      <LandingFooter />
    </main>
  );
}
