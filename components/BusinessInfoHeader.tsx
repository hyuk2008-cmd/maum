"use client";

import type { Business } from "@/lib/types";
import { scoreToStars, starGlyphs } from "@/lib/stars";
import { useEffectiveBusiness } from "@/components/BusinessOwnerPanel";

export default function BusinessInfoHeader({ business }: { business: Business }) {
  const effective = useEffectiveBusiness(business);

  return (
    <div className="p-5">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-xs font-medium text-neutral-500">{effective.category}</p>
          <h1 className="text-xl font-bold mt-0.5">
            {effective.name}
            {effective.edited && (
              <span className="ml-2 align-middle text-xs font-medium text-green-700 bg-green-50 rounded-full px-2 py-0.5">
                담당자 수정됨
              </span>
            )}
          </h1>
        </div>
        <span
          title={`신뢰도 ${business.trustScore}/100`}
          className="shrink-0 text-amber-500 text-lg tracking-tight"
        >
          {starGlyphs(scoreToStars(business.trustScore))}
        </span>
      </div>

      <dl className="mt-4 space-y-1.5 text-sm">
        {effective.phone && (
          <div className="flex items-center gap-2 text-neutral-700">
            <span aria-hidden>📞</span>
            <dd>{effective.phone}</dd>
          </div>
        )}
        {effective.kakaoId && (
          <div className="flex items-center gap-2 text-neutral-700">
            <span aria-hidden>💬</span>
            <dd>카톡 ID: {effective.kakaoId}</dd>
          </div>
        )}
        {!effective.phone && !effective.kakaoId && (
          <div className="flex items-center gap-2 text-neutral-500">
            <span aria-hidden>💬</span>
            <dd>연락처 비공개 · 단톡방에서 직접 문의</dd>
          </div>
        )}
        {effective.address && (
          <div className="flex items-center gap-2 text-neutral-700">
            <span aria-hidden>📍</span>
            <dd>{effective.address}</dd>
          </div>
        )}
      </dl>
    </div>
  );
}
