const mysql = require('mysql2/promise');
const fs = require('fs');
const path = require('path');
require('dotenv').config();

async function migrateSuppliers() {
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
       AND TABLE_NAME = 'suppliers'`,
      [process.env.DB_NAME || 'dish_accounting']
    );

    if (tables.length > 0) {
      console.log('⚠️  供应商表已存在，跳过创建');
      return;
    }

    console.log('开始创建供应商表...');

    // 读取SQL文件
    const sqlPath = path.join(__dirname, 'add_suppliers_table.sql');
    const sql = fs.readFileSync(sqlPath, 'utf8');

    // 执行SQL
    await connection.query(sql);
    
    console.log('✅ 供应商表创建成功！');
    
  } catch (error) {
    console.error('创建供应商表失败:', error);
    process.exit(1);
  } finally {
    if (connection) {
      await connection.end();
    }
  }
}

migrateSuppliers();

