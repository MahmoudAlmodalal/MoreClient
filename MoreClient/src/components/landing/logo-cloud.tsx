"use client";

import { Headphones, MessageCircle, Send, Smartphone } from "lucide-react";
import { useLanguage } from "@/components/language-provider";
import { Container } from "@/components/ui/container";

export function LogoCloud() {
  const { t } = useLanguage();
  const channels = [
    { label: t("channelWidget"), icon: MessageCircle },
    { label: t("channelWhatsapp"), icon: Smartphone },
    { label: t("channelTelegram"), icon: Send },
    { label: t("handoffsTitle"), icon: Headphones },
  ];

  return (
    <div className="py-14">
      <Container>
        <p className="text-center text-sm text-gray-500">{t("heroTrustedBy")}</p>
        <div className="mt-7 flex flex-wrap items-center justify-center gap-x-10 gap-y-5">
          {channels.map((channel) => {
            const Icon = channel.icon;
            return (
            <span
              key={channel.label}
              className="inline-flex items-center gap-2 text-sm font-semibold tracking-tight text-gray-500 transition-colors hover:text-gray-300"
            >
              <Icon size={18} aria-hidden="true" />
              {channel.label}
            </span>
            );
          })}
        </div>
      </Container>
    </div>
  );
}
