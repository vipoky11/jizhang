-- 为备忘录表添加日期字段
ALTER TABLE memos 
ADD COLUMN memo_date DATE DEFAULT (CURDATE()) COMMENT '备忘录日期';

