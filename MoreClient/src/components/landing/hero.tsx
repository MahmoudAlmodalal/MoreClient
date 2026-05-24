"use client";

import Image from "next/image";
import {
  ArrowRight,
  Bot,
  CheckCircle2,
  MessageCircle,
  PlayCircle,
  Send,
  UserRound,
} from "lucide-react";
import { useLanguage } from "@/components/language-provider";
import { Container } from "@/components/ui/container";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

export function Hero() {
  const { t } = useLanguage();

  return (
    <div id="top" className="relative overflow-hidden border-b border-white/5 pt-12 sm:pt-16">
      <div className="pointer-events-none absolute inset-0 -z-10">
        <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(124,58,237,0.16),rgba(5,5,8,0)_54%)]" />
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_0%,rgba(255,255,255,0.09),transparent_34%)]" />
        <div className="absolute inset-x-0 bottom-0 h-px bg-gradient-to-r from-transparent via-white/10 to-transparent" />
      </div>

      <Container>
        <div className="mx-auto flex max-w-3xl flex-col items-center text-center">
          <Badge tone="brand">
            <CheckCircle2 size={14} aria-hidden="true" />
            <span>{t("heroBadge")}</span>
          </Badge>

          <h1 className="mt-6 text-4xl font-bold leading-tight text-white sm:text-5xl md:text-6xl">
            {t("heroTitle")}
          </h1>

          <p className="mt-6 max-w-2xl text-lg leading-relaxed text-gray-300">
            {t("heroSubtitle")}
          </p>

          <div className="mt-9 flex w-full flex-col items-stretch gap-3 sm:w-auto sm:flex-row sm:items-center">
            <Button href="/welcome" size="lg">
              {t("heroCtaPrimary")}
              <ArrowRight size={18} aria-hidden="true" />
            </Button>
            <Button href="#how" variant="outline" size="lg">
              <PlayCircle size={18} aria-hidden="true" />
              {t("heroCtaSecondary")}
            </Button>
          </div>
        </div>

        <div className="relative mx-auto mt-14 max-w-5xl pb-16">
          <div className="overflow-hidden rounded-2xl border border-white/10 bg-[#0b0b12] shadow-2xl shadow-black/40">
            <div className="flex items-center justify-between border-b border-white/8 bg-white/[0.03] px-4 py-3">
              <div className="flex items-center gap-1.5">
                <span className="h-2.5 w-2.5 rounded-full bg-white/15" />
                <span className="h-2.5 w-2.5 rounded-full bg-white/15" />
                <span className="h-2.5 w-2.5 rounded-full bg-white/15" />
              </div>
              <span className="text-xs font-medium text-gray-500">clientMORE live console</span>
            </div>

            <div className="grid min-h-[420px] gap-0 lg:grid-cols-[230px_1fr_300px]">
              <aside className="hidden border-e border-white/8 bg-[#07070b] p-4 lg:block">
                <Image
                  src="/clientmore-logo.jpeg"
                  alt="clientMORE"
                  width={220}
                  height={120}
                  className="h-16 w-full rounded-lg object-cover"
                  priority
                />
                <div className="mt-6 space-y-2">
                  {[
                    t("channelWidget"),
                    t("channelWhatsapp"),
                    t("channelTelegram"),
                  ].map((item, i) => (
                    <div
                      key={item}
                      className={`flex items-center gap-2 rounded-lg px-3 py-2 text-sm ${
                        i === 0 ? "bg-brand-500/15 text-white" : "text-gray-500"
                      }`}
                    >
                      <MessageCircle size={15} aria-hidden="true" />
                      <span>{item}</span>
                    </div>
                  ))}
                </div>
              </aside>

              <section className="p-4 sm:p-6">
                <div className="grid gap-3 sm:grid-cols-3">
                  {[
                    ["92%", t("kpiAnswerRate"), "text-emerald-300"],
                    ["3.2s", t("heroResponseTime"), "text-sky-300"],
                    ["24/7", t("active"), "text-brand-300"],
                  ].map(([value, label, color]) => (
                    <div key={label} className="rounded-lg border border-white/8 bg-white/[0.03] p-4">
                      <p className={`text-2xl font-bold ${color}`}>{value}</p>
                      <p className="mt-1 text-xs text-gray-500">{label}</p>
                    </div>
                  ))}
                </div>

                <div className="mt-5 rounded-lg border border-white/8 bg-[#07070b] p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-semibold text-white">{t("topQuestions")}</p>
                      <p className="mt-1 text-xs text-gray-500">{t("analyticsSub")}</p>
                    </div>
                    <Badge tone="brand">{t("active")}</Badge>
                  </div>
                  <div className="mt-5 flex h-36 items-end gap-2">
                    {[52, 74, 48, 88, 67, 96, 61, 82].map((h, i) => (
                      <div
                        key={i}
                        className="min-w-0 flex-1 rounded-t bg-gradient-to-t from-brand-700 to-cyan-300"
                        style={{ height: `${h}%`, opacity: 0.5 + i * 0.05 }}
                      />
                    ))}
                  </div>
                </div>
              </section>

              <aside className="border-t border-white/8 bg-[#101018] p-4 lg:border-s lg:border-t-0">
                <div className="flex items-center gap-2 text-sm font-semibold text-white">
                  <Bot size={17} className="text-brand-300" aria-hidden="true" />
                  {t("botBadge")}
                </div>
                <div className="mt-4 space-y-3">
                  <div className="rounded-lg bg-white/[0.06] p-3 text-sm leading-relaxed text-gray-200">
                    {t("widgetGreeting")}
                  </div>
                  <div className="ms-auto max-w-[86%] rounded-lg bg-brand-600 p-3 text-sm leading-relaxed text-white">
                    {t("widgetPlaceholder")}
                  </div>
                  <div className="rounded-lg bg-white/[0.06] p-3 text-sm leading-relaxed text-gray-200">
                    {t("aiSearching")}
                  </div>
                </div>
                <div className="mt-4 flex items-center gap-2 rounded-lg border border-white/10 bg-black/20 px-3 py-2 text-sm text-gray-500">
                  <UserRound size={15} aria-hidden="true" />
                  <span className="min-w-0 flex-1 truncate">{t("replyPlaceholder")}</span>
                  <Send size={15} className="text-brand-300" aria-hidden="true" />
                </div>
              </aside>
            </div>
          </div>
        </div>
      </Container>
    </div>
  );
}
