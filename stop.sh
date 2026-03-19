#!/bin/bash

# QuickChat 停止脚本

echo "🛑 停止 QuickChat..."
echo ""

# 停止后端和前端进程
if [ -f ".backend.pid" ]; then
    BACKEND_PID=$(cat .backend.pid)
    kill $BACKEND_PID 2>/dev/null
    rm .backend.pid
    echo "✅ 后端已停止"
fi

if [ -f ".frontend.pid" ]; then
    FRONTEND_PID=$(cat .frontend.pid)
    kill $FRONTEND_PID 2>/dev/null
    rm .frontend.pid
    echo "✅ 前端已停止"
fi

# 停止 Docker 服务
echo ""
echo "🛑 停止 Docker 服务..."
docker-compose down

echo ""
echo "✅ QuickChat 已完全停止"
