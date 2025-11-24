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

async function createUser() {
  const newUser = 'caiwuguanli';
  const newPassword = 'caiwuguanli123';
  const database = 'dish_accounting';

  console.log('🔧 创建数据库用户和数据库\n');
  console.log(`用户名: ${newUser}`);
  console.log(`密码: ${newPassword}`);
  console.log(`数据库: ${database}\n`);

  // 尝试使用 root 连接
  let rootPassword = process.env.DB_PASSWORD || '';
  
  if (!rootPassword) {
    rootPassword = await question('请输入 MySQL root 密码（直接回车表示无密码）: ');
  }

  const rootConfigs = [
    {
      name: '使用 .env 中的 root 配置',
      config: {
        host: process.env.DB_HOST || 'localhost',
        user: process.env.DB_USER || 'root',
        password: process.env.DB_PASSWORD || '',
        port: process.env.DB_PORT || 3306,
      }
    },
    {
      name: '使用 root（无密码）',
      config: {
        host: process.env.DB_HOST || 'localhost',
        user: 'root',
        password: '',
        port: process.env.DB_PORT || 3306,
      }
    },
    {
      name: '使用输入的 root 密码',
      config: {
        host: process.env.DB_HOST || 'localhost',
        user: 'root',
        password: rootPassword,
        port: process.env.DB_PORT || 3306,
      }
    }
  ];

  let rootConnection = null;

  for (const { name, config } of rootConfigs) {
    try {
      console.log(`\n尝试使用 root 连接: ${name}...`);
      rootConnection = await mysql.createConnection(config);
      console.log('✅ Root 连接成功！\n');
      break;
    } catch (error) {
      console.log(`❌ 连接失败: ${error.message}`);
    }
  }

  if (!rootConnection) {
    console.log('\n❌ 无法连接到 MySQL。请检查：');
    console.log('1. MySQL 服务是否运行');
    console.log('2. root 密码是否正确');
    console.log('3. 是否有 root 权限');
    rl.close();
    process.exit(1);
  }

  try {
    // 创建数据库
    console.log(`📦 创建数据库 '${database}'...`);
    await rootConnection.query(
      `CREATE DATABASE IF NOT EXISTS ${database} CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci`
    );
    console.log(`✅ 数据库 '${database}' 创建成功或已存在\n`);

    // 检查用户是否已存在
    console.log(`👤 检查用户 '${newUser}' 是否存在...`);
    const [users] = await rootConnection.query(
      `SELECT User, Host FROM mysql.user WHERE User = ? AND Host = ?`,
      [newUser, 'localhost']
    );

    if (users.length > 0) {
      console.log(`⚠️  用户 '${newUser}'@'localhost' 已存在`);
      const answer = await question('是否删除并重新创建？(y/n): ');
      if (answer.toLowerCase() === 'y' || answer.toLowerCase() === 'yes') {
        await rootConnection.query(`DROP USER IF EXISTS '${newUser}'@'localhost'`);
        console.log(`✅ 已删除旧用户\n`);
      } else {
        console.log('跳过用户创建，直接授权...\n');
      }
    }

    // 创建用户
    if (users.length === 0 || (users.length > 0 && await question('是否重新创建用户？(y/n): ').then(a => a.toLowerCase() === 'y'))) {
      console.log(`👤 创建用户 '${newUser}'@'localhost'...`);
      await rootConnection.query(
        `CREATE USER '${newUser}'@'localhost' IDENTIFIED BY ?`,
        [newPassword]
      );
      console.log(`✅ 用户创建成功\n`);
    }

    // 授权
    console.log(`🔐 授予用户 '${newUser}' 对数据库 '${database}' 的所有权限...`);
    await rootConnection.query(
      `GRANT ALL PRIVILEGES ON ${database}.* TO '${newUser}'@'localhost'`
    );
    await rootConnection.query('FLUSH PRIVILEGES');
    console.log(`✅ 权限授予成功\n`);

    // 验证新用户连接
    console.log(`🔍 验证新用户连接...`);
    const testConnection = await mysql.createConnection({
      host: process.env.DB_HOST || 'localhost',
      user: newUser,
      password: newPassword,
      database: database,
      port: process.env.DB_PORT || 3306,
    });

    const [result] = await testConnection.query('SELECT DATABASE() as db, USER() as user');
    console.log(`✅ 新用户连接测试成功！`);
    console.log(`   当前数据库: ${result[0].db}`);
    console.log(`   当前用户: ${result[0].user}\n`);

    // 初始化表结构
    console.log(`📋 初始化表结构...`);
    const fs = require('fs');
    const path = require('path');
    const sqlFile = path.join(__dirname, 'init.sql');
    const sql = fs.readFileSync(sqlFile, 'utf8');
    
    // 只执行创建表的 SQL（跳过 CREATE DATABASE 和 USE）
    const tableSql = sql
      .split('USE dish_accounting;')[1] || sql
      .replace(/CREATE DATABASE.*?;/gi, '')
      .replace(/USE.*?;/gi, '');
    
    const newConn = await mysql.createConnection({
      host: process.env.DB_HOST || 'localhost',
      user: newUser,
      password: newPassword,
      database: database,
      port: process.env.DB_PORT || 3306,
      multipleStatements: true
    });
    
    await newConn.query(tableSql);
    await newConn.end();
    
    await testConnection.end();
    
    console.log(`✅ 表结构初始化成功\n`);

    console.log('🎉 所有操作完成！\n');
    console.log('📝 请更新 .env 文件：');
    console.log('─'.repeat(50));
    console.log(`DB_HOST=localhost`);
    console.log(`DB_USER=${newUser}`);
    console.log(`DB_PASSWORD=${newPassword}`);
    console.log(`DB_NAME=${database}`);
    console.log(`DB_PORT=3306`);
    console.log(`PORT=5000`);
    console.log('─'.repeat(50));

  } catch (error) {
    console.error('\n❌ 操作失败:', error.message);
    if (error.code === 'ER_ACCESS_DENIED_ERROR') {
      console.error('💡 提示: 需要 root 权限来创建用户');
    }
  } finally {
    if (rootConnection) {
      await rootConnection.end();
    }
    rl.close();
  }
}

createUser().catch(console.error);

