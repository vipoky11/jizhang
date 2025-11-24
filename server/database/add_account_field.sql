-- 添加账户字段到交易记录表
USE dish_accounting;

-- 添加 account 字段
ALTER TABLE transactions 
ADD COLUMN account VARCHAR(50) DEFAULT '现金' COMMENT '账户名称：微信、支付宝、现金、银联、其他' 
AFTER category;

-- 添加索引
ALTER TABLE transactions 
ADD INDEX idx_account (account);

