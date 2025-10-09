// PM2 配置文件
module.exports = {
  apps: [{
    name: 'wx-bot',
    script: './src/index.js',
    instances: 1,
    autorestart: true,
    watch: false,
    max_memory_restart: '1G',
    env: {
      NODE_ENV: 'production'
    },
    error_file: './logs/error.log',
    out_file: './logs/out.log',
    log_file: './logs/combined.log',
    time: true,
    merge_logs: true,

    // 崩溃重启策略
    min_uptime: '10s',
    max_restarts: 10,
    restart_delay: 4000,

    // 优雅关闭
    kill_timeout: 5000,
    wait_ready: true,

    // 监控文件变化（开发环境）
    env_development: {
      NODE_ENV: 'development',
      watch: ['src', '.env'],
      watch_delay: 1000,
      ignore_watch: ['node_modules', 'logs', '.wechaty'],
    }
  }],

  // 部署配置（可选）
  deploy: {
    production: {
      user: 'ubuntu',
      host: 'YOUR_SERVER_IP',
      ref: 'origin/main',
      repo: 'https://github.com/YOUR_USERNAME/wx_bot.git',
      path: '/home/ubuntu/apps/wx_bot',
      'post-deploy': 'npm install && pm2 reload ecosystem.config.js --env production',
      'pre-deploy-local': '',
      env: {
        NODE_ENV: 'production'
      }
    }
  }
};