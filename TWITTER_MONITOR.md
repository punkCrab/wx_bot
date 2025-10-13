# 推特监控功能说明

## 功能概述

推特监控功能可以实时监控指定推特账号的最新推文，并自动推送到微信群。

## 主要特性

### 1. 实时监控
- 默认每1分钟检查一次推文
- 自动检测新发布的推文
- 支持自定义检查间隔

### 2. 智能推送
- 检测到新推文立即推送到微信群
- 防重复通知机制
- 支持推送到指定群聊或所有群聊

### 3. 多实例支持
- 使用Nitter公共实例获取推文（RSS方式）
- 自动切换多个Nitter实例
- 提高稳定性和可用性

## 配置说明

### 环境变量配置

在 `.env` 文件中添加以下配置：

```env
# 推特监控配置
TWITTER_ENABLED=true                       # 是否启用
TWITTER_USERNAME=tradfinews                # 监控的用户名
TWITTER_CHECK_INTERVAL=60000               # 检查间隔（毫秒）
TWITTER_MONITOR_ROOMS=推特动态群            # 目标群聊
```

### 配置项说明

| 配置项 | 说明 | 默认值 | 示例 |
|--------|------|--------|------|
| `TWITTER_ENABLED` | 是否启用推特监控 | `true` | `true` 或 `false` |
| `TWITTER_USERNAME` | 监控的推特用户名 | `tradfinews` | `elonmusk` |
| `TWITTER_CHECK_INTERVAL` | 检查间隔（毫秒） | `60000` | `120000`（2分钟） |
| `TWITTER_MONITOR_ROOMS` | 推送目标群聊 | 使用`MONITOR_ROOMS` | `群1,群2` |

### 监控用户配置

**默认监控：**
```env
TWITTER_USERNAME=tradfinews
```

**监控其他用户：**
```env
TWITTER_USERNAME=elonmusk
# 或
TWITTER_USERNAME=binance
```

**注意：** 只能监控一个用户，如需监控多个用户，需要运行多个实例。

## 消息格式

```
🐦 【推特动态】@tradfinews
📝 Breaking: Bitcoin reaches new all-time high
🕐 2025/10/12 23:45:30
🔗 https://nitter.net/tradfinews/status/123456789
```

## 工作原理

### Nitter RSS方式

```
用户发推 → Nitter RSS → 定时检查 → 解析新推文 → 推送到微信群
```

### Nitter实例列表

程序内置了多个公共Nitter实例：
1. https://nitter.net
2. https://nitter.poast.org
3. https://nitter.privacydev.net
4. https://nitter.1d4.us

当一个实例失败时，会自动切换到下一个。

## 使用示例

### 示例1：基本使用

**配置：**
```env
TWITTER_ENABLED=true
TWITTER_USERNAME=tradfinews
TWITTER_MONITOR_ROOMS=推特动态群
```

**效果：**
- 监控 @tradfinews
- 每1分钟检查一次
- 新推文发送到"推特动态群"

### 示例2：多群推送

**配置：**
```env
TWITTER_USERNAME=tradfinews
TWITTER_MONITOR_ROOMS=群1,群2,群3
```

**效果：**
- 新推文同时发送到3个群

### 示例3：禁用推特监控

**配置：**
```env
TWITTER_ENABLED=false
```

**效果：**
- 推特监控不会启动

### 示例4：调整检查频率

**配置：**
```env
TWITTER_CHECK_INTERVAL=30000  # 30秒检查一次
```

**注意：** 不建议低于30秒，避免对Nitter实例造成过大压力。

## 故障排查

### 问题1：收不到推文通知

**检查清单：**
1. 确认 `TWITTER_ENABLED=true`
2. 检查用户名是否正确
3. 查看日志中的错误信息
4. 确认群名称配置正确

**查看日志：**
```bash
# 启用调试日志
LOG_LEVEL=debug npm start
```

### 问题2：Nitter实例都无法访问

**原因：**
- 所有公共Nitter实例都暂时不可用
- 网络问题
- Nitter实例启用了反爬虫保护（JavaScript挑战）
- TLS连接失败

**解决方案：**
1. 等待一段时间后自动恢复（Nitter实例可用性会变化）
2. 检查网络连接
3. 程序会自动切换实例重试
4. 考虑使用自建Nitter实例（更稳定）

