const express = require('express');
const router = express.Router();
const db = require('../config/database').promise;

// 获取所有交易记录
router.get('/', async (req, res) => {
  try {
    console.log('📋 获取所有交易记录...');
    const [rows] = await db.query(
      'SELECT * FROM transactions ORDER BY date DESC, id DESC'
    );
    console.log(`✅ 获取到 ${rows.length} 条交易记录`);
    res.json({ success: true, data: rows });
  } catch (error) {
    console.error('❌ 获取交易记录失败:', error);
    console.error('错误消息:', error.message);
    console.error('错误堆栈:', error.stack);
    console.error('SQL 查询: SELECT * FROM transactions ORDER BY date DESC, id DESC');
    res.status(500).json({ 
      success: false, 
      message: '获取交易记录失败',
      error: error.message 
    });
  }
});

// 创建单条交易记录
router.post('/', async (req, res) => {
  try {
    const { type, amount, description, date, category, account, supplier } = req.body;
    
    if (!type || !amount || !date) {
      return res.status(400).json({ 
        success: false, 
        message: '类型、金额和日期为必填项' 
      });
    }

    if (!category || category.trim() === '') {
      return res.status(400).json({ 
        success: false, 
        message: '分类为必填项' 
      });
    }

    if (!supplier || supplier.trim() === '') {
      return res.status(400).json({ 
        success: false, 
        message: '供应商为必填项' 
      });
    }

    const [result] = await db.query(
      'INSERT INTO transactions (type, amount, description, date, category, account, supplier) VALUES (?, ?, ?, ?, ?, ?, ?)',
      [type, amount, description || '', date, category, account || '现金', supplier]
    );

    res.json({ 
      success: true, 
      message: '交易记录创建成功',
      data: { id: result.insertId }
    });
  } catch (error) {
    console.error('创建交易记录失败:', error);
    res.status(500).json({ success: false, message: '创建交易记录失败' });
  }
});

// 批量创建交易记录
router.post('/batch', async (req, res) => {
  try {
    const { transactions } = req.body;
    
    if (!Array.isArray(transactions) || transactions.length === 0) {
      return res.status(400).json({ 
        success: false, 
        message: '请提供有效的交易记录数组' 
      });
    }

    // 验证所有记录的分类是否都已填写
    const invalidCategoryTransactions = transactions.filter(t => !t.category || t.category.trim() === '');
    if (invalidCategoryTransactions.length > 0) {
      return res.status(400).json({ 
        success: false, 
        message: `有 ${invalidCategoryTransactions.length} 条记录的分类未填写，请填写完整后再提交` 
      });
    }

    // 验证所有记录的供应商是否都已填写
    const invalidSupplierTransactions = transactions.filter(t => !t.supplier || t.supplier.trim() === '');
    if (invalidSupplierTransactions.length > 0) {
      return res.status(400).json({ 
        success: false, 
        message: `有 ${invalidSupplierTransactions.length} 条记录的供应商未填写，请填写完整后再提交` 
      });
    }

    // SQLite 不支持 MySQL 的 VALUES ? 批量插入语法
    // 需要使用事务批量插入
    const { db: sqliteDb } = require('../config/database-sqlite');
    const insertStmt = sqliteDb.prepare(
      'INSERT INTO transactions (type, amount, description, date, category, account, supplier) VALUES (?, ?, ?, ?, ?, ?, ?)'
    );
    
    const insertMany = sqliteDb.transaction((transactions) => {
      for (const t of transactions) {
        insertStmt.run(
          t.type,
          t.amount,
          t.description || '',
          t.date,
          t.category,
          t.account || '现金',
          t.supplier
        );
      }
    });
    
    insertMany(transactions);

    res.json({ 
      success: true, 
      message: `成功创建 ${transactions.length} 条交易记录`,
      data: { insertedCount: transactions.length }
    });
  } catch (error) {
    console.error('批量创建交易记录失败:', error);
    res.status(500).json({ success: false, message: '批量创建交易记录失败' });
  }
});

