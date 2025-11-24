const express = require('express');
const router = express.Router();
const db = require('../config/database').promise;

// 获取所有备忘录
router.get('/', async (req, res) => {
  try {
    const { search, tag, priority, startDate, endDate, sortBy, sortOrder } = req.query;
    let query = 'SELECT * FROM memos WHERE 1=1';
    const params = [];

    // 搜索标题和内容
    if (search) {
      query += ' AND (title LIKE ? OR content LIKE ?)';
      const searchPattern = `%${search}%`;
      params.push(searchPattern, searchPattern);
    }

    // 按标签筛选（SQLite 兼容语法）
    if (tag) {
      // SQLite 不支持 FIND_IN_SET，使用 LIKE 或 INSTR
      query += ' AND (tags LIKE ? OR tags LIKE ? OR tags = ?)';
      params.push(`%,${tag},%`, `${tag},%`, tag);
    }

    // 按优先级筛选
    if (priority !== undefined && priority !== '') {
      query += ' AND priority = ?';
      params.push(parseInt(priority));
    }

    // 按日期范围筛选
    if (startDate) {
      query += ' AND memo_date >= ?';
      params.push(startDate);
    }
    if (endDate) {
      query += ' AND memo_date <= ?';
      params.push(endDate);
    }

    // 排序
    const validSortFields = ['memo_date', 'created_at', 'updated_at', 'priority', 'title'];
    const sortField = validSortFields.includes(sortBy) ? sortBy : 'priority';
    const sortDir = sortOrder === 'asc' ? 'ASC' : 'DESC';
    
    // 默认排序：优先级降序，然后按创建时间降序
    if (sortField === 'priority') {
      query += ` ORDER BY priority ${sortDir}, created_at DESC`;
    } else {
      query += ` ORDER BY ${sortField} ${sortDir}`;
    }

    const [rows] = await db.query(query, params);
    res.json({ success: true, data: rows });
  } catch (error) {
    console.error('获取备忘录失败:', error);
    res.status(500).json({ success: false, message: '获取备忘录失败' });
  }
});

// 获取单个备忘录
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const [rows] = await db.query('SELECT * FROM memos WHERE id = ?', [id]);
    
    if (rows.length === 0) {
      return res.status(404).json({ success: false, message: '备忘录不存在' });
    }
    
    res.json({ success: true, data: rows[0] });
  } catch (error) {
    console.error('获取备忘录失败:', error);
    res.status(500).json({ success: false, message: '获取备忘录失败' });
  }
});

