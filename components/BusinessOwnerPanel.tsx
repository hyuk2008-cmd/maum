"use client";

import { useEffect, useState } from "react";
import type { Business, Category, Claim } from "@/lib/types";
import { CATEGORY_ICONS } from "@/lib/categoryIcons";
import { getOverride, setOverride, isUnlocked, unlock } from "@/lib/businessOverrides";
import { createClaim, getApprovedCode, getClaimsForBusiness } from "@/lib/claims";

const CATEGORIES = Object.keys(CATEGORY_ICONS) as Category[];

/** Effective business fields after applying any owner-submitted override. */
export function useEffectiveBusiness(business: Business) {
  const [override, setOv] = useState<ReturnType<typeof getOverride>>(undefined);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setOv(getOverride(business.id));
  }, [business.id]);

  return {
    name: override?.name ?? business.name,
    category: override?.category ?? business.category,
    phone: override?.phone ?? business.phone,
    kakaoId: override?.kakaoId ?? business.kakaoId,
    address: override?.address ?? business.address,
    edited: !!override,
  };
}

export default function BusinessOwnerPanel({ business }: { business: Business }) {
  const [unlocked, setUnlocked] = useState(false);
  const [myClaims, setMyClaims] = useState<Claim[]>([]);
  const [mode, setMode] = useState<"idle" | "claim" | "code" | "edit">("idle");

  const [claimName, setClaimName] = useState("");
  const [claimContact, setClaimContact] = useState("");
  const [claimNote, setClaimNote] = useState("");
  const [claimSent, setClaimSent] = useState(false);

  const [codeInput, setCodeInput] = useState("");
  const [codeError, setCodeError] = useState(false);

  const [editName, setEditName] = useState(business.name);
  const [editCategory, setEditCategory] = useState<Category>(business.category);
  const [editPhone, setEditPhone] = useState(business.phone ?? "");
  const [editKakaoId, setEditKakaoId] = useState(business.kakaoId ?? "");
  const [editAddress, setEditAddress] = useState(business.address ?? "");
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setUnlocked(isUnlocked(business.id));
    setMyClaims(getClaimsForBusiness(business.id));
    const override = getOverride(business.id);
    if (override) {
      setEditName(override.name ?? business.name);
      setEditCategory(override.category ?? business.category);
      setEditPhone(override.phone ?? business.phone ?? "");
      setEditKakaoId(override.kakaoId ?? business.kakaoId ?? "");
      setEditAddress(override.address ?? business.address ?? "");
    }
  }, [business]);

  function handleClaimSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!claimName.trim() || !claimContact.trim()) return;
    createClaim({
      businessId: business.id,
      claimantName: claimName.trim(),
      contact: claimContact.trim(),
      note: claimNote.trim(),
    });
    setClaimSent(true);
    setMyClaims(getClaimsForBusiness(business.id));
  }

  function handleCodeSubmit(e: React.FormEvent) {
    e.preventDefault();
    const approved = getApprovedCode(business.id);
    if (approved && approved.toUpperCase() === codeInput.trim().toUpperCase()) {
      unlock(business.id);
      setUnlocked(true);
      setMode("edit");
      setCodeError(false);
    } else {
      setCodeError(true);
    }
  }

  function handleEditSave(e: React.FormEvent) {
    e.preventDefault();
    setOverride(business.id, {
      name: editName.trim() || business.name,
      category: editCategory,
      phone: editPhone.trim() || undefined,
      kakaoId: editKakaoId.trim() || undefined,
      address: editAddress.trim() || undefined,
    });
    setSaved(true);
    setTimeout(() => setSaved(false), 2500);
  }

  const pendingClaim = myClaims.find((c) => c.status === "대기");

  return (
    <section className="mt-8 bg-neutral-50 border border-neutral-200 rounded-xl p-4">
      <p className="text-sm font-semibold text-neutral-700 mb-1">
        🏷️ 이 업체 담당자이신가요?
      </p>

      {unlocked && mode !== "edit" && (
        <div className="mt-2">
          <p className="text-xs text-green-700 mb-2">
            ✅ 수정 권한이 확인됐어요. 업체 정보를 수정할 수 있습니다.
          </p>
          <button
            onClick={() => setMode("edit")}
            className="text-xs font-medium bg-neutral-900 text-white rounded-md px-3 py-1.5"
          >
            정보 수정하기
          </button>
        </div>
      )}

      {unlocked && mode === "edit" && (
        <form onSubmit={handleEditSave} className="mt-2 space-y-2">
          <input
            value={editName}
            onChange={(e) => setEditName(e.target.value)}
            placeholder="업체명"
            className="w-full border border-neutral-300 rounded-md px-3 py-1.5 text-sm"
          />
          <select
            value={editCategory}
            onChange={(e) => setEditCategory(e.target.value as Category)}
            className="w-full border border-neutral-300 rounded-md px-2 py-1.5 text-sm"
          >
            {CATEGORIES.map((c) => (
              <option key={c} value={c}>
                {CATEGORY_ICONS[c]} {c}
              </option>
            ))}
          </select>
          <input
            value={editPhone}
            onChange={(e) => setEditPhone(e.target.value)}
            placeholder="전화번호"
            className="w-full border border-neutral-300 rounded-md px-3 py-1.5 text-sm"
          />
          <input
            value={editKakaoId}
            onChange={(e) => setEditKakaoId(e.target.value)}
            placeholder="카톡 ID"
            className="w-full border border-neutral-300 rounded-md px-3 py-1.5 text-sm"
          />
          <input
            value={editAddress}
            onChange={(e) => setEditAddress(e.target.value)}
            placeholder="주소"
            className="w-full border border-neutral-300 rounded-md px-3 py-1.5 text-sm"
          />
          <div className="flex items-center gap-2">
            <button
              type="submit"
              className="text-xs font-medium bg-neutral-900 text-white rounded-md px-3 py-1.5"
            >
              저장
            </button>
            {saved && <span className="text-xs text-green-700">저장됐어요!</span>}
          </div>
        </form>
      )}

      {!unlocked && mode === "idle" && (
        <div className="flex flex-wrap gap-2 mt-2">
          {pendingClaim ? (
            <p className="text-xs text-neutral-500">
              신청 접수됨 (대기 중) · 승인되면 담당자님께 수정 코드를 카톡으로
              전달해드려요.
            </p>
          ) : (
            <button
              onClick={() => setMode("claim")}
              className="text-xs font-medium border border-neutral-300 rounded-md px-3 py-1.5 bg-white"
            >
              내 업체 맞아요 (수정 권한 신청)
            </button>
          )}
          <button
            onClick={() => setMode("code")}
            className="text-xs font-medium border border-neutral-300 rounded-md px-3 py-1.5 bg-white"
          >
            승인 코드 입력
          </button>
        </div>
      )}

      {!unlocked && mode === "claim" && (
        <div className="mt-2">
          {claimSent ? (
            <p className="text-xs text-neutral-600">
              신청 접수됐어요! 확인 후 카톡으로 수정 코드를 보내드릴게요.
            </p>
          ) : (
            <form onSubmit={handleClaimSubmit} className="space-y-2">
              <input
                value={claimName}
                onChange={(e) => setClaimName(e.target.value)}
                placeholder="담당자 성함"
                required
                className="w-full border border-neutral-300 rounded-md px-3 py-1.5 text-sm"
              />
              <input
                value={claimContact}
                onChange={(e) => setClaimContact(e.target.value)}
                placeholder="연락처 (전화번호 또는 카톡ID)"
                required
                className="w-full border border-neutral-300 rounded-md px-3 py-1.5 text-sm"
              />
              <input
                value={claimNote}
                onChange={(e) => setClaimNote(e.target.value)}
                placeholder="본인 확인용 메모 (선택)"
                className="w-full border border-neutral-300 rounded-md px-3 py-1.5 text-sm"
              />
              <div className="flex gap-2">
                <button
                  type="submit"
                  className="text-xs font-medium bg-neutral-900 text-white rounded-md px-3 py-1.5"
                >
                  신청하기
                </button>
                <button
                  type="button"
                  onClick={() => setMode("idle")}
                  className="text-xs font-medium border border-neutral-300 rounded-md px-3 py-1.5"
                >
                  취소
                </button>
              </div>
            </form>
          )}
        </div>
      )}

      {!unlocked && mode === "code" && (
        <form onSubmit={handleCodeSubmit} className="mt-2 flex gap-2">
          <input
            value={codeInput}
            onChange={(e) => {
              setCodeInput(e.target.value);
              setCodeError(false);
            }}
            placeholder="승인 코드 입력"
            className="flex-1 border border-neutral-300 rounded-md px-3 py-1.5 text-sm"
          />
          <button
            type="submit"
            className="text-xs font-medium bg-neutral-900 text-white rounded-md px-3 py-1.5"
          >
            확인
          </button>
          <button
            type="button"
            onClick={() => setMode("idle")}
            className="text-xs font-medium border border-neutral-300 rounded-md px-3 py-1.5"
          >
            취소
          </button>
          {codeError && (
            <p className="text-xs text-red-600 basis-full">
              코드가 일치하지 않아요.
            </p>
          )}
        </form>
      )}
    </section>
  );
}
