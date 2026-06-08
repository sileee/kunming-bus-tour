// EdgeOne Pages Cloud Function
// 直接导出 Express app，平台会自动处理
require('dotenv').config();
const app = require('../backend/src/server');
module.exports = app;
