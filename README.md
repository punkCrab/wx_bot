# 微信群BSC代币信息播报机器人

这是一个功能强大的微信群监控机器人，提供以下核心功能：
1. **BSC代币信息播报** - 自动检测并播报BSC合约地址的代币信息
2. **币安上币公告监控** - 实时监控币安新币上线公告并通知到微信群
3. **推特动态监控** - 实时监控指定推特账号的最新推文并推送到微信群

## 功能特性

### BSC代币信息播报
- ✅ 自动检测群消息中的BSC合约地址（0x开头，42位十六进制）
- ✅ 通过 ave.ai API 获取代币实时数据
- ✅ 丰富的信息展示：
  - 武力（当前价格）
  - 战力（市值）
  - 当前（24小时涨跌幅）
  - 团队人数（持有者数量）
  - 24小时交易量
  - 创建时间
- ✅ 智能缓存机制：
  - 防刷屏：配置时间内（默认10秒）不重复播报同一地址
  - 实时更新：超过防刷屏时间后，重新获取最新代币数据
- ✅ API速率限制保护

### 币安上币公告监控
- ✅ 实时监控币安新币上线公告
- ✅ 每5秒自动检查最新公告（可配置）
- ✅ 检测到新币上线立即推送到微信群
- ✅ 防重复通知机制
- ✅ 支持真实API和模拟模式
- ✅ 可配置独立的监控群聊

### 推特动态监控（新功能）
- ✅ 使用 RSSHub（开箱即用，无需 API 密钥）
- ✅ 实时监控指定推特账号的最新推文
- ✅ 每1分钟自动检查新推文（可配置）
- ✅ 自动排除转推（只监控原创推文）
- ✅ 防重复通知机制
- ✅ 支持自定义监控账号
- ✅ 可配置独立的监控群聊
- ✅ 多个 RSSHub 实例自动切换
- ✅ 完全免费，无速率限制

### 通用特性
- ✅ 支持监控所有群或指定群聊
- ✅ 完善的错误处理和日志系统

## 安装步骤

### 1. 安装依赖

```bash
npm install
```

### 2. 配置环境变量

复制 `.env.example` 为 `.env`:

```bash
cp .env.example .env
```

编辑 `.env` 文件，配置你的设置:

```env
# Ave.ai API密钥（必填）
AVE_AI_API_KEY=your_api_key_here

# 监控的微信群名称（可选，多个群用逗号分隔，留空则监控所有群）
MONITOR_ROOMS=群名称1,群名称2

# 日志级别
LOG_LEVEL=info

# 缓存时间
CACHE_ADDRESS_TIMEOUT=10000    # 地址播报缓存10秒（防刷屏）
CACHE_CONTRACT_TIMEOUT=600000  # API数据缓存10分钟
MIN_QUERY_INTERVAL=0           # 无额外查询间隔限制

# 币安公告监控配置
BINANCE_MOCK_MODE=false        # 是否使用模拟模式
BINANCE_CHECK_INTERVAL=5000    # 检查间隔（毫秒）
BINANCE_MONITOR_ROOMS=         # 独立的监控群聊

# 推特监控配置（RSSHub）
TWITTER_ENABLED=true                       # 是否启用推特监控
TWITTER_USERNAME=tradfinews                # 监控的推特用户名
TWITTER_CHECK_INTERVAL=60000               # 检查间隔（毫秒）
TWITTER_MONITOR_ROOMS=                     # 独立的监控群聊
RSSHUB_INSTANCES=                          # 自定义RSSHub实例（留空使用默认公共实例）
```

## 使用方法

### 启动机器人

```bash
npm start
```

或使用开发模式（自动重启）:

```bash
npm run dev
```

### 登录流程

1. 运行程序后会显示一个二维码链接
2. 在浏览器中打开链接
3. 使用微信扫描二维码登录
4. 登录成功后机器人开始工作

### 使用示例

在监控的微信群中发送包含BSC合约地址的消息：

```
这个项目不错 0x1234567890123456789012345678901234567890
```

机器人会自动检测到地址并回复：

```
📜📜PEPE (BSC链)📜📜
💰武力: 0.0000123
💹战力: 500M
🔥当前: +25.5%
🎅团队人数: 15,234
📊24h Volume: 2.5M
🕐创建时间: 2024/01/15 14:30
```

## 项目结构

