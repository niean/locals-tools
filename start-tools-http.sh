#!/bin/bash
# start-tools-http.sh - 启动 tools http 服务

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
PROJECT_DIR="${SCRIPT_DIR}/"
LOG_DIR="$HOME/Library/Logs/tools-http"
LOG_FILE="$LOG_DIR/server.log"
PORT=8888

# 创建日志目录
mkdir -p "$LOG_DIR"

# 检查端口是否被占用
if lsof -i :$PORT > /dev/null 2>&1; then
    echo "[$(date '+%Y-%m-%d %H:%M:%S')] Error: Port $PORT is already in use" >> "$LOG_FILE"
    exit 1
fi

# 检查 python3 是否存在
if ! command -v python3 &> /dev/null; then
    echo "[$(date '+%Y-%m-%d %H:%M:%S')] Error: python3 not found" >> "$LOG_FILE"
    exit 1
fi

# 启动服务（前台运行，由 launchd 管理）
cd "$PROJECT_DIR"
echo "[$(date '+%Y-%m-%d %H:%M:%S')] Starting http.server on port $PORT" >> "$LOG_FILE"
exec python3 -m http.server $PORT >> "$LOG_FILE" 2>&1
