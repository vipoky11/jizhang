const express = require('express');
const router = express.Router();
const db = require('../config/database').promise;

// 获取所有标签
router.get('/', async (req, res) => {
  try {
    const [rows] = await db.query(
      'SELECT * FROM tags ORDER BY sort_order ASC, id ASC'
    );
    res.json({ success: true, data: rows });
  } catch (error) {
    console.error('获取标签失败:', error);
    res.status(500).json({ success: false, message: '获取标签失败' });
  }
});

// 创建标签
router.post('/', async (req, res) => {
  try {
    const { name, color, sort_order } = req.body;

    if (!name || !name.trim()) {
      return res.status(400).json({ success: false, message: '标签名称不能为空' });
    }

    const [result] = await db.query(
      'INSERT INTO tags (name, color, sort_order) VALUES (?, ?, ?)',
      [name.trim(), color || '#1890ff', sort_order || 0]
    );

    res.json({ 
      success: true, 
      message: '创建成功',
      data: { id: result.insertId }
    });
  } catch (error) {
    if (error.code === 'ER_DUP_ENTRY') {
      return res.status(400).json({ success: false, message: '标签名称已存在' });
    }
    console.error('创建标签失败:', error);
    res.status(500).json({ success: false, message: '创建标签失败' });
  }
});

// 更新标签
router.put('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { name, color, sort_order } = req.body;

    if (!name || !name.trim()) {
      return res.status(400).json({ success: false, message: '标签名称不能为空' });
    }

    const [result] = await db.query(
      'UPDATE tags SET name = ?, color = ?, sort_order = ? WHERE id = ?',
      [name.trim(), color || '#1890ff', sort_order || 0, id]
    );

    if (result.affectedRows === 0) {
      return res.status(404).json({ success: false, message: '标签不存在' });
    }

    res.json({ success: true, message: '更新成功' });
  } catch (error) {
    if (error.code === 'ER_DUP_ENTRY') {
      return res.status(400).json({ success: false, message: '标签名称已存在' });
    }
    console.error('更新标签失败:', error);
    res.status(500).json({ success: false, message: '更新标签失败' });
  }
});

// 删除标签
router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const [result] = await db.query('DELETE FROM tags WHERE id = ?', [id]);

    if (result.affectedRows === 0) {
      return res.status(404).json({ success: false, message: '标签不存在' });
    }

    res.json({ success: true, message: '删除成功' });
  } catch (error) {
    console.error('删除标签失败:', error);
    res.status(500).json({ success: false, message: '删除标签失败' });
  }
});

module.exports = router;

