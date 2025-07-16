@echo off
echo Starting Ef-El Speech Lab Backend Server...
cd /d "%~dp0"
python -m uvicorn app.main:app --reload --host 127.0.0.1 --port 8000
pause
