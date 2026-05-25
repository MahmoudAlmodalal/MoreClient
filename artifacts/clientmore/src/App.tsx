import { Switch, Route, Router as WouterRouter } from "wouter";
import { LanguageProvider } from "@/components/language-provider";

import HomePage from "@/app/page";
import NotFoundPage from "@/app/not-found";
import WelcomePage from "@/app/welcome/page";
import PricingPage from "@/app/pricing/page";
import SignUpPage from "@/app/sign-up/[[...sign-up]]/page";
import WidgetPage from "@/app/widget/page";
import PrivacyPage from "@/app/legal/privacy/page";
import TermsPage from "@/app/legal/terms/page";
import PublicTalentPage from "@/app/(public)/t/[handle]/page";
import PublicLayout from "@/app/(public)/layout";

import DashboardLayout from "@/app/dashboard/layout";
import DashboardHome from "@/app/dashboard/page";
import DashboardFiles from "@/app/dashboard/files/page";
import DashboardHandoffs from "@/app/dashboard/handoffs/page";
import DashboardSettings from "@/app/dashboard/settings/page";
import DashboardUpgrade from "@/app/dashboard/upgrade/page";

import AdminLayout from "@/app/admin/layout";
import AdminPage from "@/app/admin/page";

const base = (import.meta.env.BASE_URL || "/").replace(/\/$/, "");

function Dashboard({ children }: { children: React.ReactNode }) {
  return <DashboardLayout>{children}</DashboardLayout>;
}

function Admin({ children }: { children: React.ReactNode }) {
  return <AdminLayout>{children}</AdminLayout>;
}

function Public({ children }: { children: React.ReactNode }) {
  return <PublicLayout>{children}</PublicLayout>;
}

function App() {
  return (
    <LanguageProvider>
      <WouterRouter base={base}>
        <Switch>
          <Route path="/" component={HomePage} />
          <Route path="/welcome" component={WelcomePage} />
          <Route path="/pricing" component={PricingPage} />
          <Route path="/sign-up" component={SignUpPage} />
          <Route path="/sign-up/:rest*" component={SignUpPage} />
          <Route path="/widget" component={WidgetPage} />
          <Route path="/legal/privacy" component={PrivacyPage} />
          <Route path="/legal/terms" component={TermsPage} />
          <Route path="/t/:handle">
            {(params) => (
              <Public>
                <PublicTalentPage params={{ handle: params.handle }} />
              </Public>
            )}
          </Route>
          <Route path="/dashboard">
            <Dashboard>
              <DashboardHome />
            </Dashboard>
          </Route>
          <Route path="/dashboard/files">
            <Dashboard>
              <DashboardFiles />
            </Dashboard>
          </Route>
          <Route path="/dashboard/handoffs">
            <Dashboard>
              <DashboardHandoffs />
            </Dashboard>
          </Route>
          <Route path="/dashboard/settings">
            <Dashboard>
              <DashboardSettings />
            </Dashboard>
          </Route>
          <Route path="/dashboard/upgrade">
            <Dashboard>
              <DashboardUpgrade />
            </Dashboard>
          </Route>
          <Route path="/admin">
            <Admin>
              <AdminPage />
            </Admin>
          </Route>
          <Route component={NotFoundPage} />
        </Switch>
      </WouterRouter>
    </LanguageProvider>
  );
}

export default App;
