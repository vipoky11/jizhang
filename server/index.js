const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
require('dotenv').config();

const db = require('./config/database');
const { useSqlite } = require('./config/database');
const transactionRoutes = require('./routes/transactions');
const categoryRoutes = require('./routes/categories');
const accountRoutes = require('./routes/accounts');
const tagRoutes = require('./routes/tags');
const colorRoutes = require('./routes/colors');
const supplierRoutes = require('./routes/suppliers');
const authRoutes = require('./routes/auth');

const app = express();
// 默认使用 5001，避免与 macOS ControlCenter 冲突（占用 5000）
const PORT = process.env.PORT || 5001;

// 中间件
app.use(cors());
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

// 路由
app.use('/api/auth', authRoutes);
app.use('/api/transactions', transactionRoutes);
app.use('/api/categories', categoryRoutes);
app.use('/api/accounts', accountRoutes);
app.use('/api/tags', tagRoutes);
app.use('/api/colors', colorRoutes);
app.use('/api/suppliers', supplierRoutes);

// 全局错误处理中间件（必须在所有路由之后）
app.use((err, req, res, next) => {
  console.error('❌ 全局错误处理:', err);
  console.error('错误堆栈:', err.stack);
  console.error('请求路径:', req.path);
  console.error('请求方法:', req.method);
  res.status(500).json({
    success: false,
    message: err.message || '服务器内部错误',
    error: process.env.NODE_ENV === 'development' ? err.stack : undefined
  });
});

// 健康检查
app.get('/api/health', (req, res) => {
  res.json({ status: 'OK', message: '服务器运行正常', database: 'SQLite' });
});

// 数据库状态检查（调试用）
app.get('/api/debug/db-status', async (req, res) => {
  try {
    const sqliteDb = require('./config/database-sqlite');
    const dbPath = sqliteDb.dbPath;
    
    // 检查表是否存在
    const tables = sqliteDb.db.prepare(`
      SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%'
    `).all();
    
    // 检查 transactions 表结构
    let transactionsInfo = null;
    if (tables.some(t => t.name === 'transactions')) {
      const columns = sqliteDb.db.prepare(`PRAGMA table_info(transactions)`).all();
      const count = sqliteDb.db.prepare(`SELECT COUNT(*) as count FROM transactions`).get();
      transactionsInfo = { columns, count: count.count };
    }
    
    res.json({
      success: true,
      database: 'SQLite',
      dbPath,
      tables: tables.map(t => t.name),
      transactions: transactionsInfo
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message,
      stack: error.stack
    });
  }
});

// 确保数据库初始化完成后再启动服务器
async function startServer() {
  // 初始化 SQLite 数据库（只在首次启动或表缺失时执行）
  try {
    const initSqlite = require('./database/init-sqlite');
    await initSqlite();
  } catch (err) {
    console.error('❌ SQLite 初始化失败:', err);
    console.error('错误堆栈:', err.stack);
    // 即使初始化失败也继续启动，让用户知道问题
  }
  
  app.listen(PORT, () => {
    console.log(`🚀 服务器运行在端口 ${PORT}`);
    console.log(`📊 数据库类型: SQLite`);
    try {
      const dbPath = require('./config/database-sqlite').dbPath;
      console.log(`📂 数据库路径: ${dbPath}`);
    } catch (e) {
      console.log('⚠️  无法获取数据库路径');
    }
  });
}

startServer();

