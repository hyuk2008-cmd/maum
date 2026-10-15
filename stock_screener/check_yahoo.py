"""한 번 실행으로 '재무 데이터가 왜 비는지' 모두 확인하는 진단 스크립트. 결과 화면 전체를 캡처해서 보내주세요."""
import subprocess
import sys
import time

def step(name, fn):
    t0 = time.time()
    try:
        r = fn()
        print(f"[OK]   {name}: {r}  ({time.time()-t0:.1f}s)")
    except Exception as e:
        print(f"[FAIL] {name}: {type(e).__name__}: {str(e)[:200]}  ({time.time()-t0:.1f}s)")

try:
    commit = subprocess.check_output(["git", "rev-parse", "--short", "HEAD"], text=True).strip()
except Exception:
    commit = "알 수 없음"
print("코드 버전(커밋):", commit, "| 정상이라면 8439050 이후 값이어야 합니다")
print("Python:", sys.version.split()[0])
import yfinance as yf
print("yfinance:", yf.__version__)

for tk in ["005930.KS", "AAPL"]:            # 한국 대표주 + 미국 대표주(비교용)
    print(f"\n--- {tk} ---")
    t = yf.Ticker(tk)
    def keys():
        i = t.info
        return f"{len(i)}개 항목, PER={i.get('trailingPE')}, PBR={i.get('priceToBook')}, ROE={i.get('returnOnEquity')}"
    step("t.info", keys)
    step("t.get_info()", lambda: len(t.get_info()))
    step("t.fast_info (시총)", lambda: t.fast_info["market_cap"])
    step("재무상태표", lambda: f"{t.quarterly_balance_sheet.shape}")
    step("손익계산서", lambda: f"{t.quarterly_income_stmt.shape}")
    step("시세(5일)", lambda: f"{len(t.history(period='5d'))}행")
print("\n끝. 위 화면 전체를 캡처해서 보내주세요.")
