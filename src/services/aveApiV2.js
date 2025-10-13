import axios from 'axios';
import { getLogger } from '../utils/logger.js';
import CacheService from './cache.js';
import RateLimiter from '../utils/rateLimiter.js';
import { config } from '../config/config.js';

/**
 * Ave.ai API V2 服务
 * 文档: https://ave-cloud.gitbook.io/data-api/rest/tokens
 */
class AveApiV2Service {
  constructor(apiKey) {
    this.apiKey = apiKey;
    this.baseUrl = 'https://prod.ave-api.com';
    this.timeout = config.api.timeout;
    this.maxRetries = config.api.maxRetries;
    this.retryDelay = config.api.retryDelay;

    this.logger = getLogger();
    this.cache = new CacheService({
      maxSize: config.cache.maxCacheSize,
      defaultTTL: config.cache.contractInfoTimeout
    });
    this.rateLimiter = new RateLimiter(config.rateLimit.maxRequestsPerMinute);
  }

  /**
   * 获取BSC代币信息
   * @param {string} tokenAddress - 代币地址
   * @param {Object} options - 选项
   * @param {boolean} options.forceRefresh - 是否强制刷新缓存
   * @returns {Promise<Object>} 代币信息
   */
  async getTokenInfo(tokenAddress, options = {}) {
    const { forceRefresh = false } = options;

    // 检查缓存（除非强制刷新）
    const cacheKey = `token:${tokenAddress.toLowerCase()}`;

    if (!forceRefresh) {
      const cachedData = this.cache.get(cacheKey);
      if (cachedData) {
        this.logger.debug(`从缓存获取代币信息: ${tokenAddress}`);
        return cachedData;
      }
    } else {
      this.logger.debug(`强制刷新缓存: ${tokenAddress}`);
    }

    // 检查速率限制
    if (!this.rateLimiter.canMakeRequest()) {
      const waitTime = this.rateLimiter.getWaitTime();
      this.logger.warn(`达到速率限制，需等待 ${waitTime}ms`, {
        status: this.rateLimiter.getStatus()
      });
      await this.delay(waitTime);
    }

    // 发起请求（带重试机制）
    let lastError;
    for (let attempt = 1; attempt <= this.maxRetries; attempt++) {
      try {
        this.logger.info(`获取代币信息 [${tokenAddress}] (尝试 ${attempt}/${this.maxRetries})`);
        this.rateLimiter.recordRequest();

        // Ave.ai API V2: GET /v2/tokens?keyword=
        const response = await axios.get(`${this.baseUrl}/v2/tokens`, {
          params: {
            keyword: tokenAddress  // 使用keyword参数传递合约地址
          },
          headers: {
            'X-API-KEY': this.apiKey,  // 使用X-API-KEY头进行认证
            'Accept': 'application/json',
            'Content-Type': 'application/json',
            'User-Agent': 'BSC-Contract-Bot/1.0'
          },
          timeout: this.timeout
        });

        // 检查响应数据
        if (response.data && response.data.data) {
          const tokenInfo = this.processTokenData(response.data.data);
          // 缓存结果（注意：这里的缓存仅用于API层面的短期缓存，避免重复请求）
          // 实际播报逻辑由 messageHandler 的 addressCache 控制
          this.cache.set(cacheKey, tokenInfo);
          this.logger.info(`成功获取代币信息: ${tokenAddress}`);
          return tokenInfo;
        } else if (response.data && response.data.error) {
          throw new Error(response.data.error.message || 'API返回错误');
        } else {
          throw new Error('API返回数据格式错误');
        }
      } catch (error) {
        lastError = error;
        this.logger.error(`获取代币信息失败 [${tokenAddress}] (尝试 ${attempt}/${this.maxRetries}):`, {
          error: error.message,
          status: error.response?.status,
          data: error.response?.data
        });

        // 如果是4xx错误，不重试
        if (error.response && error.response.status >= 400 && error.response.status < 500) {
          break;
        }

        // 如果不是最后一次重试，等待后继续
        if (attempt < this.maxRetries) {
          const delay = this.retryDelay * Math.pow(2, attempt - 1); // 指数退避
          this.logger.debug(`等待 ${delay}ms 后重试...`);
          await this.delay(delay);
        }
      }
    }

    throw lastError;
  }

