#!/bin/bash

echo "=========================================="
echo "QuickChat 前端健康检查"
echo "=========================================="
echo ""

# 检查端口
echo "1. 检查端口状态..."
if lsof -Pi :3000 -sTCP:LISTEN -t >/dev/null 2>&1 ; then
    echo "✅ 端口 3000 (前端) 正在运行"
else
    echo "❌ 端口 3000 (前端) 未运行"
fi

if lsof -Pi :3001 -sTCP:LISTEN -t >/dev/null 2>&1 ; then
    echo "✅ 端口 3001 (后端) 正在运行"
else
    echo "❌ 端口 3001 (后端) 未运行"
fi
echo ""

# 检查构建
echo "2. 检查构建文件..."
if [ -d ".next" ]; then
    echo "✅ .next 目录存在"
else
    echo "❌ .next 目录不存在"
fi
echo ""

# 检查环境变量
echo "3. 检查环境变量..."
if [ -f "public/.env.local" ]; then
    echo "✅ public/.env.local 存在"
    cat public/.env.local
else
    echo "❌ public/.env.local 不存在"
fi
echo ""

# 测试 API
echo "4. 测试后端 API..."
API_RESPONSE=$(curl -s -o /dev/null -w "%{http_code}" http://localhost:3001/channels)
if [ "$API_RESPONSE" = "200" ]; then
    echo "✅ 后端 API 正常 (HTTP $API_RESPONSE)"
else
    echo "❌ 后端 API 异常 (HTTP $API_RESPONSE)"
fi
echo ""

# 测试前端页面
echo "5. 测试前端页面..."
FRONTEND_RESPONSE=$(curl -s -o /dev/null -w "%{http_code}" http://localhost:3000)
if [ "$FRONTEND_RESPONSE" = "200" ]; then
    echo "✅ 前端页面正常 (HTTP $FRONTEND_RESPONSE)"
else
    echo "❌ 前端页面异常 (HTTP $FRONTEND_RESPONSE)"
fi
echo ""

# 检查 Node 进程
echo "6. 检查 Node 进程..."
NODE_COUNT=$(pgrep -f "node.*next" | wc -l | tr -d ' ')
echo "运行中的 Next.js 进程数: $NODE_COUNT"
if [ "$NODE_COUNT" -gt 0 ]; then
    echo "✅ Next.js 进程正在运行"
    ps aux | grep -E "node.*next" | grep -v grep
else
    echo "❌ 没有运行中的 Next.js 进程"
fi
echo ""

echo "=========================================="
echo "健康检查完成"
echo "=========================================="
echo ""
echo "📝 测试页面: file:///Users/admin/QuickChat/frontend/test-frontend.html"
echo "🌐 前端地址: http://localhost:3000"
echo "🔧 后端地址: http://localhost:3001"
