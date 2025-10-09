# Ubuntu服务器部署指南

本文档详细说明如何将微信群BSC代币播报机器人部署到Ubuntu服务器。

## 环境要求

- Ubuntu 20.04 LTS 或更高版本
- Node.js 18.x 或更高版本
- 至少 1GB RAM
- 稳定的网络连接

## 部署步骤

### 1. 更新系统并安装必要软件

```bash
# 更新系统包
sudo apt update && sudo apt upgrade -y

# 安装必要的工具
sudo apt install -y git curl wget build-essential
```

### 2. 安装 Node.js

```bash
# 使用 NodeSource 仓库安装 Node.js 18.x
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt install -y nodejs

# 验证安装
node --version
npm --version
```

### 3. 克隆项目

```bash
# 创建应用目录
mkdir -p ~/apps
cd ~/apps

# 克隆项目（替换为你的仓库地址）
git clone https://github.com/your-username/wx_bot.git
cd wx_bot

# 或者直接上传项目文件
# 使用 scp 或 rsync 将本地项目文件上传到服务器
```

### 4. 安装项目依赖

```bash
cd ~/apps/wx_bot

# 安装依赖
npm install

# 如果遇到权限问题，可以使用
npm install --unsafe-perm
```

### 5. 配置环境变量

```bash
# 复制环境变量示例文件
cp .env.example .env

# 编辑配置文件
nano .env
```

在 `.env` 文件中设置必要的配置：

```env
# Ave.ai API密钥（必填）
AVE_AI_API_KEY=your_actual_api_key_here

# 监控的群名称（可选）
MONITOR_ROOMS=

# 日志级别
LOG_LEVEL=info

# 缓存配置
CACHE_ADDRESS_TIMEOUT=10000
CACHE_CONTRACT_TIMEOUT=600000
MIN_QUERY_INTERVAL=0
```

### 6. 安装 PM2 进程管理器

PM2 可以让你的机器人在后台运行，并在崩溃时自动重启。

```bash
# 全局安装 PM2
sudo npm install -g pm2

# 验证安装
pm2 --version
```

### 7. 配置 PM2

创建 PM2 配置文件（已在项目中提供）：

```bash
# 使用 PM2 启动应用
pm2 start ecosystem.config.js

# 查看运行状态
pm2 status

# 查看日志
pm2 logs wx-bot

# 监控资源使用
pm2 monit
```

### 8. 处理微信登录

由于服务器没有图形界面，需要特殊处理微信登录二维码：

#### 方法 1：SSH 端口转发（推荐）

```bash
# 在本地电脑上使用 SSH 端口转发
ssh -L 3000:localhost:3000 your-user@your-server-ip

# 然后在浏览器访问 http://localhost:3000
# 即可看到二维码页面
```

#### 方法 2：使用终端显示二维码

项目已配置在终端中显示二维码链接，直接复制链接到浏览器打开即可。

#### 方法 3：临时开放端口

```bash
# 临时开放 3000 端口（不推荐长期使用）
sudo ufw allow 3000

# 登录后关闭端口
sudo ufw delete allow 3000
```

### 9. 设置开机自启动

```bash
# 保存 PM2 进程列表
pm2 save

# 设置 PM2 开机自启
pm2 startup systemd
# 按照提示执行生成的命令

# 或者手动创建 systemd 服务
sudo nano /etc/systemd/system/wx-bot.service
```

### 10. 常用 PM2 命令

```bash
# 启动应用
pm2 start ecosystem.config.js

# 停止应用
pm2 stop wx-bot

# 重启应用
pm2 restart wx-bot

# 删除应用
pm2 delete wx-bot

# 查看详细信息
pm2 describe wx-bot

# 实时查看日志
pm2 logs wx-bot --lines 100

# 清空日志
pm2 flush wx-bot
```

## 维护和更新

### 更新代码

```bash
cd ~/apps/wx_bot

# 停止应用
pm2 stop wx-bot

# 拉取最新代码
git pull origin main

# 安装新依赖（如果有）
npm install

# 重启应用
pm2 restart wx-bot
```

### 查看日志

```bash
# 查看 PM2 日志
pm2 logs wx-bot --lines 50

# 查看系统日志
journalctl -u wx-bot -n 50 -f
```

### 备份和恢复

```bash
# 备份 .env 文件和登录状态
cp .env .env.backup
cp -r .wechaty .wechaty.backup

# 恢复
cp .env.backup .env
cp -r .wechaty.backup .wechaty
```

## 安全建议

1. **使用防火墙**
   ```bash
   # 配置 UFW 防火墙
   sudo ufw enable
   sudo ufw allow ssh
   sudo ufw allow 80
   sudo ufw allow 443
   ```

2. **定期更新系统**
   ```bash
   sudo apt update && sudo apt upgrade -y
   ```

3. **使用非 root 用户运行**
   ```bash
   # 创建专用用户
   sudo adduser botuser
   sudo usermod -aG sudo botuser

   # 切换到该用户
   su - botuser
   ```

4. **保护敏感信息**
   - 永远不要将 `.env` 文件提交到 Git
   - 定期更换 API Key
   - 使用环境变量或密钥管理服务

## 故障排查

### 1. 登录失败

```bash
# 删除缓存重新登录
rm -rf .wechaty
pm2 restart wx-bot
```

### 2. 内存不足

```bash
# 查看内存使用
free -m
pm2 monit

# 增加交换空间
sudo fallocate -l 2G /swapfile
sudo chmod 600 /swapfile
sudo mkswap /swapfile
sudo swapon /swapfile
```

### 3. 网络问题

```bash
# 测试连接
ping prod.ave-api.com
curl -I https://prod.ave-api.com

# 查看 DNS
cat /etc/resolv.conf
```

### 4. 权限问题

```bash
# 修复权限
chmod -R 755 ~/apps/wx_bot
chmod 600 .env
```

## Docker 部署（可选）

如果你熟悉 Docker，可以使用 Docker 部署：

```bash
# 构建镜像
docker build -t wx-bot .

# 运行容器
docker run -d \
  --name wx-bot \
  --restart unless-stopped \
  -v $(pwd)/.env:/app/.env \
  -v $(pwd)/.wechaty:/app/.wechaty \
  -p 3000:3000 \
  wx-bot

# 查看日志
docker logs -f wx-bot
```

## 监控和告警

建议设置监控来确保机器人正常运行：

1. **使用 PM2 Web 监控**
   ```bash
   pm2 install pm2-web
   ```

2. **设置邮件告警**
   ```bash
   pm2 set pm2-health:email your-email@example.com
   pm2 install pm2-health
   ```

3. **使用外部监控服务**
   - UptimeRobot
   - Pingdom
   - New Relic

## 常见问题

**Q: 如何处理"登录失效"？**
A: 删除 `.wechaty` 文件夹，重新扫码登录。

**Q: 如何查看机器人是否在运行？**
A: 使用 `pm2 status` 或 `pm2 list` 查看。

**Q: 如何更改监控的群？**
A: 编辑 `.env` 文件中的 `MONITOR_ROOMS`，然后 `pm2 restart wx-bot`。

**Q: 服务器重启后机器人没有自动启动？**
A: 运行 `pm2 startup` 并按提示操作。

## 支持

如遇到问题，请检查：
1. PM2 日志：`pm2 logs wx-bot`
2. 系统日志：`journalctl -xe`
3. 项目 Issues：查看或提交问题到项目仓库