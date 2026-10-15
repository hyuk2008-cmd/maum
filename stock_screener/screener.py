"""오늘 기준 '1개월 보유' 후보 종목 + 수량/손절가를 출력하고 report.html 로 저장한다.

예)  python screener.py --equity 10000000          # 현재 평가금액(원). 매달 계좌 잔고로 갱신
     python screener.py --demo                     # 합성 데이터로 동작 확인
"""
import argparse
import html
import pandas as pd
from core import Params, compute_features, select, regime_ok, position_plan, account_status
from data import load_prices, read_universe, synthetic_prices

NAMES = {}  # 필요하면 {'005930.KS': '삼성전자'} 식으로 채우세요.


def write_report(path, asof, status, note, plan, p, equity):
    rows = ""
    if plan is not None and not plan.empty:
        for tk, r in plan.iterrows():
            rows += (f"<tr><td>{html.escape(NAMES.get(tk, tk))}</td><td>{tk}</td><td>{r.price:,.0f}</td>"
                     f"<td>{r.stop:,.0f}</td><td>{int(r.qty):,}</td><td>{r.qty*r.price:,.0f}</td>"
                     f"<td>{r.weight:.1%}</td><td>{r.mom_12_1:.0%}</td><td>{r.near_high:.0%}</td></tr>")
    color = {"OK": "#1a7f37", "DERISK": "#b7791f", "HALT": "#c0392b"}[status]
    open(path, "w", encoding="utf-8").write(f"""<!doctype html><meta charset="utf-8"><meta name="viewport" content="width=device-width">
<title>월간 종목 리포트</title>
<style>body{{font-family:system-ui,sans-serif;max-width:900px;margin:24px auto;padding:0 16px;color:#222}}
table{{border-collapse:collapse;width:100%;font-size:14px}}th,td{{border-bottom:1px solid #ddd;padding:6px 8px;text-align:right}}
th:first-child,td:first-child,th:nth-child(2),td:nth-child(2){{text-align:left}}
.b{{display:inline-block;padding:4px 10px;border-radius:12px;color:#fff;background:{color}}}</style>
<h2>월간 종목 리포트 <small>기준일 {asof}</small></h2>
<p>계좌 상태 <span class="b">{status}</span> · 평가금액 {equity:,.0f}원 (원금 {p.start_capital:,.0f}원, 손실 한도 {p.max_total_loss:.0%} = {p.start_capital*(1-p.max_total_loss):,.0f}원)</p>
<p>{html.escape(note)}</p>
{"<table><tr><th>종목</th><th>티커</th><th>현재가</th><th>손절가</th><th>수량</th><th>금액</th><th>비중</th><th>12-1 모멘텀</th><th>52주고점 대비</th></tr>"+rows+"</table>" if rows else ""}
<p style="color:#666;font-size:13px">매수 후 {p.hold_days}거래일(약 1개월) 뒤 전량 청산, 손절가 이탈 시 즉시 매도. 수익을 보장하지 않으며 투자 판단과 책임은 본인에게 있습니다.</p>""")


def main() -> None:
    ap = argparse.ArgumentParser()
    ap.add_argument("--universe", default="universe_kr.txt")
    ap.add_argument("--bench", default="^KS11", help="시장 필터용 지수 (KOSPI ^KS11)")
    ap.add_argument("--equity", type=float, default=10_000_000, help="현재 계좌 평가금액(원)")
    ap.add_argument("--start-capital", type=float, default=10_000_000)
    ap.add_argument("--top", type=int, default=5)
    ap.add_argument("--min-turnover", type=float, default=5e8)
    ap.add_argument("--no-regime", action="store_true")
    ap.add_argument("--html", default="report.html")
    ap.add_argument("--demo", action="store_true")
    a = ap.parse_args()
    p = Params(top_n=a.top, min_turnover=a.min_turnover, use_regime=not a.no_regime, start_capital=a.start_capital)

    if a.demo:
        px = synthetic_prices(); bench = px["close"].mean(axis=1); p.min_turnover = 0
    else:
        px = load_prices(read_universe(a.universe) + [a.bench])
        bench = px["close"][a.bench]
        px = {k: v.drop(columns=[a.bench]) for k, v in px.items()}
    asof = px["close"].index[-1].date()

    status, risk = account_status(a.equity, p)
    p.risk_per_trade = risk
    if status == "HALT":
        note = f"🛑 누적 손실이 한도({p.max_total_loss:.0%})에 도달했습니다. 신규 매매를 중단하고 보유분을 정리한 뒤 규칙을 점검하세요."
        print(note); write_report(a.html, asof, status, note, None, p, a.equity); return
    if p.use_regime and not regime_ok(bench):
        note = "시장 필터: 지수가 200일선 아래 → 신규 진입 보류, 현금 유지 권고."
        print("⚠", note); write_report(a.html, asof, status, note, None, p, a.equity); return
    picks = select(compute_features(px["close"], px["high"], px["low"], px["volume"]), p)
    if picks.empty:
        note = "조건을 통과한 종목이 없습니다 → 이번 달은 쉬는 것도 전략입니다."
        print(note); write_report(a.html, asof, status, note, None, p, a.equity); return
    plan = position_plan(picks, a.equity, p)
    note = (f"종목당 위험 {risk:.2%}{' (손실 구간이라 절반으로 축소)' if status=='DERISK' else ''} · "
            f"투자비중 합계 {plan.weight.sum():.1%} · 전 종목 동시 손절 시 최대 손실 ≈ {plan.max_loss_pct.sum():.1%}")
    pd.options.display.float_format = "{:,.3f}".format
    print(f"기준일 {asof} | 계좌 상태 {status} | 보유 {p.hold_days}거래일 후 청산 | 손절=진입가-{p.atr_mult}×ATR14")
    print(plan.to_string()); print("\n" + note)
    write_report(a.html, asof, status, note, plan, p, a.equity)
    print(f"리포트 저장: {a.html} (브라우저로 열어보세요)")


if __name__ == "__main__":
    main()
