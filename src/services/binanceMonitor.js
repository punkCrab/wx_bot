import axios from 'axios';
import { getLogger } from '../utils/logger.js';
import CacheService from './cache.js';

/**
 * 币安公告监控服务
 * 监控币安上币公告，检测新文章
 */
class BinanceMonitor {
  constructor(bot = null, monitorRooms = null) {
    this.logger = getLogger();
    this.bot = bot; // 微信机器人实例
    this.monitorRooms = monitorRooms; // 要发送公告的群聊列表
    this.apiUrl = 'https://www.binance.com/bapi/apex/v1/public/apex/cms/article/list/query';
    this.checkInterval = parseInt(process.env.BINANCE_CHECK_INTERVAL) || 5000; // 检查间隔
    this.intervalId = null;

    // 缓存已知的文章ID，避免重复通知
    this.knownArticles = new Set();
    this.isFirstRun = true; // 首次运行标记，避免启动时发送历史文章

    // 文章缓存服务
    this.cache = new CacheService({
      maxSize: 100,
      defaultTTL: 86400000 // 24小时
    });
  }

  /**
   * 获取币安公告列表
   * @returns {Promise<Array>} 文章列表
   */
  async fetchArticles() {
    try {
      const response = await axios.get(this.apiUrl, {
        params: {
          type: 1,
          pageNo: 1,
          pageSize: 5,
          catalogId: 48
        },
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
          'Accept': 'application/json',
          'Accept-Language': 'zh-CN,zh;q=0.9,en;q=0.8'
        },
        timeout: 10000
      });

      if (response.data && response.data.success && response.data.data) {
        // API响应格式: data.catalogs[0].articles
        const catalogs = response.data.data.catalogs || [];
        if (catalogs.length > 0 && catalogs[0].articles) {
          return catalogs[0].articles;
        }
      }

      return [];
    } catch (error) {
      this.logger.error('获取币安公告失败:', {
        error: error.message,
        status: error.response?.status,
        data: error.response?.data,
        code: error.code,
        url: this.apiUrl
      });
      throw error;
    }
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
      this.logger.info(`初始化完成，已记录 ${this.knownArticles.size} 篇文章`);
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

    return `📢 【币安公告】\n📝 ${title}\n🕐 ${releaseDate}`;
  }

  /**
   * 处理新文章
   * @param {Array} newArticles - 新文章列表
   */
  async handleNewArticles(newArticles) {
    if (newArticles.length === 0) {
      return;
    }

    this.logger.info(`发现 ${newArticles.length} 篇新文章`);

    for (const article of newArticles) {
      const formattedText = this.formatArticle(article);

      // 控制台输出
      console.log('\n' + '='.repeat(50));
      console.log(formattedText);
      console.log('='.repeat(50) + '\n');

      // 记录到日志
      this.logger.info('新文章通知:', {
        id: article.id,
        title: article.title,
        releaseDate: article.releaseDate
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
      this.logger.debug('未设置微信机器人实例，跳过发送');
      return;
    }

    try {
      // 如果指定了监控群聊，只发送到这些群
      if (this.monitorRooms && this.monitorRooms.length > 0) {
        for (const roomName of this.monitorRooms) {
          const room = await this.bot.Room.find({ topic: roomName });
          if (room) {
            await room.say(message);
            this.logger.info(`已发送币安公告到群聊: ${roomName}`);
          } else {
            this.logger.warn(`未找到群聊: ${roomName}`);
          }
        }
      } else {
        // 否则发送到所有群聊
        const rooms = await this.bot.Room.findAll();
        for (const room of rooms) {
          const topic = await room.topic();
          await room.say(message);
          this.logger.info(`已发送币安公告到群聊: ${topic}`);
        }
      }
    } catch (error) {
      this.logger.error('发送消息到微信群失败:', {
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
      this.logger.debug('开始检查币安公告...');

      const articles = await this.fetchArticles();
      const newArticles = this.detectNewArticles(articles);

      await this.handleNewArticles(newArticles);

      this.logger.debug(`检查完成，当前已知文章数: ${this.knownArticles.size}`);
    } catch (error) {
      this.logger.error('检查币安公告时出错:', {
        error: error.message
      });
    }
  }

  /**
   * 启动监控
   */
  async start() {
    if (this.intervalId) {
      this.logger.warn('监控已在运行中');
      return;
    }

    this.logger.info('启动币安公告监控服务...');

    // 立即执行一次检查
    await this.checkOnce();

    // 设置定时器
    this.intervalId = setInterval(() => {
      this.checkOnce();
    }, this.checkInterval);

    this.logger.info(`币安公告监控已启动，检查间隔: ${this.checkInterval/1000}秒`);
  }

  /**
   * 停止监控
   */
  stop() {
    if (!this.intervalId) {
      this.logger.warn('监控未在运行');
      return;
    }

    clearInterval(this.intervalId);
    this.intervalId = null;
    this.logger.info('币安公告监控已停止');
  }

  /**
   * 重置已知文章列表
   */
  reset() {
    this.knownArticles.clear();
    this.isFirstRun = true;
    this.logger.info('已重置文章列表');
  }

  /**
   * 获取监控状态
   * @returns {Object} 状态信息
   */
  getStatus() {
    return {
      isRunning: !!this.intervalId,
      knownArticlesCount: this.knownArticles.size,
      checkInterval: this.checkInterval,
      isFirstRun: this.isFirstRun
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

    this.logger.info(`检查间隔已更新为: ${interval/1000}秒`);
  }
}

export default BinanceMonitor;