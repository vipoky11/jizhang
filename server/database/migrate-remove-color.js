const mysql = require('mysql2/promise');
const fs = require('fs');
const path = require('path');
require('dotenv').config();

async function migrateRemoveColor() {
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

    // 检查字段是否存在
    const [columns] = await connection.query(
      `SELECT COLUMN_NAME, COLUMN_DEFAULT, IS_NULLABLE
       FROM INFORMATION_SCHEMA.COLUMNS 
       WHERE TABLE_SCHEMA = ? 
       AND TABLE_NAME = 'memos' 
       AND COLUMN_NAME = 'color'`,
      [process.env.DB_NAME || 'dish_accounting']
    );

    if (columns.length === 0) {
      console.log('⚠️  color字段不存在，跳过修改');
      return;
    }

    console.log('开始修改color字段...');
    console.log('当前color字段信息:', {
      default: columns[0].COLUMN_DEFAULT,
      nullable: columns[0].IS_NULLABLE
    });

    // 修改color字段：允许NULL，移除默认值
    await connection.query(
      'ALTER TABLE memos MODIFY COLUMN color VARCHAR(20) DEFAULT NULL COMMENT \'颜色标记（已废弃）\''
    );
    
    console.log('✅ color字段修改成功！现在允许NULL值，默认值为NULL');
    
  } catch (error) {
    console.error('修改color字段失败:', error);
    process.exit(1);
  } finally {
    if (connection) {
      await connection.end();
    }
  }
}

migrateRemoveColor();

