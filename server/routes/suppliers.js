const express = require('express');
const router = express.Router();
const db = require('../config/database').promise;

// 获取所有供应商
router.get('/', async (req, res) => {
  try {
    const [rows] = await db.query(
      'SELECT * FROM suppliers ORDER BY id ASC'
    );
    res.json({ success: true, data: rows });
  } catch (error) {
    console.error('❌ 获取供应商失败:', error);
    console.error('错误消息:', error.message);
    console.error('错误堆栈:', error.stack);
    res.status(500).json({ 
      success: false, 
      message: '获取供应商失败',
      error: error.message 
    });
  }
});

// 创建供应商
router.post('/', async (req, res) => {
  try {
    const { name } = req.body;

    if (!name || !name.trim()) {
      return res.status(400).json({ success: false, message: '供应商名称不能为空' });
    }

    const [result] = await db.query(
      'INSERT INTO suppliers (name) VALUES (?)',
      [name.trim()]
    );

    res.json({ 
      success: true, 
      message: '创建成功',
      data: { id: result.insertId }
    });
  } catch (error) {
    if (error.code === 'ER_DUP_ENTRY') {
      return res.status(400).json({ success: false, message: '供应商名称已存在' });
    }
    console.error('创建供应商失败:', error);
    res.status(500).json({ success: false, message: '创建供应商失败' });
  }
});

// 更新供应商
router.put('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { name } = req.body;

    if (!name || !name.trim()) {
      return res.status(400).json({ success: false, message: '供应商名称不能为空' });
    }

    const [result] = await db.query(
      'UPDATE suppliers SET name = ? WHERE id = ?',
      [name.trim(), id]
    );

    if (result.affectedRows === 0) {
      return res.status(404).json({ success: false, message: '供应商不存在' });
    }

    res.json({ success: true, message: '更新成功' });
  } catch (error) {
    if (error.code === 'ER_DUP_ENTRY') {
      return res.status(400).json({ success: false, message: '供应商名称已存在' });
    }
    console.error('更新供应商失败:', error);
    res.status(500).json({ success: false, message: '更新供应商失败' });
  }
});

// 删除供应商
router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    
    // 检查是否有交易记录使用此供应商
    const [transactions] = await db.query(
      'SELECT COUNT(*) as count FROM transactions WHERE supplier = (SELECT name FROM suppliers WHERE id = ?)',
      [id]
    );

    if (transactions[0].count > 0) {
      return res.status(400).json({ 
        success: false, 
        message: `该供应商已被 ${transactions[0].count} 条交易记录使用，无法删除` 
      });
    }

    const [result] = await db.query('DELETE FROM suppliers WHERE id = ?', [id]);

    if (result.affectedRows === 0) {
      return res.status(404).json({ success: false, message: '供应商不存在' });
    }

    res.json({ success: true, message: '删除成功' });
  } catch (error) {
    console.error('删除供应商失败:', error);
    res.status(500).json({ success: false, message: '删除供应商失败' });
  }
});

module.exports = router;