  /**
   * 处理API返回的数据
   * @param {Object|Array} data - API返回的数据
   * @returns {Object} 处理后的代币信息
   */
  processTokenData(data) {
    // 如果是数组，取第一个元素
    const tokenData = Array.isArray(data) ? data[0] : data;

    if (!tokenData) {
      throw new Error('未找到代币信息');
    }

    // 解析 appendix JSON 字段（如果存在）
    let appendixData = {};
    if (tokenData.appendix) {
      try {
        appendixData = JSON.parse(tokenData.appendix);
      } catch (e) {
        this.logger.debug('解析appendix失败:', e.message);
      }
    }

    return {
      // 基本信息
      symbol: tokenData.symbol,
      name: tokenData.token_name || appendixData.tokenName || tokenData.symbol,
      address: tokenData.token || tokenData.contract_address,
      chain: tokenData.chain,
      decimals: tokenData.decimal || tokenData.decimals,

      // 价格信息（根据实际返回结构）
      priceUsd: parseFloat(tokenData.current_price_usd || 0),
      priceEth: parseFloat(tokenData.current_price_eth || 0),
      launchPrice: parseFloat(tokenData.launch_price || 0),

      // 价格变化
      priceChange24h: parseFloat(tokenData.price_change_24h || 0),
      priceChange1d: parseFloat(tokenData.price_change_1d || 0),

      // 市场数据
      marketCap: parseFloat(tokenData.market_cap || 0),
      fdv: parseFloat(tokenData.fdv || 0),
      tvl: parseFloat(tokenData.tvl || 0),
      mainPairTvl: parseFloat(tokenData.main_pair_tvl || 0),

      // 供应量
      totalSupply: parseFloat(tokenData.total || tokenData.totalSupply || 0),
      burnAmount: parseFloat(tokenData.burn_amount || 0),
      lockAmount: parseFloat(tokenData.lock_amount || 0),
      lockedPercent: parseFloat(tokenData.locked_percent || 0),

      // 交易量和交易数
      volume24h: parseFloat(tokenData.tx_volume_u_24h || 0),
      txAmount24h: parseFloat(tokenData.tx_amount_24h || 0),
      txCount24h: parseInt(tokenData.tx_count_24h || 0),
      buyTx: parseFloat(tokenData.buy_tx || 0),
      sellTx: parseFloat(tokenData.sell_tx || 0),

      // 持有者
      holders: parseInt(tokenData.holders || 0),

      // 风险信息
      riskLevel: tokenData.risk_level || tokenData.ave_risk_level || 0,
      riskScore: tokenData.risk_score,
      isHoneypot: tokenData.is_honeypot || false,
      isMintable: tokenData.is_mintable === "1" || tokenData.has_mint_method || false,
      hasNotRenounced: tokenData.has_not_renounced || false,
      hasNotAudited: tokenData.has_not_audited || false,
      isInBlacklist: tokenData.is_in_blacklist || false,

      // 社交链接（从appendix中提取）
      website: appendixData.website || tokenData.website,
      twitter: appendixData.twitter || tokenData.twitter,
      telegram: appendixData.telegram || tokenData.telegram,
      discord: appendixData.discord,
      github: appendixData.github,

      // 其他信息
      logoUrl: tokenData.logo_url,
      mainPair: tokenData.main_pair,
      issuePlatform: tokenData.issue_platform,
      createdAt: tokenData.created_at,
      updatedAt: tokenData.updated_at,

      // 原始数据（用于调试）
      _raw: tokenData
    };
  }

