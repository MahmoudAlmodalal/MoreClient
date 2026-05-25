export const runtime = "edge";
export const revalidate = 60;

import type { Metadata } from "next";

interface PageProps {
  params: Promise<{ handle: string }>;
}

const demoTalent = {
  displayName: "Maya Haddad",
  headline: "Bilingual customer support automation specialist",
  bio: "Maya helps growing teams turn messy support knowledge into fast, friendly Arabic and English customer experiences. This demo profile is static and does not depend on an API or database.",
  country: "Palestine",
  hourlyRate: 65,
  currency: "USD",
  availability: "Available",
  yearsExperience: 7,
  verificationStatus: "Verified",
  memberSince: "2025-09-12T00:00:00.000Z",
  skills: [
    { slug: "support-ops", name: "Support operations", level: "expert", yearsExp: 7 },
    { slug: "arabic-content", name: "Arabic content", level: "expert", yearsExp: 6 },
    { slug: "automation", name: "Automation design", level: "advanced", yearsExp: 5 },
    { slug: "analytics", name: "Analytics reporting", level: "advanced", yearsExp: 4 },
  ],
  experience: [
    {
      id: "exp-1",
      company: "Levant Retail Group",
      title: "Customer Experience Automation Lead",
      startDate: "2023-02-01T00:00:00.000Z",
      endDate: null,
      description:
        "Designed bilingual answer flows, reduced repeated tickets, and built weekly insight reports for operations teams.",
    },
    {
      id: "exp-2",
      company: "North Star SaaS",
      title: "Support Knowledge Manager",
      startDate: "2020-05-01T00:00:00.000Z",
      endDate: "2023-01-01T00:00:00.000Z",
      description:
        "Owned help center taxonomy, escalation rules, and quality review for a distributed support team.",
    },
  ],
  portfolio: [
    {
      id: "portfolio-1",
      title: "Bilingual FAQ Launch",
      description:
        "Converted a scattered internal FAQ into a polished self-service experience for Arabic and English customers.",
    },
    {
      id: "portfolio-2",
      title: "Handoff Quality Dashboard",
      description:
        "Created an operations view that tracks unresolved questions, confidence gaps, and agent response quality.",
    },
  ],
  languages: [
    { locale: "ar", proficiency: "Native" },
    { locale: "en", proficiency: "Fluent" },
  ],
  reviews: [
    {
      id: "review-1",
      rating: 5,
      reviewerType: "Company",
      createdAt: "2026-03-18T00:00:00.000Z",
      comment:
        "Maya understood our support workflow immediately and made the demo experience feel production-ready.",
    },
    {
      id: "review-2",
      rating: 5,
      reviewerType: "Company",
      createdAt: "2026-01-07T00:00:00.000Z",
      comment:
        "Clear thinking, strong bilingual writing, and excellent judgment around escalation rules.",
    },
  ],
};

function averageRating() {
  return demoTalent.reviews.reduce((sum, review) => sum + review.rating, 0) / demoTalent.reviews.length;
}

function formatDateRange(start: string, end: string | null): string {
  const fmt = (date: string) =>
    new Date(date).toLocaleDateString("en-US", { year: "numeric", month: "short" });

  return end ? `${fmt(start)} - ${fmt(end)}` : `${fmt(start)} - Present`;
}

function StarRating({ rating }: { rating: number }) {
  return (
    <span className="flex items-center gap-0.5" aria-label={`${rating} out of 5 stars`}>
      {[1, 2, 3, 4, 5].map((star) => (
        <svg
          key={star}
          className={`h-4 w-4 ${star <= Math.round(rating) ? "text-amber-400" : "text-gray-200"}`}
          fill="currentColor"
          viewBox="0 0 20 20"
          aria-hidden="true"
        >
          <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
        </svg>
      ))}
    </span>
  );
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { handle } = await params;
  const title = `${demoTalent.displayName} (@${handle}) - clientMORE`;

  return {
    title,
    description: demoTalent.headline,
    openGraph: {
      title,
      description: demoTalent.headline,
      type: "profile",
    },
    twitter: { card: "summary", title, description: demoTalent.headline },
  };
}

