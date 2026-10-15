"""데이터 로딩: Yahoo(yfinance) + 로컬 CSV 캐시, 그리고 테스트용 합성 데이터."""
from __future__ import annotations
import os
import numpy as np
import pandas as pd

CACHE = os.path.join(os.path.dirname(__file__), ".cache")


def read_universe(path: str) -> list[str]:
    with open(path, encoding="utf-8") as f:
        return [ln.strip() for ln in f if ln.strip() and not ln.startswith("#")]


def load_prices(tickers: list[str], years: float = 3.0) -> dict[str, pd.DataFrame]:
    """반환: {'close','high','low','volume'} → 각각 (날짜 x 티커) DataFrame."""
    try:
        import yfinance as yf
    except ImportError as e:
        raise SystemExit("yfinance가 필요합니다: pip install -r requirements.txt") from e
    os.makedirs(CACHE, exist_ok=True)
    df = yf.download(tickers, period=f"{int(np.ceil(years))}y", auto_adjust=True,
                     progress=False, group_by="column", threads=True)
    if df is None or df.empty:
        raise SystemExit("가격 데이터를 받지 못했습니다. 네트워크/티커를 확인하세요.")
    if not isinstance(df.columns, pd.MultiIndex):       # 티커 1개일 때
        df.columns = pd.MultiIndex.from_product([df.columns, tickers])
    out = {k.lower(): df[k].dropna(how="all") for k in ["Close", "High", "Low", "Volume"]}
    # 결측이 많은 종목 제거 (상장 1년 미만 등)
    ok = out["close"].columns[out["close"].notna().mean() > 0.95]
    return {k: v[ok].ffill() for k, v in out.items()}


def synthetic_prices(n_tickers: int = 40, days: int = 900, seed: int = 7) -> dict[str, pd.DataFrame]:
    """로직 검증용 가짜 데이터(기하 브라운 운동 + 약한 모멘텀 지속). 실제 성과와 무관."""
    rng = np.random.default_rng(seed)
    idx = pd.bdate_range(end=pd.Timestamp.today().normalize(), periods=days)
    mkt = rng.normal(0.0003, 0.01, days)
    drift = rng.normal(0.0002, 0.0004, n_tickers)
    rets = np.empty((days, n_tickers))
    for j in range(n_tickers):
        noise = rng.normal(0, rng.uniform(0.012, 0.03), days)
        rets[:, j] = drift[j] + 0.8 * mkt + noise
    close = pd.DataFrame(100 * np.exp(np.cumsum(rets, axis=0)), index=idx,
                         columns=[f"T{j:02d}" for j in range(n_tickers)])
    spread = np.abs(rng.normal(0, 0.008, close.shape))
    return {"close": close, "high": close * (1 + spread), "low": close * (1 - spread),
            "volume": pd.DataFrame(rng.uniform(1e6, 5e6, close.shape), index=idx, columns=close.columns)}