// 创建备忘录
router.post('/', async (req, res) => {
  try {
    const { title, content, tags, color, priority, memo_date } = req.body;
    
    console.log('创建备忘录 - 接收到的数据:', {
      title,
      color,
      priority,
      memo_date,
      tags
    });

    // 验证必填字段
    if (!title || !title.trim()) {
      return res.status(400).json({ success: false, message: '标题不能为空' });
    }
    if (!content || !content.trim()) {
      return res.status(400).json({ success: false, message: '内容不能为空' });
    }

    // 处理标签（去除空格，转换为逗号分隔的字符串）
    const tagsStr = Array.isArray(tags) 
      ? tags.map(t => t.trim()).filter(t => t).join(',')
      : (tags || '').split(',').map(t => t.trim()).filter(t => t).join(',');

    // 处理日期：确保格式为 YYYY-MM-DD
    let dateValue = new Date().toISOString().split('T')[0]; // 默认今天
    if (memo_date) {
      // 如果是 ISO 格式，提取日期部分
      if (memo_date.includes('T')) {
        dateValue = memo_date.split('T')[0];
      } else if (memo_date.match(/^\d{4}-\d{2}-\d{2}$/)) {
        dateValue = memo_date;
      } else {
        // 尝试解析其他格式
        const date = new Date(memo_date);
        if (!isNaN(date.getTime())) {
          dateValue = date.toISOString().split('T')[0];
        }
      }
    }

    const [result] = await db.query(
      'INSERT INTO memos (title, content, tags, color, priority, memo_date) VALUES (?, ?, ?, ?, ?, ?)',
      [title.trim(), content.trim(), tagsStr, null, priority || 0, dateValue]
    );

    res.json({ 
      success: true, 
      message: '创建成功',
      data: { id: result.insertId }
    });
  } catch (error) {
    console.error('创建备忘录失败:', error);
    console.error('错误堆栈:', error.stack);
    res.status(500).json({ 
      success: false, 
      message: '创建备忘录失败',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

// 更新备忘录
router.put('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { title, content, tags, color, priority, memo_date } = req.body;
    
    console.log('更新备忘录 - 接收到的数据:', {
      id,
      title,
      color,
      priority,
      memo_date,
      tags
    });

    // 验证必填字段
    if (!title || !title.trim()) {
      return res.status(400).json({ success: false, message: '标题不能为空' });
    }
    if (!content || !content.trim()) {
      return res.status(400).json({ success: false, message: '内容不能为空' });
    }

    // 处理标签
    const tagsStr = Array.isArray(tags) 
      ? tags.map(t => t.trim()).filter(t => t).join(',')
      : (tags || '').split(',').map(t => t.trim()).filter(t => t).join(',');

    // 处理日期：确保格式为 YYYY-MM-DD
    let dateValue = new Date().toISOString().split('T')[0]; // 默认今天
    if (memo_date) {
      // 如果是 ISO 格式，提取日期部分
      if (memo_date.includes('T')) {
        dateValue = memo_date.split('T')[0];
      } else if (memo_date.match(/^\d{4}-\d{2}-\d{2}$/)) {
        dateValue = memo_date;
      } else {
        // 尝试解析其他格式
        const date = new Date(memo_date);
        if (!isNaN(date.getTime())) {
          dateValue = date.toISOString().split('T')[0];
        }
      }
    }

    const [result] = await db.query(
      'UPDATE memos SET title = ?, content = ?, tags = ?, color = ?, priority = ?, memo_date = ? WHERE id = ?',
      [title.trim(), content.trim(), tagsStr, null, priority || 0, dateValue, id]
    );

    if (result.affectedRows === 0) {
      return res.status(404).json({ success: false, message: '备忘录不存在' });
    }

    res.json({ success: true, message: '更新成功' });
  } catch (error) {
    console.error('更新备忘录失败:', error);
    res.status(500).json({ success: false, message: '更新备忘录失败' });
  }
});

// 删除备忘录
router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const [result] = await db.query('DELETE FROM memos WHERE id = ?', [id]);

    if (result.affectedRows === 0) {
      return res.status(404).json({ success: false, message: '备忘录不存在' });
    }

    res.json({ success: true, message: '删除成功' });
  } catch (error) {
    console.error('删除备忘录失败:', error);
    res.status(500).json({ success: false, message: '删除备忘录失败' });
  }
});

// 批量删除备忘录
router.post('/batch-delete', async (req, res) => {
  try {
    const { ids } = req.body;
    
    if (!Array.isArray(ids) || ids.length === 0) {
      return res.status(400).json({ success: false, message: '请选择要删除的备忘录' });
    }

    // 构建批量删除查询
    const placeholders = ids.map(() => '?').join(',');
    const [result] = await db.query(`DELETE FROM memos WHERE id IN (${placeholders})`, ids);

    res.json({ 
      success: true, 
      message: `成功删除 ${result.affectedRows} 条备忘录`,
      deletedCount: result.affectedRows
    });
  } catch (error) {
    console.error('批量删除备忘录失败:', error);
    res.status(500).json({ success: false, message: '批量删除备忘录失败' });
  }
});

// 获取统计信息
router.get('/stats/summary', async (req, res) => {
  try {
    const [totalResult] = await db.query('SELECT COUNT(*) as total FROM memos');
    const [correctResult] = await db.query('SELECT COUNT(*) as count FROM memos WHERE priority = 0');
    const [wrongResult] = await db.query('SELECT COUNT(*) as count FROM memos WHERE priority = 1');
    
    const stats = {
      total: totalResult[0]?.total || 0,
      correct: correctResult[0]?.count || 0,
      wrong: wrongResult[0]?.count || 0,
    };

    res.json({ success: true, data: stats });
  } catch (error) {
    console.error('获取统计信息失败:', error);
    res.status(500).json({ success: false, message: '获取统计信息失败' });
  }
});

module.exports = router;

