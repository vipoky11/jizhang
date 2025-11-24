const mysql = require('mysql2/promise');
require('dotenv').config();

async function setDefaultAccount() {
  let connection;
  
  try {
    connection = await mysql.createConnection({
      host: process.env.DB_HOST || 'localhost',
      user: process.env.DB_USER || 'caiwuguanli',
      password: process.env.DB_PASSWORD || 'caiwuguanli123',
      database: process.env.DB_NAME || 'dish_accounting',
      port: process.env.DB_PORT || 3306,
      charset: 'utf8mb4'
    });

    console.log('✅ 已连接到数据库');

    // 先取消所有默认账户
    console.log('📝 取消所有默认账户...');
    await connection.query('UPDATE accounts SET is_default = 0');

    // 将微信设置为默认账户
    console.log('📝 将微信设置为默认账户...');
    const [result] = await connection.query(
      'UPDATE accounts SET is_default = 1 WHERE name = ?',
      ['微信']
    );

    if (result.affectedRows === 0) {
      console.log('⚠️  微信账户不存在，尝试创建...');
      // 如果微信账户不存在，创建它并设置为默认
      await connection.query(`
        INSERT INTO accounts (name, color, sort_order, is_default) VALUES
        ('微信', '#52c41a', 1, 1)
      `);
      console.log('✅ 微信账户已创建并设置为默认');
    } else {
      console.log('✅ 微信账户已设置为默认账户');
    }

    // 验证结果
    const [accounts] = await connection.query(
      'SELECT name, is_default FROM accounts WHERE name = ?',
      ['微信']
    );
    if (accounts.length > 0) {
      console.log(`✅ 验证成功：${accounts[0].name} 的 is_default = ${accounts[0].is_default}`);
    }

    console.log('🎉 默认账户设置完成！');

  } catch (error) {
    console.error('❌ 设置默认账户失败:', error.message);
    process.exit(1);
  } finally {
    if (connection) {
      await connection.end();
    }
  }
}

setDefaultAccount();

