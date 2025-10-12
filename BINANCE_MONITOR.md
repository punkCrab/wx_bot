# 币安公告监控功能说明

## 功能概述

币安公告监控功能可以实时监控币安交易所的新币上线公告，并自动推送到指定的微信群。

## 主要特性

### 1. 实时监控
- 默认每5秒检查一次币安公告API
- 自动检测新发布的上币公告
- 支持自定义检查间隔

### 2. 智能推送
- 检测到新公告立即推送到微信群
- 防重复通知机制（已推送的不会再次发送）
- 支持推送到指定群聊或所有群聊

### 3. 双模式支持
- **真实模式**：连接币安真实API获取最新公告
- **模拟模式**：用于测试，模拟新公告发布

## 配置说明

### 环境变量配置

在 `.env` 文件中添加以下配置：

```env
# 币安监控配置
BINANCE_MOCK_MODE=false                    # 是否使用模拟模式（true/false）
BINANCE_CHECK_INTERVAL=5000                # 检查间隔（毫秒），默认5秒
BINANCE_MONITOR_ROOMS=币安公告群,测试群      # 要推送的群聊名称（可选）
```

### 配置项说明

| 配置项 | 说明 | 默认值 | 示例 |
|--------|------|--------|------|
| `BINANCE_MOCK_MODE` | 是否使用模拟模式 | `false` | `true` 或 `false` |
| `BINANCE_CHECK_INTERVAL` | 检查间隔（毫秒） | `5000` | `10000`（10秒） |
| `BINANCE_MONITOR_ROOMS` | 推送目标群聊 | 使用`MONITOR_ROOMS` | `群1,群2,群3` |

### 群聊配置说明

**选项1：使用独立配置**
```env
BINANCE_MONITOR_ROOMS=币安公告专用群
```

**选项2：与合约监控共享群聊**
```env
MONITOR_ROOMS=通用监控群
BINANCE_MONITOR_ROOMS=    # 留空，使用MONITOR_ROOMS
```

**选项3：推送到所有群**
```env
MONITOR_ROOMS=           # 都留空
BINANCE_MONITOR_ROOMS=   # 推送到机器人的所有群
```

## 消息格式

### 真实API模式
```
📢 【币安公告】
📝 Binance Will List Walrus (WAL)
🕐 2025/10/10 15:00:32
```

### 模拟模式
```
📢 【币安公告】[模拟]
📝 Binance Will List CyberConnect (CYBER)
🕐 2025/10/12 22:07:31
💰 代币: CYBER
```

## 使用示例

### 示例1：基本使用（推送到指定群）

**.env 配置：**
```env
BINANCE_MOCK_MODE=false
BINANCE_CHECK_INTERVAL=5000
BINANCE_MONITOR_ROOMS=币安公告群
```

**运行：**
```bash
npm start
```

**效果：**
- 使用真实API监控
- 每5秒检查一次
- 新公告推送到"币安公告群"

### 示例2：测试模式（模拟数据）

**.env 配置：**
```env
BINANCE_MOCK_MODE=true
BINANCE_CHECK_INTERVAL=10000
BINANCE_MONITOR_ROOMS=测试群
```

**运行：**
```bash
npm start
```

**效果：**
- 使用模拟数据
- 每10秒检查一次
- 10%概率生成新公告推送到"测试群"

### 示例3：开发测试

**运行演示脚本：**
```bash
# 自动演示完整流程
node src/test-binance-demo.js

# 手动触发测试
node src/test-binance-trigger.js

# 真实API测试
node src/test-binance.js

# 模拟模式测试
node src/test-binance-mock.js
```

## 工作流程

```
┌─────────────────────────────────────────┐
│  1. 启动监控服务                         │
│     - 初始化配置                         │
│     - 获取历史文章列表                   │
│     - 记录已知文章ID                     │
└─────────────┬───────────────────────────┘
              │
              ↓
┌─────────────────────────────────────────┐
│  2. 定期检查（默认5秒）                  │
│     - 调用币安API                        │
│     - 获取前5篇最新公告                  │
└─────────────┬───────────────────────────┘
              │
              ↓
┌─────────────────────────────────────────┐
│  3. 检测新公告                           │
│     - 对比文章ID                         │
│     - 识别未见过的公告                   │
└─────────────┬───────────────────────────┘
              │
              ↓ (有新公告)
┌─────────────────────────────────────────┐
│  4. 格式化消息                           │
│     - 提取标题                           │
│     - 提取发布时间                       │
│     - 格式化输出                         │
└─────────────┬───────────────────────────┘
              │
              ↓
┌─────────────────────────────────────────┐
│  5. 推送到微信群                         │
│     - 发送到配置的群聊                   │
│     - 记录发送日志                       │
│     - 缓存已推送的公告                   │
└─────────────────────────────────────────┘
```

