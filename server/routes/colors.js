const express = require('express');
const router = express.Router();
const db = require('../config/database').promise;

// 获取所有颜色
router.get('/', async (req, res) => {
  try {
    const [rows] = await db.query(
      'SELECT * FROM colors ORDER BY sort_order ASC, id ASC'
    );
    res.json({ success: true, data: rows });
  } catch (error) {
    console.error('获取颜色失败:', error);
    res.status(500).json({ success: false, message: '获取颜色失败' });
  }
});

// 创建颜色
router.post('/', async (req, res) => {
  try {
    const { name, hex, sort_order } = req.body;

    if (!name || !name.trim()) {
      return res.status(400).json({ success: false, message: '颜色名称不能为空' });
    }
    if (!hex || !hex.trim()) {
      return res.status(400).json({ success: false, message: '颜色值不能为空' });
    }

    // 验证hex格式
    const hexPattern = /^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/;
    if (!hexPattern.test(hex.trim())) {
      return res.status(400).json({ success: false, message: '颜色值格式不正确，应为#RRGGBB格式' });
    }

    const [result] = await db.query(
      'INSERT INTO colors (name, hex, sort_order) VALUES (?, ?, ?)',
      [name.trim(), hex.trim().toUpperCase(), sort_order || 0]
    );

    res.json({ 
      success: true, 
      message: '创建成功',
      data: { id: result.insertId }
    });
  } catch (error) {
    if (error.code === 'ER_DUP_ENTRY') {
      return res.status(400).json({ success: false, message: '颜色名称或颜色值已存在' });
    }
    console.error('创建颜色失败:', error);
    res.status(500).json({ success: false, message: '创建颜色失败' });
  }
});

// 更新颜色
router.put('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { name, hex, sort_order } = req.body;

    if (!name || !name.trim()) {
      return res.status(400).json({ success: false, message: '颜色名称不能为空' });
    }
    if (!hex || !hex.trim()) {
      return res.status(400).json({ success: false, message: '颜色值不能为空' });
    }

    // 验证hex格式
    const hexPattern = /^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/;
    if (!hexPattern.test(hex.trim())) {
      return res.status(400).json({ success: false, message: '颜色值格式不正确，应为#RRGGBB格式' });
    }

    const [result] = await db.query(
      'UPDATE colors SET name = ?, hex = ?, sort_order = ? WHERE id = ?',
      [name.trim(), hex.trim().toUpperCase(), sort_order || 0, id]
    );

    if (result.affectedRows === 0) {
      return res.status(404).json({ success: false, message: '颜色不存在' });
    }

    res.json({ success: true, message: '更新成功' });
  } catch (error) {
    if (error.code === 'ER_DUP_ENTRY') {
      return res.status(400).json({ success: false, message: '颜色名称或颜色值已存在' });
    }
    console.error('更新颜色失败:', error);
    res.status(500).json({ success: false, message: '更新颜色失败' });
  }
});

// 删除颜色
router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    
    // 检查是否有备忘录使用此颜色
    const [memos] = await db.query(
      'SELECT COUNT(*) as count FROM memos WHERE color = (SELECT hex FROM colors WHERE id = ?)',
      [id]
    );
    
    if (memos[0].count > 0) {
      return res.status(400).json({ 
        success: false, 
        message: `该颜色正在被 ${memos[0].count} 个备忘录使用，无法删除` 
      });
    }

    const [result] = await db.query('DELETE FROM colors WHERE id = ?', [id]);

    if (result.affectedRows === 0) {
      return res.status(404).json({ success: false, message: '颜色不存在' });
    }

    res.json({ success: true, message: '删除成功' });
  } catch (error) {
    console.error('删除颜色失败:', error);
    res.status(500).json({ success: false, message: '删除颜色失败' });
  }
});

module.exports = router;

