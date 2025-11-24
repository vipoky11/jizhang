import React, { useState, useEffect, useCallback } from 'react';
import { Card, Row, Col, Spin, message, Statistic, Tabs, Table, Tag, Badge, Modal, Button, Form, InputNumber, Divider } from 'antd';
import { WarningOutlined, ExclamationCircleOutlined, BellOutlined, SettingOutlined } from '@ant-design/icons';
import { transactionAPI } from '../api/transactions';
import dayjs from 'dayjs';
import 'dayjs/locale/zh-cn';
import { LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';

const FinancialAnalysis = ({ year }) => {
  const [loading, setLoading] = useState(false);
  const [warningModalVisible, setWarningModalVisible] = useState(false);
  const [settingModalVisible, setSettingModalVisible] = useState(false);
  const [form] = Form.useForm();

  // 从 localStorage 读取阈值设置，如果没有则使用默认值
  const getStoredThresholds = () => {
    const stored = localStorage.getItem('financialWarningThresholds');
    if (stored) {
      try {
        return JSON.parse(stored);
      } catch (e) {
        return null;
      }
    }
    return null;
  };

  const defaultThresholds = {
    expenseThreshold: 0.3, // 30% - 月度支出异常阈值（支出超过收入的百分比）
    balanceThreshold: -100, // -100元 - 月度结余预警阈值（结余低于此值时才预警）
    yearBalanceThreshold: -1000, // -1000元 - 年度结余预警阈值
    yearExpenseThreshold: 0, // 0 - 年度支出异常阈值（可选，暂时不使用）
  };

  const storedThresholds = getStoredThresholds();
  const [thresholds, setThresholds] = useState(storedThresholds || defaultThresholds);

  // 保存阈值设置
  const saveThresholds = (values) => {
    const newThresholds = {
      expenseThreshold: values.expenseThreshold / 100, // 转换为小数（如30% -> 0.3）
      balanceThreshold: values.balanceThreshold || 0,
      yearBalanceThreshold: values.yearBalanceThreshold || 0,
    };
    localStorage.setItem('financialWarningThresholds', JSON.stringify(newThresholds));
    setThresholds(newThresholds);
    setSettingModalVisible(false);
    message.success('预警阈值设置已保存');
  };

  // 打开设置弹窗时，初始化表单值
  const handleOpenSetting = () => {
    form.setFieldsValue({
      expenseThreshold: thresholds.expenseThreshold * 100, // 转换为百分比显示
      balanceThreshold: thresholds.balanceThreshold,
      yearBalanceThreshold: thresholds.yearBalanceThreshold || 0,
    });
    setSettingModalVisible(true);
  };
  // 默认月份：如果当前年份与全局年份一致，使用当前月份；否则使用全局年份的第一个月
  const getDefaultMonth = () => {
    const currentYear = dayjs().year();
    if (currentYear === year) {
      return dayjs().format('YYYY-MM');
    }
    return `${year}-01`;
  };
  const [selectedMonth, setSelectedMonth] = useState(getDefaultMonth());
  const [analysisData, setAnalysisData] = useState({
    categoryExpense: [],
    categoryStats: [],
    accountStats: [],
    supplierStats: [],
    monthlyStats: [],
    monthlyCategoryStats: [],
    monthlySupplierStats: []
  });

  const loadAnalysis = useCallback(async () => {
    setLoading(true);
    try {
      const startDate = `${year}-01-01`;
      const endDate = `${year}-12-31`;
      const response = await transactionAPI.getAnalysis(startDate, endDate);
      if (response.data.success) {
        setAnalysisData(response.data.data);
      }
    } catch (error) {
      message.error('加载分析数据失败');
      console.error(error);
    } finally {
      setLoading(false);
    }
  }, [year]);

  useEffect(() => {
    loadAnalysis();
    // 当年份改变时，如果当前选择的月份不属于新年份，则重置为新年份的第一个月
    const selectedYear = dayjs(selectedMonth).year();
    if (selectedYear !== year) {
      setSelectedMonth(`${year}-01`);
    }
  }, [year, loadAnalysis, selectedMonth]);

  // 处理月度数据（收入支出对比）
  const monthlyData = {};
  analysisData.monthlyStats?.forEach(item => {
    const month = item.month;
    if (!monthlyData[month]) {
      monthlyData[month] = { month, income: 0, expense: 0 };
    }
    if (item.type === 'income') {
      monthlyData[month].income = parseFloat(item.total) || 0;
    } else {
      monthlyData[month].expense = parseFloat(item.total) || 0;
    }
  });
  const monthlyList = Object.values(monthlyData).sort((a, b) => a.month.localeCompare(b.month));

  // 计算月度总计
  const monthlyTotalIncome = monthlyList.reduce((sum, item) => sum + item.income, 0);
  const monthlyTotalExpense = monthlyList.reduce((sum, item) => sum + item.expense, 0);

  // 处理分类数据（收入+支出）
  const categoryDataMap = {};
  // 处理分类统计（包含收入和支出）
  analysisData.categoryStats?.forEach(item => {
    // 确保category不为空
    if (!item.category || item.category.trim() === '') {
      return;
    }
    if (!categoryDataMap[item.category]) {
      categoryDataMap[item.category] = { category: item.category, income: 0, expense: 0 };
    }
    if (item.type === 'income') {
      categoryDataMap[item.category].income += parseFloat(item.total) || 0;
    } else if (item.type === 'expense') {
      categoryDataMap[item.category].expense += parseFloat(item.total) || 0;
    }
  });
  
  // 处理分类数据（用于后续处理）
  Object.values(categoryDataMap)
    .forEach(item => {
      item.total = item.income + item.expense;
      item.incomePercent = item.income > 0 ? ((item.income / (item.income + item.expense)) * 100).toFixed(1) : '0.0';
      item.expensePercent = item.expense > 0 ? ((item.expense / (item.income + item.expense)) * 100).toFixed(1) : '0.0';
    });

  // 处理供应商数据（收入+支出）
  const supplierDataMap = {};
  analysisData.supplierStats?.forEach(item => {
    if (!item.supplier || item.supplier.trim() === '') {
      return;
    }
    if (!supplierDataMap[item.supplier]) {
      supplierDataMap[item.supplier] = { supplier: item.supplier, income: 0, expense: 0 };
    }
    if (item.type === 'income') {
      supplierDataMap[item.supplier].income += parseFloat(item.total) || 0;
    } else if (item.type === 'expense') {
      supplierDataMap[item.supplier].expense += parseFloat(item.total) || 0;
    }
  });
  
  // 处理供应商数据（用于后续处理）
  Object.values(supplierDataMap)
    .forEach(item => {
      item.total = item.income + item.expense;
      item.balance = item.income - item.expense;
      item.incomePercent = item.total > 0 ? ((item.income / item.total) * 100).toFixed(1) : '0.0';
      item.expensePercent = item.total > 0 ? ((item.expense / item.total) * 100).toFixed(1) : '0.0';
    });

  // 处理月度+分类数据
  const monthlyCategoryDataMap = {};
  analysisData.monthlyCategoryStats?.forEach(item => {
    const key = `${item.month}_${item.category}`;
    if (!monthlyCategoryDataMap[key]) {
      monthlyCategoryDataMap[key] = {
        month: item.month,
        category: item.category,
        income: 0,
        expense: 0
      };
    }
    if (item.type === 'income') {
      monthlyCategoryDataMap[key].income = parseFloat(item.total) || 0;
    } else {
      monthlyCategoryDataMap[key].expense = parseFloat(item.total) || 0;
    }
  });
  const monthlyCategoryList = Object.values(monthlyCategoryDataMap)
    .map(item => ({
      ...item,
      total: item.income + item.expense,
      balance: item.income - item.expense
    }))
    .sort((a, b) => {
      if (a.month !== b.month) return a.month.localeCompare(b.month);
      return b.total - a.total;
    });

  // 处理月度+供应商数据
  const monthlySupplierDataMap = {};
  analysisData.monthlySupplierStats?.forEach(item => {
    const key = `${item.month}_${item.supplier}`;
    if (!monthlySupplierDataMap[key]) {
      monthlySupplierDataMap[key] = {
        month: item.month,
        supplier: item.supplier,
        income: 0,
        expense: 0
      };
    }
    if (item.type === 'income') {
      monthlySupplierDataMap[key].income = parseFloat(item.total) || 0;
    } else {
      monthlySupplierDataMap[key].expense = parseFloat(item.total) || 0;
    }
  });
  const monthlySupplierList = Object.values(monthlySupplierDataMap)
    .map(item => ({
      ...item,
      total: item.income + item.expense,
      balance: item.income - item.expense
    }))
    .sort((a, b) => {
      if (a.month !== b.month) return a.month.localeCompare(b.month);
      return b.total - a.total;
    });


  // 年度总计
  const yearTotalIncome = monthlyTotalIncome;
  const yearTotalExpense = monthlyTotalExpense;

  // 月度供应商明细表格列定义
  const monthlySupplierColumns = [
    {
      title: '供应商',
      dataIndex: 'supplier',
      key: 'supplier',
      render: (text) => <Tag color="cyan">{text}</Tag>,
    },
    {
      title: '收入',
      dataIndex: 'income',
      key: 'income',
      align: 'right',
      render: (value) => <span style={{ color: '#52c41a' }}>¥{value.toFixed(2)}</span>,
    },
    {
      title: '支出',
      dataIndex: 'expense',
      key: 'expense',
      align: 'right',
      render: (value) => <span style={{ color: '#ff4d4f' }}>¥{value.toFixed(2)}</span>,
    },
    {
      title: '合计',
      dataIndex: 'total',
      key: 'total',
      align: 'right',
      render: (value) => <strong>¥{value.toFixed(2)}</strong>,
    },
    {
      title: '结余',
      dataIndex: 'balance',
      key: 'balance',
      align: 'right',
      render: (value) => (
        <span style={{ color: value >= 0 ? '#52c41a' : '#ff4d4f' }}>
          {value >= 0 ? '+' : ''}¥{value.toFixed(2)}
        </span>
      ),
    },
  ];


  // 月度表格列定义
  const monthlyColumns = [
    {
      title: '月份',
      dataIndex: 'month',
      key: 'month',
      width: 120,
      render: (text, record) => {
        const expense = parseFloat(record.expense || 0);
        const income = parseFloat(record.income || 0);
        const balance = parseFloat(record.balance || 0);
        const isExpenseAlert = income > 0 && expense > income * (1 + expenseThreshold);
        const isBalanceAlert = balance < balanceThreshold;
        
        return (
          <div>
            <strong>{text}</strong>
            {isExpenseAlert && (
              <Tag color="orange" style={{ marginLeft: 4 }}>支出异常</Tag>
            )}
            {isBalanceAlert && (
              <Tag color="red" style={{ marginLeft: 4 }}>结余预警</Tag>
            )}
          </div>
        );
      },
    },
    {
      title: '收入',
      dataIndex: 'income',
      key: 'income',
      width: 120,
      align: 'right',
      render: (value) => <span style={{ color: '#52c41a' }}>¥{parseFloat(value || 0).toFixed(2)}</span>,
    },
    {
      title: '支出',
      dataIndex: 'expense',
      key: 'expense',
      width: 120,
      align: 'right',
      render: (value) => <span style={{ color: '#ff4d4f' }}>¥{parseFloat(value || 0).toFixed(2)}</span>,
    },
    {
      title: '结余',
      dataIndex: 'balance',
      key: 'balance',
      width: 120,
      align: 'right',
      render: (value) => {
        const balance = parseFloat(value || 0);
        return (
          <strong style={{ color: balance >= 0 ? '#52c41a' : '#ff4d4f' }}>
            {balance >= 0 ? '+' : ''}¥{balance.toFixed(2)}
          </strong>
        );
      },
    },
    {
      title: '收入占比',
      key: 'incomePercent',
      width: 100,
      align: 'right',
      render: (_, record) => {
        const income = parseFloat(record.income || 0);
        const expense = parseFloat(record.expense || 0);
        const total = income + expense;
        const percent = total > 0 ? ((income / total) * 100).toFixed(1) : '0.0';
        return `${percent}%`;
      },
    },
    {
      title: '支出占比',
      key: 'expensePercent',
      width: 100,
      align: 'right',
      render: (_, record) => {
        const income = parseFloat(record.income || 0);
        const expense = parseFloat(record.expense || 0);
        const total = income + expense;
        const percent = total > 0 ? ((expense / total) * 100).toFixed(1) : '0.0';
        return `${percent}%`;
      },
    },
  ];

  // 月度分类明细表格列定义
  const monthlyCategoryColumns = [
    {
      title: '分类',
      dataIndex: 'category',
      key: 'category',
      render: (text) => <Tag color="blue">{text}</Tag>,
    },
    {
      title: '收入',
      dataIndex: 'income',
      key: 'income',
      align: 'right',
      render: (value) => <span style={{ color: '#52c41a' }}>¥{value.toFixed(2)}</span>,
    },
    {
      title: '支出',
      dataIndex: 'expense',
      key: 'expense',
      align: 'right',
      render: (value) => <span style={{ color: '#ff4d4f' }}>¥{value.toFixed(2)}</span>,
    },
    {
      title: '合计',
      dataIndex: 'total',
      key: 'total',
      align: 'right',
      render: (value) => <strong>¥{value.toFixed(2)}</strong>,
    },
    {
      title: '结余',
      dataIndex: 'balance',
      key: 'balance',
      align: 'right',
      render: (value) => (
        <span style={{ color: value >= 0 ? '#52c41a' : '#ff4d4f' }}>
          {value >= 0 ? '+' : ''}¥{value.toFixed(2)}
        </span>
      ),
    },
  ];


  // 处理月度数据，添加结余和占比（显示所有月份）
  const filteredMonthlyList = monthlyList;
  const monthlyTableData = filteredMonthlyList.map(item => ({
    ...item,
    balance: item.income - item.expense,
  }));

  // 准备图表数据
  const chartData = monthlyTableData.map(item => {
    const monthNum = parseInt(item.month.split('-')[1], 10);
    return {
      month: item.month,
      monthLabel: `${monthNum}月`, // 显示为 "1月", "2月" 等
      income: parseFloat(item.income || 0),
      expense: parseFloat(item.expense || 0),
      balance: parseFloat((item.income || 0) - (item.expense || 0)),
    };
  });

  // 自定义 Tooltip 格式化
  const formatTooltipValue = (value) => `¥${parseFloat(value || 0).toFixed(2)}`;

  // 计算月均支出
  const avgExpense = monthlyTableData.length > 0 
    ? monthlyTotalExpense / monthlyTableData.length 
    : 0;

  // 使用自定义阈值
  const expenseThreshold = thresholds.expenseThreshold; // 支出超过平均值一定比例视为异常
  const balanceThreshold = thresholds.balanceThreshold; // 结余低于阈值视为预警
  
  const warnings = [];
  const expenseAlerts = [];
  const balanceAlerts = [];

  monthlyTableData.forEach(item => {
    const expense = parseFloat(item.expense || 0);
    const income = parseFloat(item.income || 0);
    const balance = parseFloat(item.balance || 0);
    const monthNum = parseInt(item.month.split('-')[1], 10);
    const monthLabel = `${monthNum}月`;

    // 检查支出异常：支出超过收入的百分比
    if (income > 0 && expense > income * (1 + expenseThreshold)) {
      const excessPercent = ((expense - income) / income * 100).toFixed(1);
      expenseAlerts.push({
        month: item.month,
        monthLabel,
        expense,
        income,
        excessPercent,
      });
    }

    // 检查结余预警
    if (balance < balanceThreshold) {
      balanceAlerts.push({
        month: item.month,
        monthLabel,
        balance,
      });
    }
  });

  // 年度结余预警（使用独立的年度阈值）
  const yearBalance = yearTotalIncome - yearTotalExpense;
  const yearBalanceThreshold = thresholds.yearBalanceThreshold !== undefined ? thresholds.yearBalanceThreshold : thresholds.balanceThreshold;
  if (yearBalance < yearBalanceThreshold) {
    warnings.push({
      type: 'error',
      message: `年度结余低于阈值：¥${yearBalance.toFixed(2)}（阈值：¥${yearBalanceThreshold.toFixed(2)}），请注意控制支出！`,
    });
  }

  return (
    <div style={{ padding: '24px', background: '#f0f2f5', minHeight: '100vh' }}>
      <Spin spinning={loading}>
        {/* 年度总览 */}
        <Row gutter={16} style={{ marginBottom: 24 }}>
          <Col span={6}>
            <Card>
              <Statistic
                title="年度总收入"
                value={yearTotalIncome}
                precision={2}
                prefix="¥"
                valueStyle={{ color: '#52c41a' }}
              />
            </Card>
          </Col>
          <Col span={6}>
            <Card>
              <Statistic
                title="年度总支出"
                value={yearTotalExpense}
                precision={2}
                prefix="¥"
                valueStyle={{ color: '#ff4d4f' }}
              />
            </Card>
          </Col>
          <Col span={6}>
            <Card>
              <Statistic
                title="年度结余"
                value={yearTotalIncome - yearTotalExpense}
                precision={2}
                prefix="¥"
                valueStyle={{ 
                  color: (yearTotalIncome - yearTotalExpense) >= 0 ? '#52c41a' : '#ff4d4f' 
                }}
              />
            </Card>
          </Col>
          <Col span={6}>
            <Card>
              <Statistic
                title="月均支出"
                value={avgExpense}
                precision={2}
                prefix="¥"
                valueStyle={{ color: '#faad14' }}
              />
            </Card>
          </Col>
        </Row>

        {/* 预警提示按钮和设置按钮 */}
        <div style={{ marginBottom: 16, display: 'flex', justifyContent: 'flex-end', alignItems: 'center', gap: 12 }}>
          <Button
            icon={<SettingOutlined />}
            onClick={handleOpenSetting}
          >
            预警设置
          </Button>
          {(warnings.length > 0 || expenseAlerts.length > 0 || balanceAlerts.length > 0) && (
            <Badge count={warnings.length + expenseAlerts.length + balanceAlerts.length} size="small">
              <Button
                type="primary"
                danger
                icon={<BellOutlined />}
                onClick={() => setWarningModalVisible(true)}
              >
                查看预警信息
              </Button>
            </Badge>
          )}
        </div>

        {/* 预警弹窗 */}
        <Modal
          title={
            <span>
              <ExclamationCircleOutlined style={{ color: '#ff4d4f', marginRight: 8 }} />
              财务预警提醒
            </span>
          }
          open={warningModalVisible}
          onCancel={() => setWarningModalVisible(false)}
          footer={[
            <Button key="close" onClick={() => setWarningModalVisible(false)}>
              关闭
            </Button>
          ]}
          width={600}
        >
          <div style={{ maxHeight: '60vh', overflowY: 'auto' }}>
            {warnings.length > 0 && (
              <div style={{ marginBottom: 24 }}>
                <h4 style={{ color: '#ff4d4f', marginBottom: 12 }}>
                  <ExclamationCircleOutlined /> 年度预警
                </h4>
                {warnings.map((warning, index) => (
                  <div key={index} style={{ 
                    padding: '12px', 
                    background: '#fff1f0', 
                    borderRadius: '4px',
                    marginBottom: 8,
                    borderLeft: '3px solid #ff4d4f'
                  }}>
                    {warning.message}
                  </div>
                ))}
              </div>
            )}

            {expenseAlerts.length > 0 && (
              <div style={{ marginBottom: 24 }}>
                <h4 style={{ color: '#faad14', marginBottom: 12 }}>
                  <WarningOutlined /> 支出异常提醒
                </h4>
                <div style={{ 
                  padding: '12px', 
                  background: '#fffbe6', 
                  borderRadius: '4px',
                  borderLeft: '3px solid #faad14'
                }}>
                  <p style={{ marginBottom: 8 }}>以下月份支出超过收入{expenseThreshold * 100}%：</p>
                  <ul style={{ marginBottom: 0, paddingLeft: 20 }}>
                    {expenseAlerts.map((alert, index) => (
                      <li key={index} style={{ marginBottom: 4 }}>
                        <strong>{alert.monthLabel}</strong>：收入 ¥{alert.income.toFixed(2)}，支出 ¥{alert.expense.toFixed(2)}，超出收入 <span style={{ color: '#ff4d4f' }}>{alert.excessPercent}%</span>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            )}

            {balanceAlerts.length > 0 && (
              <div>
                <h4 style={{ color: '#ff4d4f', marginBottom: 12 }}>
                  <ExclamationCircleOutlined /> 结余预警
                </h4>
                <div style={{ 
                  padding: '12px', 
                  background: '#fff1f0', 
                  borderRadius: '4px',
                  borderLeft: '3px solid #ff4d4f'
                }}>
                  <p style={{ marginBottom: 8 }}>以下月份结余为负或低于阈值：</p>
                  <ul style={{ marginBottom: 0, paddingLeft: 20 }}>
                    {balanceAlerts.map((alert, index) => (
                      <li key={index} style={{ marginBottom: 4 }}>
                        <strong>{alert.monthLabel}</strong>：结余 <span style={{ color: '#ff4d4f' }}>¥{alert.balance.toFixed(2)}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            )}
          </div>
        </Modal>

        {/* 预警设置弹窗 */}
        <Modal
          title={
            <span>
              <SettingOutlined style={{ marginRight: 8 }} />
              预警阈值设置
            </span>
          }
          open={settingModalVisible}
          onCancel={() => setSettingModalVisible(false)}
          onOk={() => form.submit()}
          okText="保存"
          cancelText="取消"
          width={500}
        >
          <Form
            form={form}
            layout="vertical"
            onFinish={saveThresholds}
            initialValues={{
              expenseThreshold: thresholds.expenseThreshold * 100,
              balanceThreshold: thresholds.balanceThreshold,
              yearBalanceThreshold: thresholds.yearBalanceThreshold !== undefined ? thresholds.yearBalanceThreshold : thresholds.balanceThreshold,
            }}
          >
            <Form.Item
              label="支出异常阈值"
              name="expenseThreshold"
              tooltip="当某月支出超过该月收入的比例时，触发支出异常提醒"
              rules={[
                { required: true, message: '请输入支出异常阈值' },
                { type: 'number', min: 0, max: 100, message: '请输入0-100之间的数值' },
              ]}
            >
              <InputNumber
                style={{ width: '100%' }}
                min={0}
                max={100}
                step={5}
                formatter={(value) => `${value}%`}
                parser={(value) => value.replace('%', '')}
                placeholder="例如：30（表示支出超过收入30%）"
              />
            </Form.Item>
            <div style={{ marginBottom: 16, padding: '12px', background: '#f5f5f5', borderRadius: '4px', fontSize: '12px', color: '#666' }}>
              当前设置：当某月支出超过该月收入的 {thresholds.expenseThreshold * 100}% 时，会触发支出异常提醒
            </div>

            <Divider />

            <Form.Item
              label="结余预警阈值"
              name="balanceThreshold"
              tooltip="当结余低于此金额时，触发结余预警"
              rules={[
                { required: true, message: '请输入结余预警阈值' },
                { type: 'number', message: '请输入有效的金额' },
              ]}
            >
              <InputNumber
                style={{ width: '100%' }}
                min={-999999}
                max={999999}
                step={100}
                formatter={(value) => `¥${value}`}
                parser={(value) => value.replace('¥', '')}
                placeholder="例如：0（表示结余低于0时预警）"
              />
            </Form.Item>
            <div style={{ marginBottom: 16, padding: '12px', background: '#f5f5f5', borderRadius: '4px', fontSize: '12px', color: '#666' }}>
              当前设置：当结余低于 ¥{thresholds.balanceThreshold.toFixed(2)} 时，会触发结余预警
            </div>

            <Divider />

            <Form.Item
              label="年度结余预警阈值"
              name="yearBalanceThreshold"
              tooltip="当年度结余低于此金额时，触发年度结余预警"
              rules={[
                { required: true, message: '请输入年度结余预警阈值' },
                { type: 'number', message: '请输入有效的金额' },
              ]}
            >
              <InputNumber
                style={{ width: '100%' }}
                min={-999999}
                max={999999}
                step={100}
                formatter={(value) => `¥${value}`}
                parser={(value) => value.replace('¥', '')}
                placeholder="例如：0（表示年度结余低于0时预警）"
              />
            </Form.Item>
            <div style={{ marginBottom: 16, padding: '12px', background: '#f5f5f5', borderRadius: '4px', fontSize: '12px', color: '#666' }}>
              当前设置：当年度结余低于 ¥{(thresholds.yearBalanceThreshold !== undefined ? thresholds.yearBalanceThreshold : thresholds.balanceThreshold).toFixed(2)} 时，会触发年度结余预警
            </div>
          </Form>
        </Modal>

        <Tabs
          defaultActiveKey="monthly"
          items={[
            {
              key: 'monthly',
              label: (
                <span>
                  月度分析
                  {(expenseAlerts.length > 0 || balanceAlerts.length > 0) && (
                    <Badge count={expenseAlerts.length + balanceAlerts.length} size="small" style={{ marginLeft: 8 }} />
                  )}
                </span>
              ),
              children: (
                <Card title="月度收入支出分析（点击展开查看分类明细）" style={{ marginBottom: 24 }}>
                  <Table
                    columns={monthlyColumns}
                    dataSource={monthlyTableData}
                    rowKey="month"
                    pagination={false}
                    bordered
                    size="middle"
                    scroll={{ x: 'max-content' }}
                    expandable={{
                      expandedRowRender: (record) => {
                        const monthCategories = monthlyCategoryList.filter(
                          item => item.month === record.month
                        );
                        const monthSuppliers = monthlySupplierList.filter(
                          item => item.month === record.month
                        );
                        return (
                          <div>
                            {monthCategories.length > 0 && (
                              <div style={{ marginBottom: 16 }}>
                                <h4 style={{ marginBottom: 8 }}>分类明细</h4>
                                <Table
                                  columns={monthlyCategoryColumns}
                                  dataSource={monthCategories}
                                  rowKey={(row) => `${row.month}_${row.category}`}
                                  pagination={false}
                                  size="small"
                                  summary={(pageData) => {
                                    const totalIncome = pageData.reduce((sum, r) => sum + r.income, 0);
                                    const totalExpense = pageData.reduce((sum, r) => sum + r.expense, 0);
                                    const totalBalance = totalIncome - totalExpense;
                                    return (
                                      <Table.Summary fixed>
                                        <Table.Summary.Row>
                                          <Table.Summary.Cell index={0}>
                                            <strong>小计</strong>
                                          </Table.Summary.Cell>
                                          <Table.Summary.Cell index={1} align="right">
                                            <strong style={{ color: '#52c41a' }}>¥{totalIncome.toFixed(2)}</strong>
                                          </Table.Summary.Cell>
                                          <Table.Summary.Cell index={2} align="right">
                                            <strong style={{ color: '#ff4d4f' }}>¥{totalExpense.toFixed(2)}</strong>
                                          </Table.Summary.Cell>
                                          <Table.Summary.Cell index={3} align="right">
                                            <strong>¥{(totalIncome + totalExpense).toFixed(2)}</strong>
                                          </Table.Summary.Cell>
                                          <Table.Summary.Cell index={4} align="right">
                                            <strong style={{ color: totalBalance >= 0 ? '#52c41a' : '#ff4d4f' }}>
                                              {totalBalance >= 0 ? '+' : ''}¥{totalBalance.toFixed(2)}
                                            </strong>
                                          </Table.Summary.Cell>
                                        </Table.Summary.Row>
                                      </Table.Summary>
                                    );
                                  }}
                                />
                              </div>
                            )}
                            {monthSuppliers.length > 0 && (
                              <div>
                                <h4 style={{ marginBottom: 8 }}>供应商明细</h4>
                                <Table
                                  columns={monthlySupplierColumns}
                                  dataSource={monthSuppliers}
                                  rowKey={(row) => `${row.month}_${row.supplier}`}
                                  pagination={false}
                                  size="small"
                                  summary={(pageData) => {
                                    const totalIncome = pageData.reduce((sum, r) => sum + r.income, 0);
                                    const totalExpense = pageData.reduce((sum, r) => sum + r.expense, 0);
                                    const totalBalance = totalIncome - totalExpense;
                                    return (
                                      <Table.Summary fixed>
                                        <Table.Summary.Row>
                                          <Table.Summary.Cell index={0}>
                                            <strong>小计</strong>
                                          </Table.Summary.Cell>
                                          <Table.Summary.Cell index={1} align="right">
                                            <strong style={{ color: '#52c41a' }}>¥{totalIncome.toFixed(2)}</strong>
                                          </Table.Summary.Cell>
                                          <Table.Summary.Cell index={2} align="right">
                                            <strong style={{ color: '#ff4d4f' }}>¥{totalExpense.toFixed(2)}</strong>
                                          </Table.Summary.Cell>
                                          <Table.Summary.Cell index={3} align="right">
                                            <strong>¥{(totalIncome + totalExpense).toFixed(2)}</strong>
                                          </Table.Summary.Cell>
                                          <Table.Summary.Cell index={4} align="right">
                                            <strong style={{ color: totalBalance >= 0 ? '#52c41a' : '#ff4d4f' }}>
                                              {totalBalance >= 0 ? '+' : ''}¥{totalBalance.toFixed(2)}
                                            </strong>
                                          </Table.Summary.Cell>
                                        </Table.Summary.Row>
                                      </Table.Summary>
                                    );
                                  }}
                                />
                              </div>
                            )}
                            {monthCategories.length === 0 && monthSuppliers.length === 0 && (
                              <div style={{ padding: '16px', color: '#999' }}>该月暂无明细数据</div>
                            )}
                          </div>
                        );
                      },
                      rowExpandable: (record) => {
                        const monthCategories = monthlyCategoryList.filter(
                          item => item.month === record.month
                        );
                        const monthSuppliers = monthlySupplierList.filter(
                          item => item.month === record.month
                        );
                        return monthCategories.length > 0 || monthSuppliers.length > 0;
                      },
                    }}
                    summary={(pageData) => {
                      // 使用所有数据计算合计，而不是当前页数据
                      const allData = monthlyTableData;
                      const totalIncome = allData.reduce((sum, record) => sum + (parseFloat(record.income) || 0), 0);
                      const totalExpense = allData.reduce((sum, record) => sum + (parseFloat(record.expense) || 0), 0);
                      const totalBalance = totalIncome - totalExpense;
                      const total = totalIncome + totalExpense;
                      return (
                        <Table.Summary fixed>
                          <Table.Summary.Row>
                            <Table.Summary.Cell index={0} colSpan={1} />
                            <Table.Summary.Cell index={1}>
                              <strong>合计</strong>
                            </Table.Summary.Cell>
                            <Table.Summary.Cell index={2} align="right">
                              <strong style={{ color: '#52c41a' }}>¥{totalIncome.toFixed(2)}</strong>
                            </Table.Summary.Cell>
                            <Table.Summary.Cell index={3} align="right">
                              <strong style={{ color: '#ff4d4f' }}>¥{totalExpense.toFixed(2)}</strong>
                            </Table.Summary.Cell>
                            <Table.Summary.Cell index={4} align="right">
                              <strong style={{ color: totalBalance >= 0 ? '#52c41a' : '#ff4d4f' }}>
                                {totalBalance >= 0 ? '+' : ''}¥{totalBalance.toFixed(2)}
                              </strong>
                            </Table.Summary.Cell>
                            <Table.Summary.Cell index={5} align="right">
                              <strong>{total > 0 ? ((totalIncome / total) * 100).toFixed(1) : '0.0'}%</strong>
                            </Table.Summary.Cell>
                            <Table.Summary.Cell index={6} align="right">
                              <strong>{total > 0 ? ((totalExpense / total) * 100).toFixed(1) : '0.0'}%</strong>
                            </Table.Summary.Cell>
                          </Table.Summary.Row>
                        </Table.Summary>
                      );
                    }}
                  />
                </Card>
              ),
            },
            {
              key: 'charts',
              label: '图表分析',
              children: (
                <Row gutter={16}>
                  <Col span={12}>
                    <Card title="月度趋势分析">
                      <ResponsiveContainer width="100%" height={400}>
                        <LineChart data={chartData} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
                          <CartesianGrid strokeDasharray="3 3" />
                          <XAxis 
                            dataKey="monthLabel" 
                            tick={{ fontSize: 12 }}
                          />
                          <YAxis 
                            tick={{ fontSize: 12 }}
                            tickFormatter={(value) => `¥${(value / 1000).toFixed(0)}k`}
                          />
                          <Tooltip 
                            formatter={(value) => formatTooltipValue(value)}
                            labelFormatter={(label) => `月份: ${label}`}
                          />
                          <Legend />
                          <Line 
                            type="monotone" 
                            dataKey="income" 
                            name="收入" 
                            stroke="#52c41a" 
                            strokeWidth={2}
                            dot={{ fill: '#52c41a', r: 4 }}
                            activeDot={{ r: 6 }}
                          />
                          <Line 
                            type="monotone" 
                            dataKey="expense" 
                            name="支出" 
                            stroke="#ff4d4f" 
                            strokeWidth={2}
                            dot={{ fill: '#ff4d4f', r: 4 }}
                            activeDot={{ r: 6 }}
                          />
                          <Line 
                            type="monotone" 
                            dataKey="balance" 
                            name="结余" 
                            stroke="#1890ff" 
                            strokeWidth={2}
                            strokeDasharray="5 5"
                            dot={{ fill: '#1890ff', r: 4 }}
                            activeDot={{ r: 6 }}
                          />
                        </LineChart>
                      </ResponsiveContainer>
                    </Card>
                  </Col>
                  <Col span={12}>
                    <Card title="月度收入支出对比">
                      <ResponsiveContainer width="100%" height={400}>
                        <BarChart data={chartData} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
                          <CartesianGrid strokeDasharray="3 3" />
                          <XAxis 
                            dataKey="monthLabel" 
                            tick={{ fontSize: 12 }}
                          />
                          <YAxis 
                            tick={{ fontSize: 12 }}
                            tickFormatter={(value) => `¥${(value / 1000).toFixed(0)}k`}
                          />
                          <Tooltip 
                            formatter={(value) => formatTooltipValue(value)}
                            labelFormatter={(label) => `月份: ${label}`}
                          />
                          <Legend />
                          <Bar 
                            dataKey="income" 
                            name="收入" 
                            fill="#52c41a"
                            radius={[4, 4, 0, 0]}
                          />
                          <Bar 
                            dataKey="expense" 
                            name="支出" 
                            fill="#ff4d4f"
                            radius={[4, 4, 0, 0]}
                          />
                        </BarChart>
                      </ResponsiveContainer>
                    </Card>
                  </Col>
                </Row>
              ),
            },
          ]}
        />
      </Spin>
    </div>
  );
};

export default FinancialAnalysis;
