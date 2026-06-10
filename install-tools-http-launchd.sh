#!/bin/bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
PLIST_DIR="$HOME/Library/LaunchAgents"
PLIST_FILE="$PLIST_DIR/com.niean.tools-http.plist"
LOG_DIR="$HOME/Library/Logs/tools-http"
PORT="${TOOLS_HTTP_PORT:-8190}"
LABEL="com.niean.tools-http"

mkdir -p "$PLIST_DIR" "$LOG_DIR"

cat > "$PLIST_FILE" <<PLIST
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
    <key>Label</key>
    <string>$LABEL</string>
    <key>ProgramArguments</key>
    <array>
        <string>$SCRIPT_DIR/start-tools-http.sh</string>
    </array>
    <key>WorkingDirectory</key>
    <string>$SCRIPT_DIR</string>
    <key>RunAtLoad</key>
    <true/>
    <key>KeepAlive</key>
    <true/>
    <key>EnvironmentVariables</key>
    <dict>
        <key>TOOLS_HTTP_PORT</key>
        <string>$PORT</string>
    </dict>
    <key>StandardOutPath</key>
    <string>$LOG_DIR/launchd.out.log</string>
    <key>StandardErrorPath</key>
    <string>$LOG_DIR/launchd.err.log</string>
</dict>
</plist>
PLIST

launchctl bootout "gui/$UID" "$PLIST_FILE" >/dev/null 2>&1 || true
launchctl bootstrap "gui/$UID" "$PLIST_FILE"
launchctl kickstart -k "gui/$UID/$LABEL"

echo "tools-http launchd service installed and started."
echo "URL: http://127.0.0.1:$PORT/"
echo "Log: $LOG_DIR/server.log"
echo "Stop/uninstall: $SCRIPT_DIR/uninstall-tools-http-launchd.sh"
