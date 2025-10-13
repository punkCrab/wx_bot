import { TwitterApi } from 'twitter-api-v2';
import logger from '../utils/logger.js';

/**
 * Twitter API v2 监控服务
 * 使用官方 Twitter API v2 监控指定用户的推文
 */
class TwitterMonitorV2 {
  constructor(config = {}) {
    // Twitter API 配置
    this.bearerToken = config.bearerToken || process.env.TWITTER_BEARER_TOKEN;

    // 监控配置
    this.twitterUsername = config.username || process.env.TWITTER_USERNAME || 'tradfinews';
    this.checkInterval = parseInt(config.checkInterval || process.env.TWITTER_CHECK_INTERVAL || 60000);
    this.monitorRooms = config.monitorRooms || this.parseMonitorRooms(process.env.TWITTER_MONITOR_ROOMS);

    // 内部状态
    this.isRunning = false;
    this.intervalId = null;
    this.bot = null;
    this.userId = null; // Twitter用户ID
    this.knownTweets = new Set(); // 已知推文ID集合
    this.lastTweetId = null; // 最新推文ID（用于分页）
    this.isFirstRun = true; // 首次运行标志

    // Twitter客户端
    this.client = null;

    this.logger = logger;
  }

  /**
   * 解析监控房间配置
   */
  parseMonitorRooms(roomsStr) {
    if (!roomsStr) return null;
    return roomsStr.split(',').map(r => r.trim()).filter(r => r);
  }

  /**
   * 初始化 Twitter 客户端
   */
  async initializeClient() {
    if (!this.bearerToken) {
      throw new Error('未配置 TWITTER_BEARER_TOKEN，请在 .env 文件中设置');
    }

    try {
      this.client = new TwitterApi(this.bearerToken);

      // 获取用户信息
      const user = await this.client.v2.userByUsername(this.twitterUsername);

      if (!user.data) {
        throw new Error(`未找到推特用户: @${this.twitterUsername}`);
      }

      this.userId = user.data.id;
      this.logger.info(`Twitter API 初始化成功: @${this.twitterUsername} (ID: ${this.userId})`);

      return true;
    } catch (error) {
      this.logger.error('Twitter API 初始化失败', { error: error.message });
      throw error;
    }
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

    try {
      // 初始化客户端
      await this.initializeClient();

      this.isRunning = true;
      this.logger.info(`开始监控 @${this.twitterUsername}，检查间隔: ${this.checkInterval / 1000}秒`);

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

    } catch (error) {
      this.isRunning = false;
      this.logger.error('启动Twitter监控失败', { error: error.message });
      throw error;
    }
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
   * 获取用户最新推文（使用 Twitter API v2）
   */
  async fetchTweets() {
    try {
      const options = {
        max_results: 10,
        'tweet.fields': ['created_at', 'public_metrics'],
        exclude: ['retweets', 'replies'], // 排除转推和回复
      };

      // 如果有最新推文ID，使用 since_id 只获取更新的推文
      if (this.lastTweetId) {
        options.since_id = this.lastTweetId;
      }

      const response = await this.client.v2.userTimeline(this.userId, options);

      if (!response.data || response.data.data.length === 0) {
        return [];
      }

      const tweets = response.data.data.map(tweet => ({
        id: tweet.id,
        text: tweet.text,
        createdAt: new Date(tweet.created_at),
        url: `https://twitter.com/${this.twitterUsername}/status/${tweet.id}`,
        likes: tweet.public_metrics?.like_count || 0,
        retweets: tweet.public_metrics?.retweet_count || 0,
      }));

      // 更新最新推文ID
      if (tweets.length > 0) {
        this.lastTweetId = tweets[0].id;
      }

      return tweets;

    } catch (error) {
      // 处理速率限制
      if (error.code === 429) {
        this.logger.warn('Twitter API 速率限制，将在下次重试');
        const resetTime = error.rateLimit?.reset;
        if (resetTime) {
          const waitSeconds = Math.ceil((resetTime * 1000 - Date.now()) / 1000);
          this.logger.warn(`速率限制将在 ${waitSeconds} 秒后重置`);
        }
        return [];
      }

      // 处理认证错误
      if (error.code === 401 || error.code === 403) {
        this.logger.error('Twitter API 认证失败，请检查 Bearer Token');
        return [];
      }

      this.logger.error('获取推文失败', {
        error: error.message,
        code: error.code
      });
      return [];
    }
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
      `📝 ${tweet.text}`,
      '',
      `🕐 ${tweet.createdAt.toLocaleString('zh-CN', { timeZone: 'Asia/Shanghai' })}`,
    ];

    // 添加互动数据
    if (tweet.likes > 0 || tweet.retweets > 0) {
      lines.push(`❤️ ${tweet.likes} 👥 ${tweet.retweets}`);
    }

    lines.push(`🔗 ${tweet.url}`);

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
      userId: this.userId,
      lastTweetId: this.lastTweetId,
      apiMethod: 'Twitter API v2 (Official)',
    };
  }

  /**
   * 休眠工具函数
   */
  sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

export default TwitterMonitorV2;
