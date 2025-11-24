const express = require('express');
const router = express.Router();
const db = require('../config/database').promise;

// 获取所有分类
router.get('/', async (req, res) => {
  try {
    const { type } = req.query;
    let query = 'SELECT * FROM categories';
    const params = [];

    if (type && type !== 'both') {
      query += ' WHERE type = ? OR type = ?';
      params.push(type, 'both');
    }

    query += ' ORDER BY sort_order ASC, id ASC';

    const [rows] = await db.query(query, params);
    res.json({ success: true, data: rows });
  } catch (error) {
    console.error('❌ 获取分类失败:', error);
    console.error('错误消息:', error.message);
    console.error('错误堆栈:', error.stack);
    res.status(500).json({ 
      success: false, 
      message: '获取分类失败',
      error: error.message 
    });
  }
});

// 创建分类
router.post('/', async (req, res) => {
  try {
    const { name, color, sort_order } = req.body;
    
    if (!name) {
      return res.status(400).json({ 
        success: false, 
        message: '分类名称为必填项' 
      });
    }

    const [result] = await db.query(
      'INSERT INTO categories (name, type, color, sort_order) VALUES (?, ?, ?, ?)',
      [name, 'both', color || '#1890ff', sort_order || 0]
    );

    res.json({ 
      success: true, 
      message: '分类创建成功',
      data: { id: result.insertId }
    });
  } catch (error) {
    if (error.code === 'ER_DUP_ENTRY') {
      return res.status(400).json({ 
        success: false, 
        message: '分类名称已存在' 
      });
    }
    console.error('创建分类失败:', error);
    res.status(500).json({ success: false, message: '创建分类失败' });
  }
});

// 更新分类
router.put('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { name, color, sort_order } = req.body;

    if (!name) {
      return res.status(400).json({ 
        success: false, 
        message: '分类名称为必填项' 
      });
    }

    const [result] = await db.query(
      'UPDATE categories SET name = ?, color = ?, sort_order = ? WHERE id = ?',
      [name, color || '#1890ff', sort_order || 0, id]
    );

    if (result.affectedRows === 0) {
      return res.status(404).json({ success: false, message: '分类不存在' });
    }

    res.json({ success: true, message: '分类更新成功' });
  } catch (error) {
    if (error.code === 'ER_DUP_ENTRY') {
      return res.status(400).json({ 
        success: false, 
        message: '分类名称已存在' 
      });
    }
    console.error('更新分类失败:', error);
    res.status(500).json({ success: false, message: '更新分类失败' });
  }
});

// 删除分类
router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;

    // 检查是否有交易记录使用此分类
    const [transactions] = await db.query(
      'SELECT COUNT(*) as count FROM transactions WHERE category = (SELECT name FROM categories WHERE id = ?)',
      [id]
    );

    if (transactions[0].count > 0) {
      return res.status(400).json({ 
        success: false, 
        message: `该分类正在被 ${transactions[0].count} 条交易记录使用，无法删除` 
      });
    }

    const [result] = await db.query('DELETE FROM categories WHERE id = ?', [id]);

    if (result.affectedRows === 0) {
      return res.status(404).json({ success: false, message: '分类不存在' });
    }

    res.json({ success: true, message: '分类删除成功' });
  } catch (error) {
    console.error('删除分类失败:', error);
    res.status(500).json({ success: false, message: '删除分类失败' });
  }
});

module.exports = router;

