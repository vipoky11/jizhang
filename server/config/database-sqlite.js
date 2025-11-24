const Database = require('better-sqlite3');
const path = require('path');
const fs = require('fs');

// 获取数据库文件路径
// 在 Electron 环境中，使用用户数据目录；否则使用项目目录
function getDbPath() {
  // 检查是否在 Electron 环境中（通过环境变量判断）
  if (process.env.ELECTRON_USER_DATA) {
    // Electron 环境，使用用户数据目录
    const userDataPath = process.env.ELECTRON_USER_DATA;
    const dbDir = path.join(userDataPath, 'accounting.db');
    return dbDir;
  }

  // 尝试从 Electron app 获取路径（在主进程中）
  try {
    const { app } = require('electron');
    if (app) {
      const userDataPath = app.getPath('userData');
      return path.join(userDataPath, 'accounting.db');
    }
  } catch (e) {
    // 不在 Electron 主进程中
  }

  // 如果设置了 USE_CLIENT_DB 环境变量，开发模式也使用客户端数据库位置
  if (process.env.USE_CLIENT_DB === 'true') {
    const os = require('os');
    const platform = process.platform;
    let userDataPath;
    
    if (platform === 'darwin') {
      // Mac
      userDataPath = path.join(os.homedir(), 'Library', 'Application Support', 'dish-accounting-system');
    } else if (platform === 'win32') {
      // Windows
      userDataPath = path.join(process.env.APPDATA || path.join(os.homedir(), 'AppData', 'Roaming'), 'dish-accounting-system');
    } else {
      // Linux
      userDataPath = path.join(os.homedir(), '.config', 'dish-accounting-system');
    }
    
    if (!fs.existsSync(userDataPath)) {
      fs.mkdirSync(userDataPath, { recursive: true });
    }
    return path.join(userDataPath, 'accounting.db');
  }

  // 默认使用项目目录下的 data 文件夹
  const dataDir = path.join(__dirname, '../../data');
  if (!fs.existsSync(dataDir)) {
    fs.mkdirSync(dataDir, { recursive: true });
  }
  return path.join(dataDir, 'accounting.db');
}

const dbPath = getDbPath();

// 创建数据库连接
let db;
try {
  db = new Database(dbPath);
  console.log(`✅ SQLite 数据库连接成功: ${dbPath}`);
} catch (error) {
  console.error(`❌ SQLite 数据库连接失败: ${dbPath}`, error);
  throw error;
}

// 启用外键约束
db.pragma('foreign_keys = ON');

// 启用 WAL 模式（提高并发性能）
db.pragma('journal_mode = WAL');

console.log(`SQLite 数据库路径: ${dbPath}`);

// 将 SQL 文件中的 MySQL 特定语法转换为 SQLite 兼容语法
// 注意：系统现在完全使用 SQLite，此函数仅用于清理 SQL 文件中的 MySQL 特定语法
function mysqlToSqlite(sql) {
  // 先移除注释行（以 -- 开头的行）
  let converted = sql
    .split('\n')
    .filter(line => !line.trim().startsWith('--'))
    .join('\n');
  
  // 然后进行语法转换
  converted = converted
    // 移除数据库创建语句
    .replace(/CREATE DATABASE[^;]+;/gi, '')
    .replace(/USE[^;]+;/gi, '')
    // 移除所有 COLLATE 子句（包括字段级别的）
    .replace(/\s+COLLATE\s+[^\s,)]+/gi, '')
    // AUTO_INCREMENT 转换 - 必须处理 PRIMARY KEY 的情况
    // 先处理 "id INT AUTO_INCREMENT PRIMARY KEY" 这种情况（完整匹配）
    .replace(/(\w+)\s+INT\s+AUTO_INCREMENT\s+PRIMARY\s+KEY/gi, '$1 INTEGER PRIMARY KEY AUTOINCREMENT')
    // 再处理 "INT AUTO_INCREMENT"（没有 PRIMARY KEY 的情况）
    .replace(/INT\s+AUTO_INCREMENT/gi, 'INTEGER')
    // 最后处理单独的 AUTO_INCREMENT（其他情况）
    .replace(/\bAUTO_INCREMENT\b/gi, 'AUTOINCREMENT')
    // TIMESTAMP 转换
    .replace(/TIMESTAMP\s+DEFAULT\s+CURRENT_TIMESTAMP/gi, 'DATETIME DEFAULT CURRENT_TIMESTAMP')
    .replace(/\s+ON\s+UPDATE\s+CURRENT_TIMESTAMP/gi, '')
    // 移除 MySQL 特定语法（虽然系统完全使用 SQLite，但 SQL 文件中可能仍包含这些语法）
    .replace(/ENGINE\s*=\s*InnoDB/gi, '')
    .replace(/DEFAULT\s+CHARSET\s*=\s*utf8mb4/gi, '')
    .replace(/COLLATE\s+utf8mb4_unicode_ci/gi, '')
    .replace(/CHARACTER\s+SET\s+utf8mb4/gi, '')
    // 移除表定义末尾的 MySQL 特定语法（在 ) 后面的）
    .replace(/\)\s*ENGINE[^;]*/gi, ')')
    .replace(/\)\s*DEFAULT\s+CHARSET[^;]*/gi, ')')
    .replace(/\)\s*COLLATE[^;]*/gi, ')')
    .replace(/\)\s*COMMENT\s*=\s*['"][^'"]*['"]/gi, ')')
    // ENUM 转为 TEXT
    .replace(/ENUM\([^)]+\)/gi, 'TEXT')
    // TINYINT(1) 转为 INTEGER
    .replace(/TINYINT\(1\)/gi, 'INTEGER')
    // 移除 COMMENT（包括单引号和双引号）- 必须确保不影响 DEFAULT 子句
    .replace(/\s+COMMENT\s+['"][^'"]*['"]/gi, '')
    // 处理 UNIQUE KEY
    .replace(/UNIQUE\s+KEY\s+(\w+)\s*\(([^)]+)\)/gi, 'UNIQUE($2)')
    // 处理普通索引（在 CREATE TABLE 语句中）- 更精确的匹配
    .replace(/,\s*INDEX\s+\w+\s*\([^)]+\)/gi, '')
    // 清理多余的逗号（在行尾或括号前）
    .replace(/,\s*,/g, ',')
    .replace(/,\s*\)/g, ')')
    .replace(/\(\s*,/g, '(')
    // 清理多余的空格（但保留换行符）
    .replace(/[ \t]+/g, ' ')
    .replace(/\n\s*\n/g, '\n')
    .trim();

  // 处理 ON DUPLICATE KEY UPDATE（转换为 INSERT OR REPLACE）
  if (converted.includes('ON DUPLICATE KEY UPDATE')) {
    const match = converted.match(/INSERT\s+(?:INTO\s+)?(\w+)\s*\(([^)]+)\)\s*VALUES\s*\(([^)]+)\)\s*ON DUPLICATE KEY UPDATE\s+(.+)/i);
    if (match) {
      const [, table, columns, values, updateClause] = match;
      // 提取要更新的字段
      const updates = updateClause.split(',').map(u => u.trim()).filter(u => u);
      const setClause = updates.map(u => {
        const [field] = u.split('=');
        return `${field.trim()}=excluded.${field.trim()}`;
      }).join(', ');
      
      converted = `INSERT INTO ${table} (${columns}) VALUES (${values}) ON CONFLICT(${columns.split(',')[0].trim()}) DO UPDATE SET ${setClause}`;
    }
  }

  return converted;
}

