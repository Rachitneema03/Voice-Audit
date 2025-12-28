@echo off
echo ========================================
echo Starting Voice Audit Backend Server
echo ========================================
echo.

cd /d %~dp0

echo Checking Node.js...
node --version
if errorlevel 1 (
    echo ERROR: Node.js is not installed or not in PATH
    pause
    exit /b 1
)

echo.
echo Installing dependencies (if needed)...
call npm install

echo.
echo Starting backend server...
echo.
npm run dev

pause


