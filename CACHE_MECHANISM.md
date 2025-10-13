# BSC合约信息缓存机制说明

本文档详细说明BSC合约信息播报的缓存机制和工作原理。

## 概述

机器人使用双层缓存机制，既能防止短时间内的刷屏，又能确保每次播报都是最新的数据。

## 缓存机制

### 1. 防刷屏缓存（addressCache）

**位置：** `messageHandler.js`
**配置：** `CACHE_ADDRESS_TIMEOUT`（默认10秒）

**作用：**
- 防止同一地址在短时间内被重复播报
- 避免群消息被刷屏

**工作原理：**
```
时间线：
T0秒: 用户A发送地址 0x123... → 立即播报 ✅
T3秒: 用户B发送地址 0x123... → 跳过（缓存中）❌
T8秒: 用户C发送地址 0x123... → 跳过（缓存中）❌
T12秒: 用户D发送地址 0x123... → 重新播报（缓存已过期）✅
```

### 2. API数据缓存（内部缓存）

**位置：** `aveApiV2.js`
**配置：** `CACHE_CONTRACT_TIMEOUT`（默认10分钟）

**作用：**
- 减少对 Ave.ai API 的重复请求
- 仅作为内部优化，不影响播报逻辑

**关键改进：**
- 每次播报时使用 `forceRefresh: true` 强制刷新缓存
- 确保每次播报都获取最新的代币数据

## 实际场景示例

### 场景1：防刷屏

```
10:00:00 - 用户A: "看看这个币 0xAAA..."
10:00:01 - 机器人: 播报 0xAAA 的信息 ✅

10:00:03 - 用户B: "这个币怎么样 0xAAA..."
10:00:03 - 机器人: 跳过（3秒前刚播报过）❌

10:00:08 - 用户C: "关注一下 0xAAA..."
10:00:08 - 机器人: 跳过（8秒前刚播报过）❌
```

**结果：** 10秒内只播报1次，避免刷屏 🎯

### 场景2：实时更新

```
10:00:00 - 用户A: "看看这个币 0xAAA..."
10:00:01 - 机器人: 播报 (价格: $0.001, 涨幅: +10%) ✅

[币价上涨...]

10:00:15 - 用户B: "这个币现在怎么样 0xAAA..."
10:00:15 - 机器人: 重新播报 (价格: $0.0015, 涨幅: +50%) ✅
```

**结果：** 超过防刷屏时间后，获取最新数据并播报 🔄

### 场景3：不同地址

```
10:00:00 - 用户A: "看看这个 0xAAA..."
10:00:01 - 机器人: 播报 0xAAA 的信息 ✅

10:00:03 - 用户B: "那这个呢 0xBBB..."
10:00:04 - 机器人: 播报 0xBBB 的信息 ✅

10:00:05 - 用户C: "还有这个 0xAAA..."
10:00:05 - 机器人: 跳过（5秒前刚播报过 0xAAA）❌
```

**结果：** 不同地址独立计算，互不影响 ✨

## 配置说明

### CACHE_ADDRESS_TIMEOUT（防刷屏时间）

**推荐值：**
- **活跃群聊：** 10000ms（10秒）- 默认值
- **低频群聊：** 5000ms（5秒）
- **高频群聊：** 15000ms（15秒）

**配置方法：**
```env
# .env 文件
CACHE_ADDRESS_TIMEOUT=10000  # 10秒内不重复播报
```

**注意：**
- 设置过短可能导致刷屏
- 设置过长可能错过实时数据更新

### CACHE_CONTRACT_TIMEOUT（API缓存时间）

**说明：**
- 这是内部优化参数，一般无需修改
- 由于使用了 `forceRefresh`，此参数主要用于错误恢复场景

**默认值：** 600000ms（10分钟）

## 技术实现细节

### messageHandler.js 关键代码

```javascript
// 检查防刷屏缓存
if (this.addressCache.has(cacheKey)) {
  const ttl = this.addressCache.getTTL(cacheKey);
  this.logger.debug(`地址已在缓存中，跳过`, {
    address: address,
    ttlRemaining: Math.floor(ttl / 1000) + '秒'
  });
  return;  // 跳过，不播报
}

// 强制刷新缓存，获取最新数据
const tokenInfo = await this.tokenApiService.getTokenInfo(address, {
  forceRefresh: true  // 🔑 关键：强制刷新
});

// 播报后记录到缓存
this.addressCache.set(cacheKey, true);
```

### aveApiV2.js 关键代码

