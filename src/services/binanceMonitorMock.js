import { getLogger } from '../utils/logger.js';
import CacheService from './cache.js';

/**
 * 币安公告监控服务（模拟版本）
 * 用于测试环境，模拟币安上币公告
 */
class BinanceMonitorMock {
  constructor(bot = null, monitorRooms = null) {
    this.logger = getLogger();
    this.bot = bot; // 微信机器人实例
    this.monitorRooms = monitorRooms; // 要发送公告的群聊列表
    this.checkInterval = parseInt(process.env.BINANCE_CHECK_INTERVAL) || 5000; // 检查间隔
    this.intervalId = null;
    this.knownArticles = new Set();
    this.isFirstRun = true;
    this.mockArticleCounter = 0;

    // 文章缓存服务
    this.cache = new CacheService({
      maxSize: 100,
      defaultTTL: 86400000 // 24小时
    });

    // 模拟文章池
    this.mockArticles = [
      { title: 'Binance Will List Worldcoin (WLD)', symbol: 'WLD' },
      { title: 'Binance Will List Sei (SEI)', symbol: 'SEI' },
      { title: 'Binance Will List CyberConnect (CYBER)', symbol: 'CYBER' },
      { title: 'Binance Adds ARKM on Cross Margin & Isolated Margin', symbol: 'ARKM' },
      { title: 'Binance Will List Arkham (ARKM)', symbol: 'ARKM' },
      { title: 'Binance Will List Pendulum (PEN)', symbol: 'PEN' },
      { title: 'Binance Will List Base Protocol (BASE)', symbol: 'BASE' },
      { title: 'Binance Futures Will Launch USDⓈ-M CYBER Perpetual Contract', symbol: 'CYBER' },
      { title: 'Binance Will List Neutron (NTRN)', symbol: 'NTRN' },
      { title: 'Binance Launchpool: Memecoin (MEME)', symbol: 'MEME' }
    ];
  }

  /**
   * 模拟获取币安公告列表
   * @returns {Promise<Array>} 文章列表
   */
  async fetchArticles() {
    // 模拟网络延迟
    await new Promise(resolve => setTimeout(resolve, 100));

    // 前5篇固定文章
    const baseArticles = [
      {
        id: 'art_001',
        code: 'art_001',
        title: 'Binance System Upgrade Notice',
        releaseDate: Date.now() - 86400000 // 1天前
      },
      {
        id: 'art_002',
        code: 'art_002',
        title: 'Binance P2P: Tips to Protect Your Account',
        releaseDate: Date.now() - 172800000 // 2天前
      },
      {
        id: 'art_003',
        code: 'art_003',
        title: 'Binance Academy: Understanding Market Cycles',
        releaseDate: Date.now() - 259200000 // 3天前
      },
      {
        id: 'art_004',
        code: 'art_004',
        title: 'Binance Staking: New High-Yield Opportunities',
        releaseDate: Date.now() - 345600000 // 4天前
      },
      {
        id: 'art_005',
        code: 'art_005',
        title: 'Binance Security: How to Secure Your Account',
        releaseDate: Date.now() - 432000000 // 5天前
      }
    ];

    // 10%概率生成新文章（模拟上币公告）
    if (!this.isFirstRun && Math.random() < 0.1) {
      const newArticle = this.generateMockArticle();
      baseArticles.unshift(newArticle); // 新文章放在最前面
      baseArticles.pop(); // 移除最后一篇，保持5篇

      this.logger.info('📍 模拟生成新文章:', {
        title: newArticle.title,
        id: newArticle.id
      });
    }

    return baseArticles;
  }

  /**
   * 生成模拟的新文章
   * @returns {Object} 新文章对象
   */
  generateMockArticle() {
    this.mockArticleCounter++;
    const mockArticle = this.mockArticles[this.mockArticleCounter % this.mockArticles.length];

    return {
      id: `new_art_${Date.now()}_${this.mockArticleCounter}`,
      code: `new_art_${Date.now()}_${this.mockArticleCounter}`,
      title: mockArticle.title,
      releaseDate: Date.now(),
      symbol: mockArticle.symbol
    };
  }

  /**
   * 检查新文章
   * @param {Array} articles - 文章列表
   * @returns {Array} 新文章列表
   */
  detectNewArticles(articles) {
    const newArticles = [];

    for (const article of articles) {
      const articleId = article.id || article.code;

      // 检查是否是新文章
      if (!this.knownArticles.has(articleId)) {
        this.knownArticles.add(articleId);

        // 如果不是首次运行，则标记为新文章
        if (!this.isFirstRun) {
          newArticles.push(article);
        }
      }
    }

    // 首次运行完成后，设置标记为false
    if (this.isFirstRun) {
      this.isFirstRun = false;
      this.logger.info(`🎯 [模拟模式] 初始化完成，已记录 ${this.knownArticles.size} 篇文章`);
    }

    return newArticles;
  }

  /**
   * 格式化文章信息
   * @param {Object} article - 文章对象
   * @returns {string} 格式化后的文本
   */
  formatArticle(article) {
    const title = article.title || '无标题';
    const releaseDate = article.releaseDate ?
      new Date(article.releaseDate).toLocaleString('zh-CN') :
      '未知时间';

    let message = `📢 【币安公告】[模拟]\n📝 ${title}\n🕐 ${releaseDate}`;

    // 如果有代币符号，添加到消息中
    if (article.symbol) {
      message += `\n💰 代币: ${article.symbol}`;
    }

    return message;
  }

