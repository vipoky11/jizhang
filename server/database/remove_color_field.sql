-- 移除备忘录表的颜色字段
-- 将color字段改为允许NULL，并移除默认值
ALTER TABLE memos 
MODIFY COLUMN color VARCHAR(20) DEFAULT NULL COMMENT '颜色标记（已废弃）';

