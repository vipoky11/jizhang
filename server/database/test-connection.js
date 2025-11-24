const mysql = require('mysql2/promise');
const readline = require('readline');
require('dotenv').config();

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

function question(query) {
  return new Promise(resolve => rl.question(query, resolve));
}

async function testConnection() {
  console.log('🔍 MySQL 连接测试工具\n');
  console.log('当前配置:');
  console.log(`  主机: ${process.env.DB_HOST || 'localhost'}`);
  console.log(`  用户: ${process.env.DB_USER || 'root'}`);
  console.log(`  端口: ${process.env.DB_PORT || 3306}`);
  console.log(`  数据库: ${process.env.DB_NAME || 'dish_accounting'}`);
  console.log(`  密码: ${process.env.DB_PASSWORD ? '***已设置***' : '未设置'}\n`);

  // 尝试不同的连接方式
  const configs = [
    {
      name: '使用 .env 配置（带密码）',
      config: {
        host: process.env.DB_HOST || 'localhost',
        user: process.env.DB_USER || 'root',
        password: process.env.DB_PASSWORD || '',
        port: process.env.DB_PORT || 3306,
      }
    },
    {
      name: '使用 root 用户（无密码）',
      config: {
        host: process.env.DB_HOST || 'localhost',
        user: 'root',
        password: '',
        port: process.env.DB_PORT || 3306,
      }
    }
  ];

  // 如果 .env 中没有密码，询问用户
  if (!process.env.DB_PASSWORD) {
    const password = await question('请输入 MySQL root 密码（直接回车表示无密码）: ');
    configs[0].config.password = password;
  }

  for (const { name, config } of configs) {
    try {
      console.log(`\n尝试: ${name}...`);
      const connection = await mysql.createConnection(config);
      
      console.log('✅ 连接成功！');
      
      // 测试查询
      const [rows] = await connection.query('SELECT VERSION() as version, USER() as user');
      console.log(`   MySQL 版本: ${rows[0].version}`);
      console.log(`   当前用户: ${rows[0].user}`);
      
      // 检查数据库是否存在
      const [databases] = await connection.query('SHOW DATABASES LIKE ?', [config.database || 'dish_accounting']);
      if (databases.length > 0) {
        console.log(`   ✅ 数据库 '${config.database || 'dish_accounting'}' 已存在`);
      } else {
        console.log(`   ⚠️  数据库 '${config.database || 'dish_accounting'}' 不存在`);
      }
      
      await connection.end();
      
      console.log('\n🎉 找到可用的配置！');
      console.log('\n建议的 .env 配置:');
      console.log(`DB_HOST=${config.host}`);
      console.log(`DB_USER=${config.user}`);
      console.log(`DB_PASSWORD=${config.password || '(留空)'}`);
      console.log(`DB_PORT=${config.port}`);
      console.log(`DB_NAME=dish_accounting`);
      
      rl.close();
      return;
      
    } catch (error) {
      console.log(`❌ 连接失败: ${error.message}`);
      
      if (error.code === 'ER_ACCESS_DENIED_ERROR') {
        console.log('   💡 提示: 用户名或密码不正确');
      } else if (error.code === 'ECONNREFUSED') {
        console.log('   💡 提示: MySQL 服务可能未启动');
        console.log('   尝试启动: brew services start mysql (macOS)');
      }
    }
  }
  
  console.log('\n❌ 所有连接尝试都失败了。');
  console.log('\n💡 可能的解决方案:');
  console.log('1. 检查 MySQL 服务是否运行: brew services list (macOS)');
  console.log('2. 尝试重置 MySQL root 密码');
  console.log('3. 使用其他 MySQL 用户');
  console.log('4. 检查 MySQL 配置文件中的用户权限');
  
  rl.close();
}

testConnection().catch(console.error);

