const mysql = require('mysql2/promise');
const fs = require('fs');
const path = require('path');
require('dotenv').config();

async function migrateMemos() {
  let connection;
  
  try {
    // 创建连接
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

    console.log('开始创建备忘录表...');

    // 读取SQL文件
    const sqlPath = path.join(__dirname, 'add_memos_table.sql');
    const sql = fs.readFileSync(sqlPath, 'utf8');

    // 执行SQL
    await connection.query(sql);
    
    console.log('备忘录表创建成功！');
    
  } catch (error) {
    console.error('创建备忘录表失败:', error);
    process.exit(1);
  } finally {
    if (connection) {
      await connection.end();
    }
  }
}

migrateMemos();

