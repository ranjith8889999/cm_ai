@echo off
echo ===================================
echo  Telangana AI Governance Dashboard
echo ===================================
echo.
echo [1/2] Installing Python dependencies...
cd /d "%~dp0backend"
pip install -r requirements.txt --quiet

echo.
echo [2/2] Starting Flask server...
echo.
echo  Dashboard will open at: http://localhost:5000
echo  Press Ctrl+C to stop.
echo.
start "" "http://localhost:5000"
"%~dp0.venv\Scripts\python.exe" "%~dp0backend\app.py"
