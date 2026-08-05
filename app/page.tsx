"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { getBusinesses, getBusinessImageId, getCategories, recencyLabel } from "@/lib/data";
import { scoreToStars, starGlyphs } from "@/lib/stars";
import DriveImage from "@/components/DriveImage";

export default function HomePage() {
  const businesses = getBusinesses();
  const categories = getCategories();
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState<string | null>(null);

  const filtered = useMemo(() => {
    return businesses.filter((b) => {
      if (category && b.category !== category) return false;
      if (query && !b.name.toLowerCase().includes(query.toLowerCase())) return false;
      return true;
    });
  }, [businesses, query, category]);

  return (
    <main className="flex-1 max-w-4xl mx-auto w-full px-4 py-8">
      <header className="mb-8">
        <h1 className="text-2xl font-bold">마음 커넥트</h1>
        <p className="text-neutral-600 mt-1">
          LA 한인 커뮤니티 단톡방에서 수년간 쌓인 추천을 검색 가능한 업체
          디렉토리로 정리했습니다.
        </p>
      </header>

      <div className="flex flex-col sm:flex-row gap-3 mb-6">
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="업체명 검색 (예: 이사, 부동산, 미용실…)"
          className="flex-1 border border-neutral-300 rounded-lg px-4 py-2 bg-white"
        />
      </div>

      <div className="flex flex-wrap gap-2 mb-6">
        <button
          onClick={() => setCategory(null)}
          className={`px-3 py-1.5 rounded-full text-sm border ${
            category === null
              ? "bg-neutral-900 text-white border-neutral-900"
              : "bg-white border-neutral-300 text-neutral-700"
          }`}
        >
          전체
        </button>
        {categories.map((c) => (
          <button
            key={c}
            onClick={() => setCategory(c)}
            className={`px-3 py-1.5 rounded-full text-sm border ${
              category === c
                ? "bg-neutral-900 text-white border-neutral-900"
                : "bg-white border-neutral-300 text-neutral-700"
            }`}
          >
            {c}
          </button>
        ))}
      </div>

      <p className="text-sm text-neutral-500 mb-3">{filtered.length}개 업체</p>

      <ul className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {filtered.map((b) => (
          <li key={b.id}>
            <Link
              href={`/business/${b.id}`}
              className="block bg-white border border-neutral-200 rounded-xl overflow-hidden hover:border-neutral-400 transition-colors"
            >
              {(() => {
                const imageId = getBusinessImageId(b.id);
                return imageId ? (
                  <DriveImage
                    fileId={imageId}
                    alt={b.name}
                    className="w-full h-32 object-cover"
                  />
                ) : null;
              })()}
              <div className="p-4">
                <div className="flex items-start justify-between gap-2">
                  <h2 className="font-semibold text-neutral-900 line-clamp-2">
                    {b.name}
                  </h2>
                  <span
                    title={`신뢰도 ${b.trustScore}/100`}
                    className="shrink-0 text-amber-500 text-sm"
                  >
                    {starGlyphs(scoreToStars(b.trustScore))}
                  </span>
                </div>
                <p className="text-xs text-neutral-500 mt-1">{b.category}</p>
                <p className="text-xs text-neutral-500 mt-2">
                  총 {b.totalPostCount}회 게시·언급 · {recencyLabel(b.lastMentionDate)}
                </p>
              </div>
            </Link>
          </li>
        ))}
      </ul>

      {filtered.length === 0 && (
        <p className="text-neutral-500 text-center py-12">
          검색 결과가 없습니다.
        </p>
      )}
    </main>
  );
}
