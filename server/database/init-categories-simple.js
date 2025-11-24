const mysql = require('mysql2/promise');
require('dotenv').config();

async function initCategoriesSimple() {
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

    // 插入简单的默认分类（只有名称，不区分收入支出）
    console.log('📝 插入默认分类...');
    await connection.query(`
      INSERT INTO categories (name, type, color, sort_order) VALUES
      ('餐饮', 'both', '#ff4d4f', 1),
      ('交通', 'both', '#1890ff', 2),
      ('购物', 'both', '#52c41a', 3),
      ('娱乐', 'both', '#faad14', 4),
      ('医疗', 'both', '#f5222d', 5),
      ('教育', 'both', '#722ed1', 6),
      ('工资', 'both', '#52c41a', 7),
      ('奖金', 'both', '#1890ff', 8),
      ('投资收益', 'both', '#faad14', 9),
      ('其他', 'both', '#8c8c8c', 99)
    `);

    // 验证数据
    const [categories] = await connection.query('SELECT * FROM categories ORDER BY sort_order');
    console.log(`✅ 成功插入 ${categories.length} 个分类：`);
    categories.forEach(cat => {
      console.log(`   - ${cat.name}`);
    });

    console.log('🎉 分类数据初始化完成！');

  } catch (error) {
    console.error('❌ 初始化失败:', error.message);
    process.exit(1);
  } finally {
    if (connection) {
      await connection.end();
    }
  }
}

initCategoriesSimple();

