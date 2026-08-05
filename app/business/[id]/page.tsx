import Link from "next/link";
import { notFound } from "next/navigation";
import {
  getBusiness,
  getBusinesses,
  getBusinessImageId,
  getMentionsFor,
  recencyLabel,
} from "@/lib/data";
import { scoreToStars, starGlyphs } from "@/lib/stars";
import ReviewSection from "@/components/ReviewSection";
import DriveImage from "@/components/DriveImage";

export function generateStaticParams() {
  return getBusinesses().map((b) => ({ id: b.id }));
}

export default async function BusinessPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const business = getBusiness(id);
  if (!business) notFound();

  // Most posts about a business are the same campaign reworded, so show
  // only the single most complete write-up — the aggregate post count
  // above already covers "how many times this was posted".
  const allMentions = getMentionsFor(business.id);
  const bestMention = [...allMentions].sort(
    (a, b) => b.excerpt.length - a.excerpt.length
  )[0];
  const heroImageId = getBusinessImageId(business.id);

  return (
    <main className="flex-1 max-w-3xl mx-auto w-full px-4 py-8">
      <Link href="/" className="text-sm text-neutral-500 hover:underline">
        ← 목록으로
      </Link>

      <section className="mt-4 mb-6 bg-white border border-neutral-200 rounded-xl overflow-hidden">
        {heroImageId && (
          <DriveImage
            fileId={heroImageId}
            alt={business.name}
            className="w-full max-h-72 object-cover border-b border-neutral-100"
          />
        )}
        <div className="p-5">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-xs font-medium text-neutral-500">{business.category}</p>
              <h1 className="text-xl font-bold mt-0.5">{business.name}</h1>
            </div>
            <span
              title={`신뢰도 ${business.trustScore}/100`}
              className="shrink-0 text-amber-500 text-lg tracking-tight"
            >
              {starGlyphs(scoreToStars(business.trustScore))}
            </span>
          </div>

          <dl className="mt-4 space-y-1.5 text-sm">
            {business.phone && (
              <div className="flex items-center gap-2 text-neutral-700">
                <span aria-hidden>📞</span>
                <dd>{business.phone}</dd>
              </div>
            )}
            {business.address && (
              <div className="flex items-center gap-2 text-neutral-700">
                <span aria-hidden>📍</span>
                <dd>{business.address}</dd>
              </div>
            )}
          </dl>

          <p className="text-sm text-neutral-500 mt-4 pt-4 border-t border-neutral-100">
            단톡방/전단지에서 총{" "}
            <span className="font-semibold text-neutral-800">
              {business.totalPostCount}회
            </span>{" "}
            게시·언급됨 (💬 단톡방 {business.postCountBySource.chat}회 · 📷 전단지{" "}
            {business.postCountBySource.photo}회) · {recencyLabel(business.lastMentionDate)}
          </p>
        </div>
      </section>

      {bestMention && (
        <section>
          <h2 className="font-semibold mb-3">업체 소개</h2>
          <div className="bg-white border border-neutral-200 rounded-lg overflow-hidden">
            <div className="p-4">
              <div className="flex items-start justify-between gap-2">
                <p className="text-sm text-neutral-800 whitespace-pre-line">
                  {bestMention.excerpt}
                </p>
                <span className="shrink-0 text-xs font-medium bg-neutral-100 text-neutral-600 rounded-full px-2 py-1">
                  {bestMention.source === "photo" ? "📷 전단지" : "💬 단톡방"}
                </span>
              </div>
              <p className="text-xs text-neutral-400 mt-2">
                {recencyLabel(bestMention.date)} · {bestMention.authorId}
              </p>
            </div>
          </div>
          {allMentions.length > 1 && (
            <p className="text-xs text-neutral-400 mt-2">
              비슷한 내용으로 {allMentions.length - 1}건 더 게시되어, 가장 자세한
              글 하나만 보여드려요. (위쪽 &ldquo;총 게시·언급&rdquo; 수치에는 모두 포함돼요)
            </p>
          )}
        </section>
      )}

      <ReviewSection businessId={business.id} />
    </main>
  );
}
