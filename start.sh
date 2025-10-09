#!/bin/bash

# 快速启动脚本

echo "=========================================="
echo "    微信群BSC代币播报机器人 - 启动助手"
echo "=========================================="
echo ""

# 检查.env文件
if [ ! -f .env ]; then
    echo "错误：.env 文件不存在！"
    echo "请先复制 .env.example 并配置："
    echo "  cp .env.example .env"
    echo "  nano .env"
    exit 1
fi

# 检查API密钥
if grep -q "your_ave_ai_api_key_here" .env; then
    echo "警告：请先在 .env 文件中设置 AVE_AI_API_KEY"
    echo "运行: nano .env"
    exit 1
fi

# 检查Node.js
if ! command -v node &> /dev/null; then
    echo "错误：Node.js 未安装！"
    echo "请先安装 Node.js 18.x 或更高版本"
    exit 1
fi

# 检查依赖
if [ ! -d "node_modules" ]; then
    echo "安装依赖..."
    npm install
fi

# 创建日志目录
mkdir -p logs

# 选择启动方式
echo "选择启动方式："
echo "1) 直接运行（可以看到二维码，Ctrl+C退出）"
echo "2) PM2后台运行（推荐用于生产环境）"
echo "3) Docker运行（需要Docker环境）"
echo ""

read -p "请选择 [1-3]: " choice

case $choice in
    1)
        echo "直接启动应用..."
        echo "提示：扫描二维码登录微信"
        echo "按 Ctrl+C 退出"
        echo ""
        node src/index.js
        ;;
    2)
        if ! command -v pm2 &> /dev/null; then
            echo "PM2 未安装，正在安装..."
            sudo npm install -g pm2
        fi
        echo "使用PM2启动..."
        pm2 start ecosystem.config.js
        echo ""
        echo "应用已在后台运行！"
        echo "查看日志: pm2 logs wx-bot"
        echo "查看状态: pm2 status"
        echo "停止应用: pm2 stop wx-bot"
        ;;
    3)
        if ! command -v docker &> /dev/null; then
            echo "错误：Docker 未安装！"
            exit 1
        fi
        echo "使用Docker启动..."
        docker-compose up -d
        echo ""
        echo "应用已在Docker中运行！"
        echo "查看日志: docker-compose logs -f"
        echo "停止应用: docker-compose down"
        ;;
    *)
        echo "无效选择"
        exit 1
        ;;
esac