@echo off
rem Auto-start FeishuSync watchdog at Windows logon.
rem
rem Usage: Copy a shortcut of this file (or _autostart_watchdog.vbs) into
rem the Windows Startup folder:
rem   shell:startup
rem
rem The watchdog guards auth (token renewal) and sync (folder mirroring)
rem and restarts them if they crash.
rem
rem Uses %~dp0 for self-locating (works regardless of install path).

cd /d "%~dp0"

rem Ensure logs directory exists
if not exist logs mkdir logs

rem Verify Node.js is available (PATH may not be fully loaded at startup)
where node >nul 2>&1
if %errorlevel% neq 0 (
    echo [%date% %time%] [FeishuSync] Node.js not found in PATH > logs\startup.log
    echo [%date% %time%] Please install Node.js 18+ or add it to PATH >> logs\startup.log
    exit /b 1
)

rem Verify config.json exists
if not exist config.json (
    echo [%date% %time%] [FeishuSync] config.json not found >> logs\startup.log
    echo [%date% %time%] Copy config.example.json to config.json and fill credentials >> logs\startup.log
    exit /b 1
)

rem Install dependencies if missing
if not exist node_modules (
    echo [%date% %time%] [FeishuSync] Installing dependencies... >> logs\startup.log
    call npm install --production >> logs\startup.log 2>&1
)

rem Log startup attempt
echo [%date% %time%] [FeishuSync] Starting watchdog... >> logs\startup.log

rem Start watchdog in background.
rem /B = background (no new console window)
rem /D = set working directory explicitly
rem Output redirected to startup.log so failures are visible
start "FeishuSync Watchdog" /B /D "%~dp0" cmd /c "node scripts\watchdog.js >> logs\startup.log 2>&1"

echo [%date% %time%] [FeishuSync] Watchdog launched >> logs\startup.log
