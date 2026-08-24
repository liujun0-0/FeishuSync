@echo off
rem Auto-start FeishuSync watchdog at Windows logon (drop a shortcut to this
rem file into shell:startup). The watchdog guards auth (token renewal) and
rem sync (folder mirroring) and restarts them if they crash.
cd /d "D:\app_file\FeishuSync"
start "" /min "D:\az++\nodejs\node.exe" scripts\watchdog.js