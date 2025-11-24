import React, { useState, useEffect, useCallback } from 'react';
import { Card, Table, Spin, message } from 'antd';
import { transactionAPI } from '../api/transactions';
import dayjs from 'dayjs';

const LedgerStatisticsTable = ({ year, refreshKey }) => {
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState({ tableData: [], monthNames: [] });

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const startDate = `${year}-01-01`;
      const endDate = `${year}-12-31`;

      const response = await transactionAPI.getAnalysis(startDate, endDate);
      if (response.data.success) {
        processData(response.data.data, startDate, endDate);
      }
    } catch (error) {
      message.error('加载数据失败');
      console.error(error);
    } finally {
      setLoading(false);
    }
  }, [year]);

  const processData = (analysisData, startDate, endDate) => {
    // 处理月度数据
    const monthlyMap = {};
    analysisData.monthlyStats.forEach(item => {
      const month = item.month;
      if (!monthlyMap[month]) {
        monthlyMap[month] = { month, income: 0, expense: 0 };
      }
      if (item.type === 'income') {
        monthlyMap[month].income = parseFloat(item.total) || 0;
      } else {
        monthlyMap[month].expense = parseFloat(item.total) || 0;
      }
    });

    // 确定要显示的月份范围
    const start = dayjs(startDate);
    const end = dayjs(endDate);
    const months = [];
    const monthNames = [];
    
    let current = start.startOf('month');
    while (current.isBefore(end) || current.isSame(end, 'month')) {
      const monthKey = current.format('YYYY-MM');
      const monthName = current.format('M月');
      months.push({ key: monthKey, name: monthName });
      monthNames.push(monthName);
      current = current.add(1, 'month');
    }

    // 如果月份超过12个，只显示最近12个月
    const displayMonths = months.slice(-12);
    const displayMonthNames = monthNames.slice(-12);

    // 计算各月数据
    const monthData = displayMonths.map(({ key, name }) => {
      const monthInfo = monthlyMap[key] || { income: 0, expense: 0 };
      return {
        month: name,
        monthKey: key,
        income: monthInfo.income,
        expense: monthInfo.expense,
        balance: monthInfo.income - monthInfo.expense
      };
    });

    // 计算总计
    const totalIncome = monthData.reduce((sum, item) => sum + item.income, 0);
    const totalExpense = monthData.reduce((sum, item) => sum + item.expense, 0);
    const totalBalance = totalIncome - totalExpense;

    // 构建表格行数据
    const tableData = [
      {
        key: 'income',
        type: '收入',
        ...monthData.reduce((acc, item, index) => {
          acc[`month${index}`] = item.income;
          return acc;
        }, {}),
        typeLabel: '总收入',
        total: totalIncome
      },
      {
        key: 'expense',
        type: '支出',
        ...monthData.reduce((acc, item, index) => {
          acc[`month${index}`] = item.expense;
          return acc;
        }, {}),
        typeLabel: '总支出',
        total: totalExpense
      },
      {
        key: 'balance',
        type: '结余',
        ...monthData.reduce((acc, item, index) => {
          acc[`month${index}`] = item.balance;
          return acc;
        }, {}),
        typeLabel: '总结余',
        total: totalBalance
      }
    ];

    setData({ tableData, monthNames: displayMonthNames });
  };

  useEffect(() => {
    loadData();
  }, [year, refreshKey, loadData]);

  const columns = [
    {
      title: '类型',
      dataIndex: 'type',
      key: 'type',
      width: 80,
      fixed: 'left',
      render: (text) => <strong>{text}</strong>,
      onHeaderCell: () => ({
        style: { backgroundColor: '#1890ff', color: '#fff', fontWeight: 'bold', textAlign: 'center' }
      })
    },
    ...(data.monthNames || []).map((month, index) => ({
      title: month,
      dataIndex: `month${index}`,
      key: `month${index}`,
      width: 90,
      align: 'right',
      render: (value) => value !== undefined ? value.toFixed(2) : '0.00',
      onHeaderCell: () => ({
        style: { backgroundColor: '#1890ff', color: '#fff', fontWeight: 'bold', textAlign: 'center' }
      })
    })),
    {
      title: '类型',
      dataIndex: 'typeLabel',
      key: 'typeLabel',
      width: 100,
      render: (text) => <strong>{text}</strong>,
      onHeaderCell: () => ({
        style: { backgroundColor: '#52c41a', color: '#fff', fontWeight: 'bold', textAlign: 'center' }
      })
    },
    {
      title: '总合计',
      dataIndex: 'total',
      key: 'total',
      width: 120,
      align: 'right',
      render: (value, record) => (
        <strong style={{ color: record.key === 'balance' ? (value >= 0 ? '#52c41a' : '#ff4d4f') : '#000' }}>
          {value.toFixed(2)}
        </strong>
      ),
      onHeaderCell: () => ({
        style: { backgroundColor: '#52c41a', color: '#fff', fontWeight: 'bold', textAlign: 'center' }
      })
    }
  ];

  return (
    <Card 
      title="总账统计" 
      style={{ marginBottom: 24 }}
    >
      <Spin spinning={loading}>
        <Table
          columns={columns}
          dataSource={data.tableData || []}
          pagination={false}
          bordered
          size="small"
          scroll={{ x: 'max-content' }}
          rowClassName={(record) => {
            if (record.key === 'income') return 'income-row';
            if (record.key === 'expense') return 'expense-row';
            if (record.key === 'balance') return 'balance-row';
            return '';
          }}
        />
      </Spin>
      <style>{`
        .income-row td {
          background-color: #f6ffed !important;
        }
        .expense-row td {
          background-color: #fff1f0 !important;
        }
        .balance-row td {
          background-color: #f0f5ff !important;
        }
        .ant-table-thead > tr > th {
          text-align: center !important;
        }
        .ant-table-tbody > tr > td {
          text-align: right !important;
        }
        .ant-table-tbody > tr > td:first-child,
        .ant-table-tbody > tr > td:nth-last-child(2) {
          text-align: center !important;
        }
      `}</style>
    </Card>
  );
};

export default LedgerStatisticsTable;

