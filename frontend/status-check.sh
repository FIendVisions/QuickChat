#!/bin/bash

while true; do
    clear
    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    echo "   QuickChat 实时状态监控"
    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    echo ""
    echo "🕐 $(date '+%Y-%m-%d %H:%M:%S')"
    echo ""

    # 前端状态
    if lsof -Pi :3000 -sTCP:LISTEN -t >/dev/null 2>&1; then
        echo "✅ 前端服务 (端口 3000): 运行中"
    else
        echo "❌ 前端服务 (端口 3000): 未运行"
    fi

    # 后端状态
    if lsof -Pi :3001 -sTCP:LISTEN -t >/dev/null 2>&1; then
        echo "✅ 后端服务 (端口 3001): 运行中"
    else
        echo "❌ 后端服务 (端口 3001): 未运行"
    fi

    echo ""
    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    echo "   访问地址"
    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    echo "🌐 前端: http://localhost:3000"
    echo "🔧 后端: http://localhost:3001"
    echo "📝 测试: file:///Users/admin/QuickChat/frontend/test-frontend.html"
    echo ""
    echo "按 Ctrl+C 退出监控"
    echo ""

    sleep 3
done
