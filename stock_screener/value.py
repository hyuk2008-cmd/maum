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


def fetch_fundamentals(tickers: list[str], max_age_h: float = 24) -> pd.DataFrame:
    """종목별 재무 지표를 받아 DataFrame으로 반환(하루 캐시). 수집 실패 종목은 빈 값."""
    import yfinance as yf
    os.makedirs(CACHE, exist_ok=True)
    path = os.path.join(CACHE, "fundamentals.json")
    cached = {}
    if os.path.exists(path) and time.time() - os.path.getmtime(path) < max_age_h * 3600:
        cached = json.load(open(path, encoding="utf-8"))
    for t in tickers:
        if t in cached:
            continue
        try:
            info = yf.Ticker(t).info or {}
        except Exception:
            info = {}
        cached[t] = {k: info.get(k) for k in FIELDS}
    json.dump(cached, open(path, "w", encoding="utf-8"), ensure_ascii=False)
    df = pd.DataFrame.from_dict({t: cached[t] for t in tickers}, orient="index")
    for c in FIELDS:
        if c not in ("sector", "shortName"):
            df[c] = pd.to_numeric(df[c], errors="coerce")
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
    cols = ["shortName", "trailingPE", "priceToBook", "returnOnEquity", "debtToEquity", "currentRatio", "net_cash", "value_score"]
    return g.sort_values("value_score", ascending=False).head(p.top_n)[cols]


def synthetic_fundamentals(tickers: list[str], seed: int = 3) -> pd.DataFrame:
    rng = np.random.default_rng(seed); n = len(tickers)
    return pd.DataFrame({
        "shortName": tickers, "trailingPE": rng.uniform(3, 25, n), "priceToBook": rng.uniform(0.3, 3, n),
        "returnOnEquity": rng.uniform(-0.02, 0.25, n), "debtToEquity": rng.uniform(10, 250, n),
        "currentRatio": rng.uniform(0.6, 3, n), "freeCashflow": rng.normal(1e9, 2e9, n),
        "operatingCashflow": rng.normal(2e9, 2e9, n), "totalCash": rng.uniform(1e9, 9e9, n),
        "totalDebt": rng.uniform(1e9, 9e9, n), "marketCap": rng.uniform(5e9, 5e10, n),
        "sector": rng.choice(["Technology", "Financial Services", "Industrials"], n)}, index=tickers)
