import qrcode from 'qrcode-terminal';
import QRCode from 'qrcode';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

/**
 * 二维码处理工具
 */
export class QRCodeHandler {
  /**
   * 在终端显示二维码（适用于Ubuntu SSH）
   * @param {string} qrcodeData - 二维码数据
   */
  static showInTerminal(qrcodeData) {
    console.log('\n============ 微信登录二维码 ============\n');
    qrcode.generate(qrcodeData, { small: true }, (qrcode) => {
      console.log(qrcode);
    });
    console.log('\n=========================================\n');
  }

  /**
   * 生成二维码图片文件
   * @param {string} qrcodeData - 二维码数据
   * @param {string} filename - 文件名
   * @returns {Promise<string>} 文件路径
   */
  static async generateImage(qrcodeData, filename = 'qrcode.png') {
    const qrDir = path.join(__dirname, '../../qrcodes');

    // 创建目录
    if (!fs.existsSync(qrDir)) {
      fs.mkdirSync(qrDir, { recursive: true });
    }

    const filepath = path.join(qrDir, filename);

    try {
      await QRCode.toFile(filepath, qrcodeData, {
        width: 300,
        margin: 2
      });

      console.log(`\n✅ 二维码已保存到: ${filepath}`);
      return filepath;
    } catch (error) {
      console.error('生成二维码图片失败:', error);
      throw error;
    }
  }

  /**
   * 生成HTML页面显示二维码
   * @param {string} qrcodeData - 二维码数据
   * @returns {Promise<string>} HTML文件路径
   */
  static async generateHTML(qrcodeData) {
    const qrDir = path.join(__dirname, '../../qrcodes');

    if (!fs.existsSync(qrDir)) {
      fs.mkdirSync(qrDir, { recursive: true });
    }

    const qrDataURL = await QRCode.toDataURL(qrcodeData);
    const htmlContent = `
<!DOCTYPE html>
<html>
<head>
    <title>微信机器人登录</title>
    <meta charset="utf-8">
    <meta http-equiv="refresh" content="30">
    <style>
        body {
            display: flex;
            justify-content: center;
            align-items: center;
            min-height: 100vh;
            margin: 0;
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            font-family: Arial, sans-serif;
        }
        .container {
            background: white;
            padding: 40px;
            border-radius: 20px;
            box-shadow: 0 20px 60px rgba(0,0,0,0.3);
            text-align: center;
        }
        h1 {
            color: #333;
            margin-bottom: 20px;
        }
        .qrcode {
            padding: 20px;
            background: #f8f9fa;
            border-radius: 10px;
            display: inline-block;
        }
        .tips {
            margin-top: 20px;
            color: #666;
            font-size: 14px;
        }
        .status {
            margin-top: 15px;
            padding: 10px;
            background: #e7f3ff;
            border-radius: 5px;
            color: #0066cc;
        }
    </style>
</head>
<body>
    <div class="container">
        <h1>🤖 微信机器人登录</h1>
        <div class="qrcode">
            <img src="${qrDataURL}" alt="登录二维码">
        </div>
        <div class="tips">
            <p>📱 请使用微信扫描上方二维码登录</p>
            <p>⏱️ 页面每30秒自动刷新</p>
        </div>
        <div class="status">
            生成时间: ${new Date().toLocaleString('zh-CN')}
        </div>
    </div>
</body>
</html>`;

    const htmlPath = path.join(qrDir, 'login.html');
    fs.writeFileSync(htmlPath, htmlContent);

    console.log(`\n🌐 二维码网页已生成: ${htmlPath}`);
    return htmlPath;
  }

  /**
   * 获取网络访问URL
   * @param {number} port - 端口号
   * @returns {string[]} 访问URL列表
   */
  static getNetworkUrls(port = 3000) {
    const os = require('os');
    const interfaces = os.networkInterfaces();
    const urls = [];

    for (const name of Object.keys(interfaces)) {
      for (const iface of interfaces[name]) {
        // 跳过内部地址
        if (iface.internal) continue;

        if (iface.family === 'IPv4') {
          urls.push(`http://${iface.address}:${port}/qrcode`);
        }
      }
    }

    return urls;
  }
}

export default QRCodeHandler;