```javascript
async getTokenInfo(tokenAddress, options = {}) {
  const { forceRefresh = false } = options;

  // 如果 forceRefresh=true，跳过缓存检查
  if (!forceRefresh) {
    const cachedData = this.cache.get(cacheKey);
    if (cachedData) {
      return cachedData;  // 返回缓存
    }
  } else {
    this.logger.debug(`强制刷新缓存: ${tokenAddress}`);
  }

  // 调用 API 获取最新数据
  const response = await axios.get(...);

  // 缓存结果
  this.cache.set(cacheKey, tokenInfo);

  return tokenInfo;
}
```

## 优势

### ✅ 1. 防止刷屏
- 同一地址在短时间内不会被重复播报
- 避免群聊被大量相同信息占据

### ✅ 2. 数据实时性
- 超过防刷屏时间后，重新获取最新数据
- 确保用户看到的是当前最新的价格和涨跌幅

### ✅ 3. API效率
- 防刷屏机制减少了 API 调用次数
- 速率限制保护避免超出 API 限额

### ✅ 4. 灵活配置
- 可根据群聊活跃度调整防刷屏时间
- 适应不同使用场景

## 与旧版本对比

### 旧版本问题

❌ **问题：** API 缓存时间过长（10分钟）
❌ **影响：** 用户在10分钟内再次查询，看到的是旧数据
❌ **场景：** 币价从 $0.001 涨到 $0.01，但播报的还是 $0.001

### 新版本优势

✅ **改进：** 播报时强制刷新缓存
✅ **效果：** 每次播报都是最新数据
✅ **平衡：** 既防刷屏，又保证实时性

## 监控和调试

### 查看缓存状态

启用调试日志：
```env
LOG_LEVEL=debug
```

日志输出示例：
```
[DEBUG] 地址已在缓存中，跳过 | address: 0x123..., ttlRemaining: 7秒
[DEBUG] 强制刷新缓存: 0x123...
[INFO ] 成功获取代币信息: 0x123...
[INFO ] ✓ 合约信息已播报 | address: 0x123...
```

### 常见日志

| 日志 | 含义 | 建议 |
|------|------|------|
| `地址已在缓存中，跳过` | 防刷屏生效 | 正常 ✅ |
| `强制刷新缓存` | 正在获取最新数据 | 正常 ✅ |
| `从缓存获取代币信息` | 使用内部缓存（不应出现）| 检查代码 ⚠️ |

## 最佳实践

### 1. 活跃群聊配置

```env
CACHE_ADDRESS_TIMEOUT=15000  # 15秒防刷屏
MIN_QUERY_INTERVAL=1000      # 1秒查询间隔
```

### 2. 低频群聊配置

```env
CACHE_ADDRESS_TIMEOUT=5000   # 5秒防刷屏
MIN_QUERY_INTERVAL=0         # 无查询间隔限制
```

### 3. 测试环境配置

```env
CACHE_ADDRESS_TIMEOUT=3000   # 3秒防刷屏（方便测试）
LOG_LEVEL=debug              # 启用调试日志
```

## 常见问题

### Q: 为什么还需要 CACHE_CONTRACT_TIMEOUT？

A: 这是内部优化参数，用于以下场景：
- 错误恢复：当 API 调用失败时，可能暂时返回缓存数据
- 速率限制：避免短时间内大量 API 请求
- 在正常播报流程中，此缓存会被 `forceRefresh` 跳过

### Q: 可以设置 CACHE_ADDRESS_TIMEOUT=0 吗？

A: 不建议。设置为0会导致：
- 同一地址可能被连续播报多次
- 群聊可能被刷屏
- 浪费 API 调用次数

最小建议值：3000ms（3秒）

### Q: 如何验证每次都是最新数据？

A: 方法1 - 查看日志：
```
LOG_LEVEL=debug npm start
```
查找 "强制刷新缓存" 日志

方法2 - 对比时间：
- 发送地址后立即查看播报的价格和涨幅
- 等待防刷屏时间过期后再次发送
- 对比两次播报的数据是否有变化

### Q: 防刷屏时间过期后，一定会重新获取吗？

A: 是的！每次通过防刷屏检查后，都会：
1. 调用 `getTokenInfo(address, { forceRefresh: true })`
2. 跳过内部缓存
3. 直接请求 API 获取最新数据
4. 播报最新信息

## 总结

新的缓存机制实现了完美的平衡：

🛡️ **防刷屏** - 配置时间内不重复播报
🔄 **实时更新** - 超时后获取最新数据
⚡ **高效率** - 减少不必要的 API 调用
🎯 **灵活性** - 可根据场景调整配置

---

**关键改进点：**
- messageHandler 传递 `{ forceRefresh: true }`
- aveApiV2 支持 `forceRefresh` 选项
- 每次播报都获取最新数据

**适用场景：**
- ✅ 快速波动的代币（需要实时数据）
- ✅ 活跃的交易群（需要防刷屏）
- ✅ 多用户环境（需要负载均衡）
