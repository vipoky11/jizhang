require('dotenv').config();

// 完全使用 SQLite 数据库
const sqliteDb = require('./database-sqlite');
const db = sqliteDb;
const promise = sqliteDb.promise;
const useSqlite = true;

console.log('使用 SQLite 数据库');

module.exports = db;
module.exports.promise = promise;
module.exports.useSqlite = useSqlite;

