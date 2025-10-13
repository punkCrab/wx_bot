import { extractContractAddresses } from '../utils/contractDetector.js';
import { getLogger } from '../utils/logger.js';
import { config } from '../config/config.js';
import CacheService from '../services/cache.js';

/**
 * 消息处理器
 */
class MessageHandler {
  constructor(tokenApiService) {
    this.tokenApiService = tokenApiService;
    this.logger = getLogger();

    // 用于记录已播报的地址，防止短时间内重复播报
    this.addressCache = new CacheService({
      maxSize: 500,
      defaultTTL: config.cache.addressTimeout
    });

    // 记录每个地址的最后查询时间，用于速率限制
    this.lastQueryTime = new Map();
    this.minQueryInterval = config.rateLimit.minQueryInterval;
  }

  /**
   * 处理群消息
   * @param {Object} room - 群聊对象
   * @param {Object} message - 消息对象
   */
  async handleRoomMessage(room, message) {
    try {
      const text = message.text();
      const sender = message.talker();
      const senderName = sender.name();
      const roomTopic = await room.topic();

      this.logger.info(`收到群消息`, {
        room: roomTopic,
        sender: senderName,
        message: text.substring(0, 100)
      });

      // 提取合约地址
      const addresses = extractContractAddresses(text);

      if (addresses.length === 0) {
        return;
      }

      this.logger.info(`检测到合约地址`, {
        room: roomTopic,
        count: addresses.length,
        addresses: addresses
      });

      // 批量处理地址，但限制并发数
      const maxConcurrent = 3;
      for (let i = 0; i < addresses.length; i += maxConcurrent) {
        const batch = addresses.slice(i, i + maxConcurrent);
        await Promise.all(
          batch.map(address => this.processContractAddress(room, address))
        );
      }
    } catch (error) {
      this.logger.error('处理群消息失败:', {
        error: error.message,
        stack: error.stack
      });
    }
  }

  /**
   * 处理单个合约地址
   * @param {Object} room - 群聊对象
   * @param {string} address - 合约地址
   */
  async processContractAddress(room, address) {
    const normalizedAddress = address.toLowerCase();
    const cacheKey = `broadcast:${normalizedAddress}`;

    try {
      // 检查是否最近已播报过（防刷屏机制）
      if (this.addressCache.has(cacheKey)) {
        const ttl = this.addressCache.getTTL(cacheKey);
        this.logger.debug(`地址已在缓存中，跳过`, {
          address: address,
          ttlRemaining: Math.floor(ttl / 1000) + '秒'
        });
        return;
      }

      // 检查速率限制（每个地址的查询间隔）
      const lastQueryTime = this.lastQueryTime.get(normalizedAddress);
      if (lastQueryTime) {
        const timeSinceLastQuery = Date.now() - lastQueryTime;
        if (timeSinceLastQuery < this.minQueryInterval) {
          const waitTime = this.minQueryInterval - timeSinceLastQuery;
          this.logger.debug(`地址查询过于频繁，等待`, {
            address: address,
            waitTime: waitTime + 'ms'
          });
          await this.delay(waitTime);
        }
      }

      this.logger.info(`开始查询合约信息`, { address: address });

      // 更新最后查询时间
      this.lastQueryTime.set(normalizedAddress, Date.now());

      // 调用 API 获取代币信息（强制刷新缓存，获取最新数据）
      const tokenInfo = await this.tokenApiService.getTokenInfo(address, { forceRefresh: true });

      // 格式化信息
      const formattedMessage = this.tokenApiService.formatTokenInfo(tokenInfo, address);

      // 发送到群聊
      await room.say(formattedMessage);

      // 记录已播报的地址（防刷屏时间内不重复）
      this.addressCache.set(cacheKey, true);

      this.logger.info(`✓ 合约信息已播报`, {
        address: address,
        room: await room.topic()
      });
    } catch (error) {
      this.logger.error(`处理合约地址失败`, {
        address: address,
        error: error.message,
        statusCode: error.response?.status
      });

      // 根据配置决定是否发送错误消息到群
      if (config.message.sendErrorToRoom) {
        try {
          let errorMessage = `❌ 获取合约信息失败: ${address.slice(0, 10)}...`;

          // 根据错误类型提供更详细的提示
          if (error.response?.status === 404) {
            errorMessage += '\n📍 提示: 该地址可能不是有效的代币合约';
          } else if (error.response?.status === 429) {
            errorMessage += '\n⏱️ 提示: API请求频率过高，请稍后重试';
          } else if (error.code === 'ECONNABORTED') {
            errorMessage += '\n🌐 提示: 网络请求超时，请检查网络连接';
          }

          await room.say(errorMessage);
        } catch (sendError) {
          this.logger.error('发送错误消息失败:', {
            error: sendError.message
          });
        }
      }

      // 如果是临时性错误，不缓存，允许稍后重试
      const isTemporaryError = error.response?.status >= 500 ||
                               error.code === 'ECONNABORTED' ||
                               error.code === 'ENOTFOUND';

      if (!isTemporaryError) {
        // 对于永久性错误（如404），短时间内缓存，避免重复查询
        this.addressCache.set(cacheKey, false, 300000); // 5分钟
      }
    }
  }

  /**
   * 延迟函数
   * @param {number} ms - 毫秒数
   * @returns {Promise}
   */
  delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

}

export default MessageHandler;
