"""1개월 보유 모멘텀 스크리너 — 핵심 로직 (데이터 소스와 무관한 순수 pandas 함수)."""
from __future__ import annotations
from dataclasses import dataclass
import numpy as np
import pandas as pd


@dataclass
class Params:
    top_n: int = 5                 # 최종 보유 종목 수
    hold_days: int = 21            # 보유 기간(거래일) ≈ 1개월
    min_turnover: float = 5e8      # 20일 평균 거래대금 하한 (통화 단위 그대로; KRW 5억 / USD면 낮춰서 사용)
    max_ret_1m: float = 0.35       # 최근 1개월 +35% 초과 급등주는 과열로 제외
    max_vol_60d: float = 0.80      # 연환산 변동성 상한
    atr_mult: float = 2.0          # 손절폭 = ATR14 * atr_mult
    risk_per_trade: float = 0.01   # 종목당 최대 손실 = 총자산의 1%
    max_weight: float = 0.25       # 종목당 최대 비중
    use_regime: bool = True        # 벤치마크가 200일선 아래면 '현금' 신호
    start_capital: float = 10_000_000   # 시작 원금
    max_total_loss: float = 0.25        # 원금 대비 누적 손실 한도 (도달 시 매매 중단)
    derisk_loss: float = 0.12           # 이 손실에 도달하면 종목당 위험을 절반으로


def _rank(s: pd.Series, ascending: bool = True) -> pd.Series:
    return s.rank(pct=True, ascending=ascending)


def compute_features(close: pd.DataFrame, high: pd.DataFrame, low: pd.DataFrame,
                     volume: pd.DataFrame) -> pd.DataFrame:
    """각 종목의 '마지막 행 기준' 지표를 한 줄씩 계산한다. 미래 데이터는 쓰지 않는다."""
    n = len(close)
    if n < 253:
        raise ValueError("최소 253거래일(약 1년) 데이터가 필요합니다.")
    c = close
    last = c.iloc[-1]
    # 12-1 모멘텀: 1년 전 ~ 1개월 전 수익률 (최근 1개월은 단기 반전 효과 때문에 제외)
    mom_12_1 = c.iloc[-22] / c.iloc[-253] - 1
    ret_1m = last / c.iloc[-22] - 1
    sma50 = c.iloc[-50:].mean()
    sma200 = c.iloc[-200:].mean()
    high_52w = c.iloc[-252:].max()
    near_high = last / high_52w                      # 1에 가까울수록 신고가 근처
    vol_60d = c.pct_change().iloc[-60:].std() * np.sqrt(252)
    turnover = (c * volume).iloc[-20:].mean()
    prev_c = c.shift(1)
    tr_df = np.maximum.reduce([(high - low).values, (high - prev_c).abs().values, (low - prev_c).abs().values])
    atr14 = pd.DataFrame(tr_df, index=c.index, columns=c.columns).iloc[-14:].mean()
    return pd.DataFrame({
        "price": last, "mom_12_1": mom_12_1, "ret_1m": ret_1m, "near_high": near_high,
        "vol_60d": vol_60d, "turnover": turnover, "sma50": sma50, "sma200": sma200, "atr14": atr14,
    }).dropna()


def select(feat: pd.DataFrame, p: Params) -> pd.DataFrame:
    """필터 → 점수 → 상위 N개."""
    f = feat.copy()
    f = f[(f.turnover >= p.min_turnover)                 # 유동성
          & (f.price > f.sma50) & (f.sma50 > f.sma200)   # 정배열 추세
          & (f.mom_12_1 > 0)                             # 절대 모멘텀
          & (f.ret_1m <= p.max_ret_1m)                   # 과열 제외
          & (f.vol_60d <= p.max_vol_60d)]                # 초고변동 제외
    if f.empty:
        return f
    f["score"] = (0.45 * _rank(f.mom_12_1)                 # 중장기 모멘텀
                  + 0.30 * _rank(f.near_high)              # 52주 고점 근접도
                  + 0.25 * _rank(f.vol_60d, ascending=False))  # 저변동 선호
    return f.sort_values("score", ascending=False).head(p.top_n)


def regime_ok(bench_close: pd.Series) -> bool:
    """시장 필터: 벤치마크가 200일선 위일 때만 신규 진입."""
    return bool(bench_close.iloc[-1] > bench_close.iloc[-200:].mean())


def position_plan(picks: pd.DataFrame, equity: float, p: Params) -> pd.DataFrame:
    """ATR 손절 기준 수량 산정: 손절 시 손실 ≈ equity * risk_per_trade, 비중 상한 적용."""
    if picks.empty:
        return picks
    out = picks.copy()
    out["stop"] = out.price - p.atr_mult * out.atr14
    risk_per_share = (out.price - out.stop).clip(lower=1e-9)
    qty_risk = (equity * p.risk_per_trade) / risk_per_share
    qty_cap = (equity * p.max_weight) / out.price
    qty = np.minimum(qty_risk, qty_cap)
    total_w = (qty * out.price).sum() / equity
    if total_w > 1.0:                       # 합계가 100%를 넘으면 비례 축소(레버리지 금지)
        qty = qty / total_w
    out["qty"] = np.floor(qty)
    out["weight"] = out.qty * out.price / equity
    out["max_loss_pct"] = out.qty * risk_per_share / equity
    return out[["price", "score", "mom_12_1", "ret_1m", "near_high", "vol_60d", "stop", "qty", "weight", "max_loss_pct"]]


def account_status(equity: float, p: Params) -> tuple[str, float]:
    """현재 평가금액으로 계좌 상태와 이번 달 종목당 위험 비율을 결정한다.
    반환: (상태, risk_per_trade). 상태: 'HALT'(중단) / 'DERISK'(위험 절반) / 'OK'."""
    loss = 1 - equity / p.start_capital
    if loss >= p.max_total_loss:
        return "HALT", 0.0
    if loss >= p.derisk_loss:
        return "DERISK", p.risk_per_trade / 2
    return "OK", p.risk_per_trade