// 更新交易记录
router.put('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { type, amount, description, date, category, account, supplier } = req.body;

    if (!category || category.trim() === '') {
      return res.status(400).json({ 
        success: false, 
        message: '分类为必填项' 
      });
    }

    if (!supplier || supplier.trim() === '') {
      return res.status(400).json({ 
        success: false, 
        message: '供应商为必填项' 
      });
    }

    const [result] = await db.query(
      'UPDATE transactions SET type = ?, amount = ?, description = ?, date = ?, category = ?, account = ?, supplier = ? WHERE id = ?',
      [type, amount, description || '', date, category, account || '现金', supplier, id]
    );

    if (result.affectedRows === 0) {
      return res.status(404).json({ success: false, message: '交易记录不存在' });
    }

    res.json({ success: true, message: '交易记录更新成功' });
  } catch (error) {
    console.error('更新交易记录失败:', error);
    res.status(500).json({ success: false, message: '更新交易记录失败' });
  }
});

// 删除交易记录
router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;

    const [result] = await db.query('DELETE FROM transactions WHERE id = ?', [id]);

    if (result.affectedRows === 0) {
      return res.status(404).json({ success: false, message: '交易记录不存在' });
    }

    res.json({ success: true, message: '交易记录删除成功' });
  } catch (error) {
    console.error('删除交易记录失败:', error);
    res.status(500).json({ success: false, message: '删除交易记录失败' });
  }
});

// 获取统计信息
router.get('/stats', async (req, res) => {
  try {
    const { startDate, endDate } = req.query;
    
    let query = `
      SELECT 
        type,
        SUM(amount) as total,
        COUNT(*) as count
      FROM transactions
    `;
    
    const params = [];
    if (startDate && endDate) {
      query += ' WHERE date BETWEEN ? AND ?';
      params.push(startDate, endDate);
    }
    
    query += ' GROUP BY type';

    console.log('📊 执行统计查询:', query);
    console.log('📊 查询参数:', params);
    
    const [rows] = await db.query(query, params);
    
    console.log('📊 查询结果:', rows);
    
    const stats = {
      income: 0,
      expense: 0,
      incomeCount: 0,
      expenseCount: 0
    };

    rows.forEach(row => {
      if (row.type === 'income') {
        stats.income = parseFloat(row.total) || 0;
        stats.incomeCount = row.count || 0;
      } else if (row.type === 'expense') {
        stats.expense = parseFloat(row.total) || 0;
        stats.expenseCount = row.count || 0;
      }
    });

    stats.balance = stats.income - stats.expense;

    res.json({ success: true, data: stats });
  } catch (error) {
    console.error('❌ 获取统计信息失败:', error);
    console.error('错误消息:', error.message);
    console.error('错误堆栈:', error.stack);
    res.status(500).json({ 
      success: false, 
      message: '获取统计信息失败',
      error: error.message 
    });
  }
});

