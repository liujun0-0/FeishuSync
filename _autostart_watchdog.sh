#!/bin/bash
# Auto-start FeishuSync watchdog at login (Linux/macOS).
#
# Usage:
#   chmod +x _autostart_watchdog.sh
#
#   macOS (launchd):
#     cp _autostart_watchdog.sh ~/Library/LaunchAgents/feishu-sync-watchdog.sh
#     # Then create a plist or use this script directly in a launchd plist
#
#   Linux (systemd -- user service):
#     cp _autostart_watchdog.sh ~/.config/autostart/feishu-sync-watchdog.sh
#     # Or create a systemd user service (see below)
#
#   Manual:
#     ./_autostart_watchdog.sh

set -e

# Navigate to the script's directory (portable)
cd "$(dirname "$0")"

# Check node
if ! command -v node &> /dev/null; then
    echo "[FeishuSync] Node.js not found. Please install Node.js 18+."
    echo "[FeishuSync] Download: https://nodejs.org/"
    exit 1
fi

# Check config
if [ ! -f config.json ]; then
    echo "[FeishuSync] config.json not found."
    echo "[FeishuSync] Run: cp config.example.json config.json && edit config.json"
    exit 1
fi

# Install deps if needed
if [ ! -d node_modules ]; then
    echo "[FeishuSync] Installing dependencies..."
    npm install --production
fi

# Start watchdog (background, nohup)
echo "[FeishuSync] Starting watchdog..."
nohup node scripts/watchdog.js > logs/watchdog.log 2>&1 &
echo $! > .feishu-sync-watchdog.pid
echo "[FeishuSync] Watchdog started (pid $!)"
