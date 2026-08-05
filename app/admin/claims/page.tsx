"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import type { Claim } from "@/lib/types";
import { getAllClaims, updateClaimStatus } from "@/lib/claims";
import { getBusiness } from "@/lib/data";

export default function AdminClaimsPage() {
  const [claims, setClaims] = useState<Claim[] | null>(null);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setClaims(getAllClaims());
  }, []);

  function handleDecision(id: string, status: "승인" | "거절") {
    updateClaimStatus(id, status);
    setClaims(getAllClaims());
  }

  return (
    <main className="flex-1 max-w-3xl mx-auto w-full px-4 py-8">
      <Link href="/" className="text-sm text-neutral-500 hover:underline">
        ← 홈으로
      </Link>

      <header className="mt-4 mb-6">
        <h1 className="text-2xl font-bold">업체 담당자 인증 신청 관리</h1>
        <p className="text-neutral-600 mt-1 text-sm">
          신청을 승인하면 수정 코드가 발급돼요. 그 코드를 신청자에게
          카톡/전화로 직접 전달해주세요 — 신청자는 업체 페이지에서
          &ldquo;승인 코드 입력&rdquo;으로 수정 권한을 받습니다.
        </p>
        <p className="text-xs text-amber-600 mt-2">
          ⚠️ 이 페이지는 별도 로그인 보호가 없는 체험판입니다. URL을
          아무에게나 공유하지 마세요.
        </p>
      </header>

      {claims === null ? null : claims.length === 0 ? (
        <p className="text-neutral-500 text-center py-12">
          접수된 신청이 없어요.
        </p>
      ) : (
        <ul className="space-y-3">
          {claims.map((c) => {
            const business = getBusiness(c.businessId);
            return (
              <li
                key={c.id}
                className="bg-white border border-neutral-200 rounded-lg p-4"
              >
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <p className="font-semibold">
                      {business ? (
                        <Link
                          href={`/business/${business.id}`}
                          className="hover:underline"
                        >
                          {business.name}
                        </Link>
                      ) : (
                        c.businessId
                      )}
                    </p>
                    <p className="text-sm text-neutral-600 mt-1">
                      신청자: {c.claimantName} · 연락처: {c.contact}
                    </p>
                    {c.note && (
                      <p className="text-sm text-neutral-500 mt-1">
                        메모: {c.note}
                      </p>
                    )}
                    <p className="text-xs text-neutral-400 mt-1">
                      {new Date(c.createdAt).toLocaleString("ko-KR")}
                    </p>
                  </div>
                  <span
                    className={`shrink-0 text-xs font-medium rounded-full px-2 py-1 ${
                      c.status === "승인"
                        ? "bg-green-100 text-green-700"
                        : c.status === "거절"
                          ? "bg-red-100 text-red-700"
                          : "bg-neutral-100 text-neutral-600"
                    }`}
                  >
                    {c.status}
                  </span>
                </div>

                {c.status === "대기" && (
                  <div className="flex gap-2 mt-3">
                    <button
                      onClick={() => handleDecision(c.id, "승인")}
                      className="text-xs font-medium bg-neutral-900 text-white rounded-md px-3 py-1.5"
                    >
                      승인
                    </button>
                    <button
                      onClick={() => handleDecision(c.id, "거절")}
                      className="text-xs font-medium border border-neutral-300 rounded-md px-3 py-1.5"
                    >
                      거절
                    </button>
                  </div>
                )}

                {c.status === "승인" && c.ownerCode && (
                  <p className="text-sm mt-3 bg-neutral-50 border border-neutral-200 rounded-md px-3 py-2">
                    수정 코드: <span className="font-mono font-bold">{c.ownerCode}</span>
                    {" "}— 이 코드를 {c.claimantName}님께 전달해주세요.
                  </p>
                )}
              </li>
            );
          })}
        </ul>
      )}
    </main>
  );
}
