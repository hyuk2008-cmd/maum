"""오늘 기준 '1개월 보유' 후보 종목 + 수량/손절가를 출력한다.

예)  python screener.py --universe universe_kr.txt --bench ^KS11 --equity 50000000 --min-turnover 5e8
     python screener.py --universe universe_us.txt --bench ^GSPC --equity 50000 --min-turnover 2e7
     python screener.py --demo        # 합성 데이터로 동작 확인
"""
import argparse
import pandas as pd
from core import Params, compute_features, select, regime_ok, position_plan
from data import load_prices, read_universe, synthetic_prices


def main() -> None:
    ap = argparse.ArgumentParser()
    ap.add_argument("--universe", default="universe_kr.txt")
    ap.add_argument("--bench", default="^KS11", help="시장 필터용 지수 (KOSPI ^KS11, S&P500 ^GSPC)")
    ap.add_argument("--equity", type=float, default=50_000_000, help="투자 가능 총자산(통화 단위 그대로)")
    ap.add_argument("--top", type=int, default=5)
    ap.add_argument("--min-turnover", type=float, default=5e8)
    ap.add_argument("--no-regime", action="store_true")
    ap.add_argument("--demo", action="store_true")
    a = ap.parse_args()
    p = Params(top_n=a.top, min_turnover=a.min_turnover, use_regime=not a.no_regime)

    if a.demo:
        px = synthetic_prices(); bench = px["close"].mean(axis=1)
        p.min_turnover = 0
    else:
        tickers = read_universe(a.universe)
        px = load_prices(tickers + [a.bench])
        bench = px["close"][a.bench]
        px = {k: v.drop(columns=[a.bench]) for k, v in px.items()}

    if p.use_regime and not regime_ok(bench):
        print("⚠ 시장 필터: 벤치마크가 200일선 아래 → 신규 진입 보류(현금 유지) 권고")
        return
    feat = compute_features(px["close"], px["high"], px["low"], px["volume"])
    picks = select(feat, p)
    if picks.empty:
        print("조건을 통과한 종목이 없습니다 → 이번 달은 쉬는 것도 전략입니다.")
        return
    plan = position_plan(picks, a.equity, p)
    pd.options.display.float_format = "{:,.3f}".format
    print(f"기준일 {px['close'].index[-1].date()} | 보유 {p.hold_days}거래일 후 전량 청산 | 손절=진입가-{p.atr_mult}×ATR14")
    print(plan.to_string())
    print(f"\n투자비중 합계 {plan.weight.sum():.1%} (나머지는 현금) | 전 종목 동시 손절 시 최대 손실 ≈ {plan.max_loss_pct.sum():.1%}")


if __name__ == "__main__":
    main()
