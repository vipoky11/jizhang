# SQLite 数据库文件位置说明

## 📍 数据库文件位置

SQLite 数据库文件的位置取决于运行环境：

### 1. 桌面客户端（Electron）

**Mac:**
```
~/Library/Application Support/记账系统/accounting.db
```

**Windows:**
```
%APPDATA%/记账系统/accounting.db
```

**Linux:**
```
~/.config/记账系统/accounting.db
```

### 2. Web 开发模式（非 Electron）

**项目目录:**
```
项目根目录/data/accounting.db
```

例如：
```
/Users/hair/Documents/菜品记账系统/data/accounting.db
```

---

## 🔍 如何查找数据库文件

### Mac 系统

```bash
# 方法 1：使用 Finder
open ~/Library/Application\ Support/记账系统/

# 方法 2：使用终端
ls -la ~/Library/Application\ Support/记账系统/accounting.db

# 方法 3：查找所有可能的位置
find ~/Library/Application\ Support -name "accounting.db" 2>/dev/null
find ~/Documents/菜品记账系统 -name "accounting.db" 2>/dev/null
```

### Windows 系统

```cmd
# 在文件资源管理器中打开
%APPDATA%\记账系统\

# 或在 PowerShell 中
Get-ChildItem "$env:APPDATA\记账系统\accounting.db"
```

### Linux 系统

```bash
ls -la ~/.config/记账系统/accounting.db
```

---

## 📋 数据库文件信息

- **文件名**: `accounting.db`
- **文件类型**: SQLite 3 数据库
- **大小**: 根据数据量变化（初始很小，几 KB）
- **创建时间**: 首次运行应用时自动创建

---

## 💾 数据备份

### 备份数据库

直接复制 `.db` 文件即可：

**Mac:**
```bash
cp ~/Library/Application\ Support/记账系统/accounting.db ~/Desktop/accounting_backup.db
```

**Windows:**
```cmd
copy "%APPDATA%\记账系统\accounting.db" "%USERPROFILE%\Desktop\accounting_backup.db"
```

### 恢复数据库

将备份文件复制回原位置即可。

---

## 🔧 查看数据库内容

可以使用 SQLite 工具查看数据库：

```bash
# 安装 SQLite（如果还没安装）
# Mac: brew install sqlite3
# Ubuntu: sudo apt-get install sqlite3

# 打开数据库
sqlite3 ~/Library/Application\ Support/记账系统/accounting.db

# 查看所有表
.tables

# 查看表结构
.schema transactions

# 查询数据
SELECT * FROM transactions LIMIT 10;

# 退出
.quit
```

---

## ⚠️ 注意事项

1. **不要手动删除数据库文件**：除非确定要清空所有数据
2. **备份重要**：定期备份数据库文件
3. **文件权限**：确保应用有读写权限
4. **多实例**：如果同时运行多个实例，它们会共享同一个数据库文件

---

## 🐛 常见问题

### 问题 1：找不到数据库文件

**原因**：应用还没有运行过，数据库文件尚未创建

**解决**：运行一次应用，数据库文件会自动创建

### 问题 2：数据库文件损坏

**解决**：
1. 如果有备份，恢复备份文件
2. 如果没有备份，可能需要重新初始化（会丢失数据）

### 问题 3：想重置数据库

**解决**：
1. 关闭应用
2. 删除数据库文件
3. 重新运行应用，会自动创建新的数据库

---

## 📝 相关文件

- 数据库配置：`server/config/database-sqlite.js`
- 初始化脚本：`server/database/init-sqlite.js`

