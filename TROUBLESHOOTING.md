# 故障排查指南

## 常见问题解决方案

### 1. 微信登录错误 1102

**错误信息：**
```
AssertionError [ERR_ASSERTION]: '1102' == 0
```

**原因：**
- 微信账号被限制登录网页版或第三方客户端
- 新注册的微信账号（需要使用一段时间才能登录网页版）
- 长时间未使用网页版微信
- 微信安全策略限制

**解决方案：**

#### 方案1：更换微信账号（推荐）
- 使用注册超过6个月的老账号
- 确保账号已经正常使用过网页版微信
- 避免使用新注册的账号

#### 方案2：激活网页版权限
1. 访问 https://wx.qq.com
2. 使用该账号扫码登录网页版微信
3. 成功登录后再使用机器人

#### 方案3：更换Puppet（如果条件允许）
wechat4u是免费但不稳定的puppet，建议使用更稳定的：

**免费替代方案：**
- 目前wechat4u是唯一免费方案
- 只能通过更换账号解决

**付费方案（更稳定）：**
- wechaty-puppet-padlocal（推荐）
- wechaty-puppet-wechat（官方）
- wechaty-puppet-service

#### 方案4：检查账号状态
确认账号：
- [ ] 已实名认证
- [ ] 绑定了手机号
- [ ] 添加了好友
- [ ] 正常使用超过1个月
- [ ] 能正常登录手机端

---

### 2. 登录失败或无响应

**症状：**
- 扫码后一直没反应
- 显示"登录中"后卡住
- 反复要求扫码

**解决方案：**

#### 1. 清除缓存
```bash
rm -rf .wechaty/
rm *.memory-card.json
```

#### 2. 检查网络
```bash
# 测试网络连接
ping wechaty.js.org
ping wx.qq.com
```

#### 3. 重启程序
```bash
# 停止程序
Ctrl + C

# 清除缓存
rm -rf .wechaty/

# 重新启动
npm start
```

---

### 3. 收不到合约地址通知

**症状：**
- 在群里发送合约地址，机器人没反应

**检查清单：**

#### 1. 确认群聊配置
```bash
# 查看配置
cat .env | grep MONITOR_ROOMS
```

确保：
- 群名称完全匹配（区分大小写）
- 如果留空，应该监控所有群

#### 2. 检查地址格式
合约地址必须：
- 以 `0x` 开头
- 总长度42位
- 只包含十六进制字符（0-9, a-f, A-F）

示例：
```
✅ 正确: 0x55d398326f99059fF775485246999027B3197955
❌ 错误: 55d398326f99059fF775485246999027B3197955 (缺少0x)
❌ 错误: 0x55d39832 (长度不够)
```

#### 3. 查看日志
```bash
# 启用调试日志
LOG_LEVEL=debug npm start
```

#### 4. 测试API密钥
```bash
# 检查环境变量
echo $AVE_AI_API_KEY
```

---

### 4. 收不到币安公告通知

**症状：**
- 币安发布新公告，机器人没推送

**检查清单：**

#### 1. 确认监控已启动
查看启动日志，应该包含：
```
📢 币安公告监控已启动（真实模式：发送到微信群）
```

#### 2. 检查群聊配置
```bash
# 查看配置
cat .env | grep BINANCE_MONITOR_ROOMS
```

#### 3. 测试API访问
```bash
# 测试币安API
curl "https://www.binance.com/bapi/apex/v1/public/apex/cms/article/list/query?type=1&pageNo=1&pageSize=5&catalogId=48"
```

#### 4. 检查模式
```bash
# 确认不是模拟模式
cat .env | grep BINANCE_MOCK_MODE
# 应该是 false 或者不存在
```

---

### 5. API调用失败

**错误信息：**
```
获取代币信息失败
API调用失败
```

**解决方案：**

#### 1. 检查API密钥
```bash
# 验证密钥是否正确
cat .env | grep AVE_AI_API_KEY
```

#### 2. 测试网络连接
```bash
# 测试API连接
curl -H "X-API-KEY: your_key" https://prod.ave-api.com/v2/tokens?keyword=0x55d398326f99059fF775485246999027B3197955
```

#### 3. 查看错误日志
检查日志文件中的详细错误信息

#### 4. 检查速率限制
- 确认没有超过API调用限制
- 调整 `MAX_REQUESTS_PER_MINUTE` 配置

---

### 6. 程序崩溃或自动退出

**解决方案：**

#### 1. 查看错误日志
```bash
# 查看最近的错误
tail -n 50 *.log
```

#### 2. 检查内存使用
```bash
# 查看进程内存
ps aux | grep node
```

#### 3. 使用PM2管理
```bash
# 安装PM2
npm install -g pm2

# 启动
pm2 start ecosystem.config.js

# 查看日志
pm2 logs

# 重启
pm2 restart wx-bot
```

---

### 7. 发送消息失败

**错误信息：**
```
发送消息到微信群失败
未找到群聊
```

**解决方案：**

#### 1. 确认群名称
```bash
# 获取所有群聊名称
# 在程序中添加调试代码打印所有群
```

#### 2. 检查机器人权限
- 确认机器人在该群中
- 确认未被禁言
- 确认有发言权限

#### 3. 群名称匹配
```env
# .env 配置中使用完整准确的群名称
MONITOR_ROOMS=完整的群名称
```

---

### 8. 配置文件问题

**症状：**
- 启动时提示配置错误
- 找不到配置文件

**解决方案：**

#### 1. 检查.env文件
```bash
# 确认文件存在
ls -la .env

# 如果不存在，复制示例
cp .env.example .env
```

#### 2. 检查配置格式
```env
# 正确格式
AVE_AI_API_KEY=your_key

# 错误格式
AVE_AI_API_KEY = your_key  # 不要有空格
AVE_AI_API_KEY='your_key'  # 不要用引号
```

#### 3. 验证必填配置
确保以下配置存在：
- `AVE_AI_API_KEY`

---

## 调试技巧

### 启用详细日志
```bash
LOG_LEVEL=debug npm start
```

### 测试单个功能

**测试合约播报：**
在监控的群里发送：
```
测试 0x55d398326f99059fF775485246999027B3197955
```

**测试币安监控（模拟）：**
```env
# 临时启用模拟模式
BINANCE_MOCK_MODE=true
```

### 查看运行状态
```bash
# 使用PM2
pm2 status
pm2 logs wx-bot --lines 100

# 查看进程
ps aux | grep node

# 查看端口
netstat -nltp | grep node
```

---

## 获取帮助

### 日志信息
提交问题时，请附带：
1. 完整的错误信息
2. 相关日志（隐藏敏感信息）
3. 配置信息（隐藏API密钥）
4. 系统环境信息

### 环境信息
```bash
# Node.js版本
node -v

# npm版本
npm -v

# 系统信息
uname -a
```

### 常用命令
```bash
# 查看依赖版本
npm list wechaty

# 重新安装依赖
rm -rf node_modules package-lock.json
npm install

# 清除缓存
npm cache clean --force
```

---

## 预防措施

### 定期维护
- 定期更新依赖包
- 定期清理日志文件
- 定期备份配置

### 监控告警
- 使用PM2监控进程状态
- 设置日志告警
- 定期检查运行状态

### 安全建议
- 不要使用主账号
- 定期更换API密钥
- 保护.env文件
- 不要在公开仓库提交密钥

---

## 联系支持

如果以上方案都无法解决问题：

1. 检查文档：README.md
2. 查看示例：QUICK_START.md
3. 提交Issue（附带详细信息）
4. 社区求助