# 快速开始指南

## 快速配置（5分钟上手）

### 1. 复制配置文件
```bash
cp .env.example .env
```

### 2. 编辑 .env 文件
```env
# 必填：Ave.ai API密钥
AVE_AI_API_KEY=your_api_key_here

# 可选：监控的群聊
MONITOR_ROOMS=群名称1,群名称2

# 币安监控配置
BINANCE_MOCK_MODE=false
BINANCE_MONITOR_ROOMS=币安公告群
```

### 3. 安装依赖
```bash
npm install
```

### 4. 启动机器人
```bash
npm start
```

### 5. 扫码登录
- 打开控制台显示的二维码链接
- 用微信扫码登录
- 等待提示"机器人已启动"

## 功能说明

### 功能1：BSC合约地址播报
**触发方式：** 在群里发送包含 `0x` 开头的42位地址

**示例：**
```
这个项目不错 0x1234567890123456789012345678901234567890
```

**机器人回复：**
```
📜📜TOKEN (BSC链)📜📜
💰武力: 0.0000123
💹战力: 500M
🔥当前: +25.5%
🎅团队人数: 15,234
📊24h Volume: 2.5M
🕐创建时间: 2024/01/15 14:30
```

### 功能2：币安上币公告监控
**触发方式：** 自动监控，无需手动触发

**示例输出：**
```
📢 【币安公告】
📝 Binance Will List Walrus (WAL)
🕐 2025/10/10 15:00:32
```

## 测试功能

### 测试合约播报
在群里发送：
```
测试地址：0x55d398326f99059fF775485246999027B3197955
```

### 测试币安监控
运行测试脚本：
```bash
# 查看演示
node src/test-binance-demo.js

# 真实API测试
node src/test-binance.js

# 模拟模式测试
node src/test-binance-mock.js
```

## 常用配置

### 配置1：监控所有群
```env
MONITOR_ROOMS=
BINANCE_MONITOR_ROOMS=
```

### 配置2：监控特定群
```env
MONITOR_ROOMS=群1,群2
BINANCE_MONITOR_ROOMS=币安群
```

### 配置3：测试模式
```env
BINANCE_MOCK_MODE=true
LOG_LEVEL=debug
```

## 常见问题速查

| 问题 | 解决方案 |
|------|----------|
| 登录失败 | 删除 `.wechaty` 文件夹后重试 |
| 收不到通知 | 检查群名称是否正确（区分大小写） |
| API错误 | 检查 `AVE_AI_API_KEY` 是否正确 |
| 币安通知延迟 | 调整 `BINANCE_CHECK_INTERVAL` 为更小值 |

## 停止机器人
按 `Ctrl + C` 优雅退出

## 查看日志
```bash
# 启用详细日志
LOG_LEVEL=debug npm start
```

## 需要帮助？
查看详细文档：
- [README.md](README.md) - 完整功能说明
- [BINANCE_MONITOR.md](BINANCE_MONITOR.md) - 币安监控详解
- [.env.example](.env.example) - 配置参数说明