# Solana 链支持说明

## 概述

从 v2.0 版本开始，本机器人已支持 **Solana 链**的合约地址检测和代币信息播报，与现有的 BSC 链功能并存。

## 支持的链

| 链名称 | 地址格式 | 示例 | 状态 |
|--------|---------|------|------|
| BSC | 0x 开头，42位十六进制 | `0x1234...abcd` | ✅ 支持 |
| Solana | base58 编码，40-44字符 | `So11111111111111111111111111111111111111112` | ✅ 支持 |

## Solana 地址格式

### 特征
- **编码方式**: base58 编码（类似比特币地址）
- **字符集**: 1-9, A-Z, a-z（排除易混淆的 0, O, I, l）
- **长度**: 通常 40-44 个字符（最常见 43-44 字符）

### 有效地址示例
```
So11111111111111111111111111111111111111112  // SOL 原生代币
EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v  // USDC
Es9vMFrzaCERmJfrF4H2FYD4KCoNkY11McCe8BenwNYB  // USDT
mSoLzYCxHdYgdzU16g5QSh3i5K3z3KZK7ytfqcJm7So   // mSOL
```

### 识别规则
1. 长度在 40-44 个字符之间
2. 只包含 base58 字符集
3. 不包含易混淆字符（0, O, I, l）
4. 通常以字母开头

## 使用方法

### 自动检测
机器人会自动检测群消息中的合约地址，无需任何配置：

```
用户A: 看看这个代币 So11111111111111111111111111111111111111112
机器人: 📜📜SOL (Solana链)📜📜
        💰武力: 150.25
        💹战力: 70.5B
        🔥当前: +5.32%
        ...
```

### 混合消息
可以在同一条消息中包含 BSC 和 Solana 地址：

```
用户B: BSC的这个不错 0x1234567890123456789012345678901234567890
      Solana上这个也可以 EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v

机器人: [会分别播报两个地址的信息]
```

## 实现细节