**自建Nitter实例：**
如需更高的稳定性，可以自建Nitter实例：
```bash
# 使用Docker运行Nitter
docker run -d -p 8080:8080 zedeus/nitter
```

然后在代码中添加你的实例地址到 `nitterInstances` 数组。

**临时禁用：**
```env
TWITTER_ENABLED=false
```

### 问题3：推文延迟

**原因：**
- 检查间隔设置较长
- Nitter RSS更新有延迟

**优化：**
```env
TWITTER_CHECK_INTERVAL=30000  # 缩短到30秒
```

**注意：** 太频繁可能导致被限制。

## 技术细节

### RSS解析

程序通过解析Nitter的RSS Feed获取推文：

```javascript
// RSS URL格式
https://nitter.net/{username}/rss

// 解析XML提取信息
- id: 推文ID
- title: 推文内容
- link: 推文链接
- pubDate: 发布时间
```

### 防重复机制

1. **推文ID缓存**
   - 使用Set存储已推送的推文ID
   - 每次检查前对比ID
   - 已存在的ID不会重复推送

2. **首次运行保护**
   - 初始化时记录历史推文
   - 标记为已知，不推送
   - 避免启动时发送大量历史通知

### 自动切换实例

```javascript
// 实例切换逻辑
1. 尝试当前实例
2. 失败则切换到下一个
3. 循环尝试所有实例
4. 记录失败日志
```

## 性能优化

### 1. 合理的检查间隔
- 默认1分钟平衡实时性和性能
- 建议不低于30秒

### 2. 缓存机制
- 推文详情缓存24小时
- 减少重复解析

### 3. 批量处理
- 一次获取多条推文
- 减少API请求次数

## 限制说明

### 1. 只能监控公开账号
- 需要账号是公开的（非私密账号）
- 无法访问受保护的推文

### 2. 依赖Nitter可用性
- 需要至少一个Nitter实例可用
- 如果所有实例都不可用，监控会失败

### 3. RSS延迟
- Nitter RSS可能有1-2分钟延迟
- 不如推特官方API实时

## 与其他监控对比

| 功能 | 推特监控 | 币安监控 | 合约播报 |
|------|---------|---------|---------|
| 触发方式 | 定时检查 | 定时检查 | 用户消息 |
| 检查间隔 | 1分钟 | 5秒 | 实时 |
| 数据源 | Nitter RSS | 币安API | Ave.ai API |
| 推送方式 | 群消息 | 群消息 | 群消息 |

## 扩展功能

### 监控多个账号（需要修改代码）

如果需要监控多个推特账号，可以：

1. **方案A：多实例**
   - 运行多个机器人实例
   - 每个实例监控不同账号

2. **方案B：修改代码**
   - 修改 `twitterMonitor.js`
   - 支持数组形式的用户名配置
   - 循环检查多个账号

## 安全建议

1. **遵守使用条款**
   - 不要频繁请求Nitter
   - 遵守推特服务条款

2. **保护隐私**
   - 不要监控私人账号
   - 尊重用户隐私

3. **合理使用**
   - 设置合理的检查间隔
   - 不要滥用公共服务

## 常见问题

### Q1: 可以监控多个账号吗？
**A:** 目前只支持单个账号，需要多账号监控请运行多个实例。

### Q2: 为什么不用推特官方API？
**A:** 推特官方API需要申请且有严格限制，Nitter方案更简单免费。

### Q3: 推文通知有延迟吗？
**A:** 有1-3分钟的延迟，取决于检查间隔和RSS更新速度。

### Q4: Nitter是什么？
**A:** Nitter是一个开源的推特前端，提供RSS功能，保护隐私。

### Q5: 如果Nitter不可用怎么办？
**A:** 程序会自动尝试多个实例，全部失败会记录日志并在下次重试。

## 更新日志

### v1.0.0 (2025-10-12)
- ✅ 实现推特监控功能
- ✅ 支持通过Nitter RSS获取推文
- ✅ 自动推送到微信群
- ✅ 防重复通知机制
- ✅ 多Nitter实例支持
- ✅ 可配置用户名和检查间隔

## 联系支持

如有问题或建议，请查看：
- 主文档：[README.md](README.md)
- 故障排查：[TROUBLESHOOTING.md](TROUBLESHOOTING.md)
- 提交Issue：GitHub Issues