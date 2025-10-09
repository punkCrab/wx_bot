# 使用Node.js官方镜像
FROM node:18-slim

# 设置工作目录
WORKDIR /app

# 安装系统依赖
RUN apt-get update && apt-get install -y \
    chromium \
    fonts-wqy-microhei \
    fonts-wqy-zenhei \
    && rm -rf /var/lib/apt/lists/*

# 复制package文件
COPY package*.json ./

# 安装项目依赖
RUN npm ci --only=production

# 复制项目文件
COPY . .

# 创建日志目录
RUN mkdir -p logs

# 设置环境变量
ENV NODE_ENV=production

# 暴露端口（用于二维码服务）
EXPOSE 3000

# 运行应用
CMD ["node", "src/index.js"]