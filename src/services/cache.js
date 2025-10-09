/**
 * 缓存服务
 */
class CacheService {
  constructor(options = {}) {
    this.maxSize = options.maxSize || 1000;
    this.defaultTTL = options.defaultTTL || 3600000; // 默认1小时
    this.cache = new Map();
    this.accessOrder = []; // 用于LRU策略
  }

  /**
   * 获取缓存值
   * @param {string} key - 缓存键
   * @returns {any|null} 缓存值或null
   */
  get(key) {
    const item = this.cache.get(key);

    if (!item) {
      return null;
    }

    // 检查是否过期
    if (item.expireAt && Date.now() > item.expireAt) {
      this.delete(key);
      return null;
    }

    // 更新访问顺序（LRU）
    this.updateAccessOrder(key);

    return item.value;
  }

  /**
   * 设置缓存值
   * @param {string} key - 缓存键
   * @param {any} value - 缓存值
   * @param {number} ttl - 过期时间（毫秒）
   */
  set(key, value, ttl = null) {
    // 如果缓存已满，使用LRU策略移除最少访问的项
    if (this.cache.size >= this.maxSize && !this.cache.has(key)) {
      this.evictLRU();
    }

    const expireAt = ttl ? Date.now() + ttl : Date.now() + this.defaultTTL;

    this.cache.set(key, {
      value,
      expireAt,
      createdAt: Date.now()
    });

    this.updateAccessOrder(key);
  }

  /**
   * 删除缓存项
   * @param {string} key - 缓存键
   * @returns {boolean} 是否删除成功
   */
  delete(key) {
    const index = this.accessOrder.indexOf(key);
    if (index > -1) {
      this.accessOrder.splice(index, 1);
    }
    return this.cache.delete(key);
  }

  /**
   * 检查缓存中是否存在键
   * @param {string} key - 缓存键
   * @returns {boolean}
   */
  has(key) {
    const item = this.cache.get(key);

    if (!item) {
      return false;
    }

    // 检查是否过期
    if (item.expireAt && Date.now() > item.expireAt) {
      this.delete(key);
      return false;
    }

    return true;
  }

  /**
   * 清空缓存
   */
  clear() {
    this.cache.clear();
    this.accessOrder = [];
  }

  /**
   * 更新访问顺序（LRU）
   * @param {string} key - 缓存键
   */
  updateAccessOrder(key) {
    const index = this.accessOrder.indexOf(key);
    if (index > -1) {
      this.accessOrder.splice(index, 1);
    }
    this.accessOrder.push(key);
  }

  /**
   * 移除最少使用的缓存项
   */
  evictLRU() {
    if (this.accessOrder.length > 0) {
      const keyToRemove = this.accessOrder[0];
      this.delete(keyToRemove);
    }
  }

  /**
   * 清理过期缓存
   */
  cleanExpired() {
    const now = Date.now();
    const keysToDelete = [];

    for (const [key, item] of this.cache.entries()) {
      if (item.expireAt && now > item.expireAt) {
        keysToDelete.push(key);
      }
    }

    keysToDelete.forEach(key => this.delete(key));

    return keysToDelete.length;
  }

  /**
   * 获取缓存统计信息
   * @returns {Object}
   */
  getStats() {
    return {
      size: this.cache.size,
      maxSize: this.maxSize,
      usage: `${((this.cache.size / this.maxSize) * 100).toFixed(2)}%`
    };
  }

  /**
   * 获取缓存项的剩余TTL
   * @param {string} key - 缓存键
   * @returns {number|null} 剩余时间（毫秒）或null
   */
  getTTL(key) {
    const item = this.cache.get(key);

    if (!item || !item.expireAt) {
      return null;
    }

    const ttl = item.expireAt - Date.now();
    return ttl > 0 ? ttl : 0;
  }
}

export default CacheService;