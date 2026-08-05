"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { advanceListingStatus, getListing } from "@/lib/marketplace";
import type { Listing, TradeStatus } from "@/lib/types";
import { CATEGORY_ICONS } from "@/lib/categoryIcons";
import SafeTradeGuide from "@/components/SafeTradeGuide";
import TradeStatusStepper from "@/components/TradeStatusStepper";

export default function ListingPage() {
  const params = useParams<{ id: string }>();
  const [listing, setListing] = useState<Listing | null | undefined>(undefined);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setListing(getListing(params.id) ?? null);
  }, [params.id]);

  function handleAdvance(next: TradeStatus) {
    advanceListingStatus(params.id, next);
    setListing(getListing(params.id) ?? null);
  }

  function handleCancel() {
    advanceListingStatus(params.id, "거래취소");
    setListing(getListing(params.id) ?? null);
  }

  if (listing === undefined) return null;

  if (listing === null) {
    return (
      <main className="flex-1 max-w-3xl mx-auto w-full px-4 py-8">
        <Link href="/marketplace" className="text-sm text-neutral-500 hover:underline">
          ← 개인거래 목록으로
        </Link>
        <p className="text-neutral-500 text-center py-12">
          찾을 수 없는 물품이에요. (이 브라우저에서 등록한 물품만 보여요)
        </p>
      </main>
    );
  }

  return (
    <main className="flex-1 max-w-3xl mx-auto w-full px-4 py-8">
      <Link href="/marketplace" className="text-sm text-neutral-500 hover:underline">
        ← 개인거래 목록으로
      </Link>

      <section className="mt-4 mb-6 bg-white border border-neutral-200 rounded-xl p-5">
        <p className="text-xs font-medium text-neutral-500">
          {CATEGORY_ICONS[listing.category]} {listing.category}
        </p>
        <h1 className="text-xl font-bold mt-0.5">{listing.title}</h1>
        <p className="text-2xl font-bold text-neutral-900 mt-2">
          ${listing.price.toLocaleString()}
        </p>
        {listing.description && (
          <p className="text-sm text-neutral-700 mt-3 whitespace-pre-line">
            {listing.description}
          </p>
        )}
        <p className="text-xs text-neutral-400 mt-3">
          판매자: {listing.sellerName} ·{" "}
          {new Date(listing.createdAt).toLocaleDateString("ko-KR")}
        </p>
      </section>

      <section className="bg-white border border-neutral-200 rounded-xl p-5 mb-6">
        <h2 className="font-semibold mb-3">거래 상태</h2>
        <TradeStatusStepper
          status={listing.status}
          onAdvance={handleAdvance}
          onCancel={handleCancel}
        />
      </section>

      <SafeTradeGuide />
    </main>
  );
}
