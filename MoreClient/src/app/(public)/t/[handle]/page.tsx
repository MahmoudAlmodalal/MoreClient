export const revalidate = 300; // 5-minute ISR

import { notFound } from "next/navigation";
import { prisma } from "@/server/core/db";
import { ReviewRepo } from "@/server/reviews/repo";
import type { Metadata } from "next";

interface PageProps {
  params: Promise<{ handle: string }>;
}

async function getTalentProfile(handle: string) {
  return prisma.talent.findFirst({
    where: {
      handle,
      status: "active",
      deletedAt: null,
      searchVisibility: "public",
    },
    select: {
      id: true,
      handle: true,
      displayName: true,
      headline: true,
      bio: true,
      country: true,
      avatarUrl: true,
      hourlyRate: true,
      currency: true,
      availability: true,
      yearsExperience: true,
      verificationStatus: true,
      featuredUntil: true,
      createdAt: true,
      skills: {
        select: {
          level: true,
          yearsExp: true,
          skill: { select: { slug: true, nameEn: true, nameAr: true, category: true } },
        },
      },
      portfolio: {
        select: { id: true, title: true, description: true, mediaUrls: true, url: true },
        take: 6,
        orderBy: { createdAt: "desc" },
      },
      experience: {
        select: { id: true, company: true, title: true, startDate: true, endDate: true, description: true },
        orderBy: { startDate: "desc" },
      },
      languages: { select: { locale: true, proficiency: true } },
    },
  });
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { handle } = await params;
  const talent = await getTalentProfile(handle);
  if (!talent) return { title: "Profile not found" };

  const title = `${talent.displayName} — clientMORE`;
  const description =
    talent.headline ?? talent.bio?.slice(0, 160) ?? `${talent.displayName}'s talent profile on clientMORE`;

  return {
    title,
    description,
    openGraph: {
      title,
      description,
      images: talent.avatarUrl ? [{ url: talent.avatarUrl, alt: talent.displayName }] : [],
      type: "profile",
    },
    twitter: { card: "summary", title, description },
    alternates: { canonical: `https://clientmore.com/t/${handle}` },
  };
}

const PROFICIENCY_LABELS: Record<string, string> = {
  native: "Native",
  fluent: "Fluent",
  conversational: "Conversational",
  basic: "Basic",
};

const AVAILABILITY_BADGE: Record<string, { label: string; color: string }> = {
  available: { label: "Available", color: "bg-green-100 text-green-800" },
  limited: { label: "Limited", color: "bg-yellow-100 text-yellow-800" },
  unavailable: { label: "Unavailable", color: "bg-gray-100 text-gray-600" },
};

function formatDateRange(start: Date, end: Date | null): string {
  const fmt = (d: Date) => d.toLocaleDateString("en-US", { year: "numeric", month: "short" });
  return end ? `${fmt(start)} – ${fmt(end)}` : `${fmt(start)} – Present`;
}

function StarRating({ rating }: { rating: number }) {
  return (
    <span className="flex items-center gap-0.5">
      {[1, 2, 3, 4, 5].map((star) => (
        <svg
          key={star}
          className={`w-4 h-4 ${star <= Math.round(rating) ? "text-amber-400" : "text-gray-200"}`}
          fill="currentColor"
          viewBox="0 0 20 20"
        >
          <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
        </svg>
      ))}
    </span>
  );
}

