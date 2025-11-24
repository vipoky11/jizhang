const express = require('express');
const router = express.Router();
const db = require('../config/database').promise;

// 获取所有账户
router.get('/', async (req, res) => {
  try {
    const [rows] = await db.query(
      'SELECT * FROM accounts ORDER BY sort_order ASC, id ASC'
    );
    res.json({ success: true, data: rows });
  } catch (error) {
    console.error('❌ 获取账户失败:', error);
    console.error('错误消息:', error.message);
    console.error('错误堆栈:', error.stack);
    res.status(500).json({ 
      success: false, 
      message: '获取账户失败',
      error: error.message 
    });
  }
});

// 创建账户
router.post('/', async (req, res) => {
  try {
    const { name, color, sort_order, is_default } = req.body;
    
    if (!name) {
      return res.status(400).json({ 
        success: false, 
        message: '账户名称为必填项' 
      });
    }

    // 如果设置为默认账户，先取消其他默认账户
    if (is_default) {
      await db.query('UPDATE accounts SET is_default = 0 WHERE is_default = 1');
    }

    const [result] = await db.query(
      'INSERT INTO accounts (name, color, sort_order, is_default) VALUES (?, ?, ?, ?)',
      [name, color || '#1890ff', sort_order || 0, is_default ? 1 : 0]
    );

    res.json({ 
      success: true, 
      message: '账户创建成功',
      data: { id: result.insertId }
    });
  } catch (error) {
    if (error.code === 'ER_DUP_ENTRY') {
      return res.status(400).json({ 
        success: false, 
        message: '账户名称已存在' 
      });
    }
    console.error('创建账户失败:', error);
    res.status(500).json({ success: false, message: '创建账户失败' });
  }
});

// 更新账户
router.put('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { name, color, sort_order, is_default } = req.body;

    if (!name) {
      return res.status(400).json({ 
        success: false, 
        message: '账户名称为必填项' 
      });
    }

    // 如果设置为默认账户，先取消其他默认账户
    if (is_default) {
      await db.query('UPDATE accounts SET is_default = 0 WHERE is_default = 1 AND id != ?', [id]);
    }

    const [result] = await db.query(
      'UPDATE accounts SET name = ?, color = ?, sort_order = ?, is_default = ? WHERE id = ?',
      [name, color || '#1890ff', sort_order || 0, is_default ? 1 : 0, id]
    );

    if (result.affectedRows === 0) {
      return res.status(404).json({ success: false, message: '账户不存在' });
    }

    res.json({ success: true, message: '账户更新成功' });
  } catch (error) {
    if (error.code === 'ER_DUP_ENTRY') {
      return res.status(400).json({ 
        success: false, 
        message: '账户名称已存在' 
      });
    }
    console.error('更新账户失败:', error);
    res.status(500).json({ success: false, message: '更新账户失败' });
  }
});

// 删除账户
router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;

    // 检查是否有交易记录使用此账户
    const [transactions] = await db.query(
      'SELECT COUNT(*) as count FROM transactions WHERE account = (SELECT name FROM accounts WHERE id = ?)',
      [id]
    );

    if (transactions[0].count > 0) {
      return res.status(400).json({ 
        success: false, 
        message: `该账户正在被 ${transactions[0].count} 条交易记录使用，无法删除` 
      });
    }

    const [result] = await db.query('DELETE FROM accounts WHERE id = ?', [id]);

    if (result.affectedRows === 0) {
      return res.status(404).json({ success: false, message: '账户不存在' });
    }

    res.json({ success: true, message: '账户删除成功' });
  } catch (error) {
    console.error('删除账户失败:', error);
    res.status(500).json({ success: false, message: '删除账户失败' });
  }
});

// 设置默认账户
router.post('/:id/set-default', async (req, res) => {
  try {
    const { id } = req.params;

    // 先取消所有默认账户
    await db.query('UPDATE accounts SET is_default = 0');

    // 设置新的默认账户
    const [result] = await db.query('UPDATE accounts SET is_default = 1 WHERE id = ?', [id]);

    if (result.affectedRows === 0) {
      return res.status(404).json({ success: false, message: '账户不存在' });
    }

    res.json({ success: true, message: '默认账户设置成功' });
  } catch (error) {
    console.error('设置默认账户失败:', error);
    res.status(500).json({ success: false, message: '设置默认账户失败' });
  }
});

module.exports = router;

