"""저평가 우량주 선별: 낮은 PER/PBR + 건전한 재무(가치 함정 방지). 순수 pandas 로직 + yfinance 수집."""
from __future__ import annotations
import json
import os
import time
from dataclasses import dataclass
import numpy as np
import pandas as pd

CACHE = os.path.join(os.path.dirname(__file__), ".cache")
FIELDS = ["trailingPE", "priceToBook", "returnOnEquity", "debtToEquity", "currentRatio",
          "freeCashflow", "operatingCashflow", "totalCash", "totalDebt", "marketCap", "sector", "shortName"]


@dataclass
class ValueParams:
    max_per: float = 10.0        # 0 < PER <= 10
    max_pbr: float = 1.0         # PBR <= 1.0 (장부가 이하)
    min_roe: float = 0.08        # ROE >= 8% (싼 데는 이유가 없어야 함)
    max_debt_equity: float = 100.0   # 부채/자기자본 <= 100% (Yahoo는 % 단위)
    min_current_ratio: float = 1.2   # 유동비율 >= 1.2
    top_n: int = 10
    max_per_sector: int = 2      # 한 업종(예: 은행)이 목록을 독식하지 않도록 업종당 최대 종목 수


def _has_data(d: dict) -> bool:
    return any(d.get(k) is not None for k in ("trailingPE", "priceToBook", "returnOnEquity"))


def _fill_per_pbr(tk, row: dict) -> None:
    """Yahoo .info는 한국 상장종목에 trailingPE/priceToBook을 거의 항상 비워둔다(EPS·장부가 미제공).
    시가총액은 정상 수집되므로, 재무제표(순이익/자본총계)로 직접 나눠서 보정한다."""
    mc = row.get("marketCap")
    if not mc:
        return
    try:
        if row.get("trailingPE") is None:
            fin = tk.financials
            if "Net Income" in fin.index:
                ni = fin.loc["Net Income"].iloc[0]
                if ni and ni > 0:
                    row["trailingPE"] = mc / ni
        if row.get("priceToBook") is None:
            bs = tk.balance_sheet
            if "Stockholders Equity" in bs.index:
                eq = bs.loc["Stockholders Equity"].iloc[0]
                if eq and eq > 0:
                    row["priceToBook"] = mc / eq
    except Exception:
        pass


def fetch_fundamentals(tickers: list[str], max_age_h: float = 24) -> pd.DataFrame:
    """종목별 재무 지표를 받아 DataFrame으로 반환. 성공한 종목만 하루 캐시하고, 실패 원인은 df.attrs['errors']에 담는다."""
    import yfinance as yf
    os.makedirs(CACHE, exist_ok=True)
    path = os.path.join(CACHE, "fundamentals.json")
    cached = {}
    if os.path.exists(path) and time.time() - os.path.getmtime(path) < max_age_h * 3600:
        cached = {t: d for t, d in json.load(open(path, encoding="utf-8")).items() if _has_data(d)}  # 빈 캐시는 무시
    errors, fresh = [], {}
    for t in tickers:
        if t in cached:
            continue
        tk = yf.Ticker(t)
        info = {}
        for attempt in range(3):                     # 요청 제한 대비 재시도
            try:
                info = tk.info or {}
                if info:
                    break
            except Exception as e:
                if len(errors) < 3:
                    errors.append(f"{t}: {type(e).__name__}: {str(e)[:120]}")
            time.sleep(1.5 * (attempt + 1))
        row = {k: info.get(k) for k in FIELDS}
        _fill_per_pbr(tk, row)                        # 야후가 한국 종목엔 PER/PBR을 안 채워줄 때 재무제표로 직접 계산
        fresh[t] = row
        if _has_data(row):
            cached[t] = row
        time.sleep(0.3)                              # 요청 간격
        if len(fresh) >= 5 and not cached and not any(_has_data(r) for r in fresh.values()):
            errors.append("처음 5종목 모두 데이터가 비어 있어 수집을 중단했습니다(요청 제한 또는 접속 문제 가능).")
            break
    json.dump(cached, open(path, "w", encoding="utf-8"), ensure_ascii=False)   # 성공한 것만 저장
    rows = {t: cached.get(t) or fresh.get(t) or {k: None for k in FIELDS} for t in tickers}
    df = pd.DataFrame.from_dict(rows, orient="index")
    for c in FIELDS:
        if c not in ("sector", "shortName"):
            df[c] = pd.to_numeric(df[c], errors="coerce")
    df.attrs["errors"] = errors
    return df


