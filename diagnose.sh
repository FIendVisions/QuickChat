#!/bin/bash

# QuickChat 系统诊断脚本

echo "🔍 QuickChat 系统诊断"
echo "================================"
echo ""

# 检查前端
echo "1️⃣ 前端服务器状态"
if curl -s http://localhost:3000 > /dev/null; then
    echo "   ✅ 前端运行正常: http://localhost:3000"
else
    echo "   ❌ 前端未运行，正在启动..."
    cd /Users/admin/QuickChat/frontend
    npm run dev > /tmp/frontend-auto.log 2>&1 &
    sleep 5
    if curl -s http://localhost:3000 > /dev/null; then
        echo "   ✅ 前端已启动"
    else
        echo "   ❌ 前端启动失败"
    fi
fi
echo ""

# 检查后端
echo "2️⃣ 后端服务器状态"
BACKEND_STATUS=$(curl -s -o /dev/null -w "%{http_code}" http://localhost:3001/channels)
if [ "$BACKEND_STATUS" = "200" ]; then
    CHANNEL_COUNT=$(curl -s http://localhost:3001/channels | jq '.total')
    echo "   ✅ 后端运行正常: $CHANNEL_COUNT 个频道"
else
    echo "   ❌ 后端未运行，正在启动..."
    cd /Users/admin/QuickChat/backend
    npm run start > /tmp/backend-auto.log 2>&1 &
    sleep 5
    if curl -s http://localhost:3001/channels > /dev/null; then
        echo "   ✅ 后端已启动"
    else
        echo "   ❌ 后端启动失败"
    fi
fi
echo ""

# 检查进程
echo "3️⃣ 进程状态"
FRONTEND_PROC=$(ps aux | grep "next dev" | grep -v grep | wc -l)
BACKEND_PROC=$(ps aux | grep "dist/src/main" | grep -v grep | wc -l)
echo "   前端进程: $FRONTEND_PROC"
echo "   后端进程: $BACKEND_PROC"
echo ""

# 总结
echo "📊 诊断总结"
echo "================================"
if curl -s http://localhost:3000 > /dev/null && curl -s http://localhost:3001/channels > /dev/null; then
    echo "✅ 系统运行正常"
    echo ""
    echo "🌐 访问地址:"
    echo "   前端: http://localhost:3000"
    echo "   后端: http://localhost:3001"
    echo ""
    echo "🚀 实时功能:"
    echo "   - 用户1创建频道 → 用户2立即看到"
    echo "   - 用户1发送消息 → 用户2立即收到"
else
    echo "❌ 系统存在问题，请查看日志"
    echo ""
    echo "📋 日志文件:"
    echo "   前端: /tmp/frontend-auto.log"
    echo "   后端: /tmp/backend-auto.log"
fi
