"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { createListing, loadListings } from "@/lib/marketplace";
import type { Category, Listing } from "@/lib/types";
import { CATEGORY_ICONS } from "@/lib/categoryIcons";
import SafeTradeGuide from "@/components/SafeTradeGuide";

const CATEGORIES = Object.keys(CATEGORY_ICONS) as Category[];

const STATUS_LABEL: Record<Listing["status"], string> = {
  판매중: "판매중",
  구매요청됨: "구매요청됨",
  결제대기: "결제대기(안전거래)",
  수령확인대기: "수령확인대기",
  정산완료: "거래완료",
  거래취소: "거래취소",
};

export default function MarketplacePage() {
  const [listings, setListings] = useState<Listing[] | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [title, setTitle] = useState("");
  const [price, setPrice] = useState("");
  const [category, setCategory] = useState<Category>("기타");
  const [description, setDescription] = useState("");
  const [sellerName, setSellerName] = useState("");

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setListings(loadListings());
  }, []);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!title.trim() || !price) return;
    createListing({
      title: title.trim(),
      price: Number(price),
      category,
      description: description.trim(),
      sellerName: sellerName.trim() || "익명",
    });
    setListings(loadListings());
    setTitle("");
    setPrice("");
    setDescription("");
    setSellerName("");
    setShowForm(false);
  }

  return (
    <main className="flex-1 max-w-4xl mx-auto w-full px-4 py-8">
      <Link href="/" className="text-sm text-neutral-500 hover:underline">
        ← 업체 디렉토리로
      </Link>

      <header className="mt-4 mb-6 flex items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold">개인거래</h1>
          <p className="text-neutral-600 mt-1">
            이웃과 안전하게 중고 물품을 사고파세요.
          </p>
        </div>
        <button
          onClick={() => setShowForm((v) => !v)}
          className="shrink-0 bg-neutral-900 text-white text-sm font-medium rounded-lg px-4 py-2"
        >
          {showForm ? "취소" : "+ 물품 등록"}
        </button>
      </header>

      <div className="mb-6">
        <SafeTradeGuide />
      </div>

      {showForm && (
        <form
          onSubmit={handleSubmit}
          className="bg-white border border-neutral-200 rounded-xl p-4 mb-6 space-y-3"
        >
          <input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="물품명"
            required
            className="w-full border border-neutral-300 rounded-md px-3 py-2 text-sm"
          />
          <div className="flex gap-3">
            <input
              value={price}
              onChange={(e) => setPrice(e.target.value.replace(/[^\d]/g, ""))}
              placeholder="가격 ($)"
              required
              className="flex-1 border border-neutral-300 rounded-md px-3 py-2 text-sm"
            />
            <select
              value={category}
              onChange={(e) => setCategory(e.target.value as Category)}
              className="border border-neutral-300 rounded-md px-2 py-2 text-sm"
            >
              {CATEGORIES.map((c) => (
                <option key={c} value={c}>
                  {CATEGORY_ICONS[c]} {c}
                </option>
              ))}
            </select>
          </div>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="상태, 거래 희망 장소 등 설명을 적어주세요"
            rows={3}
            className="w-full border border-neutral-300 rounded-md px-3 py-2 text-sm"
          />
          <input
            value={sellerName}
            onChange={(e) => setSellerName(e.target.value)}
            placeholder="판매자 이름 (선택, 비우면 익명)"
            className="w-full border border-neutral-300 rounded-md px-3 py-2 text-sm"
          />
          <button
            type="submit"
            className="bg-neutral-900 text-white text-sm font-medium rounded-md px-4 py-2"
          >
            등록하기
          </button>
          <p className="text-xs text-neutral-400">
            지금은 이 브라우저에만 저장되는 체험판입니다.
          </p>
        </form>
      )}

      {listings === null ? null : listings.length === 0 ? (
        <p className="text-neutral-500 text-center py-12">
          아직 등록된 물품이 없어요. 첫 물품을 올려보세요!
        </p>
      ) : (
        <ul className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {listings.map((l) => (
            <li key={l.id}>
              <Link
                href={`/marketplace/${l.id}`}
                className="block bg-white border border-neutral-200 rounded-xl p-4 hover:border-neutral-400 transition-colors"
              >
                <div className="flex items-start justify-between gap-2">
                  <h2 className="font-semibold text-neutral-900 line-clamp-2">
                    {CATEGORY_ICONS[l.category]} {l.title}
                  </h2>
                  <span className="shrink-0 text-xs font-medium bg-neutral-100 text-neutral-600 rounded-full px-2 py-1">
                    {STATUS_LABEL[l.status]}
                  </span>
                </div>
                <p className="text-neutral-900 font-semibold mt-1">
                  ${l.price.toLocaleString()}
                </p>
                <p className="text-xs text-neutral-500 mt-2">
                  {l.sellerName} ·{" "}
                  {new Date(l.createdAt).toLocaleDateString("ko-KR")}
                </p>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </main>
  );
}
