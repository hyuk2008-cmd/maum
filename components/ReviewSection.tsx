"use client";

import { useEffect, useState } from "react";
import type { Review } from "@/lib/types";
import { starGlyphs } from "@/lib/stars";

function storageKey(businessId: string): string {
  return `maum:reviews:${businessId}`;
}

function loadReviews(businessId: string): Review[] {
  try {
    const raw = localStorage.getItem(storageKey(businessId));
    return raw ? (JSON.parse(raw) as Review[]) : [];
  } catch {
    return [];
  }
}

function saveReviews(businessId: string, reviews: Review[]) {
  localStorage.setItem(storageKey(businessId), JSON.stringify(reviews));
}

export default function ReviewSection({ businessId }: { businessId: string }) {
  const [reviews, setReviews] = useState<Review[] | null>(null);
  const [name, setName] = useState("");
  const [rating, setRating] = useState(5);
  const [body, setBody] = useState("");

  useEffect(() => {
    // one-time hydration from localStorage, which doesn't exist during SSR
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setReviews(loadReviews(businessId));
  }, [businessId]);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!body.trim()) return;
    const review: Review = {
      id: `rev_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
      businessId,
      authorName: name.trim() || "익명",
      rating,
      body: body.trim(),
      createdAt: new Date().toISOString(),
    };
    const updated = [review, ...(reviews ?? [])];
    setReviews(updated);
    saveReviews(businessId, updated);
    setName("");
    setRating(5);
    setBody("");
  }

  return (
    <section className="mt-8">
      <h2 className="font-semibold mb-3">
        사용자 후기 {reviews && reviews.length > 0 ? `(${reviews.length})` : ""}
      </h2>

      <form
        onSubmit={handleSubmit}
        className="bg-white border border-neutral-200 rounded-lg p-4 mb-4 space-y-3"
      >
        <div className="flex items-center gap-3">
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="이름 (선택, 비우면 익명)"
            className="flex-1 border border-neutral-300 rounded-md px-3 py-1.5 text-sm"
          />
          <select
            value={rating}
            onChange={(e) => setRating(Number(e.target.value))}
            className="border border-neutral-300 rounded-md px-2 py-1.5 text-sm"
          >
            {[5, 4, 3, 2, 1].map((n) => (
              <option key={n} value={n}>
                {starGlyphs(n)}
              </option>
            ))}
          </select>
        </div>
        <textarea
          value={body}
          onChange={(e) => setBody(e.target.value)}
          placeholder="이용 후기를 남겨주세요"
          rows={3}
          className="w-full border border-neutral-300 rounded-md px-3 py-2 text-sm"
        />
        <button
          type="submit"
          className="bg-neutral-900 text-white text-sm font-medium rounded-md px-4 py-2"
        >
          후기 등록
        </button>
        <p className="text-xs text-neutral-400">
          지금은 이 브라우저에만 저장되는 체험판입니다. 로그인 연동 후
          모두에게 공개되는 후기로 전환될 예정이에요.
        </p>
      </form>

      {reviews === null ? null : reviews.length === 0 ? (
        <p className="text-sm text-neutral-400">
          아직 등록된 후기가 없어요. 첫 후기를 남겨보세요!
        </p>
      ) : (
        <ul className="space-y-3">
          {reviews.map((r) => (
            <li
              key={r.id}
              className="bg-white border border-neutral-200 rounded-lg p-4"
            >
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">{r.authorName}</span>
                <span className="text-amber-500 text-sm">
                  {starGlyphs(r.rating)}
                </span>
              </div>
              <p className="text-sm text-neutral-700 mt-1 whitespace-pre-line">
                {r.body}
              </p>
              <p className="text-xs text-neutral-400 mt-2">
                {new Date(r.createdAt).toLocaleDateString("ko-KR")}
              </p>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