  /**
   * 处理新文章
   * @param {Array} newArticles - 新文章列表
   */
  async handleNewArticles(newArticles) {
    if (newArticles.length === 0) {
      return;
    }

    this.logger.info(`🎯 [模拟模式] 发现 ${newArticles.length} 篇新文章`);

    for (const article of newArticles) {
      const formattedText = this.formatArticle(article);

      // 控制台输出
      console.log('\n' + '🌟'.repeat(25));
      console.log(formattedText);
      console.log('🌟'.repeat(25) + '\n');

      // 记录到日志
      this.logger.info('[模拟] 新文章通知:', {
        id: article.id,
        title: article.title,
        releaseDate: article.releaseDate,
        symbol: article.symbol
      });

      // 发送到微信群
      await this.sendToWechatGroups(formattedText);

      // 缓存文章信息
      this.cache.set(`article:${article.id}`, article);
    }
  }

  /**
   * 发送消息到微信群
   * @param {string} message - 要发送的消息
   */
  async sendToWechatGroups(message) {
    if (!this.bot) {
      this.logger.debug('[模拟模式] 未设置微信机器人实例，跳过发送');
      return;
    }

    try {
      // 如果指定了监控群聊，只发送到这些群
      if (this.monitorRooms && this.monitorRooms.length > 0) {
        for (const roomName of this.monitorRooms) {
          const room = await this.bot.Room.find({ topic: roomName });
          if (room) {
            await room.say(message);
            this.logger.info(`[模拟模式] 已发送币安公告到群聊: ${roomName}`);
          } else {
            this.logger.warn(`[模拟模式] 未找到群聊: ${roomName}`);
          }
        }
      } else {
        // 否则发送到所有群聊
        const rooms = await this.bot.Room.findAll();
        for (const room of rooms) {
          const topic = await room.topic();
          await room.say(message);
          this.logger.info(`[模拟模式] 已发送币安公告到群聊: ${topic}`);
        }
      }
    } catch (error) {
      this.logger.error('[模拟模式] 发送消息到微信群失败:', {
        error: error.message,
        stack: error.stack
      });
    }
  }

  /**
   * 执行一次检查
   */
  async checkOnce() {
    try {
      this.logger.debug('[模拟模式] 开始检查币安公告...');

      const articles = await this.fetchArticles();
      const newArticles = this.detectNewArticles(articles);

      await this.handleNewArticles(newArticles);

      this.logger.debug(`[模拟模式] 检查完成，当前已知文章数: ${this.knownArticles.size}`);
    } catch (error) {
      this.logger.error('[模拟模式] 检查币安公告时出错:', {
        error: error.message
      });
    }
  }

  /**
   * 启动监控
   */
  async start() {
    if (this.intervalId) {
      this.logger.warn('[模拟模式] 监控已在运行中');
      return;
    }

    console.log('\n' + '='.repeat(60));
    console.log('🎯 启动币安公告监控服务【模拟模式】');
    console.log('📝 说明: 由于网络原因，使用模拟数据进行测试');
    console.log('📝 模拟规则: 10%概率生成新的上币公告');
    console.log('='.repeat(60) + '\n');

    this.logger.info('[模拟模式] 启动币安公告监控服务...');

    // 立即执行一次检查
    await this.checkOnce();

    // 设置定时器
    this.intervalId = setInterval(() => {
      this.checkOnce();
    }, this.checkInterval);

    this.logger.info(`[模拟模式] 币安公告监控已启动，检查间隔: ${this.checkInterval/1000}秒`);
  }

  /**
   * 停止监控
   */
  stop() {
    if (!this.intervalId) {
      this.logger.warn('[模拟模式] 监控未在运行');
      return;
    }

    clearInterval(this.intervalId);
    this.intervalId = null;
    this.logger.info('[模拟模式] 币安公告监控已停止');
  }

  /**
   * 重置已知文章列表
   */
  reset() {
    this.knownArticles.clear();
    this.isFirstRun = true;
    this.mockArticleCounter = 0;
    this.logger.info('[模拟模式] 已重置文章列表');
  }

  /**
   * 获取监控状态
   * @returns {Object} 状态信息
   */
  getStatus() {
    return {
      mode: 'mock',
      isRunning: !!this.intervalId,
      knownArticlesCount: this.knownArticles.size,
      checkInterval: this.checkInterval,
      isFirstRun: this.isFirstRun,
      mockArticleCounter: this.mockArticleCounter
    };
  }

  /**
   * 设置检查间隔
   * @param {number} interval - 间隔时间（毫秒）
   */
  setCheckInterval(interval) {
    if (interval < 1000) {
      throw new Error('检查间隔不能小于1秒');
    }

    this.checkInterval = interval;

    // 如果正在运行，重启以应用新的间隔
    if (this.intervalId) {
      this.stop();
      this.start();
    }

    this.logger.info(`[模拟模式] 检查间隔已更新为: ${interval/1000}秒`);
  }

  /**
   * 手动触发一个新文章（用于测试）
   */
  async triggerNewArticle() {
    const newArticle = this.generateMockArticle();
    await this.handleNewArticles([newArticle]);
    return newArticle;
  }
}

export default BinanceMonitorMock;