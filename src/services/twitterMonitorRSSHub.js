import axios from 'axios';
import { createLogger } from '../utils/logger.js';

/**
 * 推特监控服务 - RSSHub 版本
 * 使用 RSSHub 提供的 RSS 订阅获取推文
 * 优点：无需 API 密钥，稳定可靠，支持多种社交媒体
 */
class TwitterMonitorRSSHub {
  constructor(config = {}) {
    // RSSHub 实例列表（公共实例 + 自定义实例）
    this.rsshubInstances = config.rsshubInstances || this.parseRsshubInstances() || [
      'https://rsshub.app',
      'https://rss.shab.fun',
      'https://rsshub.rssforever.com',
    ];

    this.currentInstanceIndex = 0;

    // 监控配置
    this.twitterUsername = config.username || process.env.TWITTER_USERNAME || 'tradfinews';
    this.checkInterval = parseInt(config.checkInterval || process.env.TWITTER_CHECK_INTERVAL || 60000);
    this.monitorRooms = config.monitorRooms || this.parseMonitorRooms(process.env.TWITTER_MONITOR_ROOMS);

    // 内部状态
    this.isRunning = false;
    this.intervalId = null;
    this.bot = null;
    this.knownTweets = new Set(); // 已知推文ID集合
    this.isFirstRun = true; // 首次运行标志

    this.logger = createLogger({ level: 'info' });
  }

  /**
   * 解析 RSSHub 实例列表
   */
  parseRsshubInstances() {
    const instances = process.env.RSSHUB_INSTANCES;
    if (!instances) return null;
    return instances.split(',').map(s => s.trim()).filter(s => s);
  }

  /**
   * 解析监控房间配置
   */
  parseMonitorRooms(roomsStr) {
    if (!roomsStr) return null;
    return roomsStr.split(',').map(r => r.trim()).filter(r => r);
  }

  /**
   * 获取当前使用的 RSSHub 实例
   */
  getCurrentInstance() {
    return this.rsshubInstances[this.currentInstanceIndex];
  }

  /**
   * 切换到下一个 RSSHub 实例
   */
  switchToNextInstance() {
    this.currentInstanceIndex = (this.currentInstanceIndex + 1) % this.rsshubInstances.length;
    const nextInstance = this.getCurrentInstance();
    this.logger.info(`切换到 RSSHub 实例: ${nextInstance}`);
    return nextInstance;
  }

  /**
   * 设置微信机器人实例和监控房间
   */
  async setBotAndRooms(bot, monitorRooms) {
    this.bot = bot;

    // 如果没有单独配置 Twitter 监控房间，使用全局配置
    if (!this.monitorRooms && monitorRooms) {
      this.monitorRooms = monitorRooms;
    }

    this.logger.info('Twitter监控已设置微信机器人实例');

    if (this.monitorRooms && this.monitorRooms.length > 0) {
      this.logger.info(`Twitter监控将发送到指定群聊: ${this.monitorRooms.join(', ')}`);
    } else {
      this.logger.info('Twitter监控将发送到所有群聊');
    }
  }

  /**
   * 开始监控
   */
  async start() {
    if (this.isRunning) {
      this.logger.warn('Twitter监控已在运行中');
      return;
    }

    this.isRunning = true;
    this.logger.info(`开始监控 @${this.twitterUsername}，检查间隔: ${this.checkInterval / 1000}秒`);
    this.logger.info(`使用 RSSHub 实例: ${this.rsshubInstances.join(', ')}`);

    // 立即执行第一次检查
    await this.checkNewTweets();

    // 设置定时器
    this.intervalId = setInterval(async () => {
      try {
        await this.checkNewTweets();
      } catch (error) {
        this.logger.error('检查推文时出错', { error: error.message });
      }
    }, this.checkInterval);
  }

  /**
   * 停止监控
   */
  stop() {
    if (!this.isRunning) {
      return;
    }

    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
    }

