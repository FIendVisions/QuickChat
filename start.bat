@echo off
REM QuickChat Windows 启动脚本

echo ==================================
echo QuickChat - 游戏语音开黑系统
echo ==================================
echo.

REM 检查 Docker
docker --version >nul 2>&1
if %errorlevel% neq 0 (
    echo [错误] Docker 未安装或未运行
    echo 请先安装 Docker Desktop for Windows
    pause
    exit /b 1
)

echo [1/6] 启动 Docker 服务...
docker-compose up -d postgres redis
if %errorlevel% neq 0 (
    echo [错误] Docker 服务启动失败
    pause
    exit /b 1
)

echo [2/6] 等待服务启动...
timeout /t 5 /nobreak >nul

echo [3/6] 安装后端依赖...
cd backend
if not exist "node_modules" (
    call npm install
)

echo [4/6] 初始化后端...
if not exist ".env" (
    copy .env.example .env
)
call npm run prisma:generate
call npm run prisma:push
call npm run prisma:seed

echo [5/6] 启动后端服务器...
start "QuickChat Backend" cmd /k "npm run start:dev"

cd ..

echo [6/6] 安装前端依赖...
cd frontend
if not exist "node_modules" (
    call npm install
)

if not exist ".env.local" (
    copy .env.example .env.local
)

echo [启动] 前端服务器...
start "QuickChat Frontend" cmd /k "npm run dev"

cd ..

echo.
echo ==================================
echo QuickChat 启动成功！
echo ==================================
echo.
echo 访问地址：
echo   前端: http://localhost:3000
echo   后端: http://localhost:3001
echo   API 文档: http://localhost:3001/api
echo.
echo 提示：
echo   - 点击前端页面的"开始使用"模拟登录
echo   - 点击左上角 + 创建频道
echo   - 选择"私有频道"并设置密码
echo   - 点击频道进入语音房间
echo.
echo 按任意键关闭此窗口...
pause >nul
