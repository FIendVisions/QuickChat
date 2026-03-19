#!/bin/bash

echo "🧪 QuickChat 前端快速测试"
echo "=========================="
echo ""

# 测试 1: 前端页面可访问性
echo "📍 测试 1: 前端页面访问"
FRONTEND_HTML=$(curl -s http://localhost:3000)
if echo "$FRONTEND_HTML" | grep -q "QuickChat"; then
    echo "✅ 前端页面包含预期内容"
else
    echo "❌ 前端页面内容异常"
fi
echo ""

# 测试 2: API 连接
echo "📍 测试 2: API 连接"
API_STATUS=$(curl -s -o /dev/null -w "%{http_code}" http://localhost:3001/channels)
if [ "$API_STATUS" = "200" ]; then
    echo "✅ API 连接正常 (HTTP $API_STATUS)"
    CHANNEL_COUNT=$(curl -s http://localhost:3001/channels | grep -o '"id"' | wc -l | tr -d ' ')
    echo "   频道数量: $CHANNEL_COUNT"
else
    echo "❌ API 连接异常 (HTTP $API_STATUS)"
fi
echo ""

# 测试 3: WebSocket 端口
echo "📍 测试 3: WebSocket 端口"
if lsof -Pi :3001 -sTCP:LISTEN -t >/dev/null 2>&1; then
    echo "✅ WebSocket 端口可访问"
else
    echo "❌ WebSocket 端口不可访问"
fi
echo ""

# 测试 4: 环境变量
echo "📍 测试 4: 环境变量配置"
if [ -f "public/.env.local" ]; then
    echo "✅ 环境变量文件存在"
    grep "NEXT_PUBLIC" public/.env.local | while read line; do
        echo "   $line"
    done
else
    echo "❌ 环境变量文件缺失"
fi
echo ""

# 测试 5: 编译状态
echo "📍 测试 5: 编译状态"
if [ -d ".next" ] && [ -d ".next/static" ]; then
    echo "✅ 编译文件完整"
else
    echo "❌ 编译文件缺失"
fi
echo ""

echo "=========================="
echo "🎯 快速修复建议:"
echo ""
echo "如果前端有问题，请尝试："
echo "1. 清理浏览器缓存 (Cmd+Shift+R)"
echo "2. 检查浏览器控制台 (F12)"
echo "3. 重启前端服务: npm run dev"
echo "4. 清理编译缓存: rm -rf .next && npm run dev"
echo ""
echo "📊 实时监控: ./status-check.sh"
echo "🔧 详细诊断: ./check-frontend.sh"
echo "🧪 功能测试: 打开 test-frontend.html"
echo "=========================="
