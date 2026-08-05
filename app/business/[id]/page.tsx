import Link from "next/link";
import { notFound } from "next/navigation";
import { getBusiness, getBusinesses, getMentionsFor, recencyLabel } from "@/lib/data";

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

  const mentions = getMentionsFor(business.id);

  return (
    <main className="flex-1 max-w-3xl mx-auto w-full px-4 py-8">
      <Link href="/" className="text-sm text-neutral-500 hover:underline">
        ← 목록으로
      </Link>

      <header className="mt-4 mb-6">
        <div className="flex items-start justify-between gap-3">
          <h1 className="text-2xl font-bold">{business.name}</h1>
          <span className="shrink-0 text-sm font-medium bg-neutral-900 text-white rounded-full px-3 py-1">
            신뢰도 {business.trustScore}
          </span>
        </div>
        <p className="text-neutral-500 mt-1">{business.category}</p>
        {business.phone && (
          <p className="text-neutral-700 mt-2">📞 {business.phone}</p>
        )}
        <p className="text-sm text-neutral-500 mt-1">
          단톡방에서 {business.mentionCount}회 언급 · {recencyLabel(business.lastMentionDate)}
        </p>
      </header>

      <section>
        <h2 className="font-semibold mb-3">커뮤니티 언급 근거</h2>
        <ul className="space-y-3">
          {mentions.map((m) => (
            <li
              key={m.id}
              className="bg-white border border-neutral-200 rounded-lg p-4"
            >
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
            </li>
          ))}
        </ul>
      </section>
    </main>
  );
}
