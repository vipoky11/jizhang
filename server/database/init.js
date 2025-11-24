const mysql = require('mysql2/promise');
const fs = require('fs');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../../.env') });

async function initDatabase() {
  let connection;
  
  try {
    // 先连接到 MySQL 服务器（不指定数据库）
    connection = await mysql.createConnection({
      host: process.env.DB_HOST || 'localhost',
      user: process.env.DB_USER || 'root',
      password: process.env.DB_PASSWORD || '',
      port: process.env.DB_PORT || 3306,
      multipleStatements: true
    });

    console.log('✅ 已连接到 MySQL 服务器');

    // 读取 SQL 文件
    const sqlFile = path.join(__dirname, 'init.sql');
    const sql = fs.readFileSync(sqlFile, 'utf8');

    // 执行 SQL 语句
    console.log('📝 正在初始化数据库...');
    await connection.query(sql);

    console.log('✅ 数据库初始化成功！');
    console.log(`📊 数据库名称: ${process.env.DB_NAME || 'dish_accounting'}`);
    console.log('📋 表结构已创建: transactions');

  } catch (error) {
    console.error('❌ 数据库初始化失败:', error.message);
    
    if (error.code === 'ER_ACCESS_DENIED_ERROR') {
      console.error('💡 提示: 请检查 .env 文件中的数据库用户名和密码是否正确');
    } else if (error.code === 'ECONNREFUSED') {
      console.error('💡 提示: 请确保 MySQL 服务已启动');
    } else if (error.code === 'ER_BAD_DB_ERROR') {
      console.error('💡 提示: 数据库不存在，但脚本应该会自动创建');
    }
    
    process.exit(1);
  } finally {
    if (connection) {
      await connection.end();
      console.log('🔌 数据库连接已关闭');
    }
  }
}

// 运行初始化
initDatabase();