export default async function TalentPublicProfilePage({ params }: PageProps) {
  const { handle } = await params;

  const [talent, reviewData] = await Promise.all([
    getTalentProfile(handle),
    (async () => {
      // Will be populated after talent id is known; pre-fetch a placeholder
      return null;
    })(),
  ]);

  if (!talent) notFound();

  const [{ items: reviews, avgRating, reviewCount }] = await Promise.all([
    ReviewRepo.listByTarget(talent.id, "talent", { limit: 5 }).then(async (r) => {
      const agg = await ReviewRepo.aggregateRating(talent.id);
      return { ...r, avgRating: agg.avg, reviewCount: agg.count };
    }),
  ]);

  const isFeatured = talent.featuredUntil && talent.featuredUntil > new Date();
  const avail = AVAILABILITY_BADGE[talent.availability] ?? AVAILABILITY_BADGE.unavailable;

  return (
    <main className="max-w-4xl mx-auto px-4 py-10 space-y-10">
      {/* ── Header ── */}
      <section className="flex flex-col sm:flex-row gap-6 items-start">
        {talent.avatarUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={talent.avatarUrl}
            alt={talent.displayName}
            className="w-24 h-24 rounded-full object-cover shrink-0"
            loading="eager"
          />
        ) : (
          <div className="w-24 h-24 rounded-full bg-gray-200 flex items-center justify-center text-3xl font-bold text-gray-500 shrink-0">
            {talent.displayName.charAt(0).toUpperCase()}
          </div>
        )}

        <div className="flex-1 min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <h1 className="text-2xl font-bold text-gray-900">{talent.displayName}</h1>
            {talent.verificationStatus === "verified" && (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-700">
                ✓ Verified
              </span>
            )}
            {isFeatured && (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-amber-100 text-amber-700">
                ★ Featured
              </span>
            )}
          </div>

          {talent.headline && (
            <p className="mt-1 text-gray-600 text-lg">{talent.headline}</p>
          )}

          <div className="mt-3 flex flex-wrap gap-2 text-sm items-center">
            <span className={`px-2 py-0.5 rounded-full font-medium ${avail.color}`}>
              {avail.label}
            </span>
            {talent.country && <span className="text-gray-500">📍 {talent.country}</span>}
            {talent.hourlyRate && (
              <span className="text-gray-500">
                {talent.hourlyRate} {talent.currency}/hr
              </span>
            )}
            {talent.yearsExperience && (
              <span className="text-gray-500">{talent.yearsExperience}+ yrs exp</span>
            )}
            {reviewCount > 0 && (
              <span className="flex items-center gap-1 text-gray-700">
                <StarRating rating={avgRating} />
                <span className="font-medium">{avgRating.toFixed(1)}</span>
                <span className="text-gray-400">({reviewCount})</span>
              </span>
            )}
          </div>
        </div>
      </section>

      {/* ── Bio ── */}
      {talent.bio && (
        <section>
          <h2 className="text-lg font-semibold text-gray-900 mb-2">About</h2>
          <p className="text-gray-700 leading-relaxed whitespace-pre-wrap">{talent.bio}</p>
        </section>
      )}

      {/* ── Skills ── */}
      {talent.skills.length > 0 && (
        <section>
          <h2 className="text-lg font-semibold text-gray-900 mb-3">Skills</h2>
          <div className="flex flex-wrap gap-2">
            {talent.skills.map(({ skill, level, yearsExp }) => (
              <div
                key={skill.slug}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-gray-100 text-sm"
              >
                <span className="font-medium text-gray-800">{skill.nameEn}</span>
                <span className="text-gray-400 capitalize text-xs">{level}</span>
                {yearsExp && <span className="text-gray-400 text-xs">· {yearsExp}y</span>}
              </div>
            ))}
          </div>
        </section>
      )}

      {/* ── Experience ── */}
      {talent.experience.length > 0 && (
        <section>
          <h2 className="text-lg font-semibold text-gray-900 mb-3">Experience</h2>
          <div className="space-y-4">
            {talent.experience.map((exp) => (
              <div key={exp.id} className="border-l-2 border-gray-200 pl-4">
                <p className="font-semibold text-gray-900">{exp.title}</p>
                <p className="text-gray-600 text-sm">
                  {exp.company} · {formatDateRange(exp.startDate, exp.endDate)}
                </p>
                {exp.description && (
                  <p className="mt-1 text-gray-700 text-sm">{exp.description}</p>
                )}
              </div>
            ))}
          </div>
        </section>
      )}

      {/* ── Portfolio ── */}
      {talent.portfolio.length > 0 && (
        <section>
          <h2 className="text-lg font-semibold text-gray-900 mb-3">Portfolio</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {talent.portfolio.map((item) => (
              <div
                key={item.id}
                className="border border-gray-200 rounded-xl p-4 hover:border-gray-400 transition-colors"
              >
                {item.mediaUrls.length > 0 && (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={item.mediaUrls[0]}
                    alt={item.title}
                    className="w-full h-36 object-cover rounded-lg mb-3"
                    loading="lazy"
                  />
                )}
                <p className="font-medium text-gray-900">{item.title}</p>
                {item.description && (
                  <p className="text-gray-600 text-sm mt-1 line-clamp-2">{item.description}</p>
                )}
                {item.url && (
                  <a
                    href={item.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="mt-2 inline-block text-sm text-blue-600 hover:underline"
                  >
                    View project →
                  </a>
                )}
              </div>
            ))}
          </div>
        </section>
      )}

      {/* ── Languages ── */}
      {talent.languages.length > 0 && (
        <section>
          <h2 className="text-lg font-semibold text-gray-900 mb-2">Languages</h2>
          <div className="flex flex-wrap gap-3">
            {talent.languages.map(({ locale, proficiency }) => (
              <span key={locale} className="text-sm text-gray-700">
                <span className="font-medium">{locale.toUpperCase()}</span>
                <span className="text-gray-400"> · {PROFICIENCY_LABELS[proficiency] ?? proficiency}</span>
              </span>
            ))}
          </div>
        </section>
      )}

      {/* ── Reviews ── */}
      {reviewCount > 0 && (
        <section>
          <div className="flex items-center gap-3 mb-4">
            <h2 className="text-lg font-semibold text-gray-900">Reviews</h2>
            <span className="flex items-center gap-1.5">
              <StarRating rating={avgRating} />
              <span className="font-semibold text-gray-900">{avgRating.toFixed(1)}</span>
              <span className="text-gray-500 text-sm">({reviewCount} review{reviewCount !== 1 ? "s" : ""})</span>
            </span>
          </div>
          <div className="space-y-4">
            {reviews.map((review) => (
              <div key={review.id} className="border border-gray-100 rounded-xl p-4">
                <div className="flex items-center justify-between mb-2">
                  <StarRating rating={review.rating} />
                  <span className="text-xs text-gray-400">
                    {review.createdAt.toLocaleDateString("en-US", {
                      year: "numeric",
                      month: "short",
                    })}
                  </span>
                </div>
                {review.comment && (
                  <p className="text-gray-700 text-sm leading-relaxed">{review.comment}</p>
                )}
                <p className="text-xs text-gray-400 mt-2 capitalize">
                  {review.reviewerType === "company_user" ? "Company" : "Talent"}
                </p>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* ── CTA ── */}
      <section className="border-t border-gray-200 pt-6 flex flex-col sm:flex-row gap-3 items-start sm:items-center justify-between">
        <p className="text-gray-500 text-sm">
          Member since{" "}
          {talent.createdAt.toLocaleDateString("en-US", { year: "numeric", month: "long" })}
        </p>
        <a
          href="/sign-up"
          className="inline-flex items-center px-5 py-2.5 rounded-lg bg-gray-900 text-white text-sm font-medium hover:bg-gray-800 transition-colors"
        >
          Hire {talent.displayName.split(" ")[0]} on clientMORE
        </a>
      </section>
    </main>
  );
}