  /**
   * 格式化代币信息为可读文本（使用新模板）
   * @param {Object} tokenData - 代币数据
   * @param {string} tokenAddress - 代币地址
   * @returns {string} 格式化后的文本
   */
  formatTokenInfo(tokenData, tokenAddress = '') {
    try {
      const {
        symbol,
        chain,
        priceUsd,
        marketCap,
        tvl,
        mainPairTvl,
        priceChange24h,
        holders,
        volume24h,
        txCount24h
      } = tokenData;

      // 标题
      let message = `📜📜${symbol || 'UNKNOWN'} (${chain === 'bsc' ? 'BSC' : chain?.toUpperCase() || 'BSC'}链)📜📜\n`;

      // 武力值（价格）
      if (priceUsd !== undefined && priceUsd !== null) {
        message += `💰武力: ${this.formatPrice(priceUsd)}\n`;
      }

      // 战力（市值）
      if (marketCap !== undefined && marketCap > 0) {
        message += `💹战力: ${this.formatMarketCap(marketCap)}\n`;
      }

      // 当前（24小时涨跌幅）
      if (priceChange24h !== undefined && priceChange24h !== null) {
        // 如果涨幅超过100%，转换为X倍数显示
        if (priceChange24h >= 100) {
          const times = (priceChange24h / 100 + 1).toFixed(1);
          message += `🔥当前: ${times}X\n`;
        } else {
          const changeSymbol = priceChange24h >= 0 ? '+' : '';
          message += `🔥当前: ${changeSymbol}${priceChange24h.toFixed(2)}%\n`;
        }
      }

      // 团队人数（持有者）
      if (holders !== undefined && holders > 0) {
        message += `🎅团队人数: ${this.formatNumber(holders)}\n`;
      }

      // 24小时交易量
      if (volume24h !== undefined && volume24h > 0) {
        message += `📊24h Volume: ${this.formatVolume(volume24h)}\n`;
      }

      // 创建时间
      if (tokenData.createdAt) {
        const createdDate = new Date(tokenData.createdAt * 1000); // Unix时间戳转换
        message += `🕐创建时间: ${createdDate.toLocaleString('zh-CN', {
          year: 'numeric',
          month: '2-digit',
          day: '2-digit',
          hour: '2-digit',
          minute: '2-digit'
        })}`;
      }

      return message;
    } catch (error) {
      this.logger.error('格式化代币信息失败:', { error: error.message });
      return '❌ 格式化代币信息时出错';
    }
  }

  /**
   * 格式化DEX名称
   * @param {string} dex - DEX名称或对象
   * @returns {string} 格式化后的名称
   */
  formatDexName(dex) {
    if (typeof dex === 'object' && dex.name) {
      return dex.name;
    }

    const dexNames = {
      'pancakeswap': 'PancakeSwap',
      'pancakeswapv3': 'PancakeSwap V3',
      'pancakeswap_v2': 'PancakeSwap V2',
      'biswap': 'BiSwap',
      'apeswap': 'ApeSwap',
      'babyswap': 'BabySwap',
      'mdex': 'MDEX'
    };

    const dexStr = String(dex).toLowerCase();
    return dexNames[dexStr] || dex;
  }

  /**
   * 格式化地址
   * @param {string} address - 地址
   * @returns {string} 格式化后的地址
   */
  formatAddress(address) {
    if (!address || address.length < 10) {
      return address;
    }
    return `${address.substring(0, 6)}...${address.substring(address.length - 4)}`;
  }

  /**
   * 格式化价格
   * @param {number} price - 价格
   * @returns {string} 格式化后的价格
   */
  formatPrice(price) {
    if (price >= 1) {
      return price.toFixed(2);
    } else if (price >= 0.01) {
      return price.toFixed(4);
    } else if (price >= 0.0001) {
      return price.toFixed(6);
    } else if (price >= 0.000001) {
      return price.toFixed(8);
    } else {
      return price.toExponential(2);
    }
  }

  /**
   * 格式化数字（用于持有者数量）
   * @param {number} num - 数字
   * @returns {string} 格式化后的数字
   */
  formatNumber(num) {
    if (num >= 1000) {
      return num.toLocaleString();
    }
    return num.toString();
  }

  /**
   * 格式化市值
   * @param {number} marketCap - 市值
   * @returns {string} 格式化后的市值
   */
  formatMarketCap(marketCap) {
    if (marketCap >= 1e9) {
      return (marketCap / 1e9).toFixed(2) + 'B';
    } else if (marketCap >= 1e6) {
      return (marketCap / 1e6).toFixed(2) + 'M';
    } else if (marketCap >= 1e3) {
      return (marketCap / 1e3).toFixed(2) + 'K';
    }
    return marketCap.toFixed(2);
  }

  /**
   * 格式化交易量
   * @param {number} volume - 交易量
   * @returns {string} 格式化后的交易量
   */
  formatVolume(volume) {
    if (volume >= 1e9) {
      return (volume / 1e9).toFixed(2) + 'B';
    } else if (volume >= 1e6) {
      return (volume / 1e6).toFixed(2) + 'M';
    } else if (volume >= 1e3) {
      return (volume / 1e3).toFixed(2) + 'K';
    }
    return volume.toFixed(2);
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

export default AveApiV2Service;