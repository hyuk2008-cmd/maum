"use client";

import { TRADE_STATUS_ORDER, type TradeStatus } from "@/lib/types";

const LABELS: Record<TradeStatus, string> = {
  판매중: "판매중",
  구매요청됨: "구매요청",
  결제대기: "결제대기(안전거래)",
  수령확인대기: "수령확인",
  정산완료: "정산완료",
  거래취소: "거래취소",
};

export default function TradeStatusStepper({
  status,
  onAdvance,
  onCancel,
}: {
  status: TradeStatus;
  onAdvance?: (next: TradeStatus) => void;
  onCancel?: () => void;
}) {
  if (status === "거래취소") {
    return (
      <div className="text-sm font-medium text-neutral-500">
        ❌ 거래취소됨
      </div>
    );
  }

  const currentIndex = TRADE_STATUS_ORDER.indexOf(status);
  const nextStatus = TRADE_STATUS_ORDER[currentIndex + 1];

  return (
    <div>
      <ol className="flex items-center gap-1 flex-wrap">
        {TRADE_STATUS_ORDER.map((s, i) => (
          <li key={s} className="flex items-center gap-1">
            <span
              className={`text-xs font-medium px-2 py-1 rounded-full ${
                i <= currentIndex
                  ? "bg-neutral-900 text-white"
                  : "bg-neutral-100 text-neutral-400"
              }`}
            >
              {LABELS[s]}
            </span>
            {i < TRADE_STATUS_ORDER.length - 1 && (
              <span className="text-neutral-300">→</span>
            )}
          </li>
        ))}
      </ol>

      {(onAdvance || onCancel) && status !== "정산완료" && (
        <div className="flex gap-2 mt-3">
          {nextStatus && onAdvance && (
            <button
              onClick={() => onAdvance(nextStatus)}
              className="text-xs font-medium bg-neutral-900 text-white rounded-md px-3 py-1.5"
            >
              다음 단계로: {LABELS[nextStatus]}
            </button>
          )}
          {onCancel && (
            <button
              onClick={onCancel}
              className="text-xs font-medium border border-neutral-300 text-neutral-600 rounded-md px-3 py-1.5"
            >
              거래취소
            </button>
          )}
        </div>
      )}
    </div>
  );
}
