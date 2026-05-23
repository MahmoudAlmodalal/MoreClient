"use client";

import { useLanguage } from "@/components/language-provider";
import { Container } from "@/components/ui/container";

const COMPANIES = ["CloudSys", "NexusHub", "InnovateX", "GlobalNet", "TechCorp"];

export function LogoCloud() {
  const { t } = useLanguage();

  return (
    <div className="py-14">
      <Container>
        <p className="text-center text-sm text-gray-500">{t("heroTrustedBy")}</p>
        <div className="mt-7 flex flex-wrap items-center justify-center gap-x-10 gap-y-5">
          {COMPANIES.map((name) => (
            <span
              key={name}
              className="text-lg font-semibold tracking-tight text-gray-600 transition-colors hover:text-gray-400"
            >
              {name}
            </span>
          ))}
        </div>
      </Container>
    </div>
  );
}
