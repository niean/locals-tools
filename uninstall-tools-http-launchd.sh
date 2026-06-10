#!/bin/bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
PLIST_FILE="$HOME/Library/LaunchAgents/com.niean.tools-http.plist"
LABEL="com.niean.tools-http"

launchctl bootout "gui/$UID" "$PLIST_FILE" >/dev/null 2>&1 || true
rm -f "$PLIST_FILE"

echo "tools-http launchd service uninstalled."
echo "Manual start remains available: $SCRIPT_DIR/start-tools-http.sh"
