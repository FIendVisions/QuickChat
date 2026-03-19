#!/bin/bash

# QuickChat 启动脚本

echo "🎮 QuickChat - 游戏语音开黑系统"
echo "=================================="
echo ""

# 检查 Docker
if ! command -v docker &> /dev/null; then
    echo "❌ Docker 未安装，请先安装 Docker"
    echo "   访问 https://docs.docker.com/get-docker/ 获取安装指南"
    exit 1
fi

# 启动 Docker 服务
echo "📦 启动 Docker 服务..."
docker-compose up -d postgres redis

echo ""
echo "⏳ 等待服务启动..."
sleep 5

# 安装后端依赖
echo "📥 安装后端依赖..."
cd backend
if [ ! -d "node_modules" ]; then
    npm install
fi

# 检查环境变量
if [ ! -f ".env" ]; then
    echo "📝 创建 .env 文件..."
    cp .env.example .env
fi

# 生成 Prisma Client
echo "🔧 生成 Prisma Client..."
npm run prisma:generate

# 推送数据库 Schema
echo "💾 初始化数据库..."
npm run prisma:push

# 运行种子数据
echo "🌱 添加种子数据..."
npm run prisma:seed

# 启动后端
echo "🚀 启动后端服务器..."
npm run start:dev &
BACKEND_PID=$!

cd ..

# 安装前端依赖
echo "📥 安装前端依赖..."
cd frontend
if [ ! -d "node_modules" ]; then
    npm install
fi

# 检查环境变量
if [ ! -f ".env.local" ]; then
    echo "📝 创建 .env.local 文件..."
    cp .env.example .env.local
fi

# 启动前端
echo "🚀 启动前端服务器..."
npm run dev &
FRONTEND_PID=$!

cd ..

echo ""
echo "✅ QuickChat 启动成功！"
echo ""
echo "📱 访问地址："
echo "   前端: http://localhost:3000"
echo "   后端: http://localhost:3001"
echo "   API 文档: http://localhost:3001/api"
echo ""
echo "💡 提示："
echo "   - 点击前端页面的'开始使用'模拟登录"
echo "   - 点击左上角 + 创建频道"
echo "   - 选择'私有频道'并设置密码"
echo "   - 点击频道进入语音房间"
echo ""
echo "⏹️  停止服务："
echo "   按 Ctrl+C 或运行 ./stop.sh"
echo ""

# 保存 PID
echo $BACKEND_PID > .backend.pid
echo $FRONTEND_PID > .frontend.pid

# 等待用户中断
wait