// 获取财务分析数据
router.get('/analysis', async (req, res) => {
  try {
    const { startDate, endDate } = req.query;
    
    let whereClause = '';
    const params = [];
    if (startDate && endDate) {
      whereClause = ' WHERE date BETWEEN ? AND ?';
      params.push(startDate, endDate);
    }

    // 按分类统计收入支出
    let categoryQuery = `
      SELECT 
        category,
        type,
        SUM(amount) as total,
        COUNT(*) as count
      FROM transactions
    `;
    if (whereClause) {
      categoryQuery += `${whereClause} AND category != ''`;
    } else {
      categoryQuery += ` WHERE category != ''`;
    }
    categoryQuery += ` GROUP BY category, type ORDER BY category, type`;
    const [categoryStats] = await db.query(categoryQuery, params);

    // 按账户统计
    let accountQuery = `
      SELECT 
        account,
        type,
        SUM(amount) as total,
        COUNT(*) as count
      FROM transactions
    `;
    if (whereClause) {
      accountQuery += whereClause;
    }
    accountQuery += ` GROUP BY account, type ORDER BY account, type`;
    const [accountStats] = await db.query(accountQuery, params);

    // 按日期统计（每日）
    let dailyQuery = `
      SELECT 
        date,
        type,
        SUM(amount) as total,
        COUNT(*) as count
      FROM transactions
    `;
    if (whereClause) {
      dailyQuery += whereClause;
    }
    dailyQuery += ` GROUP BY date, type ORDER BY date DESC LIMIT 30`;
    const [dailyStats] = await db.query(dailyQuery, params);

    // 按月统计
    let monthlyQuery = `
      SELECT 
        strftime('%Y-%m', date) as month,
        type,
        SUM(amount) as total,
        COUNT(*) as count
      FROM transactions
    `;
    if (whereClause) {
      monthlyQuery += whereClause;
    }
    monthlyQuery += ` GROUP BY month, type ORDER BY month DESC LIMIT 12`;
    const [monthlyStats] = await db.query(monthlyQuery, params);

    // 按月+分类统计
    let monthlyCategoryQuery = `
      SELECT 
        strftime('%Y-%m', date) as month,
        category,
        type,
        SUM(amount) as total,
        COUNT(*) as count
      FROM transactions
    `;
    if (whereClause) {
      monthlyCategoryQuery += `${whereClause} AND category != ''`;
    } else {
      monthlyCategoryQuery += ` WHERE category != ''`;
    }
    monthlyCategoryQuery += ` GROUP BY month, category, type ORDER BY month, category`;
    const [monthlyCategoryStats] = await db.query(monthlyCategoryQuery, params);

    // 按月+供应商统计
    let monthlySupplierQuery = `
      SELECT 
        strftime('%Y-%m', date) as month,
        supplier,
        type,
        SUM(amount) as total,
        COUNT(*) as count
      FROM transactions
    `;
    if (whereClause) {
      monthlySupplierQuery += `${whereClause} AND supplier IS NOT NULL AND supplier != ''`;
    } else {
      monthlySupplierQuery += ` WHERE supplier IS NOT NULL AND supplier != ''`;
    }
    monthlySupplierQuery += ` GROUP BY month, supplier, type ORDER BY month, supplier`;
    const [monthlySupplierStats] = await db.query(monthlySupplierQuery, params);

    // 按日期+分类+账户+供应商统计（每日详细）
    let dailyDetailQuery = `
      SELECT 
        date,
        category,
        account,
        supplier,
        type,
        SUM(amount) as total,
        COUNT(*) as count
      FROM transactions
    `;
    if (whereClause) {
      dailyDetailQuery += whereClause;
    } else {
      // 如果没有日期范围，默认查询最近30天
      dailyDetailQuery += ` WHERE date >= DATE_SUB(CURDATE(), INTERVAL 30 DAY)`;
    }
    dailyDetailQuery += ` GROUP BY date, category, account, supplier, type ORDER BY date DESC, category, account, supplier LIMIT 1000`;
    const [dailyDetailStats] = await db.query(dailyDetailQuery, params);

    // 按供应商统计
    let supplierQuery = `
      SELECT 
        supplier,
        type,
        SUM(amount) as total,
        COUNT(*) as count
      FROM transactions
    `;
    if (whereClause) {
      supplierQuery += `${whereClause} AND supplier IS NOT NULL AND supplier != ''`;
    } else {
      supplierQuery += ` WHERE supplier IS NOT NULL AND supplier != ''`;
    }
    supplierQuery += ` GROUP BY supplier, type ORDER BY total DESC`;
    const [supplierStats] = await db.query(supplierQuery, params);

    res.json({
      success: true,
      data: {
        categoryExpense: categoryStats?.filter(item => item.type === 'expense') || [],
        categoryStats: categoryStats || [],
        accountStats: accountStats || [],
        supplierStats: supplierStats || [],
        dailyStats: dailyStats || [],
        monthlyStats: monthlyStats || [],
        monthlyCategoryStats: monthlyCategoryStats || [],
        monthlySupplierStats: monthlySupplierStats || [],
        dailyDetailStats: dailyDetailStats || []
      }
    });
  } catch (error) {
    console.error('获取财务分析数据失败:', error);
    res.status(500).json({ success: false, message: '获取财务分析数据失败' });
  }
});

module.exports = router;
