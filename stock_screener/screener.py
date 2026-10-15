"""오늘 기준 '1개월 보유' 후보 종목 + 수량/손절가를 출력하고 report.html 로 저장한다.

예)  python screener.py --equity 10000000          # 현재 평가금액(원). 매달 계좌 잔고로 갱신
     python screener.py --demo                     # 합성 데이터로 동작 확인
"""
import argparse
import html
import pandas as pd
from core import Params, compute_features, select, regime_ok, position_plan, account_status
from data import load_prices, read_universe, synthetic_prices
from value import fetch_fundamentals, value_screen, value_diagnostics, synthetic_fundamentals

NAMES = {}  # 필요하면 {'005930.KS': '삼성전자'} 식으로 채우세요.


def write_report(path, asof, status, note, plan, p, equity, value=None, mom_tickers=()):
    rows = ""
    if plan is not None and not plan.empty:
        for tk, r in plan.iterrows():
            rows += (f"<tr><td>{html.escape(NAMES.get(tk, tk))}</td><td>{tk}</td><td>{r.price:,.0f}</td>"
                     f"<td>{r.stop:,.0f}</td><td>{int(r.qty):,}</td><td>{r.qty*r.price:,.0f}</td>"
                     f"<td>{r.weight:.1%}</td><td>{r.mom_12_1:.0%}</td><td>{r.near_high:.0%}</td></tr>")
    vrows = ""
    if value is not None and not value.empty:
        for tk, r in value.iterrows():
            tag = " ★모멘텀 겹침" if tk in mom_tickers else ""
            vrows += (f"<tr><td>{html.escape(str(r.shortName))}{tag}</td><td>{tk}</td><td>{r.trailingPE:.1f}</td>"
                      f"<td>{r.priceToBook:.2f}</td><td>{r.returnOnEquity:.0%}</td><td>{r.debtToEquity:.0f}%</td>"
                      f"<td>{r.currentRatio:.1f}</td><td>{r.net_cash:+.0%}</td></tr>")
    vhtml = ("<h3>저평가 우량주 (PER≤10, PBR≤1, ROE≥8%, 부채비율≤100%, 유동비율≥1.2, 현금흐름 +)</h3>"
             "<table><tr><th>종목</th><th>티커</th><th>PER</th><th>PBR</th><th>ROE</th><th>부채비율</th><th>유동비율</th><th>순현금/시총</th></tr>"
             + vrows + "</table><p style='color:#666;font-size:13px'>가치 효과는 보통 수 개월~수 년에 걸쳐 나타나므로 1개월 보유 후보가 아니라 <b>관찰 목록</b>입니다. "
             "★는 모멘텀 후보와도 겹치는 종목(저평가+상승 추세)입니다. 지주사·그룹 지배구조 등 구조적 이유로 싼 종목도 있어 사업·공시 확인이 필요합니다.</p>") if vrows else ""
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
{vhtml}
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
    ap.add_argument("--no-value", action="store_true", help="저평가 우량주 선별 생략")
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

    value = None
    if not a.no_value:
        try:
            tks = list(px["close"].columns)
            fund = synthetic_fundamentals(tks) if a.demo else fetch_fundamentals(tks)
            value = value_screen(fund)
            print(value_diagnostics(fund))
            print("\n[저평가 우량주 관찰 목록]"); print(value.to_string() if not value.empty else "통과 종목 없음")
        except Exception as e:
            print(f"(재무 데이터 수집 실패, 저평가 선별 생략: {e})")

    status, risk = account_status(a.equity, p)
    p.risk_per_trade = risk
    if status == "HALT":
        note = f"🛑 누적 손실이 한도({p.max_total_loss:.0%})에 도달했습니다. 신규 매매를 중단하고 보유분을 정리한 뒤 규칙을 점검하세요."
        print(note); write_report(a.html, asof, status, note, None, p, a.equity, value); return
    b200 = bench.iloc[-200:].mean()
    print(f"시장 필터: 지수 {bench.iloc[-1]:,.1f} / 200일선 {b200:,.1f} ({bench.iloc[-1]/b200-1:+.1%})")
    blocked = p.use_regime and not regime_ok(bench)
    picks = select(compute_features(px["close"], px["high"], px["low"], px["volume"]), p)
    if picks.empty:
        note = "조건을 통과한 종목이 없습니다 → 이번 달은 쉬는 것도 전략입니다."
        print(note); write_report(a.html, asof, status, note, None, p, a.equity, value); return
    plan = position_plan(picks, a.equity, p)
    if blocked:
        note = "⚠ 시장 필터: 지수가 200일선 아래 → 신규 진입 보류(현금 유지) 권고. 아래 표는 '참고용'이며 매수 대상이 아닙니다."
        print(note); print(plan[["price", "score", "mom_12_1", "ret_1m", "near_high"]].to_string())
        write_report(a.html, asof, status, note, plan, p, a.equity, value, set()); return
    note = (f"종목당 위험 {risk:.2%}{' (손실 구간이라 절반으로 축소)' if status=='DERISK' else ''} · "
            f"투자비중 합계 {plan.weight.sum():.1%} · 전 종목 동시 손절 시 최대 손실 ≈ {plan.max_loss_pct.sum():.1%}")
    pd.options.display.float_format = "{:,.3f}".format
    print(f"기준일 {asof} | 계좌 상태 {status} | 보유 {p.hold_days}거래일 후 청산 | 손절=진입가-{p.atr_mult}×ATR14")
    print(plan.to_string()); print("\n" + note)
    write_report(a.html, asof, status, note, plan, p, a.equity, value, set(plan.index))
    print(f"리포트 저장: {a.html} (브라우저로 열어보세요)")


if __name__ == "__main__":
    main()