    this.isRunning = false;
    this.logger.info('Twitter监控已停止');
  }

  /**
   * 检查新推文
   */
  async checkNewTweets() {
    try {
      const tweets = await this.fetchTweets();

      if (tweets.length === 0) {
        this.logger.debug('未获取到新推文');
        return;
      }

      const newTweets = this.detectNewTweets(tweets);

      if (newTweets.length > 0) {
        this.logger.info(`检测到 ${newTweets.length} 条新推文`);

        // 按时间顺序发送（从旧到新）
        for (const tweet of newTweets.reverse()) {
          const message = this.formatTweet(tweet);
          await this.sendToWechatGroups(message);

          // 避免发送太快
          await this.sleep(1000);
        }
      } else {
        this.logger.debug('没有新推文');
      }

    } catch (error) {
      this.logger.error('检查新推文失败', { error: error.message });
    }
  }

  /**
   * 从 RSSHub 获取推文
   */
  async fetchTweets() {
    // 尝试所有 RSSHub 实例
    for (let i = 0; i < this.rsshubInstances.length; i++) {
      const instance = this.getCurrentInstance();
      const rssUrl = `${instance}/twitter/user/${this.twitterUsername}`;

      try {
        this.logger.debug(`尝试获取推文: ${rssUrl}`);

        const response = await axios.get(rssUrl, {
          timeout: 10000,
          headers: {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
          },
          validateStatus: (status) => status >= 200 && status < 500
        });

        if (response.status !== 200) {
          this.logger.warn(`RSSHub 实例返回错误状态: ${response.status}`);
          this.switchToNextInstance();
          continue;
        }

        // 解析 RSS XML
        const tweets = this.parseRSS(response.data);

        if (tweets.length > 0) {
          this.logger.debug(`成功从 ${instance} 获取 ${tweets.length} 条推文`);
          return tweets;
        } else {
          this.logger.warn(`${instance} 返回了空内容`);
          this.switchToNextInstance();
          continue;
        }

      } catch (error) {
        this.logger.warn(`RSSHub 实例失败: ${instance}`, { error: error.message });
        this.switchToNextInstance();
        continue;
      }
    }

    // 所有实例都失败
    this.logger.error('所有 RSSHub 实例都无法访问');
    return [];
  }

  /**
   * 解析 RSS XML
   */
  parseRSS(xml) {
    const tweets = [];

    try {
      // 提取所有 <item> 标签
      const itemRegex = /<item>([\s\S]*?)<\/item>/g;
      const items = xml.match(itemRegex) || [];

      for (const item of items) {
        try {
          // 提取标题（推文内容）
          const titleMatch = item.match(/<title><!\[CDATA\[(.*?)\]\]><\/title>/);
          const title = titleMatch ? titleMatch[1] : '';

          // 提取链接
          const linkMatch = item.match(/<link>(.*?)<\/link>/);
          const link = linkMatch ? linkMatch[1] : '';

          // 提取发布时间
          const pubDateMatch = item.match(/<pubDate>(.*?)<\/pubDate>/);
          const pubDate = pubDateMatch ? new Date(pubDateMatch[1]) : new Date();

          // 提取描述（完整内容）
          const descMatch = item.match(/<description><!\[CDATA\[([\s\S]*?)\]\]><\/description>/);
          let description = descMatch ? descMatch[1] : '';

          // 从描述中提取纯文本（去除 HTML）
          description = description.replace(/<[^>]*>/g, '').trim();

          // 从链接中提取推文ID
          const idMatch = link.match(/status\/(\d+)/);
          const id = idMatch ? idMatch[1] : `${Date.now()}_${Math.random()}`;

          // 只处理原创推文（标题不以 RT @开头）
          if (title.startsWith('RT @')) {
            continue;
          }

          tweets.push({
            id,
            title: title || description,
            link,
            pubDate,
            description
          });

        } catch (error) {
          this.logger.warn('解析单个推文失败', { error: error.message });
        }
      }

    } catch (error) {
      this.logger.error('解析 RSS 失败', { error: error.message });
    }

    return tweets;
  }

  /**
   * 检测新推文
   */
  detectNewTweets(tweets) {
    if (this.isFirstRun) {
      // 首次运行，记录所有推文ID但不发送通知
      tweets.forEach(tweet => this.knownTweets.add(tweet.id));
      this.isFirstRun = false;
      this.logger.info(`初始化完成，已记录 ${tweets.length} 条历史推文`);
      return [];
    }

    const newTweets = tweets.filter(tweet => !this.knownTweets.has(tweet.id));

    // 记录新推文
    newTweets.forEach(tweet => this.knownTweets.add(tweet.id));

    // 限制缓存大小（保留最近1000条）
    if (this.knownTweets.size > 1000) {
      const tweetsArray = Array.from(this.knownTweets);
      this.knownTweets = new Set(tweetsArray.slice(-1000));
    }

    return newTweets;
  }

  /**
   * 格式化推文消息
   */
  formatTweet(tweet) {
    const lines = [
      `🐦 【推特动态】@${this.twitterUsername}`,
      '',
      `📝 ${tweet.title}`,
      '',
      `🕐 ${tweet.pubDate.toLocaleString('zh-CN', { timeZone: 'Asia/Shanghai' })}`,
      `🔗 ${tweet.link}`
    ];

    return lines.join('\n');
  }

  /**
   * 发送消息到微信群
   */
  async sendToWechatGroups(message) {
    if (!this.bot) {
      this.logger.warn('未设置微信机器人实例，消息将仅输出到控制台');
      console.log('\n' + '='.repeat(60));
      console.log(message);
      console.log('='.repeat(60) + '\n');
      return;
    }

    try {
      if (this.monitorRooms && this.monitorRooms.length > 0) {
        // 发送到指定群聊
        for (const roomName of this.monitorRooms) {
          try {
            const room = await this.bot.Room.find({ topic: roomName });
            if (room) {
              await room.say(message);
              this.logger.info(`推文已发送到群聊: ${roomName}`);
            } else {
              this.logger.warn(`未找到群聊: ${roomName}`);
            }
          } catch (error) {
            this.logger.error(`发送到群聊 ${roomName} 失败`, { error: error.message });
          }
        }
      } else {
        // 发送到所有群聊
        const rooms = await this.bot.Room.findAll();
        for (const room of rooms) {
          try {
            await room.say(message);
            const topic = await room.topic();
            this.logger.info(`推文已发送到群聊: ${topic}`);
          } catch (error) {
            this.logger.error('发送到群聊失败', { error: error.message });
          }
        }
      }
    } catch (error) {
      this.logger.error('发送微信消息失败', { error: error.message });
    }
  }

  /**
   * 获取监控状态
   */
  getStatus() {
    return {
      isRunning: this.isRunning,
      knownTweetsCount: this.knownTweets.size,
      checkInterval: this.checkInterval,
      isFirstRun: this.isFirstRun,
      username: this.twitterUsername,
      currentRsshubInstance: this.getCurrentInstance(),
      rsshubInstances: this.rsshubInstances,
      apiMethod: 'RSSHub',
    };
  }

  /**
   * 休眠工具函数
   */
  sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

export default TwitterMonitorRSSHub;