```
wx_bot/
├── src/
│   ├── index.js                     # 主程序入口
│   ├── config/
│   │   └── config.js               # 配置管理
│   ├── services/
│   │   ├── aveApiV2.js            # Ave.ai API V2服务
│   │   ├── binanceMonitor.js      # 币安公告监控服务
│   │   ├── binanceMonitorMock.js  # 币安监控模拟版本
│   │   ├── twitterMonitorRSSHub.js # 推特监控服务（RSSHub）
│   │   └── cache.js                # 缓存服务
│   ├── handlers/
│   │   └── messageHandler.js       # 消息处理器
│   └── utils/
│       ├── contractDetector.js     # 合约地址检测
│       ├── logger.js               # 日志工具
│       └── rateLimiter.js         # 速率限制
├── .env                            # 环境变量配置
├── .env.example                    # 环境变量示例
├── .gitignore                      # Git忽略文件
├── package.json                    # 项目配置
├── README.md                       # 说明文档
├── BINANCE_MONITOR.md              # 币安监控详细说明
├── TWITTER_MONITOR_RSSHUB.md       # 推特监控详细说明（RSSHub）
├── QUICK_START.md                  # 快速开始指南
└── DEPLOY_UBUNTU.md                # Ubuntu部署指南
```

## 配置说明

### 环境变量

| 变量名 | 必填 | 说明 | 默认值 |
|--------|------|------|--------|
| `AVE_AI_API_KEY` | 是 | Ave.ai API密钥 | 无 |
| `MONITOR_ROOMS` | 否 | 监控的群名称，多个用逗号分隔 | 监控所有群 |
| `LOG_LEVEL` | 否 | 日志级别 (error/warn/info/debug) | `info` |
| `CACHE_ADDRESS_TIMEOUT` | 否 | 防刷屏时间(毫秒)，此时间内不重复播报 | `10000` |
| `CACHE_CONTRACT_TIMEOUT` | 否 | API数据缓存时间(毫秒)，仅内部使用 | `600000` |
| `MIN_QUERY_INTERVAL` | 否 | 同地址最小查询间隔(毫秒) | `0` |
| `BINANCE_MOCK_MODE` | 否 | 币安监控是否使用模拟模式 | `false` |
| `BINANCE_CHECK_INTERVAL` | 否 | 币安公告检查间隔(毫秒) | `5000` |
| `BINANCE_MONITOR_ROOMS` | 否 | 币安公告监控的群名称 | 使用`MONITOR_ROOMS` |
| `TWITTER_ENABLED` | 否 | 是否启用推特监控 | `true` |
| `TWITTER_USERNAME` | 否 | 监控的推特用户名 | `tradfinews` |
| `TWITTER_CHECK_INTERVAL` | 否 | 推特检查间隔(毫秒) | `60000` |
| `TWITTER_MONITOR_ROOMS` | 否 | 推特监控的群名称 | 使用`MONITOR_ROOMS` |
| `RSSHUB_INSTANCES` | 否 | 自定义RSSHub实例列表 | 使用默认公共实例 |

### 监控模式

- **监控所有群**: 不设置 `MONITOR_ROOMS` 或设为空
- **监控指定群**: 设置 `MONITOR_ROOMS=群名称1,群名称2`

## API接口说明

本项目使用 Ave.ai API V2 接口：
- **基础URL**: `https://prod.ave-api.com`
- **端点**: `/v2/tokens`
- **认证方式**: X-API-KEY header
- **参数**: `keyword` (合约地址)

## 注意事项

1. **API限制**: 注意 Ave.ai API 的调用频率限制，避免过度请求
2. **网络环境**: 确保运行环境可以访问微信服务器和 Ave.ai API
3. **账号安全**:
   - 不要在公开仓库中提交 `.env` 文件
   - 定期更换 API Key
   - 建议使用小号运行机器人
4. **合规使用**: 遵守微信使用规范，避免频繁操作被封号

## 常见问题

### 微信登录错误 (1102)
这是最常见的问题，表示账号被限制登录网页版。

**快速解决：**
1. 使用注册超过6个月的老账号
2. 先在 https://wx.qq.com 登录激活权限
3. 避免使用新注册的账号

### 其他问题
详细的故障排查指南请查看：[TROUBLESHOOTING.md](TROUBLESHOOTING.md)

包括：
- 登录失败
- 收不到通知
- API调用失败
- 程序崩溃
- 配置问题
- 等等...

## 开发计划

- [ ] 支持更多链的合约地址检测（ETH、Polygon等）
- [ ] 添加合约安全性检测
- [ ] 支持自定义播报格式
- [ ] 添加Web管理面板
- [ ] 支持数据库存储历史记录

## 贡献

欢迎提交 Issue 和 Pull Request！

## 许可证

MIT License

## 免责声明

本项目仅供学习交流使用，使用本项目获取的信息仅供参考，不构成投资建议。使用者需自行承担使用本工具的风险。
