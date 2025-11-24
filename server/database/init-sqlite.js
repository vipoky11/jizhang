const fs = require('fs');
const path = require('path');
const { db, mysqlToSqlite, promise } = require('../config/database-sqlite');

async function initSqliteDatabase() {
  try {
    // 检查数据库是否已初始化（通过检查 transactions 表是否存在）
    const tables = db.prepare(`
      SELECT name FROM sqlite_master WHERE type='table' AND name='transactions'
    `).all();
    
    const isInitialized = tables.length > 0;
    
    if (isInitialized) {
      // 数据库已初始化，只检查关键表是否存在
      const allTables = db.prepare(`
        SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%'
      `).all();
      const existingTables = allTables.map(t => t.name);
      const requiredTables = ['transactions', 'categories', 'accounts', 'suppliers', 'memos', 'tags'];
      const missingTables = requiredTables.filter(t => !existingTables.includes(t));
      
      if (missingTables.length === 0) {
        // 所有表都存在，跳过初始化
        return;
      }
      // 有缺失的表，继续初始化
      console.log('📝 检测到缺失的表，开始初始化...');
    } else {
      console.log('📝 开始初始化 SQLite 数据库...');
    }

    // 读取并执行所有 SQL 文件
    const sqlFiles = [
      'init.sql',
      'add_categories_table.sql',
      'add_accounts_table.sql',
      'add_suppliers_table.sql',
      'add_memos_table.sql',
      'add_tags_table.sql',
    ];

    for (const sqlFile of sqlFiles) {
      const sqlPath = path.join(__dirname, sqlFile);
      if (fs.existsSync(sqlPath)) {
        if (!isInitialized) {
          console.log(`📄 执行 ${sqlFile}...`);
        }
        const sql = fs.readFileSync(sqlPath, 'utf8');
        const convertedSql = mysqlToSqlite(sql);
        
        // 执行转换后的 SQL（mysqlToSqlite 已经移除了注释）
        const statements = convertedSql.split(';').filter(s => s.trim());
        for (const statement of statements) {
          const trimmed = statement.trim();
          if (trimmed && trimmed.length > 0) {
            try {
              db.exec(trimmed);
            } catch (error) {
              // 忽略表已存在的错误
              if (!error.message.includes('already exists')) {
                console.error(`执行语句失败: ${trimmed.substring(0, 100)}...`);
                console.error(error.message);
                // 输出完整的 SQL 以便调试
                if (error.message.includes('syntax error')) {
                  console.error('完整 SQL:', trimmed);
                }
              }
            }
          }
        }
      }
    }

    // 添加 supplier 字段到 transactions 表（如果不存在）
    try {
      db.exec(`
        ALTER TABLE transactions ADD COLUMN supplier VARCHAR(255) DEFAULT NULL;
      `);
      console.log('✅ 已添加 supplier 字段');
    } catch (error) {
      if (!error.message.includes('duplicate column')) {
        console.log('ℹ️  supplier 字段已存在或添加失败');
      }
    }

    // 添加 memo_date 字段到 memos 表（如果不存在）
    try {
      db.exec(`
        ALTER TABLE memos ADD COLUMN memo_date DATE DEFAULT NULL;
      `);
      console.log('✅ 已添加 memo_date 字段');
    } catch (error) {
      if (!error.message.includes('duplicate column')) {
        console.log('ℹ️  memo_date 字段已存在或添加失败');
      }
    }

    // 验证表是否创建成功
    const allTables = db.prepare(`
      SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%'
    `).all();
    
    // 检查关键表是否存在
    const requiredTables = ['transactions', 'categories', 'accounts', 'suppliers', 'memos', 'tags'];
    const existingTables = allTables.map(t => t.name);
    const missingTables = requiredTables.filter(t => !existingTables.includes(t));
    
    if (missingTables.length > 0) {
      console.error('❌ 缺少以下表:', missingTables.join(', '));
      throw new Error(`缺少表: ${missingTables.join(', ')}`);
    }
    
    if (!isInitialized) {
      console.log('📋 已创建的表:', existingTables.join(', '));
      // 注意：默认情况下不插入任何数据，用户需要手动添加分类和账户
      console.log('ℹ️  数据库表已创建，请通过界面添加分类和账户数据');
      console.log('✅ SQLite 数据库初始化完成！');
      console.log(`📊 数据库路径: ${require('../config/database-sqlite').dbPath}`);
    }

  } catch (error) {
    console.error('❌ SQLite 数据库初始化失败:', error);
    throw error;
  }
}

// 如果直接运行此脚本
if (require.main === module) {
  initSqliteDatabase()
    .then(() => {
      console.log('🎉 初始化完成');
      process.exit(0);
    })
    .catch((error) => {
      console.error('初始化失败:', error);
      process.exit(1);
    });
}

module.exports = initSqliteDatabase;

