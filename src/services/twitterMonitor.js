import axios from 'axios';
import { getLogger } from '../utils/logger.js';
import CacheService from './cache.js';

/**
 * 推特监控服务
 * 监控指定推特账号的推文
 *
 * 方案说明：
 * 1. 使用nitter公共实例获取RSS（如果可用）
 * 2. 备用方案：通过公开API获取
 * 3. 最终备用：使用RSS.app等第三方服务
 */
class TwitterMonitor {
  constructor(bot = null, monitorRooms = null) {
    this.logger = getLogger();
    this.bot = bot; // 微信机器人实例
    this.monitorRooms = monitorRooms; // 要发送推文的群聊列表
    this.checkInterval = parseInt(process.env.TWITTER_CHECK_INTERVAL) || 60000; // 默认1分钟检查一次
    this.intervalId = null;

    // 监控的推特账号
    this.twitterUsername = process.env.TWITTER_USERNAME || 'tradfinews';

    // Nitter实例列表（公共实例）
    this.nitterInstances = [
      'https://nitter.net',
      'https://nitter.poast.org',
      'https://nitter.privacydev.net',
      'https://nitter.1d4.us'
    ];
    this.currentNitterIndex = 0;

    // 缓存已知的推文ID，避免重复通知
    this.knownTweets = new Set();
    this.isFirstRun = true; // 首次运行标记，避免启动时发送历史推文

    // 推文缓存服务
    this.cache = new CacheService({
      maxSize: 200,
      defaultTTL: 86400000 // 24小时
    });
  }

  /**
   * 获取当前使用的Nitter实例
   */
  getCurrentNitterUrl() {
    return this.nitterInstances[this.currentNitterIndex];
  }

  /**
   * 切换到下一个Nitter实例
   */
  switchToNextNitter() {
    this.currentNitterIndex = (this.currentNitterIndex + 1) % this.nitterInstances.length;
    this.logger.info(`切换到Nitter实例: ${this.getCurrentNitterUrl()}`);
  }

  /**
   * 获取推特推文（通过Nitter RSS）
   * @returns {Promise<Array>} 推文列表
   */
  async fetchTweets() {
    let lastError = null;

    // 尝试所有Nitter实例
    for (let attempt = 0; attempt < this.nitterInstances.length; attempt++) {
      try {
        const nitterUrl = this.getCurrentNitterUrl();
        const rssUrl = `${nitterUrl}/${this.twitterUsername}/rss`;

        this.logger.debug(`尝试获取推文: ${rssUrl}`);

        const response = await axios.get(rssUrl, {
          headers: {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
          },
          timeout: 15000,
          validateStatus: (status) => status >= 200 && status < 500
        });

        if (response.status === 200 && response.data) {
          // 解析RSS XML
          const tweets = this.parseRSS(response.data);
          if (tweets.length > 0) {
            this.logger.info(`成功获取 ${tweets.length} 条推文`);
            return tweets;
          }
        }

        // 如果当前实例失败，尝试下一个
        this.switchToNextNitter();
      } catch (error) {
        lastError = error;
        this.logger.warn(`Nitter实例失败: ${this.getCurrentNitterUrl()}`, {
          error: error.message
        });
        this.switchToNextNitter();
      }
    }

    // 所有实例都失败
    this.logger.error('所有Nitter实例都无法访问', {
      error: lastError?.message
    });
    return [];
  }

  /**
   * 解析RSS XML
   * @param {string} xml - RSS XML内容
   * @returns {Array} 推文列表
   */
  parseRSS(xml) {
    const tweets = [];

    try {
      // 简单的XML解析（提取item标签）
      const itemRegex = /<item>([\s\S]*?)<\/item>/g;
      const items = xml.match(itemRegex) || [];

      for (const item of items.slice(0, 10)) { // 只取前10条
        const titleMatch = item.match(/<title><!\[CDATA\[(.*?)\]\]><\/title>/);
        const linkMatch = item.match(/<link>(.*?)<\/link>/);
        const pubDateMatch = item.match(/<pubDate>(.*?)<\/pubDate>/);
        const descriptionMatch = item.match(/<description><!\[CDATA\[(.*?)\]\]><\/description>/);

        if (titleMatch && linkMatch) {
          // 从链接中提取推文ID
          const linkParts = linkMatch[1].split('#m');
          const tweetId = linkParts.length > 1 ? linkParts[1] : linkMatch[1].split('/').pop();

          tweets.push({
            id: tweetId,
            title: titleMatch[1],
            link: linkMatch[1],
            pubDate: pubDateMatch ? new Date(pubDateMatch[1]) : new Date(),
            description: descriptionMatch ? descriptionMatch[1] : '',
            username: this.twitterUsername
          });
        }
      }
    } catch (error) {
      this.logger.error('解析RSS失败:', {
        error: error.message
      });
    }

    return tweets;
  }

