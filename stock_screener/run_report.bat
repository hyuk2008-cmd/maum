@echo off
chcp 65001 >nul
set PYTHONUTF8=1
cd /d "%~dp0"

echo [1/3] 최신 코드 받는 중...
git pull --quiet

echo [2/3] 필요한 라이브러리 확인 중...
python -m pip install -q -r requirements.txt

echo [3/3] 종목 선별 실행 중... (1~3분 걸립니다)
python screener.py --equity 10000000
if errorlevel 1 (
  echo.
  echo 오류가 났습니다. 이 화면을 캡처해서 보내주세요.
  pause
  exit /b 1
)

start "" "%~dp0report.html"
echo.
echo 완료. 브라우저에 리포트가 열립니다.
pause
