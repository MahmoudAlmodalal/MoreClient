"use client";

import { ShieldCheck } from "lucide-react";
import { useLanguage } from "@/components/language-provider";

export function AboutUs() {
  const { t, language } = useLanguage();

  return (
    <section id="about" className="relative py-20 border-t border-border">
      <div className="mx-auto max-w-6xl px-5 sm:px-8">
        {/* Section Header */}
        <div className="text-center mb-14">
          <h2 className="text-3xl font-bold tracking-tight text-foreground sm:text-4xl">
            {t("aboutTitle")}
          </h2>
          <p className="mx-auto mt-4 max-w-2xl text-sm sm:text-base text-muted-fg">
            {t("aboutSubtitle")}
          </p>
        </div>

        {/* Grid Content */}
        <div className="grid gap-8 md:grid-cols-12 md:items-stretch">
          {/* About Text */}
          <div className="md:col-span-7 flex flex-col justify-center text-start space-y-5 text-sm sm:text-base leading-relaxed text-muted-fg [&_strong]:text-foreground">
            <p>
              {language === "ar" ? (
                <>
                  منصة <strong>مور ريبونس (More Response)</strong> هي نظام SaaS سحابي متكامل يهدف إلى حل الفجوة بين الشركات وعملائها. صممنا هذه المنصة لتمكين رواد الأعمال، وأصحاب العيادات الطبية، والمدارس، ومتاجر التجارة الإلكترونية من إعداد قنوات محادثات فورية مؤتمتة بنسبة 100%.
                </>
              ) : (
                <>
                  <strong>More Response</strong> is an integrated cloud SaaS platform aimed at bridging the gap between businesses and their clients. We designed this platform to empower entrepreneurs, medical clinic owners, schools, and e-commerce stores to setup 100% automated instant reply channels.
                </>
              )}
            </p>
            <p>
              {language === "ar" ? (
                <>
                  من خلال خوارزميات الذكاء الاصطناعي وبوابة الربط المباشرة مع WhatsApp API وبوابات الرسائل القصيرة، نستطيع معالجة آلاف استفسارات العملاء وحجز المواعيد والرد الفوري بدقة متناهية وسرعة مذهلة دون تشتيت فريق عملك.
                </>
              ) : (
                <>
                  Through advanced AI algorithms and direct gateway integrations with WhatsApp API and SMS providers, we process thousands of customer inquiries, bookings, and instant replies with high accuracy and speed without distracting your team.
                </>
              )}
            </p>
          </div>

          {/* Infrastructure Card */}
          <div className="md:col-span-5 flex items-center">
            <div className="w-full rounded-2xl border border-primary/20 bg-primary/[0.04] p-6 sm:p-8 text-start shadow-sm flex flex-col justify-center">
              <ShieldCheck className="w-12 h-12 text-primary mb-5" />
              <h3 className="text-lg sm:text-xl font-bold text-foreground mb-3">
                {t("aboutCardTitle")}
              </h3>
              <p className="text-xs sm:text-sm leading-relaxed text-muted-fg">
                {t("aboutCardDesc")}
              </p>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
