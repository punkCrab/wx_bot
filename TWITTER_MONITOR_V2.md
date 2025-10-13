# 推特监控功能详细说明（Twitter API v2）

本文档详细说明推特监控功能的使用方法、配置和故障排查。

## 概述

推特监控功能使用 **Twitter API v2 官方接口**监控指定推特账号的最新推文，并自动推送到微信群。这是最稳定、最可靠的推特监控方案。

### 方案优势

✅ **官方支持** - 使用 Twitter 官方 API v2，最稳定可靠
✅ **数据准确** - 获取最完整、最准确的推文数据
✅ **实时性好** - 支持高效的增量更新
✅ **功能强大** - 支持高级过滤和元数据获取
✅ **长期维护** - Twitter 官方持续维护更新

### 主要功能

- ✅ 实时监控指定推特账号的最新推文
- ✅ 自动推送到微信群
- ✅ 防重复通知机制
- ✅ 首次运行不发送历史推文
- ✅ 支持自定义监控账号
- ✅ 支持独立的监控群聊配置
- ✅ 显示推文互动数据（点赞、转发）
- ✅ 排除转推和回复（只监控原创推文）
- ✅ 自动处理 API 速率限制

## 获取 Twitter API 密钥

### 步骤1：申请开发者账号

1. 访问 [Twitter Developer Portal](https://developer.twitter.com/)
2. 使用你的 Twitter 账号登录
3. 点击 "Sign up for Free Account"
4. 填写申请表单：
   - 选择用途（个人使用 / Personal use）
   - 说明使用目的（监控特定账号的推文）
   - 同意开发者协议

**注意：** 申请过程通常在几分钟内完成，无需人工审核。

### 步骤2：创建应用

1. 进入 [Developer Portal Dashboard](https://developer.twitter.com/en/portal/dashboard)
2. 点击 "+ Create Project"
3. 填写项目信息：
   - Project Name: 随意命名（如 "WeChat Bot Monitor"）
   - Use Case: 选择 "Making a bot"
   - Project Description: 简单描述（如 "Monitor tweets for WeChat notifications"）

### 步骤3：获取 Bearer Token

1. 创建完项目后，系统会自动生成密钥
2. 找到 **Bearer Token**（长这样：`AAAAAAAAAAAAAAAAAAAAAA%2FAAA...`）
3. **重要：** 立即复制并保存 Bearer Token（只显示一次！）
4. 如果遗失，可以在项目设置中重新生成

### 步骤4：配置环境变量

在项目的 `.env` 文件中添加：

```env
TWITTER_BEARER_TOKEN=你的Bearer_Token
```

## 配置说明

### 环境变量

在 `.env` 文件中配置以下参数：

```env
# 推特监控配置（使用 Twitter API v2）
TWITTER_ENABLED=true                       # 是否启用推特监控
TWITTER_BEARER_TOKEN=your_bearer_token_here # Twitter API Bearer Token（必填）
TWITTER_USERNAME=tradfinews                # 监控的推特用户名
TWITTER_CHECK_INTERVAL=60000               # 检查间隔（毫秒）
TWITTER_MONITOR_ROOMS=                     # 监控的群名称（逗号分隔）
```

### 参数说明

| 参数 | 必填 | 说明 | 默认值 |
|------|------|------|--------|
| `TWITTER_ENABLED` | 否 | 是否启用推特监控 | `true` |
| `TWITTER_BEARER_TOKEN` | **是** | Twitter API Bearer Token | 无 |
| `TWITTER_USERNAME` | 否 | 监控的推特用户名（不含@） | `tradfinews` |
| `TWITTER_CHECK_INTERVAL` | 否 | 检查间隔（毫秒） | `60000`（1分钟） |
| `TWITTER_MONITOR_ROOMS` | 否 | 独立的监控群聊 | 使用 `MONITOR_ROOMS` |

### 监控模式

#### 1. 监控所有群聊

```env
TWITTER_MONITOR_ROOMS=
```

推文将发送到机器人所在的所有微信群。

#### 2. 监控指定群聊

```env
TWITTER_MONITOR_ROOMS=群名称1,群名称2,群名称3
```

推文只发送到指定的微信群。

### 示例配置

```env
# 示例1：监控 @tradfinews，发送到所有群
TWITTER_ENABLED=true
TWITTER_BEARER_TOKEN=AAAAAAAAAAAAAAAAAAAAAA%2FAAA...
TWITTER_USERNAME=tradfinews
TWITTER_CHECK_INTERVAL=60000

# 示例2：监控 @elonmusk，仅发送到特定群
TWITTER_ENABLED=true
TWITTER_BEARER_TOKEN=AAAAAAAAAAAAAAAAAAAAAA%2FAAA...
TWITTER_USERNAME=elonmusk
TWITTER_CHECK_INTERVAL=120000
TWITTER_MONITOR_ROOMS=科技新闻群,马斯克粉丝群
```

## 推文通知格式

```
🐦 【推特动态】@tradfinews

📝 Bitcoin hits new all-time high! 🚀
The king of crypto is back stronger than ever.

🕐 2025/10/12 23:45:30
❤️ 1234 👥 567
🔗 https://twitter.com/tradfinews/status/1234567890
```

### 格式说明

- 🐦 推特图标和用户名
- 📝 推文内容
- 🕐 发布时间（北京时间）
- ❤️ 点赞数 👥 转发数
- 🔗 推文链接

## 使用方法

### 启动监控

1. 配置 `.env` 文件（必须设置 `TWITTER_BEARER_TOKEN`）
2. 启动机器人：
   ```bash
   npm start
   ```
3. 推特监控会在机器人登录后自动启动

### 查看日志

```bash
# 普通日志
npm start

# 调试日志（查看详细信息）
LOG_LEVEL=debug npm start
```

### 临时禁用

如需临时禁用推特监控：

```env
TWITTER_ENABLED=false
```

## API 使用限制

### 免费版限制

Twitter API v2 免费版（Essential）的限制：

- **每月推文上限：** 10,000 条
- **每 15 分钟请求限制：** 15 次
- **推文获取限制：** 每次最多 10 条

### 建议配置

根据限制，建议配置：

```env
# 推荐：1分钟检查一次（每小时60次，远低于限制）
TWITTER_CHECK_INTERVAL=60000

# 保守：2分钟检查一次
TWITTER_CHECK_INTERVAL=120000

# 激进：30秒检查一次（需要更高级别的 API 访问）
TWITTER_CHECK_INTERVAL=30000
```

### 速率限制处理

当触发速率限制时：

- ✅ 自动跳过该次请求
- ✅ 记录警告日志
- ✅ 等待下次检查时重试
- ✅ 不会导致程序崩溃

## 技术实现

### 核心特性

1. **增量更新**：使用 `since_id` 参数只获取新推文
2. **防重复**：使用 `Set` 缓存已知推文 ID
3. **首次保护**：首次运行只记录不推送
4. **错误恢复**：遇到错误自动重试，不影响服务
5. **优雅降级**：API 失败时继续运行，等待恢复

### 文件结构

```
src/services/twitterMonitorV2.js  # Twitter API v2 监控服务
```

### 关键代码位置

- 初始化客户端：[twitterMonitorV2.js:45](src/services/twitterMonitorV2.js#L45)
- 获取推文：[twitterMonitorV2.js:172](src/services/twitterMonitorV2.js#L172)
- 发送微信群：[twitterMonitorV2.js:273](src/services/twitterMonitorV2.js#L273)

## 故障排查

### 问题1：启动失败 - "未配置 TWITTER_BEARER_TOKEN"

**原因：**
- 未在 `.env` 文件中设置 `TWITTER_BEARER_TOKEN`

**解决方案：**
1. 按照上面的步骤获取 Bearer Token
2. 在 `.env` 文件中添加：
   ```env
   TWITTER_BEARER_TOKEN=你的Bearer_Token
   ```
3. 重启机器人

### 问题2：认证失败（401/403错误）

**原因：**
- Bearer Token 无效或过期
- Token 权限不足

**解决方案：**
1. 检查 Token 是否正确复制（没有多余空格）
2. 在 Twitter Developer Portal 重新生成 Token
3. 确认项目有 "Read" 权限

### 问题3：未找到推特用户

**原因：**
- 用户名拼写错误
- 用户已更改用户名
- 用户账号已被封禁

**解决方案：**
1. 检查 `TWITTER_USERNAME` 配置（不要包含 @）
2. 访问 `https://twitter.com/用户名` 确认账号存在
3. 更新为正确的用户名

### 问题4：触发速率限制（429错误）

**原因：**
- 检查间隔太短
- 超过 API 使用限额

**解决方案：**
1. 增加检查间隔：
   ```env
   TWITTER_CHECK_INTERVAL=120000  # 改为2分钟
   ```
2. 等待速率限制重置（15分钟）
3. 考虑升级到付费 API

### 问题5：推文延迟

**原因：**
- 检查间隔较长
- API 返回有延迟

**解决方案：**
1. 减少检查间隔（注意速率限制）：
   ```env
   TWITTER_CHECK_INTERVAL=30000  # 改为30秒
   ```
2. 这是正常现象，Twitter API 不是实时推送

### 问题6：收到历史推文通知

**原因：**
- 程序重启导致缓存清空
- `isFirstRun` 标志未正确设置

**解决方案：**
- 这是正常行为，首次启动时会记录但不发送
- 如果持续出现，检查代码中的 `isFirstRun` 逻辑

## 调试技巧

### 查看 API 响应

```bash
LOG_LEVEL=debug npm start
```

### 测试 Token

创建测试脚本 `test-twitter-api.js`：

```javascript
import { TwitterApi } from 'twitter-api-v2';

const client = new TwitterApi(process.env.TWITTER_BEARER_TOKEN);

// 测试获取用户信息
const user = await client.v2.userByUsername('tradfinews');
console.log(user);
```

运行：
```bash
node test-twitter-api.js
```

### 监控状态

在代码中调用 `twitterMonitor.getStatus()` 查看当前状态：

```javascript
const status = twitterMonitor.getStatus();
console.log(status);
```

## 高级配置

### 监控多个账号

如需监控多个推特账号，可以创建多个监控实例：

```javascript
const monitor1 = new TwitterMonitorV2({ username: 'tradfinews' });
const monitor2 = new TwitterMonitorV2({ username: 'elonmusk' });

monitor1.start();
monitor2.start();
```

### 自定义推文过滤

修改 `fetchTweets()` 方法中的 `options`：

```javascript
const options = {
  max_results: 10,
  'tweet.fields': ['created_at', 'public_metrics'],
  exclude: ['retweets', 'replies'], // 排除转推和回复
  // 添加更多过滤条件...
};
```

### 升级到付费 API

如需更高的速率限制和更多功能：

1. 访问 [Twitter API Plans](https://developer.twitter.com/en/portal/products)
2. 选择适合的付费计划
3. 无需修改代码，直接使用相同的 Bearer Token

## 与 Nitter 方案对比

| 特性 | Twitter API v2 | Nitter RSS |
|------|----------------|------------|
| **稳定性** | ⭐⭐⭐⭐⭐ 非常稳定 | ⭐⭐ 不稳定 |
| **数据准确性** | ⭐⭐⭐⭐⭐ 完整准确 | ⭐⭐⭐ 基本准确 |
| **实时性** | ⭐⭐⭐⭐⭐ 实时 | ⭐⭐⭐ 有延迟 |
| **配置难度** | ⭐⭐⭐ 需要申请 | ⭐⭐⭐⭐⭐ 无需配置 |
| **费用** | 免费（有限额）| 完全免费 |
| **长期可用性** | ⭐⭐⭐⭐⭐ 官方维护 | ⭐⭐ 可能失效 |
| **推荐度** | ✅ **强烈推荐** | ⚠️ 备用方案 |

## 常见问题

### Q: 免费版够用吗？

A: 对于监控1-2个账号，每分钟检查一次，免费版完全够用。免费版每月10,000条推文限额，远超普通使用需求。

### Q: Bearer Token 会过期吗？

A: Bearer Token 默认不会过期，除非你主动重新生成。建议定期（如每3个月）更换一次以确保安全。

### Q: 可以监控私密账号吗？

A: 不可以。Twitter API 只能获取公开推文。要监控私密账号，你的 Twitter 账号必须已关注该账号，且需要使用 OAuth 1.0a 认证（更复杂）。

### Q: 为什么不发送转推和回复？

A: 为了减少噪音，默认只监控原创推文。如需包含转推和回复，可修改代码删除 `exclude` 参数。

### Q: 如何知道 API 用量？

A: 访问 [Developer Portal Usage](https://developer.twitter.com/en/portal/dashboard) 查看每月用量统计。

## 相关链接

- [Twitter API v2 官方文档](https://developer.twitter.com/en/docs/twitter-api)
- [twitter-api-v2 库文档](https://github.com/PLhery/node-twitter-api-v2)
- [Twitter Developer Portal](https://developer.twitter.com/en/portal/dashboard)
- [API 速率限制说明](https://developer.twitter.com/en/docs/twitter-api/rate-limits)

## 支持

如遇到问题：

1. 查看本文档的故障排查部分
2. 检查日志输出（`LOG_LEVEL=debug`）
3. 访问 Twitter Developer 社区寻求帮助
4. 提交 Issue 到项目仓库

---

**提示：** Twitter API v2 是推特监控的最佳方案，值得花几分钟完成申请！
