import React, { useState, useEffect } from 'react';
import { Card, DatePicker, Space, Table, Tag, Spin, message } from 'antd';
import { transactionAPI } from '../api/transactions';
import dayjs from 'dayjs';

const { RangePicker } = DatePicker;

const LedgerStatistics = () => {
  const [loading, setLoading] = useState(false);
  const [year, setYear] = useState(dayjs().year());
  const [data, setData] = useState([]);

  const loadData = async () => {
    setLoading(true);
    try {
      const startDate = `${year}-01-01`;
      const endDate = `${year}-12-31`;
      const response = await transactionAPI.getAnalysis(startDate, endDate);
      if (response.data.success) {
        processData(response.data.data);
      }
    } catch (error) {
      message.error('加载数据失败');
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const processData = (analysisData) => {
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

    // 构建表格数据
    const months = ['01', '02', '03', '04', '05', '06', '07', '08', '09', '10', '11', '12'];
    const monthNames = ['一月', '二月', '三月', '四月', '五月', '六月', '七月', '八月', '九月', '十月', '十一月', '十二月'];
    
    // 计算各月数据
    const monthData = months.map((month, index) => {
      const monthKey = `${year}-${month}`;
      const monthInfo = monthlyMap[monthKey] || { income: 0, expense: 0 };
      return {
        month: monthNames[index],
        monthKey,
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

    setData({ tableData, monthNames });
  };

  useEffect(() => {
    loadData();
  }, [year]);

  const columns = [
    {
      title: '类型',
      dataIndex: 'type',
      key: 'type',
      width: 80,
      fixed: 'left',
      render: (text) => <strong>{text}</strong>,
      onHeaderCell: () => ({
        style: { backgroundColor: '#1890ff', color: '#fff', fontWeight: 'bold' }
      })
    },
    ...(data.monthNames || []).map((month, index) => ({
      title: month,
      dataIndex: `month${index}`,
      key: `month${index}`,
      width: 100,
      align: 'right',
      render: (value) => value !== undefined ? value.toFixed(2) : '0.00',
      onHeaderCell: () => ({
        style: { backgroundColor: '#1890ff', color: '#fff', fontWeight: 'bold' }
      })
    })),
    {
      title: '类型',
      dataIndex: 'typeLabel',
      key: 'typeLabel',
      width: 100,
      render: (text) => <strong>{text}</strong>,
      onHeaderCell: () => ({
        style: { backgroundColor: '#52c41a', color: '#fff', fontWeight: 'bold' }
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
        style: { backgroundColor: '#52c41a', color: '#fff', fontWeight: 'bold' }
      })
    }
  ];

  return (
    <div style={{ padding: '24px', background: '#f0f2f5', minHeight: '100vh' }}>
      <Card style={{ marginBottom: 24 }}>
        <Space>
          <span>选择年份：</span>
          <DatePicker
            picker="year"
            value={dayjs(`${year}-01-01`)}
            onChange={(date) => setYear(date ? date.year() : dayjs().year())}
            format="YYYY"
          />
        </Space>
      </Card>

      <Spin spinning={loading}>
        <Card title="总账统计">
          <Table
            columns={columns}
            dataSource={data.tableData || []}
            pagination={false}
            bordered
            scroll={{ x: 'max-content' }}
            rowClassName={(record) => {
              if (record.key === 'income') return 'income-row';
              if (record.key === 'expense') return 'expense-row';
              if (record.key === 'balance') return 'balance-row';
              return '';
            }}
          />
        </Card>
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
    </div>
  );
};

export default LedgerStatistics;

