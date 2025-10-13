# 推特监控功能详细说明（RSSHub版本）

本文档详细说明使用 RSSHub 实现推特监控功能的使用方法、配置和故障排查。

## 概述

推特监控功能使用 **RSSHub** 提供的 RSS 订阅服务监控指定推特账号的最新推文，并自动推送到微信群。

### 方案优势

✅ **无需API密钥** - 直接使用，无需申请 Twitter API
✅ **完全免费** - 没有任何配额限制
✅ **配置简单** - 开箱即用，无需注册账号
✅ **多实例支持** - 自动切换备用实例，提高可用性
✅ **扩展性强** - RSSHub 支持数百种信息源（YouTube、Instagram等）

### 什么是 RSSHub？

[RSSHub](https://docs.rsshub.app/) 是一个开源、易用、可扩展的 RSS 生成器，可以将几乎所有内容转换为 RSS 订阅源。它支持：

- 社交媒体（Twitter、Instagram、YouTube等）
- 新闻网站
- 视频平台
- 开发者平台
- ...以及数百种其他服务

### 主要功能

- ✅ 实时监控指定推特账号的最新推文
- ✅ 自动推送到微信群
- ✅ 防重复通知机制
- ✅ 首次运行不发送历史推文
- ✅ 支持自定义监控账号
- ✅ 支持独立的监控群聊配置
- ✅ 自动过滤转推（只监控原创推文）
- ✅ 多个 RSSHub 实例自动切换

## 快速开始

### 步骤1：配置环境变量

编辑 `.env` 文件（如果没有，复制 `.env.example`）：

```env
# 推特监控配置
TWITTER_ENABLED=true           # 启用推特监控
TWITTER_USERNAME=tradfinews    # 要监控的推特用户名
TWITTER_CHECK_INTERVAL=60000   # 每分钟检查一次
TWITTER_MONITOR_ROOMS=         # 留空表示发送到所有群
```

### 步骤2：启动机器人

```bash
npm start
```

### 步骤3：查看启动日志

看到以下输出说明推特监控已启动：

```
🐦 推特监控已启动（RSSHub，发送到微信群）
🐦 监控账号: @tradfinews
🐦 RSSHub实例: https://rsshub.app, https://rss.shab.fun, https://rsshub.rssforever.com
```

**就是这么简单！** 无需申请 API，无需配置密钥，直接使用。

---

## 配置说明

### 环境变量

| 参数 | 必填 | 说明 | 默认值 |
|------|------|------|--------|
| `TWITTER_ENABLED` | 否 | 是否启用推特监控 | `true` |
| `TWITTER_USERNAME` | 否 | 监控的推特用户名（不含@） | `tradfinews` |
| `TWITTER_CHECK_INTERVAL` | 否 | 检查间隔（毫秒） | `60000`（1分钟） |
| `TWITTER_MONITOR_ROOMS` | 否 | 独立的监控群聊 | 使用 `MONITOR_ROOMS` |
| `RSSHUB_INSTANCES` | 否 | 自定义 RSSHub 实例 | 使用默认公共实例 |

### 默认 RSSHub 实例

系统默认使用以下公共 RSSHub 实例：

1. **https://rsshub.app** - 官方实例
2. **https://rss.shab.fun** - 社区实例
3. **https://rsshub.rssforever.com** - 社区实例

当一个实例无法访问时，会自动切换到下一个。

### 自定义 RSSHub 实例

如果公共实例不稳定，可以自建或使用其他实例：

```env
# 使用自定义实例
RSSHUB_INSTANCES=https://你的rsshub实例.com,https://备用实例.com
```

### 示例配置

#### 示例1：监控单个账号，发送到所有群

```env
TWITTER_ENABLED=true
TWITTER_USERNAME=tradfinews
TWITTER_CHECK_INTERVAL=60000
```

#### 示例2：监控多个账号（需要修改代码）

```env
# 主实例监控 tradfinews
TWITTER_ENABLED=true
TWITTER_USERNAME=tradfinews

# 在代码中创建第二个实例监控 elonmusk
```

#### 示例3：仅发送到特定群

```env
TWITTER_ENABLED=true
TWITTER_USERNAME=CZ_Binance
TWITTER_MONITOR_ROOMS=币圈新闻群,交易信号群
```

#### 示例4：使用自建实例

```env
TWITTER_ENABLED=true
TWITTER_USERNAME=tradfinews
RSSHUB_INSTANCES=https://你的域名.com,https://rsshub.app
```

---

## 推文通知格式

```
🐦 【推特动态】@tradfinews

📝 Bitcoin hits new all-time high! 🚀
The king of crypto is back stronger than ever.

🕐 2025/10/12 23:45:30
🔗 https://twitter.com/tradfinews/status/1234567890
```

---

## 自建 RSSHub 实例（可选）

如果希望更高的稳定性和更快的速度，可以自建 RSSHub 实例。

### 方法1：使用 Docker（推荐）

```bash
# 拉取镜像
docker pull diygod/rsshub

# 运行实例
docker run -d \
  --name rsshub \
  -p 1200:1200 \
  diygod/rsshub
```

访问 `http://你的服务器IP:1200` 即可使用。

### 方法2：使用 Vercel（免费）

1. Fork [RSSHub 仓库](https://github.com/DIYgod/RSSHub)
2. 在 Vercel 中导入该仓库
3. 一键部署
4. 获得你的 RSSHub 域名：`https://你的项目.vercel.app`

### 配置自建实例

```env
RSSHUB_INSTANCES=http://你的服务器IP:1200,https://rsshub.app
```

---

## RSSHub 路由说明

RSSHub 使用以下路由获取推文：

```
https://rsshub.app/twitter/user/{username}
```

示例：
- `https://rsshub.app/twitter/user/tradfinews`
- `https://rsshub.app/twitter/user/elonmusk`
- `https://rsshub.app/twitter/user/CZ_Binance`

你可以在浏览器中直接访问这些链接，查看 RSS 内容。

### 支持的参数

RSSHub Twitter 路由支持额外参数（需要修改代码）：

- `/twitter/user/:username` - 用户推文
- `/twitter/user/:username/exclude_replies` - 排除回复
- `/twitter/user/:username/exclude_retweets` - 排除转推

当前实现已自动过滤转推。

---

## 扩展：监控其他平台

RSSHub 不仅支持 Twitter，还支持数百种平台。你可以轻松扩展监控功能：

### YouTube频道

```
https://rsshub.app/youtube/user/@频道名
```

### Instagram

```
https://rsshub.app/instagram/user/用户名
```

### GitHub

```
https://rsshub.app/github/user/activity/用户名
```

### Reddit

```
https://rsshub.app/reddit/user/用户名
```

查看完整列表：https://docs.rsshub.app/

---

## 故障排查

### 问题1：未获取到推文

**可能原因：**
- 所有 RSSHub 实例都无法访问
- 推特用户名拼写错误
- 网络连接问题

**解决方案：**

1. **检查 RSSHub 实例可用性**
   ```bash
   curl https://rsshub.app/twitter/user/tradfinews
   ```

   如果返回 XML 内容，说明实例可用。

2. **检查用户名**
   访问 `https://twitter.com/tradfinews` 确认账号存在。

3. **添加更多备用实例**
   ```env
   RSSHUB_INSTANCES=https://rsshub.app,https://rss.shab.fun,https://你的实例.com
   ```

### 问题2：RSSHub 实例频繁切换

**原因：**
公共实例可能不稳定或被限流。

**解决方案：**
- 自建 RSSHub 实例（推荐）
- 增加检查间隔：
  ```env
  TWITTER_CHECK_INTERVAL=120000  # 改为2分钟
  ```

### 问题3：推文延迟

**原因：**
- 检查间隔较长
- RSSHub 实例缓存延迟

**解决方案：**
1. 减少检查间隔：
   ```env
   TWITTER_CHECK_INTERVAL=30000  # 改为30秒
   ```

2. 使用自建实例（更新更快）

### 问题4：收到重复通知

**原因：**
- 程序重启导致缓存清空

**解决方案：**
这是正常行为。首次启动时会记录所有历史推文但不发送通知，之后只推送新推文。

### 问题5：转推也被推送

**原因：**
- RSS 内容包含转推

**解决方案：**
代码已自动过滤转推（标题以 "RT @" 开头的推文）。如仍有问题，检查代码中的过滤逻辑：

```javascript
// 只处理原创推文
if (title.startsWith('RT @')) {
  continue;
}
```

---

## 性能优化

### 1. 使用自建实例

自建实例可以：
- 更快的响应速度
- 更高的稳定性
- 无限流限制

### 2. 合理设置检查间隔

```env
# 推荐配置
TWITTER_CHECK_INTERVAL=60000  # 1分钟，平衡实时性和资源消耗
```

### 3. 指定监控群聊

只发送到需要的群聊，减少消息发送压力：

```env
TWITTER_MONITOR_ROOMS=核心群1,核心群2
```

---

## 技术实现

### 核心特性

1. **RSS 解析**：解析 XML 格式的 RSS 订阅
2. **防重复**：使用 `Set` 缓存已知推文 ID
3. **首次保护**：首次运行只记录不推送
4. **实例切换**：自动切换失败的 RSSHub 实例
5. **错误恢复**：遇到错误自动重试，不影响服务

### 文件结构

```
src/services/twitterMonitorRSSHub.js  # RSSHub 版推特监控服务
```

### 关键代码位置

- 获取推文：[twitterMonitorRSSHub.js:177](src/services/twitterMonitorRSSHub.js#L177)
- 解析 RSS：[twitterMonitorRSSHub.js:226](src/services/twitterMonitorRSSHub.js#L226)
- 发送微信群：[twitterMonitorRSSHub.js:316](src/services/twitterMonitorRSSHub.js#L316)

---

## 与其他方案对比

| 特性 | RSSHub | Twitter API v2 | Nitter RSS |
|------|--------|----------------|------------|
| **配置难度** | ⭐⭐⭐⭐⭐ 开箱即用 | ⭐⭐⭐ 需要申请 | ⭐⭐⭐⭐ 简单 |
| **稳定性** | ⭐⭐⭐⭐ 较稳定 | ⭐⭐⭐⭐⭐ 非常稳定 | ⭐⭐ 不稳定 |
| **费用** | ✅ 完全免费 | 免费（有限额）| 完全免费 |
| **速率限制** | ✅ 无限制 | ⚠️ 有限制 | ✅ 无限制 |
| **实时性** | ⭐⭐⭐⭐ 较快 | ⭐⭐⭐⭐⭐ 实时 | ⭐⭐⭐ 有延迟 |
| **扩展性** | ⭐⭐⭐⭐⭐ 支持多平台 | ⭐⭐ 仅Twitter | ⭐⭐ 仅Twitter |
| **推荐度** | ✅ **强烈推荐** | ✅ 推荐 | ⚠️ 备用方案 |

**结论：** RSSHub 方案最适合快速部署和日常使用，无需配置，开箱即用！

---

## 常见问题

### Q: RSSHub 是免费的吗？

A: 是的，完全免费！公共实例免费使用，自建实例也是开源免费的。

### Q: 会被 Twitter 封禁吗？

A: 不会。RSSHub 通过公开可访问的方式获取数据，不涉及账号登录，非常安全。

### Q: 可以监控私密账号吗？

A: 不可以。只能监控公开的推特账号。

### Q: 推文延迟多久？

A: 通常在 1-5 分钟内，取决于 RSSHub 实例的缓存更新频率。

### Q: 如何监控多个账号？

A: 需要在代码中创建多个监控实例：

```javascript
const monitor1 = new TwitterMonitorRSSHub({ username: 'tradfinews' });
const monitor2 = new TwitterMonitorRSSHub({ username: 'elonmusk' });
```

### Q: 公共实例不稳定怎么办？

A: 自建 RSSHub 实例（5分钟搞定）：
```bash
docker run -d -p 1200:1200 diygod/rsshub
```

---

## 相关链接

- [RSSHub 官方文档](https://docs.rsshub.app/)
- [RSSHub GitHub 仓库](https://github.com/DIYgod/RSSHub)
- [RSSHub Twitter 路由](https://docs.rsshub.app/routes/social-media#twitter)
- [公共 RSSHub 实例列表](https://docs.rsshub.app/guide/instances)

---

## 总结

✅ **优点：**
- 无需 API 密钥，开箱即用
- 完全免费，无配额限制
- 支持多平台扩展
- 配置简单，易于维护

⚠️ **注意：**
- 公共实例可能不稳定
- 建议自建实例以获得最佳体验

🚀 **推荐使用场景：**
- 快速部署测试
- 个人日常使用
- 需要监控多平台信息源

---

**RSSHub 方案是推特监控的最佳入门选择！** 🎉
