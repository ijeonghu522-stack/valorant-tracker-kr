@echo off
REM Valorant Tracker KR 백엔드 실행기 (더블클릭)
cd /d "%~dp0backend"
"%~dp0.tools\node\node.exe" server.js
pause
