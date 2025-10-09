import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

/**
 * 简单的日志系统
 */
class Logger {
  constructor(config = {}) {
    this.level = config.level || 'info';
    this.toFile = config.toFile || false;
    this.filePath = config.filePath || path.join(__dirname, '../../logs/bot.log');

    this.levels = {
      debug: 0,
      info: 1,
      warn: 2,
      error: 3
    };

    if (this.toFile) {
      this.ensureLogDirectory();
    }
  }

  ensureLogDirectory() {
    const dir = path.dirname(this.filePath);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
  }

  shouldLog(level) {
    return this.levels[level] >= this.levels[this.level];
  }

  formatMessage(level, message, meta = {}) {
    const timestamp = new Date().toISOString();
    const levelStr = level.toUpperCase().padEnd(5);

    let logMessage = `[${timestamp}] [${levelStr}] ${message}`;

    if (Object.keys(meta).length > 0) {
      logMessage += ` | ${JSON.stringify(meta)}`;
    }

    return logMessage;
  }

  writeToFile(message) {
    if (!this.toFile) return;

    try {
      fs.appendFileSync(this.filePath, message + '\n', 'utf8');
    } catch (error) {
      console.error('写入日志文件失败:', error.message);
    }
  }

  log(level, message, meta = {}) {
    if (!this.shouldLog(level)) return;

    const formattedMessage = this.formatMessage(level, message, meta);

    // 输出到控制台
    switch (level) {
      case 'error':
        console.error(formattedMessage);
        break;
      case 'warn':
        console.warn(formattedMessage);
        break;
      default:
        console.log(formattedMessage);
    }

    // 写入文件
    this.writeToFile(formattedMessage);
  }

  debug(message, meta) {
    this.log('debug', message, meta);
  }

  info(message, meta) {
    this.log('info', message, meta);
  }

  warn(message, meta) {
    this.log('warn', message, meta);
  }

  error(message, meta) {
    this.log('error', message, meta);
  }
}

// 创建默认logger实例
let defaultLogger = null;

export function createLogger(config) {
  defaultLogger = new Logger(config);
  return defaultLogger;
}

export function getLogger() {
  if (!defaultLogger) {
    defaultLogger = new Logger();
  }
  return defaultLogger;
}

export default Logger;