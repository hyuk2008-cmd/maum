"use client";

import { useState } from "react";
import type { Business } from "@/lib/types";
import { createInteraction } from "@/lib/interactions";

function InteractionModal({
  title,
  businessId,
  kind,
  onClose,
}: {
  title: string;
  businessId: string;
  kind: "reservations" | "inquiries";
  onClose: () => void;
}) {
  const [name, setName] = useState("");
  const [contact, setContact] = useState("");
  const [message, setMessage] = useState("");
  const [sent, setSent] = useState(false);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!contact.trim() || !message.trim()) return;
    createInteraction(kind, {
      businessId,
      name: name.trim() || "익명",
      contact: contact.trim(),
      message: message.trim(),
    });
    setSent(true);
  }

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-xl p-5 w-full max-w-sm">
        {sent ? (
          <>
            <p className="font-semibold mb-2">요청이 접수됐어요!</p>
            <p className="text-sm text-neutral-600">
              업체 담당자가 연락처로 직접 연락드릴 예정이에요.
            </p>
            <button
              onClick={onClose}
              className="mt-4 w-full bg-neutral-900 text-white text-sm font-medium rounded-md px-4 py-2"
            >
              닫기
            </button>
          </>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-3">
            <p className="font-semibold">{title}</p>
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="이름 (선택)"
              className="w-full border border-neutral-300 rounded-md px-3 py-2 text-sm"
            />
            <input
              value={contact}
              onChange={(e) => setContact(e.target.value)}
              placeholder="연락받으실 전화번호 또는 카톡ID"
              required
              className="w-full border border-neutral-300 rounded-md px-3 py-2 text-sm"
            />
            <textarea
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder={
                kind === "reservations" ? "희망 날짜/시간, 요청사항" : "문의 내용"
              }
              rows={3}
              required
              className="w-full border border-neutral-300 rounded-md px-3 py-2 text-sm"
            />
            <div className="flex gap-2">
              <button
                type="submit"
                className="flex-1 bg-neutral-900 text-white text-sm font-medium rounded-md px-4 py-2"
              >
                보내기
              </button>
              <button
                type="button"
                onClick={onClose}
                className="border border-neutral-300 text-sm font-medium rounded-md px-4 py-2"
              >
                취소
              </button>
            </div>
            <p className="text-xs text-neutral-400">
              지금은 이 브라우저에만 저장되는 체험판입니다.
            </p>
          </form>
        )}
      </div>
    </div>
  );
}

export default function BusinessActions({ business }: { business: Business }) {
  const [modal, setModal] = useState<"reservations" | "inquiries" | null>(null);
  const [copied, setCopied] = useState(false);

  function openDirections() {
    const query = encodeURIComponent(business.address || business.name);
    window.open(`https://www.google.com/maps/search/?api=1&query=${query}`, "_blank");
  }

  async function share() {
    const url = window.location.href;
    if (navigator.share) {
      try {
        await navigator.share({ title: business.name, url });
      } catch {
        // user cancelled the share sheet — ignore
      }
      return;
    }
    await navigator.clipboard.writeText(url);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <>
      <div className="grid grid-cols-4 gap-2 mt-4">
        <button
          onClick={() => setModal("reservations")}
          className="flex flex-col items-center gap-1 py-2 rounded-lg border border-neutral-200 text-xs font-medium text-neutral-700 hover:bg-neutral-50"
        >
          <span className="text-lg">📅</span>예약
        </button>
        <button
          onClick={openDirections}
          className="flex flex-col items-center gap-1 py-2 rounded-lg border border-neutral-200 text-xs font-medium text-neutral-700 hover:bg-neutral-50"
        >
          <span className="text-lg">🧭</span>길찾기
        </button>
        <button
          onClick={share}
          className="flex flex-col items-center gap-1 py-2 rounded-lg border border-neutral-200 text-xs font-medium text-neutral-700 hover:bg-neutral-50"
        >
          <span className="text-lg">🔗</span>
          {copied ? "복사됨!" : "공유"}
        </button>
        <button
          onClick={() => setModal("inquiries")}
          className="flex flex-col items-center gap-1 py-2 rounded-lg border border-neutral-200 text-xs font-medium text-neutral-700 hover:bg-neutral-50"
        >
          <span className="text-lg">💬</span>문의
        </button>
      </div>

      {modal && (
        <InteractionModal
          title={modal === "reservations" ? "예약 요청" : "문의하기"}
          businessId={business.id}
          kind={modal}
          onClose={() => setModal(null)}
        />
      )}
    </>
  );
}
