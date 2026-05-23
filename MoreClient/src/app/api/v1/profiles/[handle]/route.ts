import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/server/core/db";
import { ReviewRepo } from "@/server/reviews/repo";

// Public, cacheable profile endpoint. Runs on Node (Prisma is not Edge-safe);
// the consuming page at /t/[handle] is the Edge-rendered surface. The CDN
// caches this response for 60s (see Cache-Control below + next.config.ts).

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ handle: string }> },
) {
  const { handle } = await params;

  const talent = await prisma.talent.findFirst({
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
        select: {
          id: true,
          company: true,
          title: true,
          startDate: true,
          endDate: true,
          description: true,
        },
        orderBy: { startDate: "desc" },
      },
      languages: { select: { locale: true, proficiency: true } },
    },
  });

  if (!talent) {
    return NextResponse.json({ error: "not_found" }, { status: 404 });
  }

  const [reviewPage, agg] = await Promise.all([
    ReviewRepo.listByTarget(talent.id, "talent", { limit: 5 }),
    ReviewRepo.aggregateRating(talent.id, "talent"),
  ]);

  return NextResponse.json(
    {
      talent,
      reviews: reviewPage.items,
      avgRating: agg.avg,
      reviewCount: agg.count,
    },
    {
      headers: {
        "Cache-Control": "public, s-maxage=60, stale-while-revalidate=60",
      },
    },
  );
}