export default async function TalentPublicProfilePage({ params }: PageProps) {
  const { handle } = await params;
  const rating = averageRating();

  return (
    <main className="mx-auto max-w-4xl px-4 py-10 text-gray-900">
      <section className="flex flex-col gap-6 sm:flex-row sm:items-start">
        <div className="flex h-24 w-24 shrink-0 items-center justify-center rounded-full bg-gray-900 text-3xl font-bold text-white">
          {demoTalent.displayName.charAt(0)}
        </div>

        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <h1 className="text-2xl font-bold">{demoTalent.displayName}</h1>
            <span className="rounded-full bg-blue-100 px-2 py-0.5 text-xs font-medium text-blue-700">
              {demoTalent.verificationStatus}
            </span>
            <span className="rounded-full bg-green-100 px-2 py-0.5 text-xs font-medium text-green-700">
              {demoTalent.availability}
            </span>
          </div>
          <p className="mt-1 text-sm text-gray-500">@{handle}</p>
          <p className="mt-2 text-lg text-gray-700">{demoTalent.headline}</p>

          <div className="mt-4 flex flex-wrap items-center gap-3 text-sm text-gray-600">
            <span>{demoTalent.country}</span>
            <span>
              {demoTalent.hourlyRate} {demoTalent.currency}/hr
            </span>
            <span>{demoTalent.yearsExperience}+ yrs exp</span>
            <span className="flex items-center gap-1.5 text-gray-800">
              <StarRating rating={rating} />
              <span className="font-medium">{rating.toFixed(1)}</span>
              <span className="text-gray-400">({demoTalent.reviews.length})</span>
            </span>
          </div>
        </div>
      </section>

      <section className="mt-10">
        <h2 className="text-lg font-semibold">About</h2>
        <p className="mt-2 leading-relaxed text-gray-700">{demoTalent.bio}</p>
      </section>

      <section className="mt-10">
        <h2 className="text-lg font-semibold">Skills</h2>
        <div className="mt-3 flex flex-wrap gap-2">
          {demoTalent.skills.map((skill) => (
            <span key={skill.slug} className="rounded-full bg-gray-100 px-3 py-1.5 text-sm">
              <span className="font-medium">{skill.name}</span>
              <span className="ml-1 text-xs capitalize text-gray-400">
                {skill.level} - {skill.yearsExp}y
              </span>
            </span>
          ))}
        </div>
      </section>

      <section className="mt-10">
        <h2 className="text-lg font-semibold">Experience</h2>
        <div className="mt-4 space-y-4">
          {demoTalent.experience.map((item) => (
            <div key={item.id} className="border-l-2 border-gray-200 pl-4">
              <p className="font-semibold">{item.title}</p>
              <p className="text-sm text-gray-500">
                {item.company} - {formatDateRange(item.startDate, item.endDate)}
              </p>
              <p className="mt-1 text-sm leading-relaxed text-gray-700">{item.description}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="mt-10">
        <h2 className="text-lg font-semibold">Portfolio</h2>
        <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2">
          {demoTalent.portfolio.map((item) => (
            <article key={item.id} className="rounded-xl border border-gray-200 p-4">
              <p className="font-medium">{item.title}</p>
              <p className="mt-1 text-sm leading-relaxed text-gray-600">{item.description}</p>
            </article>
          ))}
        </div>
      </section>

      <section className="mt-10">
        <h2 className="text-lg font-semibold">Languages</h2>
        <div className="mt-2 flex flex-wrap gap-3 text-sm text-gray-700">
          {demoTalent.languages.map((language) => (
            <span key={language.locale}>
              <span className="font-medium">{language.locale.toUpperCase()}</span>
              <span className="text-gray-400"> - {language.proficiency}</span>
            </span>
          ))}
        </div>
      </section>

      <section className="mt-10">
        <div className="mb-4 flex flex-wrap items-center gap-3">
          <h2 className="text-lg font-semibold">Reviews</h2>
          <span className="flex items-center gap-1.5 text-sm">
            <StarRating rating={rating} />
            <span className="font-semibold">{rating.toFixed(1)}</span>
            <span className="text-gray-500">({demoTalent.reviews.length} reviews)</span>
          </span>
        </div>
        <div className="space-y-4">
          {demoTalent.reviews.map((review) => (
            <article key={review.id} className="rounded-xl border border-gray-100 p-4">
              <div className="mb-2 flex items-center justify-between">
                <StarRating rating={review.rating} />
                <span className="text-xs text-gray-400">
                  {new Date(review.createdAt).toLocaleDateString("en-US", {
                    year: "numeric",
                    month: "short",
                  })}
                </span>
              </div>
              <p className="text-sm leading-relaxed text-gray-700">{review.comment}</p>
              <p className="mt-2 text-xs text-gray-400">{review.reviewerType}</p>
            </article>
          ))}
        </div>
      </section>

      <section className="mt-10 flex flex-col gap-3 border-t border-gray-200 pt-6 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-sm text-gray-500">
          Demo member since{" "}
          {new Date(demoTalent.memberSince).toLocaleDateString("en-US", {
            year: "numeric",
            month: "long",
          })}
        </p>
        <a
          href="/dashboard"
          className="inline-flex items-center justify-center rounded-lg bg-gray-900 px-5 py-2.5 text-sm font-medium text-white transition-colors hover:bg-gray-800"
        >
          Open frontend demo
        </a>
      </section>
    </main>
  );
}
