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

const MAX_MENTIONS_SHOWN = 4;

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

  const mentions = getMentionsFor(business.id)
    .sort((a, b) => b.repostCount - a.repostCount)
    .slice(0, MAX_MENTIONS_SHOWN);
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

      <section>
        <h2 className="font-semibold mb-3">업체 소개</h2>
        <ul className="space-y-3">
          {mentions.map((m) => (
            <li
              key={m.id}
              className="bg-white border border-neutral-200 rounded-lg overflow-hidden"
            >
              <div className="p-4">
                <div className="flex items-start justify-between gap-2">
                  <p className="text-sm text-neutral-800 whitespace-pre-line">
                    {m.excerpt}
                  </p>
                  <span className="shrink-0 text-xs font-medium bg-neutral-100 text-neutral-600 rounded-full px-2 py-1">
                    {m.source === "photo" ? "📷 전단지" : "💬 단톡방"}
                    {m.repostCount > 1 ? ` · ${m.repostCount}회 게시` : ""}
                  </span>
                </div>
                <p className="text-xs text-neutral-400 mt-2">
                  {recencyLabel(m.date)} · {m.authorId}
                </p>
              </div>
            </li>
          ))}
        </ul>
        {business.mentionCount > MAX_MENTIONS_SHOWN && (
          <p className="text-xs text-neutral-400 mt-2">
            비슷한 내용의 게시물 {business.mentionCount - MAX_MENTIONS_SHOWN}건은
            요약에 포함되어 생략했어요.
          </p>
        )}
      </section>

      <ReviewSection businessId={business.id} />
    </main>
  );
}
