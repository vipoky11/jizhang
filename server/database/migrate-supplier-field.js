const mysql = require('mysql2/promise');
require('dotenv').config();

async function migrateSupplierField() {
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
       AND TABLE_NAME = 'transactions' 
       AND COLUMN_NAME = 'supplier'`,
      [process.env.DB_NAME || 'dish_accounting']
    );

    if (columns.length > 0) {
      console.log('✅ supplier 字段已存在，跳过迁移');
      await connection.end();
      return;
    }

    console.log('📝 开始添加 supplier 字段...');

    // 添加 supplier 字段
    await connection.query(`
      ALTER TABLE transactions 
      ADD COLUMN supplier VARCHAR(100) DEFAULT NULL COMMENT '供应商名称' 
      AFTER account
    `);

    console.log('✅ supplier 字段添加成功');

    // 添加索引
    try {
      await connection.query(`
        ALTER TABLE transactions 
        ADD INDEX idx_supplier (supplier)
      `);
      console.log('✅ supplier 索引添加成功');
    } catch (error) {
      if (error.code !== 'ER_DUP_KEYNAME') {
        throw error;
      }
      console.log('⚠️  supplier 索引已存在');
    }

    console.log('🎉 数据库迁移完成！');

  } catch (error) {
    console.error('❌ 数据库迁移失败:', error.message);
    if (error.code === 'ER_DUP_FIELDNAME') {
      console.log('💡 supplier 字段已存在，无需迁移');
    } else {
      process.exit(1);
    }
  } finally {
    if (connection) {
      await connection.end();
    }
  }
}

migrateSupplierField();