// 提供类似 MySQL 的 promise 接口（为了兼容现有代码）
const promise = {
  query: async (sql, params = []) => {
    try {
      // 处理 SELECT 查询
      if (sql.trim().toUpperCase().startsWith('SELECT')) {
        const stmt = db.prepare(sql);
        const rows = stmt.all(params);
        return [rows];
      }
      // 处理 INSERT 查询
      else if (sql.trim().toUpperCase().startsWith('INSERT')) {
        // 转换 SQL 中的 ON DUPLICATE KEY UPDATE
        let insertSql = sql;
        if (sql.includes('ON DUPLICATE KEY UPDATE')) {
          // 简化处理：转换为 INSERT OR REPLACE
          insertSql = sql.replace(/ON DUPLICATE KEY UPDATE[^;]+/gi, '');
          // 如果表有 UNIQUE 约束，SQLite 会自动处理冲突
        }
        const convertedSql = mysqlToSqlite(insertSql);
        const stmt = db.prepare(convertedSql);
        const result = stmt.run(params);
        return [{ insertId: result.lastInsertRowid, affectedRows: result.changes }];
      }
      // 处理 UPDATE/DELETE 查询
      else if (sql.trim().toUpperCase().startsWith('UPDATE') || 
               sql.trim().toUpperCase().startsWith('DELETE')) {
        const stmt = db.prepare(sql);
        const result = stmt.run(params);
        return [{ affectedRows: result.changes, insertId: null }];
      }
      // 处理其他查询（CREATE TABLE 等）
      else {
        const convertedSql = mysqlToSqlite(sql);
        // 处理多语句
        const statements = convertedSql.split(';').filter(s => s.trim());
        for (const statement of statements) {
          if (statement.trim()) {
            db.exec(statement);
          }
        }
        return [{ affectedRows: 0, insertId: null }];
      }
    } catch (error) {
      console.error('SQLite 查询错误:', error);
      console.error('SQL:', sql);
      console.error('参数:', params);
      throw error;
    }
  },
  
  // 执行原始 SQL（用于初始化脚本）
  execute: async (sql) => {
    try {
      const convertedSql = mysqlToSqlite(sql);
      const statements = convertedSql.split(';').filter(s => s.trim());
      for (const statement of statements) {
        if (statement.trim()) {
          db.exec(statement);
        }
      }
    } catch (error) {
      console.error('SQLite 执行错误:', error);
      throw error;
    }
  }
};

// 提供同步接口（用于初始化）
db.querySync = (sql, params = []) => {
  try {
    if (sql.trim().toUpperCase().startsWith('SELECT')) {
      const stmt = db.prepare(sql);
      return stmt.all(params);
    } else {
      const stmt = db.prepare(sql);
      return stmt.run(params);
    }
  } catch (error) {
    console.error('SQLite 同步查询错误:', error);
    throw error;
  }
};

module.exports = {
  db,
  promise,
  mysqlToSqlite,
  dbPath,
  getConnection: (callback) => {
    // 兼容 MySQL 的 getConnection 接口
    callback(null, {
      query: (sql, params, cb) => {
        promise.query(sql, params)
          .then(result => cb(null, result))
          .catch(err => cb(err));
      },
      release: () => {}
    });
  }
};

