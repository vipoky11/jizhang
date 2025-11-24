const mysql = require('mysql2/promise');
require('dotenv').config();

async function clearCategories() {
  let connection;
  
  try {
    connection = await mysql.createConnection({
      host: process.env.DB_HOST || 'localhost',
      user: process.env.DB_USER || 'root',
      password: process.env.DB_PASSWORD || '',
      database: process.env.DB_NAME || 'dish_accounting',
      port: process.env.DB_PORT || 3306,
      charset: 'utf8mb4'
    });

    console.log('✅ 已连接到数据库');

    // 清空分类数据
    console.log('📝 正在清空分类数据...');
    const [result] = await connection.query('DELETE FROM categories');
    
    console.log(`✅ 已清空 ${result.affectedRows} 条分类记录`);
    console.log('🎉 分类数据清空完成！');

  } catch (error) {
    console.error('❌ 清空失败:', error.message);
    process.exit(1);
  } finally {
    if (connection) {
      await connection.end();
    }
  }
}

clearCategories();

