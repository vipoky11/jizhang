-- 为交易记录表添加供应商字段
USE dish_accounting;

-- 添加 supplier 字段
ALTER TABLE transactions 
ADD COLUMN supplier VARCHAR(100) DEFAULT NULL COMMENT '供应商名称' 
AFTER account;

-- 添加索引
ALTER TABLE transactions 
ADD INDEX idx_supplier (supplier);

