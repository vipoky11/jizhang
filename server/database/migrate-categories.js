const mysql = require('mysql2/promise');
const fs = require('fs');
const path = require('path');
require('dotenv').config();

async function migrateCategories() {
  let connection;
  
  try {
    connection = await mysql.createConnection({
      host: process.env.DB_HOST || 'localhost',
      user: process.env.DB_USER || 'root',
      password: process.env.DB_PASSWORD || '',
      database: process.env.DB_NAME || 'dish_accounting',
      port: process.env.DB_PORT || 3306,
      multipleStatements: true
    });

    console.log('✅ 已连接到数据库');

    // 检查表是否已存在
    const [tables] = await connection.query(
      `SELECT TABLE_NAME 
       FROM INFORMATION_SCHEMA.TABLES 
       WHERE TABLE_SCHEMA = ? 
       AND TABLE_NAME = 'categories'`,
      [process.env.DB_NAME || 'dish_accounting']
    );

    if (tables.length > 0) {
      console.log('✅ categories 表已存在，跳过创建');
    } else {
      console.log('📝 开始创建 categories 表...');

      // 读取 SQL 文件
      const sqlFile = path.join(__dirname, 'add_categories_table.sql');
      const sql = fs.readFileSync(sqlFile, 'utf8');

      // 执行 SQL
      await connection.query(sql);
      console.log('✅ categories 表创建成功');
    }

    // 注意：默认情况下不插入任何分类数据，用户需要手动添加
    const [categories] = await connection.query('SELECT COUNT(*) as count FROM categories');
    console.log(`ℹ️  当前有 ${categories[0].count} 个分类，请通过界面添加分类数据`);

    console.log('🎉 分类表迁移完成！');

  } catch (error) {
    console.error('❌ 分类表迁移失败:', error.message);
    if (error.code !== 'ER_TABLE_EXISTS_ERROR') {
      process.exit(1);
    }
  } finally {
    if (connection) {
      await connection.end();
    }
  }
}

migrateCategories();

