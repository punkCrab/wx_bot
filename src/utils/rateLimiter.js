/**
 * 速率限制器
 */
class RateLimiter {
  constructor(maxRequestsPerMinute = 30) {
    this.maxRequestsPerMinute = maxRequestsPerMinute;
    this.requests = [];
  }

  /**
   * 检查是否可以发送请求
   * @returns {boolean}
   */
  canMakeRequest() {
    this.cleanOldRequests();
    return this.requests.length < this.maxRequestsPerMinute;
  }

  /**
   * 记录一次请求
   */
  recordRequest() {
    this.requests.push(Date.now());
  }

  /**
   * 清理超过1分钟的请求记录
   */
  cleanOldRequests() {
    const oneMinuteAgo = Date.now() - 60000;
    this.requests = this.requests.filter(timestamp => timestamp > oneMinuteAgo);
  }

  /**
   * 获取到下次可用的等待时间（毫秒）
   * @returns {number}
   */
  getWaitTime() {
    this.cleanOldRequests();

    if (this.requests.length < this.maxRequestsPerMinute) {
      return 0;
    }

    // 找到最早的请求，计算需要等待的时间
    const oldestRequest = Math.min(...this.requests);
    const waitTime = 60000 - (Date.now() - oldestRequest);

    return Math.max(0, waitTime);
  }

  /**
   * 获取当前速率信息
   * @returns {Object}
   */
  getStatus() {
    this.cleanOldRequests();
    return {
      currentRequests: this.requests.length,
      maxRequests: this.maxRequestsPerMinute,
      available: this.maxRequestsPerMinute - this.requests.length
    };
  }

  /**
   * 重置速率限制器
   */
  reset() {
    this.requests = [];
  }
}

export default RateLimiter;