### 地址检测
[src/utils/contractDetector.js:18-59](d:/work/wx_bot/src/utils/contractDetector.js#L18-L59)

```javascript
export function extractContractAddresses(text) {
  const results = [];
  const foundAddresses = new Set();

  // 提取 BSC 地址
  const bscMatches = text.match(BSC_ADDRESS_REGEX);
  if (bscMatches) {
    bscMatches.forEach(address => {
      results.push({
        address: address,
        chain: 'bsc'
      });
    });
  }

  // 提取 Solana 地址
  const solanaMatches = text.match(SOLANA_ADDRESS_REGEX);
  if (solanaMatches) {
    solanaMatches.forEach(address => {
      if (isValidSolanaAddress(address)) {
        results.push({
          address: address,
          chain: 'solana'
        });
      }
    });
  }

  return results;
}
```

### API 查询
[src/services/aveApiV2.js:33-101](d:/work/wx_bot/src/services/aveApiV2.js#L33-L101)

API 服务已更新以支持多链查询：

```javascript
async getTokenInfo(tokenAddress, chain = 'bsc') {
  // 根据 chain 参数查询对应链的代币信息
  const response = await axios.get(`${this.baseUrl}/v2/tokens`, {
    params: {
      keyword: tokenAddress
    },
    headers: {
      'X-API-KEY': this.apiKey,
      // ...
    }
  });

  return this.processTokenData(response.data.data, chain);
}
```

### 消息处理
[src/handlers/messageHandler.js:78-130](d:/work/wx_bot/src/handlers/messageHandler.js#L78-L130)

消息处理器现在会传递链类型：

```javascript
async processContractAddress(room, address, chain = 'bsc') {
  // 使用链类型作为缓存键的一部分
  const cacheKey = `broadcast:${chain}:${normalizedAddress}`;

  // 调用 API 时传递链类型
  const tokenInfo = await this.tokenApiService.getTokenInfo(address, chain);

  // 格式化并发送消息
  const formattedMessage = this.tokenApiService.formatTokenInfo(tokenInfo, address);
  await room.say(formattedMessage);
}
```

### 格式化输出
[src/services/aveApiV2.js:199-268](d:/work/wx_bot/src/services/aveApiV2.js#L199-L268)

播报消息会自动显示对应的链类型：

```javascript
formatTokenInfo(tokenData, tokenAddress = '') {
  const chainDisplay = this.getChainDisplay(chain);
  let message = `📜📜${symbol || 'UNKNOWN'} (${chainDisplay})📜📜\n`;
  // ...
}

getChainDisplay(chain) {
  const chainMap = {
    'bsc': 'BSC链',
    'solana': 'Solana链',
    'sol': 'Solana链',
    // ...
  };
  return chainMap[chain.toLowerCase()] || `${chain.toUpperCase()}链`;
}
```

## 缓存机制

### 防刷屏缓存
每个链的地址独立缓存：
```javascript
// BSC 地址缓存键
broadcast:bsc:0x1234567890123456789012345678901234567890

// Solana 地址缓存键
broadcast:solana:epjfwdd5aufqssqem2qn1xzybap8g4weggkzwytdt1v
```

这意味着：
- 同一 BSC 地址在 10 秒内只播报一次
- 同一 Solana 地址在 10 秒内只播报一次
- BSC 和 Solana 地址相互独立

## 性能优化

### 批量处理
支持同时处理多个不同链的地址：

```javascript
// 批量处理，每批最多 3 个地址
const maxConcurrent = 3;
for (let i = 0; i < addresses.length; i += maxConcurrent) {
  const batch = addresses.slice(i, i + maxConcurrent);
  await Promise.all(
    batch.map(addrObj =>
      this.processContractAddress(room, addrObj.address, addrObj.chain)
    )
  );
}
```

### 速率限制
- 全局速率限制：60 请求/分钟（所有链共享）
- 单地址查询间隔：可配置（默认 0ms）
- 防刷屏缓存：10 秒（可配置）

## 测试示例

### BSC 地址测试
```
# 在群里发送
0x55d398326f99059fF775485246999027B3197955

# 机器人会回复 BSC 链的代币信息
```

### Solana 地址测试
```
# 在群里发送
EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v

# 机器人会回复 Solana 链的代币信息
```

### 混合测试
```
# 在群里发送
BSC: 0x55d398326f99059fF775485246999027B3197955
Solana: So11111111111111111111111111111111111111112

# 机器人会分别回复两个链的代币信息
```

## 常见问题

### Q: 如何禁用某个链的支持？
A: 目前无法通过配置禁用，但可以修改代码：
```javascript
// src/utils/contractDetector.js
export function extractContractAddresses(text) {
  // 只保留 BSC 检测，注释掉 Solana 部分
  // ...
}
```

### Q: Solana 地址为什么有时检测不到？
A: 可能原因：
1. 地址长度不够（<40 字符）
2. 包含非 base58 字符
3. 与其他文本连在一起没有空格分隔

解决方法：确保地址前后有空格或换行符。

### Q: 支持其他链吗（如 ETH、Polygon）？
A: 目前只支持 BSC 和 Solana。如需支持其他链：
1. 在 `contractDetector.js` 添加对应的正则表达式
2. 在 `aveApiV2.js` 添加 API 查询逻辑
3. 在 `getChainDisplay` 添加显示名称

### Q: Ave.ai API 支持 Solana 吗？
A: 是的，Ave.ai API v2 支持多链查询，包括 Solana。使用 `keyword` 参数可以查询任何链的代币。

## 日志示例

启用 Solana 支持后的日志：

```
[2025-10-20 10:15:23] [INFO] 检测到合约地址 | {
  room: "加密货币讨论群",
  count: 2,
  addresses: [
    "0x1234...abcd (bsc)",
    "EPjF...Dt1v (solana)"
  ]
}

[2025-10-20 10:15:24] [INFO] 开始查询SOLANA合约信息 | {
  address: "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v"
}

[2025-10-20 10:15:25] [INFO] 成功获取最新SOLANA代币信息: EPjF...Dt1v

[2025-10-20 10:15:26] [INFO] ✓ SOLANA合约信息已播报 | {
  address: "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v",
  chain: "solana",
  room: "加密货币讨论群"
}
```

## 技术细节

### 正则表达式
```javascript
// BSC 地址 (Ethereum EVM 兼容)
const BSC_ADDRESS_REGEX = /\b(0x[a-fA-F0-9]{40})\b/g;

// Solana 地址 (base58)
const SOLANA_ADDRESS_REGEX = /\b([1-9A-HJ-NP-Za-km-z]{32,44})\b/g;
```

### Base58 字符集
Solana 使用的 base58 字符集：
```
123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz
```

排除的字符：`0` (零), `O` (大写o), `I` (大写i), `l` (小写L)

### 验证逻辑
```javascript
function isValidSolanaAddress(address) {
  // 1. 长度检查
  if (address.length < 32 || address.length > 44) {
    return false;
  }

  // 2. 字符集检查
  if (!/^[1-9A-HJ-NP-Za-km-z]+$/.test(address)) {
    return false;
  }

  // 3. 最小长度过滤（避免误判）
  if (address.length < 40) {
    return false;
  }

  return true;
}
```

## 更新日志

### v2.0 (2025-10-20)
- ✅ 新增 Solana 链支持
- ✅ 更新地址检测逻辑支持多链
- ✅ API 服务支持链类型参数
- ✅ 优化缓存机制支持多链
- ✅ 更新消息格式显示链类型
- ✅ 完善日志记录链信息

### v1.0 (2025-10-13)
- ✅ 初始版本，支持 BSC 链

## 相关链接

- [Ave.ai API 文档](https://ave-cloud.gitbook.io/data-api/rest/tokens)
- [Solana 官方文档](https://docs.solana.com/)
- [Base58 编码说明](https://en.wikipedia.org/wiki/Binary-to-text_encoding#Base58)
- [项目 README](README.md)

---

**最后更新**: 2025-10-20