def value_screen(f: pd.DataFrame, p: ValueParams = ValueParams()) -> pd.DataFrame:
    """필터 통과 종목을 '저평가 + 재무 건전' 점수로 정렬. 금융업은 부채/유동비율 조건을 면제한다."""
    f = f.copy()
    fin = f["sector"].fillna("").str.contains("Financial", case=False)
    cheap = (f.trailingPE > 0) & (f.trailingPE <= p.max_per) & (f.priceToBook > 0) & (f.priceToBook <= p.max_pbr)
    profitable = (f.returnOnEquity >= p.min_roe)
    safe = fin | ((f.debtToEquity <= p.max_debt_equity) & (f.currentRatio >= p.min_current_ratio))
    cash_ok = fin | ((f.freeCashflow > 0) & (f.operatingCashflow > 0))
    g = f[cheap & profitable & safe & cash_ok].copy()
    if g.empty:
        return g
    g["net_cash"] = (g.totalCash.fillna(0) - g.totalDebt.fillna(0)) / g.marketCap       # 시총 대비 순현금
    r = lambda s, asc=True: s.rank(pct=True, ascending=asc)
    g["value_score"] = (0.30 * r(g.trailingPE, False) + 0.25 * r(g.priceToBook, False)   # 낮을수록 좋음
                        + 0.25 * r(g.returnOnEquity) + 0.10 * r(g.net_cash.fillna(-1))
                        + 0.10 * r(g.debtToEquity.fillna(0), False))
    cols = ["shortName", "sector", "trailingPE", "priceToBook", "returnOnEquity", "debtToEquity", "currentRatio", "net_cash", "value_score"]
    g = g.sort_values("value_score", ascending=False)
    sec = g["sector"].fillna("")                       # 업종 정보가 없는 종목은 제한하지 않음
    rank_in_sector = g.groupby(sec.where(sec != "", pd.Series(g.index, index=g.index))).cumcount()
    return g[rank_in_sector < p.max_per_sector].head(p.top_n)[cols]


def synthetic_fundamentals(tickers: list[str], seed: int = 3) -> pd.DataFrame:
    rng = np.random.default_rng(seed); n = len(tickers)
    return pd.DataFrame({
        "shortName": tickers, "trailingPE": rng.uniform(3, 25, n), "priceToBook": rng.uniform(0.3, 3, n),
        "returnOnEquity": rng.uniform(-0.02, 0.25, n), "debtToEquity": rng.uniform(10, 250, n),
        "currentRatio": rng.uniform(0.6, 3, n), "freeCashflow": rng.normal(1e9, 2e9, n),
        "operatingCashflow": rng.normal(2e9, 2e9, n), "totalCash": rng.uniform(1e9, 9e9, n),
        "totalDebt": rng.uniform(1e9, 9e9, n), "marketCap": rng.uniform(5e9, 5e10, n),
        "sector": rng.choice(["Technology", "Financial Services", "Industrials"], n)}, index=tickers)


def value_diagnostics(f: pd.DataFrame, p: ValueParams = ValueParams()) -> str:
    """어느 조건에서 종목이 탈락하는지(또는 데이터가 비었는지) 한 줄로 요약."""
    n = len(f)
    has = f[["trailingPE", "priceToBook"]].notna().all(axis=1)
    fin = f["sector"].fillna("").str.contains("Financial", case=False)
    c1 = has & (f.trailingPE > 0) & (f.trailingPE <= p.max_per) & (f.priceToBook > 0) & (f.priceToBook <= p.max_pbr)
    c2 = c1 & (f.returnOnEquity >= p.min_roe)
    c3 = c2 & (fin | ((f.debtToEquity <= p.max_debt_equity) & (f.currentRatio >= p.min_current_ratio)))
    c4 = c3 & (fin | ((f.freeCashflow > 0) & (f.operatingCashflow > 0)))
    return (f"재무 데이터 {int(has.sum())}/{n}종목 수집 → PER·PBR 조건 {int(c1.sum())} → ROE {int(c2.sum())} "
            f"→ 부채·유동비율 {int(c3.sum())} → 현금흐름 {int(c4.sum())}")
