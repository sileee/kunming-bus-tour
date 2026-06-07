// Vercel Serverless Function —— Express 入口
// Vercel 会自动把 /api/* 请求路由到这里
const path = require('path');

// 尝试加载 .env（本地开发用，Vercel 上通过环境变量面板设置）
try {
  require('dotenv').config({ path: path.join(__dirname, '..', 'backend', '.env') });
} catch (_) {}

const app = require('../backend/src/server');

module.exports = app;
