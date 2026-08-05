const TIPS = [
  "가능하면 공공장소(카페, 마트 주차장 등)에서 직접 만나 물건을 확인한 후 거래하세요.",
  "선입금을 요구하거나 지나치게 저렴한 가격을 제시하면 한 번 더 의심해보세요.",
  "판매자/구매자의 카톡 프로필, 거래 이력을 확인하고 후기를 남겨 커뮤니티가 함께 신뢰를 쌓아가요.",
  "고가 물품은 결제대기(안전거래) 상태를 거쳐 수령 확인 후 정산되는 흐름을 이용하세요.",
  "문제가 생기면 즉시 커뮤니티 관리자에게 신고해주세요.",
];

export default function SafeTradeGuide() {
  return (
    <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
      <p className="text-sm font-semibold text-amber-900 mb-2">
        🛡️ 안전거래 가이드
      </p>
      <ul className="text-sm text-amber-800 space-y-1 list-disc list-inside">
        {TIPS.map((tip) => (
          <li key={tip}>{tip}</li>
        ))}
      </ul>
      <p className="text-xs text-amber-700 mt-2">
        * 지금은 결제대기(안전거래) 상태 표시가 개념 모델이며, 실제 결제
        보관/이체는 아직 연동되지 않았습니다.
      </p>
    </div>
  );
}
