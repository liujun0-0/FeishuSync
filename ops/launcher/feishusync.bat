@echo off
setlocal EnableExtensions EnableDelayedExpansion
set "ROOT=%~dp0..\.."
pushd "%ROOT%"
title FeishuSync Launcher
:menu
cls
echo ========================================
echo          FeishuSync Launcher
echo ========================================
echo 1. Start background sync
echo 2. Stop background sync
echo 3. Show status
echo 4. Run one local-to-remote sync
echo 5. Start/re-authorize authentication
echo 6. Run tests
echo 0. Exit
echo.
set "choice="
set /p "choice=Select [0-6]: "
if "%choice%"=="1" call npm run start && pause && goto menu
if "%choice%"=="2" call npm run stop && pause && goto menu
if "%choice%"=="3" call npm run status && pause && goto menu
if "%choice%"=="4" call npm run update && pause && goto menu
if "%choice%"=="5" call npm run auth && pause && goto menu
if "%choice%"=="6" call npm test && pause && goto menu
if "%choice%"=="0" goto end
echo Invalid selection.
timeout /t 2 >nul
goto menu
:end
popd
endlocal
