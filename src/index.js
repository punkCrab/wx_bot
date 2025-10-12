import 'dotenv/config';
import { WechatyBuilder } from 'wechaty';
import AveApiV2Service from './services/aveApiV2.js';
import BinanceMonitor from './services/binanceMonitor.js';
import BinanceMonitorMock from './services/binanceMonitorMock.js';
import MessageHandler from './handlers/messageHandler.js';
import { config, validateConfig } from './config/config.js';
import { createLogger } from './utils/logger.js';

/**
 * 微信群BSC合约地址播报机器人
 */

// 初始化日志系统
const logger = createLogger(config.log);

// 验证配置
const configErrors = validateConfig();
if (configErrors.length > 0) {
  console.error('❌ 配置错误:');
  configErrors.forEach(error => console.error(`  - ${error}`));
  console.error('\n请检查 .env 文件配置');
  process.exit(1);
}

// 初始化服务（使用Ave.ai API V2）
const tokenApiService = new AveApiV2Service(config.api.apiKey);
const messageHandler = new MessageHandler(tokenApiService);

// 初始化币安公告监控服务（暂不传递bot实例，等登录后再设置）
// 如果环境变量设置为使用模拟模式（默认使用真实API）
const useMockMode = process.env.BINANCE_MOCK_MODE === 'true';
const binanceMonitor = useMockMode ? new BinanceMonitorMock() : new BinanceMonitor();

// 创建微信机器人实例
const bot = WechatyBuilder.build({
  name: config.bot.name,
  puppet: config.bot.puppet,
});

/**
 * 机器人扫码登录
 */
bot.on('scan', (qrcode, status) => {
  const qrcodeUrl = `https://wechaty.js.org/qrcode/${encodeURIComponent(qrcode)}`;
  logger.info(`扫码登录`, { url: qrcodeUrl, status: status });
  console.log(`\n📱 扫描二维码登录: ${qrcodeUrl}`);
  console.log(`状态: ${status}\n`);
});

/**
 * 机器人登录成功
 */
bot.on('login', (user) => {
  logger.info('登录成功', {
    userName: user.name(),
    userId: user.id
  });

  console.log(`\n✅ 登录成功: ${user.name()}`);
  console.log(`🤖 机器人ID: ${user.id}`);

  if (config.bot.monitorRooms) {
    console.log(`📋 监控群聊: ${config.bot.monitorRooms.join(', ')}`);
  } else {
    console.log(`📋 监控模式: 所有群聊`);
  }

  console.log(`\n⚙️ 配置信息:`);
  console.log(`  - API超时: ${config.api.timeout}ms`);
  console.log(`  - 最大重试: ${config.api.maxRetries}次`);
  console.log(`  - 速率限制: ${config.rateLimit.maxRequestsPerMinute}请求/分钟`);
  console.log(`  - 地址缓存: ${config.cache.addressTimeout / 1000}秒`);

  console.log('\n🚀 机器人已启动，开始监控合约地址...\n');

  // 设置bot实例和监控群聊
  const binanceMonitorRooms = process.env.BINANCE_MONITOR_ROOMS ?
    process.env.BINANCE_MONITOR_ROOMS.split(',').map(s => s.trim()).filter(s => s) :
    config.bot.monitorRooms; // 使用与合约监控相同的群聊配置

  binanceMonitor.bot = bot;
  binanceMonitor.monitorRooms = binanceMonitorRooms;

  // 启动币安公告监控
  binanceMonitor.start().then(() => {
    const mode = useMockMode ? '模拟模式' : '真实模式';
    const sendMode = binanceMonitor.bot ? '发送到微信群' : '仅控制台输出';
    console.log(`📢 币安公告监控已启动（${mode}：${sendMode}）`);

    if (binanceMonitorRooms && binanceMonitorRooms.length > 0) {
      console.log(`📢 币安公告监控群聊: ${binanceMonitorRooms.join(', ')}\n`);
    } else {
      console.log(`📢 币安公告监控模式: 所有群聊\n`);
    }
  }).catch(err => {
    logger.error('币安公告监控启动失败:', { error: err.message });
  });
});

/**
 * 机器人登出
 */
bot.on('logout', (user) => {
  logger.warn('机器人登出', { userName: user.name() });
  console.log(`\n❌ 登出: ${user.name()}`);
});

/**
 * 处理消息
 */
bot.on('message', async (message) => {
  try {
    // 忽略自己发送的消息
    if (message.self()) {
      return;
    }

    // 只处理群消息
    const room = message.room();
    if (!room) {
      return;
    }

    // 只处理文本消息
    if (message.type() !== bot.Message.Type.Text) {
      return;
    }

    // 如果配置了特定群聊，只监控这些群
    if (config.bot.monitorRooms) {
      const roomTopic = await room.topic();
      if (!config.bot.monitorRooms.includes(roomTopic)) {
        logger.debug('跳过非监控群聊', { room: roomTopic });
        return;
      }
    }

    // 处理消息
    await messageHandler.handleRoomMessage(room, message);
  } catch (error) {
    logger.error('处理消息时出错:', {
      error: error.message,
      stack: error.stack
    });
  }
});

/**
 * 错误处理
 */
bot.on('error', (error) => {
  logger.error('机器人错误:', {
    error: error.message,
    stack: error.stack
  });
});

/**
 * 启动机器人
 */
async function start() {
  try {
    console.log('🚀 启动微信群BSC合约地址播报机器人...\n');
    logger.info('启动机器人', { version: '1.0.0' });
    await bot.start();
  } catch (error) {
    logger.error('启动失败:', {
      error: error.message,
      stack: error.stack
    });
    console.error('❌ 启动失败:', error);
    process.exit(1);
  }
}

/**
 * 优雅退出
 */
process.on('SIGINT', async () => {
  logger.info('收到退出信号，正在关闭机器人...');
  console.log('\n\n⏹️ 正在关闭机器人...');

  try {
    // 停止币安监控
    binanceMonitor.stop();
    console.log('✅ 币安公告监控已停止');

    await bot.stop();
    logger.info('机器人已关闭');
    console.log('✅ 机器人已安全关闭');
  } catch (error) {
    logger.error('关闭机器人时出错:', { error: error.message });
    console.error('❌ 关闭时出错:', error);
  }

  process.exit(0);
});

/**
 * 未捕获的异常处理
 */
process.on('uncaughtException', (error) => {
  logger.error('未捕获的异常:', {
    error: error.message,
    stack: error.stack
  });
  console.error('💥 未捕获的异常:', error);
  process.exit(1);
});

process.on('unhandledRejection', (reason, promise) => {
  logger.error('未处理的Promise拒绝:', {
    reason: reason,
    promise: promise
  });
  console.error('💥 未处理的Promise拒绝:', reason);
});

// 启动
start();
