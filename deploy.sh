#!/bin/bash

# 微信机器人部署脚本
# 用于在Ubuntu服务器上快速部署

set -e  # 遇到错误立即退出

echo "================================================"
echo "微信群BSC代币播报机器人 - Ubuntu自动部署脚本"
echo "================================================"
echo ""

# 颜色定义
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# 检查是否为root用户
if [[ $EUID -eq 0 ]]; then
   echo -e "${RED}请不要使用root用户运行此脚本！${NC}"
   echo "请切换到普通用户后再运行。"
   exit 1
fi

# 步骤1: 更新系统
echo -e "${GREEN}[1/8] 更新系统包...${NC}"
sudo apt update && sudo apt upgrade -y

# 步骤2: 安装必要的软件
echo -e "${GREEN}[2/8] 安装必要的软件...${NC}"
sudo apt install -y git curl wget build-essential

# 步骤3: 检查并安装Node.js
echo -e "${GREEN}[3/8] 检查Node.js...${NC}"
if ! command -v node &> /dev/null; then
    echo "Node.js 未安装，正在安装..."
    curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
    sudo apt install -y nodejs
else
    NODE_VERSION=$(node --version)
    echo "Node.js 已安装: $NODE_VERSION"
fi

# 步骤4: 安装PM2
echo -e "${GREEN}[4/8] 安装PM2进程管理器...${NC}"
if ! command -v pm2 &> /dev/null; then
    sudo npm install -g pm2
    echo "PM2 安装完成"
else
    echo "PM2 已安装: $(pm2 --version)"
fi

# 步骤5: 创建日志目录
echo -e "${GREEN}[5/8] 创建必要的目录...${NC}"
mkdir -p logs

# 步骤6: 安装项目依赖
echo -e "${GREEN}[6/8] 安装项目依赖...${NC}"
npm install

# 步骤7: 配置环境变量
echo -e "${GREEN}[7/8] 配置环境变量...${NC}"
if [ ! -f .env ]; then
    cp .env.example .env
    echo -e "${YELLOW}请编辑 .env 文件，设置你的API密钥和其他配置${NC}"
    echo "运行: nano .env"
    echo ""
    read -p "按回车键继续..."
else
    echo ".env 文件已存在"
fi

# 步骤8: 启动应用
echo -e "${GREEN}[8/8] 启动应用...${NC}"
echo ""
echo "可用的命令："
echo "  1) 开发模式启动（前台运行，可以看到二维码）"
echo "  2) 生产模式启动（使用PM2后台运行）"
echo "  3) 查看运行状态"
echo "  4) 查看日志"
echo "  5) 停止应用"
echo "  6) 退出"
echo ""

while true; do
    read -p "请选择操作 [1-6]: " choice
    case $choice in
        1)
            echo "启动开发模式..."
            npm run dev
            break
            ;;
        2)
            echo "启动生产模式..."
            pm2 start ecosystem.config.js
            echo -e "${GREEN}应用已启动！${NC}"
            echo "使用 'pm2 logs wx-bot' 查看日志"
            echo "使用 'pm2 status' 查看运行状态"
            break
            ;;
        3)
            pm2 status
            ;;
        4)
            pm2 logs wx-bot --lines 50
            ;;
        5)
            pm2 stop wx-bot
            echo "应用已停止"
            ;;
        6)
            echo "退出部署脚本"
            exit 0
            ;;
        *)
            echo -e "${RED}无效的选择，请重新选择${NC}"
            ;;
    esac
done

echo ""
echo "================================================"
echo -e "${GREEN}部署完成！${NC}"
echo "================================================"
echo ""
echo "重要提示："
echo "1. 首次运行需要扫描二维码登录微信"
echo "2. 如果使用PM2后台运行，查看二维码方法："
echo "   - 运行: pm2 logs wx-bot"
echo "   - 复制二维码链接到浏览器打开"
echo "3. 配置文件位置: .env"
echo "4. 日志文件位置: ./logs/"
echo ""
echo "常用PM2命令："
echo "  pm2 status          - 查看运行状态"
echo "  pm2 logs wx-bot     - 查看日志"
echo "  pm2 restart wx-bot  - 重启应用"
echo "  pm2 stop wx-bot     - 停止应用"
echo "  pm2 delete wx-bot   - 删除应用"
echo ""
echo "设置开机自启动："
echo "  pm2 save"
echo "  pm2 startup"
echo ""