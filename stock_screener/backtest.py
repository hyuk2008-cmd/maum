"""워크포워드 백테스트: 매 21거래일마다 리밸런싱, 그 시점까지의 데이터만 사용.

예)  python backtest.py
     python backtest.py --demo
"""
import argparse
import numpy as np
import pandas as pd
from core import Params, compute_features, select, regime_ok
from data import load_prices, read_universe, synthetic_prices


def run(px: dict, bench: pd.Series, p: Params, cost_bps: float) -> pd.DataFrame:
    c, h, l, v = px["close"], px["high"], px["low"], px["volume"]
    rows = []
    for t in range(253, len(c) - p.hold_days, p.hold_days):
        sl = slice(0, t + 1)                                    # t일 종가까지만 사용
        entry, exit_ = t + 1, t + 1 + p.hold_days - 1          # 다음 거래일 시가 대용: t+1 종가 진입
        if exit_ >= len(c):
            break
        univ_ret = (c.iloc[exit_] / c.iloc[entry] - 1).mean()   # 유니버스 동일가중(비교용)
        if p.use_regime and not regime_ok(bench.iloc[sl]):
            rows.append((c.index[t], 0.0, univ_ret, 0, "cash")); continue
        feat = compute_features(c.iloc[sl], h.iloc[sl], l.iloc[sl], v.iloc[sl])
        picks = select(feat, p)
        if picks.empty:
            rows.append((c.index[t], 0.0, univ_ret, 0, "none")); continue
        r = []
        for tk, row in picks.iterrows():
            stop = row.price - p.atr_mult * row.atr14
            path = c[tk].iloc[entry:exit_ + 1]
            px_in = path.iloc[0]
            hit = path[path <= stop]                             # 종가 기준 손절(보수적 단순화)
            px_out = hit.iloc[0] if len(hit) else path.iloc[-1]
            r.append(px_out / px_in - 1 - 2 * cost_bps / 1e4)
        rows.append((c.index[t], float(np.mean(r)), univ_ret, len(r), "long"))
    return pd.DataFrame(rows, columns=["date", "strategy", "universe_ew", "n", "state"]).set_index("date")


def summary(df: pd.DataFrame) -> None:
    for col in ["strategy", "universe_ew"]:
        r = df[col]; eq = (1 + r).cumprod()
        dd = (eq / eq.cummax() - 1).min()
        print(f"{col:12s} 누적 {eq.iloc[-1]-1:7.1%} | 월평균 {r.mean():6.2%} | 승률 {(r>0).mean():5.1%} | 최대낙폭(월단위) {dd:6.1%} | 월 변동성 {r.std():5.2%}")
    print(f"리밸런싱 {len(df)}회, 현금/무진입 {int((df.state != 'long').sum())}회")


def main() -> None:
    ap = argparse.ArgumentParser()
    ap.add_argument("--universe", default="universe_kr.txt")
    ap.add_argument("--bench", default="^KS11")
    ap.add_argument("--min-turnover", type=float, default=5e8)
    ap.add_argument("--cost-bps", type=float, default=18, help="편도 거래비용(bp). 한국: 매도세 0.20%(2026)+수수료+슬리피지 → 왕복 약 0.35%")
    ap.add_argument("--years", type=float, default=6)
    ap.add_argument("--demo", action="store_true")
    a = ap.parse_args()
    p = Params(min_turnover=a.min_turnover)
    if a.demo:
        px = synthetic_prices(days=1500); bench = px["close"].mean(axis=1); p.min_turnover = 0
    else:
        px = load_prices(read_universe(a.universe) + [a.bench], years=a.years)
        bench = px["close"][a.bench]; px = {k: v.drop(columns=[a.bench]) for k, v in px.items()}
    summary(run(px, bench, p, a.cost_bps))
    print("\n※ 유니버스가 '현재 살아남은 종목'이면 생존편향으로 과거 성과가 부풀려집니다. 참고용으로만 보세요.")


if __name__ == "__main__":
    main()
