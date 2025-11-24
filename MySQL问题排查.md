# MySQL 连接问题排查指南

## 常见错误及解决方案

### 错误 1045: Access denied (访问被拒绝)

这个错误通常表示用户名或密码不正确。

#### 解决方案 1: 使用测试工具诊断

```bash
node server/database/test-connection.js
```

这个工具会：
- 测试不同的连接配置
- 自动检测可用的配置
- 提供正确的 .env 配置建议

#### 解决方案 2: 检查 MySQL 服务状态

**macOS (使用 Homebrew):**
```bash
# 检查 MySQL 状态
brew services list

# 如果未运行，启动 MySQL
brew services start mysql

# 或者使用 mysqld
brew services start mysql@8.0  # 根据你的版本调整
```

**Linux:**
```bash
sudo systemctl status mysql
sudo systemctl start mysql
```

**Windows:**
- 打开"服务"管理器
- 找到 MySQL 服务
- 确保它正在运行

#### 解决方案 3: 重置 MySQL root 密码

**macOS/Linux:**

1. 停止 MySQL 服务：
```bash
brew services stop mysql
# 或
sudo systemctl stop mysql
```

2. 以安全模式启动 MySQL（跳过权限检查）：
```bash
sudo mysqld_safe --skip-grant-tables &
```

3. 连接到 MySQL（无需密码）：
```bash
mysql -u root
```

4. 在 MySQL 中重置密码：
```sql
USE mysql;
UPDATE user SET authentication_string=PASSWORD('你的新密码') WHERE User='root';
FLUSH PRIVILEGES;
EXIT;
```

5. 重启 MySQL 服务：
```bash
brew services restart mysql
# 或
sudo systemctl restart mysql
```

#### 解决方案 4: 使用无密码连接（如果 root 没有密码）

如果 MySQL root 用户没有设置密码，在 `.env` 文件中：

```env
DB_HOST=localhost
DB_USER=root
DB_PASSWORD=
DB_NAME=dish_accounting
DB_PORT=3306
PORT=5000
```

注意：`DB_PASSWORD=` 后面留空。

#### 解决方案 5: 创建新的 MySQL 用户

如果你不想使用 root 用户，可以创建一个新用户：

1. 以 root 身份登录 MySQL（如果可能）：
```bash
mysql -u root
```

2. 创建新用户和数据库：
```sql
CREATE USER 'dish_user'@'localhost' IDENTIFIED BY '你的密码';
CREATE DATABASE dish_accounting CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
GRANT ALL PRIVILEGES ON dish_accounting.* TO 'dish_user'@'localhost';
FLUSH PRIVILEGES;
EXIT;
```

3. 在 `.env` 文件中使用新用户：
```env
DB_HOST=localhost
DB_USER=dish_user
DB_PASSWORD=你的密码
DB_NAME=dish_accounting
DB_PORT=3306
PORT=5000
```

## 快速测试连接

### 方法 1: 使用测试脚本
```bash
node server/database/test-connection.js
```

### 方法 2: 直接测试 MySQL 连接
```bash
# 测试无密码连接
mysql -u root

# 测试带密码连接
mysql -u root -p

# 测试特定用户
mysql -u 用户名 -p
```

### 方法 3: 使用 Node.js 快速测试
```bash
node -e "
const mysql = require('mysql2/promise');
(async () => {
  try {
    const conn = await mysql.createConnection({
      host: 'localhost',
      user: 'root',
      password: '',  // 在这里填入密码，或留空
    });
    console.log('✅ 连接成功！');
    await conn.end();
  } catch (e) {
    console.log('❌ 连接失败:', e.message);
  }
})();
"
```

## 检查 MySQL 安装

### macOS
```bash
# 检查是否安装
which mysql
mysql --version

# 如果未安装，使用 Homebrew 安装
brew install mysql
brew services start mysql
```

### Linux
```bash
# 检查是否安装
mysql --version

# 如果未安装
sudo apt-get update
sudo apt-get install mysql-server
```

## 验证数据库初始化

连接成功后，验证数据库和表：

```bash
mysql -u root -p -e "
SHOW DATABASES;
USE dish_accounting;
SHOW TABLES;
DESCRIBE transactions;
"
```

## 获取帮助

如果以上方法都不行，请提供以下信息：

1. MySQL 版本：`mysql --version`
2. 操作系统：`uname -a` (macOS/Linux) 或系统信息 (Windows)
3. MySQL 服务状态
4. 错误信息的完整内容

