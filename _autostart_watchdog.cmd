@echo off
rem Auto-start FeishuSync watchdog at Windows logon.
rem Usage: Copy a shortcut of this file into shell:startup
rem
rem The watchdog guards auth (token renewal) and sync (folder mirroring)
rem and restarts them if they crash.
rem
rem This script uses %~dp0 to find its own directory, so it works
rem regardless of where FeishuSync is installed.

rem 切换到脚本所在目录（自适应路径）
cd /d "%~dp0"

rem 检查 node 是否可用
where node >nul 2>&1
if %errorlevel% neq 0 (
    echo [FeishuSync] Node.js not found in PATH. Please install Node.js 18+.
    echo [FeishuSync] Download: https://nodejs.org/
    pause
    exit /b 1
)

rem 检查 config.json 是否存在
if not exist config.json (
    echo [FeishuSync] config.json not found. Please copy config.example.json to config.json and fill in your credentials.
    pause
    exit /b 1
)

rem 检查 node_modules 是否安装
if not exist node_modules (
    echo [FeishuSync] Installing dependencies...
    call npm install --production
)

rem 启动 watchdog（最小化窗口）
echo [FeishuSync] Starting watchdog...
start "" /min node scripts\watchdog.js
