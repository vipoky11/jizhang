-- 创建颜色表
CREATE TABLE IF NOT EXISTS colors (
  id INT AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(50) NOT NULL UNIQUE COMMENT '颜色名称',
  hex VARCHAR(20) NOT NULL UNIQUE COMMENT '颜色值（hex）',
  sort_order INT DEFAULT 0 COMMENT '排序',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
  INDEX idx_sort_order (sort_order)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='颜色表';

-- 插入默认颜色
INSERT INTO colors (name, hex, sort_order) VALUES
('蓝色', '#1890ff', 1),
('绿色', '#52c41a', 2),
('红色', '#ff4d4f', 3),
('橙色', '#faad14', 4),
('紫色', '#722ed1', 5),
('粉色', '#eb2f96', 6),
('青色', '#13c2c2', 7),
('深橙', '#fa8c16', 8)
ON DUPLICATE KEY UPDATE name=name;