## API接口说明

### 币安公告API

**接口地址：**
```
https://www.binance.com/bapi/apex/v1/public/apex/cms/article/list/query
```

**请求参数：**
- `type`: 1 (文章类型)
- `pageNo`: 1 (页码)
- `pageSize`: 5 (每页数量)
- `catalogId`: 48 (新币上线分类)

**响应示例：**
```json
{
  "code": "000000",
  "success": true,
  "data": {
    "catalogs": [{
      "catalogName": "New Cryptocurrency Listing",
      "articles": [
        {
          "id": 252293,
          "title": "Binance Will List Walrus (WAL)",
          "releaseDate": 1760106609813
        }
      ]
    }]
  }
}
```

## 防重复机制

### 1. 首次运行保护
- 初始化时获取历史文章
- 标记为已知，不会推送
- 避免启动时发送大量历史通知

### 2. ID缓存机制
- 使用Set存储已推送的文章ID
- 每次检查前对比ID
- 已存在的ID不会重复推送

### 3. 本地缓存
- 使用CacheService缓存文章详情
- 24小时TTL
- 支持离线查询

## 日志说明

### 日志级别

根据 `LOG_LEVEL` 配置显示不同级别的日志：

```env
LOG_LEVEL=info  # debug | info | warn | error
```

### 关键日志

```
[INFO] 启动币安公告监控服务...
[INFO] 初始化完成，已记录 5 篇文章
[INFO] 币安公告监控已启动，检查间隔: 5秒
[INFO] 发现 1 篇新文章
[INFO] 已发送币安公告到群聊: 币安公告群
```

## 错误处理

### 1. 网络错误
- 自动重试机制
- 记录错误日志
- 不影响下次检查

### 2. API错误
- 捕获异常
- 详细错误日志
- 继续运行监控

### 3. 群聊发送失败
- 记录失败日志
- 不中断监控服务
- 记录已推送状态

## 性能优化

### 1. 合理的检查间隔
- 默认5秒平衡实时性和性能
- 可根据需求调整（建议不小于3秒）

### 2. 缓存机制
- 文章详情缓存24小时
- 减少重复API调用

### 3. 批量处理
- 一次获取多篇文章
- 减少API请求次数

## 常见问题

### Q1: 收不到通知怎么办？
**A:** 检查以下几点：
1. 确认机器人已登录成功
2. 确认群名称配置正确（区分大小写）
3. 查看日志是否有错误信息
4. 检查网络连接是否正常

### Q2: 通知有延迟怎么办？
**A:** 调整检查间隔：
```env
BINANCE_CHECK_INTERVAL=3000  # 改为3秒
```

### Q3: 如何测试功能？
**A:** 使用测试脚本：
```bash
# 运行演示
node src/test-binance-demo.js

# 手动触发测试
node src/test-binance-trigger.js
```

### Q4: 可以只在控制台输出不发送到群吗？
**A:** 可以，注释掉主程序中设置bot实例的代码：
```javascript
// binanceMonitor.bot = bot;  // 注释这行
```

### Q5: 真实API访问失败怎么办？
**A:** 临时使用模拟模式：
```env
BINANCE_MOCK_MODE=true
```

## 技术架构

### 核心类

**BinanceMonitor** - 真实API版本
- 调用币安真实API
- 解析响应数据
- 推送到微信群

**BinanceMonitorMock** - 模拟版本
- 生成模拟数据
- 测试功能流程
- 开发调试使用

### 依赖服务

- **Logger** - 日志记录
- **CacheService** - 缓存管理
- **Wechaty Bot** - 微信机器人

## 最佳实践

### 1. 生产环境
```env
BINANCE_MOCK_MODE=false
BINANCE_CHECK_INTERVAL=5000
BINANCE_MONITOR_ROOMS=正式群
LOG_LEVEL=info
```

### 2. 测试环境
```env
BINANCE_MOCK_MODE=true
BINANCE_CHECK_INTERVAL=10000
BINANCE_MONITOR_ROOMS=测试群
LOG_LEVEL=debug
```

### 3. 开发环境
```env
BINANCE_MOCK_MODE=true
BINANCE_CHECK_INTERVAL=5000
BINANCE_MONITOR_ROOMS=
LOG_LEVEL=debug
```

## 更新日志

### v1.0.0 (2025-10-12)
- ✅ 实现币安公告监控功能
- ✅ 支持真实API和模拟模式
- ✅ 自动推送到微信群
- ✅ 防重复通知机制
- ✅ 可配置群聊和检查间隔
- ✅ 完善的错误处理和日志

## 联系支持

如有问题或建议，请提交Issue或Pull Request。