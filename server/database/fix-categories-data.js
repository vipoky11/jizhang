const mysql = require('mysql2/promise');
require('dotenv').config();

async function fixCategoriesData() {
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

    // 清空现有分类数据
    console.log('📝 清空现有分类数据...');
    await connection.query('DELETE FROM categories');

    // 重新插入默认分类（使用正确的编码）
    console.log('📝 插入默认分类...');
    await connection.query(`
      INSERT INTO categories (name, type, color, sort_order) VALUES
      ('餐饮', 'expense', '#ff4d4f', 1),
      ('交通', 'expense', '#1890ff', 2),
      ('购物', 'expense', '#52c41a', 3),
      ('娱乐', 'expense', '#faad14', 4),
      ('医疗', 'expense', '#f5222d', 5),
      ('教育', 'expense', '#722ed1', 6),
      ('工资', 'income', '#52c41a', 1),
      ('奖金', 'income', '#1890ff', 2),
      ('投资收益', 'income', '#faad14', 3),
      ('其他收入', 'income', '#8c8c8c', 4),
      ('其他支出', 'expense', '#8c8c8c', 99)
    `);

    // 验证数据
    const [categories] = await connection.query('SELECT * FROM categories ORDER BY sort_order');
    console.log(`✅ 成功插入 ${categories.length} 个分类：`);
    categories.forEach(cat => {
      console.log(`   - ${cat.name} (${cat.type})`);
    });

    console.log('🎉 分类数据修复完成！');

  } catch (error) {
    console.error('❌ 修复失败:', error.message);
    process.exit(1);
  } finally {
    if (connection) {
      await connection.end();
    }
  }
}

fixCategoriesData();

