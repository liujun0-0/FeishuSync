#!/usr/bin/env bash
set -euo pipefail
ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
cd "$ROOT"
while true; do
  clear 2>/dev/null || true
  cat <<'MENU'
========================================
         FeishuSync Launcher
========================================
1. Start background sync
2. Stop background sync
3. Show status
4. Run one local-to-remote sync
5. Start/re-authorize authentication
6. Run tests
0. Exit
MENU
  read -r -p "Select [0-6]: " choice
  case "$choice" in
    1) npm run start ;;
    2) npm run stop ;;
    3) npm run status ;;
    4) npm run update ;;
    5) npm run auth ;;
    6) npm test ;;
    0) exit 0 ;;
    *) echo "Invalid selection." ;;
  esac
  echo
  read -r -p "Press Enter to return to the menu..." _
done
