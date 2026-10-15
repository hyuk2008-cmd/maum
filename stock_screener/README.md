# 1개월 보유 모멘텀 스크리너

**원리(학술적으로 가장 오래 검증된 요인 조합):** 12-1 모멘텀(Jegadeesh & Titman, 1993) + 52주 고점 근접도(George & Hwang, 2004)
+ 저변동 선호 + 시장 추세 필터. 최근 1개월 수익률은 단기 반전 효과(Jegadeesh, 1990) 때문에 점수에서 빼고, 과열 급등주는 제외합니다.

## 실행
```bash
pip install -r requirements.txt
python screener.py --universe universe_kr.txt --bench ^KS11 --equity 50000000 --min-turnover 5e8   # 한국
python screener.py --universe universe_us.txt --bench ^GSPC --equity 50000 --min-turnover 2e7      # 미국
python backtest.py --universe universe_us.txt --bench ^GSPC --cost-bps 20                         # 과거 검증
python screener.py --demo   # 합성 데이터로 동작 확인
```

## 월간 루틴
1. 매월 첫 거래일 장 마감 후 `screener.py` 실행 → 다음 거래일 시가 근처에서 매수
2. 출력된 `stop`(진입가 − 2×ATR14)에 손절 주문, 21거래일 후 전량 청산 → 다시 1번
3. "현금 유지" 또는 "통과 종목 없음"이면 쉬기

## 주의
- 수익을 보장하지 않습니다. 백테스트는 생존편향·거래비용·슬리피지로 실제보다 좋게 나옵니다.
- 유니버스를 KOSPI200/S&P500 전체로 넓혀야 순위 선별이 의미 있습니다(예시 파일은 25종목).
- 처음 2~3개월은 실제 돈 없이 종이 거래로 규칙을 따라 보세요.