  /**
   * 检查新推文
   * @param {Array} tweets - 推文列表
   * @returns {Array} 新推文列表
   */
  detectNewTweets(tweets) {
    const newTweets = [];

    for (const tweet of tweets) {
      // 检查是否是新推文
      if (!this.knownTweets.has(tweet.id)) {
        this.knownTweets.add(tweet.id);

        // 如果不是首次运行，则标记为新推文
        if (!this.isFirstRun) {
          newTweets.push(tweet);
        }
      }
    }

    // 首次运行完成后，设置标记为false
    if (this.isFirstRun) {
      this.isFirstRun = false;
      this.logger.info(`初始化完成，已记录 ${this.knownTweets.size} 条历史推文`);
    }

    return newTweets;
  }

  /**
   * 格式化推文信息
   * @param {Object} tweet - 推文对象
   * @returns {string} 格式化后的文本
   */
  formatTweet(tweet) {
    const time = tweet.pubDate.toLocaleString('zh-CN');
    const cleanTitle = tweet.title.replace(/^RT by @\w+: /, ''); // 移除RT前缀

    let message = `🐦 【推特动态】@${tweet.username}\n`;
    message += `📝 ${cleanTitle}\n`;
    message += `🕐 ${time}\n`;
    message += `🔗 ${tweet.link}`;

    return message;
  }

  /**
   * 处理新推文
   * @param {Array} newTweets - 新推文列表
   */
  async handleNewTweets(newTweets) {
    if (newTweets.length === 0) {
      return;
    }

    this.logger.info(`发现 ${newTweets.length} 条新推文`);

    for (const tweet of newTweets) {
      const formattedText = this.formatTweet(tweet);

      // 控制台输出
      console.log('\n' + '='.repeat(50));
      console.log(formattedText);
      console.log('='.repeat(50) + '\n');

      // 记录到日志
      this.logger.info('新推文通知:', {
        id: tweet.id,
        username: tweet.username,
        title: tweet.title.substring(0, 100)
      });

      // 发送到微信群
      await this.sendToWechatGroups(formattedText);

      // 缓存推文信息
      this.cache.set(`tweet:${tweet.id}`, tweet);
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
            this.logger.info(`已发送推特动态到群聊: ${roomName}`);
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
          this.logger.info(`已发送推特动态到群聊: ${topic}`);
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
      this.logger.debug('开始检查推特动态...');

      const tweets = await this.fetchTweets();
      const newTweets = this.detectNewTweets(tweets);

      await this.handleNewTweets(newTweets);

      this.logger.debug(`检查完成，当前已知推文数: ${this.knownTweets.size}`);
    } catch (error) {
      this.logger.error('检查推特动态时出错:', {
        error: error.message
      });
    }
  }

  /**
   * 启动监控
   */
  async start() {
    if (this.intervalId) {
      this.logger.warn('推特监控已在运行中');
      return;
    }

    this.logger.info('启动推特监控服务...');
    this.logger.info(`监控账号: @${this.twitterUsername}`);

    // 立即执行一次检查
    await this.checkOnce();

    // 设置定时器
    this.intervalId = setInterval(() => {
      this.checkOnce();
    }, this.checkInterval);

    this.logger.info(`推特监控已启动，检查间隔: ${this.checkInterval/1000}秒`);
  }

  /**
   * 停止监控
   */
  stop() {
    if (!this.intervalId) {
      this.logger.warn('推特监控未在运行');
      return;
    }

    clearInterval(this.intervalId);
    this.intervalId = null;
    this.logger.info('推特监控已停止');
  }

  /**
   * 重置已知推文列表
   */
  reset() {
    this.knownTweets.clear();
    this.isFirstRun = true;
    this.logger.info('已重置推文列表');
  }

  /**
   * 获取监控状态
   * @returns {Object} 状态信息
   */
  getStatus() {
    return {
      isRunning: !!this.intervalId,
      knownTweetsCount: this.knownTweets.size,
      checkInterval: this.checkInterval,
      isFirstRun: this.isFirstRun,
      username: this.twitterUsername,
      currentNitter: this.getCurrentNitterUrl()
    };
  }

  /**
   * 设置检查间隔
   * @param {number} interval - 间隔时间（毫秒）
   */
  setCheckInterval(interval) {
    if (interval < 30000) {
      throw new Error('检查间隔不能小于30秒');
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

export default TwitterMonitor;