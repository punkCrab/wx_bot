/**
 * 应用配置
 */

export const config = {
  // API配置
  api: {
    baseUrl: process.env.AVE_AI_BASE_URL || 'https://prod.ave-api.com',
    apiKey: process.env.AVE_AI_API_KEY,
    timeout: parseInt(process.env.API_TIMEOUT) || 10000,
    maxRetries: parseInt(process.env.API_MAX_RETRIES) || 3,
    retryDelay: parseInt(process.env.API_RETRY_DELAY) || 1000,
  },

  // 缓存配置
  cache: {
    // 地址缓存时间（毫秒） - 设置为0可以禁用缓存，允许重复播报
    addressTimeout: parseInt(process.env.CACHE_ADDRESS_TIMEOUT) || 3600000, // 1小时
    // 合约信息缓存时间（毫秒）
    contractInfoTimeout: parseInt(process.env.CACHE_CONTRACT_TIMEOUT) || 600000, // 10分钟
    // 最大缓存数量
    maxCacheSize: parseInt(process.env.MAX_CACHE_SIZE) || 1000,
    // 是否启用播报缓存（false = 允许重复播报）
    enableBroadcastCache: process.env.ENABLE_BROADCAST_CACHE !== 'false', // 默认true
  },

  // 速率限制配置
  rateLimit: {
    // 每分钟最大请求数
    maxRequestsPerMinute: parseInt(process.env.MAX_REQUESTS_PER_MINUTE) || 30,
    // 每个地址的最小查询间隔（毫秒）
    minQueryInterval: parseInt(process.env.MIN_QUERY_INTERVAL) || 5000,
  },

  // 机器人配置
  bot: {
    name: process.env.BOT_NAME || 'bsc-contract-bot',
    puppet: process.env.BOT_PUPPET || 'wechaty-puppet-wechat4u',
    // 监控的群名称
    monitorRooms: process.env.MONITOR_ROOMS
      ? process.env.MONITOR_ROOMS.split(',').map(name => name.trim()).filter(Boolean)
      : null,
    // 是否启用调试模式
    debug: process.env.DEBUG === 'true',
  },

  // 日志配置
  log: {
    level: process.env.LOG_LEVEL || 'info',
    // 是否输出到文件
    toFile: process.env.LOG_TO_FILE === 'true',
    // 日志文件路径
    filePath: process.env.LOG_FILE_PATH || './logs/bot.log',
  },

  // 消息配置
  message: {
    // 是否显示合约地址
    showAddress: process.env.SHOW_CONTRACT_ADDRESS !== 'false',
    // 是否显示查询时间
    showTimestamp: process.env.SHOW_TIMESTAMP === 'true',
    // 错误消息是否发送到群
    sendErrorToRoom: process.env.SEND_ERROR_TO_ROOM !== 'false',
  }
};

// 验证必要配置
export function validateConfig() {
  const errors = [];

  if (!config.api.apiKey) {
    errors.push('未设置 AVE_AI_API_KEY 环境变量');
  }

  if (config.api.timeout < 1000 || config.api.timeout > 60000) {
    errors.push('API_TIMEOUT 应在 1000-60000 毫秒之间');
  }

  if (config.api.maxRetries < 0 || config.api.maxRetries > 10) {
    errors.push('API_MAX_RETRIES 应在 0-10 之间');
  }

  if (config.rateLimit.maxRequestsPerMinute < 1 || config.rateLimit.maxRequestsPerMinute > 100) {
    errors.push('MAX_REQUESTS_PER_MINUTE 应在 1-100 之间');
  }

  return errors;
}