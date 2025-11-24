-- 创建账户表
USE dish_accounting;

CREATE TABLE IF NOT EXISTS accounts (
  id INT AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(50) NOT NULL COMMENT '账户名称',
  color VARCHAR(20) DEFAULT '#1890ff' COMMENT '账户颜色',
  sort_order INT DEFAULT 0 COMMENT '排序顺序',
  is_default TINYINT(1) DEFAULT 0 COMMENT '是否默认账户',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
  UNIQUE KEY uk_name (name),
  INDEX idx_default (is_default)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='账户表';

-- 注意：默认情况下不插入任何账户数据，用户需要手动添加

