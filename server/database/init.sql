-- 创建数据库
CREATE DATABASE IF NOT EXISTS dish_accounting CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

USE dish_accounting;

-- 创建交易记录表
CREATE TABLE IF NOT EXISTS transactions (
  id INT AUTO_INCREMENT PRIMARY KEY,
  type ENUM('income', 'expense') NOT NULL COMMENT '类型：收入或支出',
  amount DECIMAL(10, 2) NOT NULL COMMENT '金额',
  description VARCHAR(500) DEFAULT '' COMMENT '描述',
  date DATE NOT NULL COMMENT '日期',
  category VARCHAR(100) DEFAULT '' COMMENT '分类',
  account VARCHAR(50) DEFAULT '现金' COMMENT '账户名称：微信、支付宝、现金、银联、其他',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
  INDEX idx_date (date),
  INDEX idx_type (type),
  INDEX idx_account (account)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='交易记录表';

