const mysql = require('mysql2/promise');
const fs = require('fs');
const path = require('path');
require('dotenv').config();

async function migrateMemoDate() {
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

    // 检查字段是否已存在
    const [columns] = await connection.query(
      `SELECT COLUMN_NAME 
       FROM INFORMATION_SCHEMA.COLUMNS 
       WHERE TABLE_SCHEMA = ? 
       AND TABLE_NAME = 'memos' 
       AND COLUMN_NAME = 'memo_date'`,
      [process.env.DB_NAME || 'dish_accounting']
    );

    if (columns.length > 0) {
      console.log('⚠️  日期字段已存在，跳过创建');
      return;
    }

    console.log('开始添加日期字段...');

    // 直接执行SQL（MySQL不支持IF NOT EXISTS，所以先检查）
    try {
      await connection.query(
        'ALTER TABLE memos ADD COLUMN memo_date DATE DEFAULT (CURDATE()) COMMENT \'备忘录日期\''
      );
    } catch (error) {
      if (error.code === 'ER_DUP_FIELDNAME') {
        console.log('⚠️  日期字段已存在，跳过创建');
        return;
      }
      throw error;
    }
    
    console.log('✅ 日期字段添加成功！');
    
  } catch (error) {
    console.error('添加日期字段失败:', error);
    process.exit(1);
  } finally {
    if (connection) {
      await connection.end();
    }
  }
}

migrateMemoDate();

