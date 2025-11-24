const mysql = require('mysql2/promise');
const fs = require('fs');
const path = require('path');
require('dotenv').config();

async function migrateAccounts() {
  let connection;
  
  try {
    connection = await mysql.createConnection({
      host: process.env.DB_HOST || 'localhost',
      user: process.env.DB_USER || 'root',
      password: process.env.DB_PASSWORD || '',
      database: process.env.DB_NAME || 'dish_accounting',
      port: process.env.DB_PORT || 3306,
      multipleStatements: true,
      charset: 'utf8mb4'
    });

    console.log('✅ 已连接到数据库');

    // 检查表是否已存在
    const [tables] = await connection.query(
      `SELECT TABLE_NAME 
       FROM INFORMATION_SCHEMA.TABLES 
       WHERE TABLE_SCHEMA = ? 
       AND TABLE_NAME = 'accounts'`,
      [process.env.DB_NAME || 'dish_accounting']
    );

    if (tables.length > 0) {
      console.log('✅ accounts 表已存在，跳过创建');
    } else {
      console.log('📝 开始创建 accounts 表...');

      // 读取 SQL 文件
      const sqlFile = path.join(__dirname, 'add_accounts_table.sql');
      const sql = fs.readFileSync(sqlFile, 'utf8');

      // 执行 SQL
      await connection.query(sql);
      console.log('✅ accounts 表创建成功');
    }

    // 注意：默认情况下不插入任何账户数据，用户需要手动添加
    const [accounts] = await connection.query('SELECT COUNT(*) as count FROM accounts');
    console.log(`ℹ️  当前有 ${accounts[0].count} 个账户，请通过界面添加账户数据`);

    console.log('🎉 账户表迁移完成！');

  } catch (error) {
    console.error('❌ 账户表迁移失败:', error.message);
    if (error.code !== 'ER_TABLE_EXISTS_ERROR') {
      process.exit(1);
    }
  } finally {
    if (connection) {
      await connection.end();
    }
  }
}

migrateAccounts();

