"use client";

import { useLanguage } from "@/components/language-provider";
import { Container } from "@/components/ui/container";
import { Logo } from "@/components/ui/logo";

export function LandingFooter() {
  const { t } = useLanguage();

  const cols = [
    {
      heading: t("footerProduct"),
      links: [
        { label: t("navFeatures"), href: "/#features" },
        { label: t("navHowItWorks"), href: "/#how" },
        { label: t("navPricing"), href: "/pricing" },
        { label: t("navFaq"), href: "/#faq" },
      ],
    },
    {
      heading: t("footerLegal"),
      links: [
        { label: t("footerPrivacy"), href: "/legal/privacy" },
        { label: t("footerTerms"), href: "/legal/terms" },
      ],
    },
    {
      heading: t("footerContact"),
      links: [{ label: "support@moreclient.com", href: "mailto:support@moreclient.com" }],
    },
  ];

  return (
    <footer className="border-t border-white/5 bg-[#07070b] py-14">
      <Container>
        <div className="grid gap-10 md:grid-cols-[1.5fr_1fr_1fr_1fr]">
          <div>
            <Logo variant="dark" size="sm" />
            <p className="mt-4 max-w-xs text-sm leading-relaxed text-gray-500">
              {t("footerTagline")}
            </p>
          </div>
          {cols.map((c) => (
            <div key={c.heading}>
              <h4 className="text-sm font-semibold text-white">{c.heading}</h4>
              <ul className="mt-4 space-y-2.5">
                {c.links.map((l) => (
                  <li key={l.label}>
                    <a href={l.href} className="text-sm text-gray-500 transition-colors hover:text-gray-300">
                      {l.label}
                    </a>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
        <div className="mt-12 border-t border-white/5 pt-6 text-center text-sm text-gray-600">
          © {new Date().getFullYear()} clientMORE. {t("footerRights")}
        </div>
      </Container>
    </footer>
  );
}
