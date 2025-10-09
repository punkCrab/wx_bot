import express from 'express';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

/**
 * 简单的Web服务器用于显示二维码
 */
export class QRCodeServer {
  constructor(port = 3000) {
    this.port = port;
    this.app = express();
    this.server = null;
    this.currentQRCode = null;
  }

  /**
   * 启动服务器
   */
  start() {
    // 静态文件服务
    const qrDir = path.join(__dirname, '../../qrcodes');
    this.app.use('/qrcodes', express.static(qrDir));

    // 主页路由
    this.app.get('/', (req, res) => {
      res.send(`
        <html>
          <head>
            <title>微信机器人控制面板</title>
            <style>
              body { font-family: Arial; padding: 20px; }
              .link { display: block; margin: 10px 0; }
            </style>
          </head>
          <body>
            <h1>🤖 微信机器人控制面板</h1>
            <div class="link">
              <a href="/qrcode">查看登录二维码</a>
            </div>
            <div class="link">
              <a href="/qrcodes/login.html">查看静态二维码页面</a>
            </div>
            <div class="link">
              <a href="/status">查看机器人状态</a>
            </div>
          </body>
        </html>
      `);
    });

    // 动态二维码路由
    this.app.get('/qrcode', (req, res) => {
      if (this.currentQRCode) {
        res.send(`
          <html>
            <head>
              <title>微信登录二维码</title>
              <meta http-equiv="refresh" content="5">
              <style>
                body {
                  display: flex;
                  justify-content: center;
                  align-items: center;
                  min-height: 100vh;
                  margin: 0;
                  background: #f0f2f5;
                }
                .container {
                  text-align: center;
                  background: white;
                  padding: 40px;
                  border-radius: 10px;
                  box-shadow: 0 2px 10px rgba(0,0,0,0.1);
                }
                pre {
                  background: #000;
                  color: #fff;
                  padding: 20px;
                  border-radius: 5px;
                  line-height: 1.2;
                  font-size: 10px;
                }
              </style>
            </head>
            <body>
              <div class="container">
                <h1>📱 请使用微信扫描登录</h1>
                <pre>${this.currentQRCode}</pre>
                <p>页面每5秒自动刷新</p>
              </div>
            </body>
          </html>
        `);
      } else {
        res.send(`
          <html>
            <body>
              <h1>等待生成二维码...</h1>
              <meta http-equiv="refresh" content="2">
            </body>
          </html>
        `);
      }
    });

    // 状态路由
    this.app.get('/status', (req, res) => {
      res.json({
        status: 'running',
        qrcode: this.currentQRCode ? 'available' : 'waiting',
        timestamp: new Date().toISOString()
      });
    });

    this.server = this.app.listen(this.port, '0.0.0.0', () => {
      console.log(`\n🌐 Web服务器已启动:`);
      console.log(`   本地访问: http://localhost:${this.port}`);

      // 获取所有网络接口的IP
      const os = require('os');
      const interfaces = os.networkInterfaces();

      for (const name of Object.keys(interfaces)) {
        for (const iface of interfaces[name]) {
          if (iface.family === 'IPv4' && !iface.internal) {
            console.log(`   网络访问: http://${iface.address}:${this.port}`);
          }
        }
      }

      console.log(`\n📱 在手机或电脑浏览器中访问上述地址查看二维码\n`);
    });
  }

  /**
   * 更新二维码
   * @param {string} qrcodeText - ASCII格式的二维码
   */
  updateQRCode(qrcodeText) {
    this.currentQRCode = qrcodeText;
  }

  /**
   * 停止服务器
   */
  stop() {
    if (this.server) {
      this.server.close(() => {
        console.log('Web服务器已停止');
      });
    }
  }
}

export default QRCodeServer;