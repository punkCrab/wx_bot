# Twitter API 快速设置指南

本指南帮助你在 **5分钟内** 完成 Twitter API 的申请和配置。

## 为什么选择 Twitter API v2？

✅ **最稳定** - 官方接口，长期可用
✅ **最准确** - 数据完整，无延迟
✅ **免费** - 个人使用完全够用（每月10,000条推文）
✅ **简单** - 申请快速，无需人工审核

---

## 步骤1：申请开发者账号（2分钟）

### 1.1 访问 Twitter Developer Portal

打开浏览器，访问：https://developer.twitter.com/

### 1.2 登录你的 Twitter 账号

使用你的 Twitter 账号登录（如果没有账号，先注册一个）

### 1.3 申请开发者访问权限

点击右上角的 **"Sign up"** 或 **"Apply"** 按钮

### 1.4 填写申请表单

选择以下选项：
- **Account type**: Hobbyist（业余爱好者）
- **Use case**: Making a bot（创建机器人）

填写基本信息：
- **App name**: 随意命名，如 "WeChat Notification Bot"
- **Description**: 简单描述，如 "A bot to monitor tweets and send notifications to WeChat"
- **What will you use the Twitter API for**:
  ```
  I want to monitor specific Twitter accounts for new tweets and
  send real-time notifications to WeChat groups. This is for
  personal use only.
  ```

**提示：** 不需要写得很长，简单说明即可。

### 1.5 同意条款

勾选 "I agree to the Terms of Service" 并提交

**🎉 完成！** 申请会立即通过，无需等待人工审核。

---

## 步骤2：创建应用并获取 Bearer Token（2分钟）

### 2.1 进入开发者面板

访问：https://developer.twitter.com/en/portal/dashboard

### 2.2 创建项目（Project）

如果还没有项目：
1. 点击 **"+ Create Project"**
2. 填写项目名称（如 "WeChat Bot"）
3. 选择用途：**"Making a bot"**
4. 填写项目描述（随意）

### 2.3 创建应用（App）

1. 在项目下点击 **"+ Add App"**
2. 填写应用名称（如 "Tweet Monitor"）
3. 点击 **"Complete"**

### 2.4 获取 Bearer Token

创建应用后，系统会自动显示密钥：

```
API Key: xxxxxxxxxxxxx
API Secret: xxxxxxxxxxxxx
Bearer Token: AAAAAAAAAAAAAAAAAAAAAA%2FAAA...
```

**⚠️ 重要：**
- 立即复制 **Bearer Token**（最长的那个）
- 这是唯一一次显示，遗失需要重新生成
- 保存到安全的地方

如果遗失了 Bearer Token：
1. 进入应用设置
2. 找到 "Keys and tokens" 标签
3. 点击 "Regenerate" 重新生成

---

## 步骤3：配置机器人（1分钟）

### 3.1 编辑 .env 文件

打开项目根目录的 `.env` 文件（如果没有，复制 `.env.example` 为 `.env`）

### 3.2 添加 Bearer Token

找到推特配置部分，填入你的 Bearer Token：

```env
# 推特监控配置（Twitter API v2）
TWITTER_ENABLED=true
TWITTER_BEARER_TOKEN=粘贴你的Bearer_Token
TWITTER_USERNAME=tradfinews
TWITTER_CHECK_INTERVAL=60000
TWITTER_MONITOR_ROOMS=
```

**示例：**
```env
TWITTER_BEARER_TOKEN=AAAAAAAAAAAAAAAAAAAAAA%2FAAAAAAAxxxxxxxxxxxxxxxxxx
```

### 3.3 保存文件

确保保存了 `.env` 文件

---

## 步骤4：测试（可选但推荐）

### 4.1 运行测试脚本

```bash
node src/test-twitter-v2.js
```

### 4.2 查看测试结果

如果看到以下输出，说明配置成功：

```
✅ 客户端初始化成功
✅ 成功获取 X 条推文
✅ 防重复机制工作正常
✅ 所有测试通过，Twitter API v2 监控服务可以正常使用！
```

### 4.3 如果测试失败

检查以下几点：
- Bearer Token 是否正确复制（没有多余空格）
- 网络连接是否正常
- 推特用户名是否正确（不要包含 @）

---

## 步骤5：启动机器人

```bash
npm start
```

看到以下输出说明推特监控已启动：

```
🐦 推特监控已启动（Twitter API v2，发送到微信群）
🐦 监控账号: @tradfinews
```

---

## 常见问题

### Q: 申请需要多久？

A: **立即通过**，无需等待人工审核。整个流程5分钟内完成。

### Q: 免费版有什么限制？

A:
- 每月 10,000 条推文（远超个人使用需求）
- 每 15 分钟 15 次请求
- 每次最多获取 10 条推文

对于监控1-2个账号，每分钟检查一次，免费版完全够用。

### Q: Bearer Token 会过期吗？

A: 默认不会过期，除非你主动重新生成。建议每3个月更换一次以确保安全。

### Q: 可以监控多个账号吗？

A: 可以！只需在代码中创建多个监控实例。但注意 API 限额。

### Q: 如果遗失了 Bearer Token？

A:
1. 进入 https://developer.twitter.com/en/portal/dashboard
2. 选择你的应用
3. 进入 "Keys and tokens" 标签
4. 点击 "Regenerate" 按钮重新生成

### Q: 测试失败显示 401 错误？

A: Bearer Token 无效或过期，请：
1. 检查是否完整复制（包括所有特殊字符）
2. 确保没有多余的空格或换行
3. 尝试重新生成 Token

### Q: 能监控私密账号吗？

A: 不可以。Twitter API 只能获取公开推文。

---

## 下一步

配置完成后，你可以：

1. **自定义监控账号**
   ```env
   TWITTER_USERNAME=你想监控的用户名
   ```

2. **调整检查频率**
   ```env
   TWITTER_CHECK_INTERVAL=120000  # 2分钟检查一次
   ```

3. **指定发送群聊**
   ```env
   TWITTER_MONITOR_ROOMS=群名称1,群名称2
   ```

4. **查看详细文档**
   - [TWITTER_MONITOR_V2.md](TWITTER_MONITOR_V2.md) - 完整功能说明
   - [README.md](README.md) - 项目总览

---

## 获取帮助

- 📖 [Twitter API 官方文档](https://developer.twitter.com/en/docs/twitter-api)
- 📖 [完整配置指南](TWITTER_MONITOR_V2.md)
- 🐛 [提交问题](https://github.com/your-repo/issues)

---

**🎉 恭喜！你已经成功配置了 Twitter API 监控！**

现在你可以实时接收推特动态通知了！ 🚀
