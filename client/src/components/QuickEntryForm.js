import React, { useEffect, useState } from 'react';
import { Form, Input, InputNumber, DatePicker, Select, Button, Card, message, Table, Space } from 'antd';
import { PlusOutlined, DeleteOutlined, AppstoreOutlined, UnorderedListOutlined } from '@ant-design/icons';
import dayjs from 'dayjs';
import 'dayjs/locale/zh-cn';
import locale from 'antd/locale/zh_CN';
import { categoryAPI } from '../api/categories';
import { accountAPI } from '../api/accounts';
import { supplierAPI } from '../api/suppliers';

dayjs.locale('zh-cn');

const { Option } = Select;
const { TextArea } = Input;

const QuickEntryForm = ({ onSubmit, loading = false, transactionType = 'expense', categoryRefreshKey = 0, accountRefreshKey = 0, supplierRefreshKey = 0, onBatchSubmit }) => {
  const [form] = Form.useForm();
  const [categories, setCategories] = useState([]);
  const [accounts, setAccounts] = useState([]);
  const [suppliers, setSuppliers] = useState([]);
  const [defaultAccount, setDefaultAccount] = useState('');
  const [isBatchMode, setIsBatchMode] = useState(false);
  const [batchData, setBatchData] = useState([]);
  const [allCategories, setAllCategories] = useState({ income: [], expense: [] }); // 存储所有类型的分类
  const [highlightRows, setHighlightRows] = useState(new Set()); // 需要高亮的行（分类或供应商未填写）

  const handleSubmit = async (values) => {
    try {
      if (isBatchMode) {
        // 批量模式
        if (batchData.length === 0) {
          message.warning('请至少添加一条记录');
          return;
        }
        // 验证批量数据中的分类是否都已填写
        const invalidCategoryRows = batchData.filter(item => !item.category || item.category.trim() === '');
        // 验证批量数据中的供应商是否都已填写
        const invalidSupplierRows = batchData.filter(item => !item.supplier || item.supplier.trim() === '');
        
        // 收集所有需要高亮的行的 key
        const invalidRowKeys = new Set();
        invalidCategoryRows.forEach(row => invalidRowKeys.add(row.key));
        invalidSupplierRows.forEach(row => invalidRowKeys.add(row.key));
        
        if (invalidCategoryRows.length > 0 || invalidSupplierRows.length > 0) {
          // 设置高亮状态
          setHighlightRows(invalidRowKeys);
          
          // 构建错误消息
          const errorMessages = [];
          if (invalidCategoryRows.length > 0) {
            errorMessages.push(`有 ${invalidCategoryRows.length} 条记录的分类未填写`);
          }
          if (invalidSupplierRows.length > 0) {
            errorMessages.push(`有 ${invalidSupplierRows.length} 条记录的供应商未填写`);
          }
          message.warning(`${errorMessages.join('，')}，请填写完整后再提交`);
          
          // 滚动到第一个错误行
          setTimeout(() => {
            const firstInvalidRow = document.querySelector('.ant-table-row-highlight');
            if (firstInvalidRow) {
              firstInvalidRow.scrollIntoView({ behavior: 'smooth', block: 'center' });
            }
          }, 100);
          
          return;
        }
        
        // 验证通过，清除高亮
        setHighlightRows(new Set());
        // 调用批量提交
        if (onBatchSubmit) {
          await onBatchSubmit(batchData);
          setBatchData([]);
          form.setFieldsValue({
            type: 'income',
            date: dayjs(),
          });
        }
      } else {
        // 单条模式
        const data = {
          ...values,
          date: values.date.format('YYYY-MM-DD'),
        };
        await onSubmit(data);
        // 提交成功后重置表单，但保留类型（默认收入）、账户（默认账户）和日期
        form.resetFields(['amount', 'description', 'category', 'supplier']);
        form.setFieldsValue({
          type: 'income', // 默认收入
          account: defaultAccount || undefined, // 使用默认账户
          date: dayjs(),
        });
        // 聚焦到金额输入框，方便连续录入
        setTimeout(() => {
          const amountInput = document.querySelector('.ant-input-number-input');
          amountInput?.focus();
        }, 100);
      }
    } catch (error) {
      console.error('提交失败:', error);
      // 错误已在 App.js 中处理，这里不需要再次抛出
    }
  };

  const handleAddRow = () => {
    form.validateFields(['type', 'date']).then(values => {
      // 加载对应类型的分类，然后添加行
      const loadCategories = async () => {
        try {
          const response = await categoryAPI.getAll(values.type);
          if (response.data.success) {
            setCategories(response.data.data);
            // 检查是否有分类
            if (response.data.data.length === 0) {
              message.warning(`该类型（${values.type === 'income' ? '收入' : '支出'}）暂无分类，请先创建分类后再添加记录`);
              return;
            }
            // 不再自动选择第一个分类，让用户手动选择
            const newRow = {
              key: Date.now(),
              type: values.type,
              date: values.date.format('YYYY-MM-DD'),
              amount: 0,
              description: '',
              category: undefined, // 不自动选择，让用户手动选择，使用 undefined 以显示 placeholder
              account: defaultAccount || undefined, // 使用 undefined 以显示 placeholder
              supplier: undefined, // 使用 undefined 以显示 placeholder
            };
            setBatchData([...batchData, newRow]);
          } else {
            message.warning('加载分类失败，请稍后重试');
          }
        } catch (error) {
          console.error('加载分类失败:', error);
          message.warning('加载分类失败，请稍后重试');
        }
      };
      loadCategories();
    }).catch(() => {
      message.warning('请先选择类型和日期');
    });
  };

  const handleDeleteRow = (key) => {
    setBatchData(batchData.filter(item => item.key !== key));
  };

  const handleBatchDataChange = (key, field, value) => {
    setBatchData(batchData.map(item => {
      if (item.key === key) {
        return { ...item, [field]: value };
      }
      return item;
    }));
    
    // 如果填写了分类或供应商，清除该行的高亮
    if ((field === 'category' || field === 'supplier') && value && value.trim() !== '') {
      setHighlightRows(prev => {
        const newSet = new Set(prev);
        newSet.delete(key);
        return newSet;
      });
    }
  };

  // 加载账户列表和默认账户
  useEffect(() => {
    const loadAccounts = async () => {
      try {
        const response = await accountAPI.getAll();
        if (response.data.success) {
          const newAccounts = response.data.data;
          setAccounts(newAccounts);
          
          // 检查当前选择的账户是否还存在
          const currentAccount = form.getFieldValue('account');
          const accountExists = newAccounts.some(acc => acc.name === currentAccount);
          
          // 找到默认账户
          const defaultAcc = newAccounts.find(acc => acc.is_default === 1 || acc.is_default === true);
          if (defaultAcc) {
            setDefaultAccount(defaultAcc.name);
            // 如果当前账户不存在或没有选择账户，使用默认账户
            if (!currentAccount || !accountExists) {
              form.setFieldsValue({ account: defaultAcc.name });
            }
          } else if (newAccounts.length > 0) {
            // 如果没有默认账户，则选择第一个账户
            setDefaultAccount(newAccounts[0].name);
            if (!currentAccount || !accountExists) {
              form.setFieldsValue({ account: newAccounts[0].name });
            }
          }
        }
      } catch (error) {
        console.error('加载账户失败:', error);
      }
    };
    loadAccounts();
  }, [form, accountRefreshKey]);

  // 加载供应商列表
  useEffect(() => {
    const loadSuppliers = async () => {
      try {
        const response = await supplierAPI.getAll();
        if (response.data.success) {
          setSuppliers(response.data.data);
        }
      } catch (error) {
        console.error('加载供应商失败:', error);
      }
    };
    loadSuppliers();
  }, [supplierRefreshKey]);

  // 加载所有类型的分类（用于批量模式）
  useEffect(() => {
    const loadAllCategories = async () => {
      try {
        const [incomeRes, expenseRes] = await Promise.all([
          categoryAPI.getAll('income'),
          categoryAPI.getAll('expense')
        ]);
        setAllCategories({
          income: incomeRes.data.success ? incomeRes.data.data : [],
          expense: expenseRes.data.success ? expenseRes.data.data : []
        });
      } catch (error) {
        console.error('加载分类失败:', error);
      }
    };
    loadAllCategories();
  }, [categoryRefreshKey]);

  // 加载分类列表（用于单条模式）
  useEffect(() => {
    const loadCategories = async () => {
      try {
        const type = form.getFieldValue('type') || 'income'; // 默认收入
        const response = await categoryAPI.getAll(type);
        if (response.data.success) {
          const newCategories = response.data.data;
          setCategories(newCategories);
          
          // 检查当前选择的分类是否还存在
          const currentCategory = form.getFieldValue('category');
          const categoryExists = newCategories.some(cat => cat.name === currentCategory);
          
          // 如果当前分类不存在，清空选择（不再自动选择第一个）
          if (currentCategory && !categoryExists) {
            form.setFieldsValue({ category: undefined });
          }
          // 不再自动选择第一个分类，让用户手动选择
        }
      } catch (error) {
        console.error('加载分类失败:', error);
      }
    };
    if (!isBatchMode) {
      loadCategories();
    }
  }, [transactionType, form, categoryRefreshKey, isBatchMode]);

  // 监听类型变化，重新加载分类
  const handleTypeChange = (value) => {
    form.setFieldsValue({ type: value });
    // 类型变化时，清空分类选择，让用户重新选择
    form.setFieldsValue({ category: undefined });
    const loadCategories = async () => {
      try {
        const response = await categoryAPI.getAll(value);
        if (response.data.success) {
          setCategories(response.data.data);
          // 不再自动选择第一个分类，让用户手动选择
          if (response.data.data.length === 0) {
            // 提示用户该类型没有分类
            message.warning(`该类型（${value === 'income' ? '收入' : '支出'}）暂无分类，请先创建分类`);
          }
        }
      } catch (error) {
        console.error('加载分类失败:', error);
      }
    };
    loadCategories();
  };

  // 批量表格列定义
  const batchColumns = [
    {
      title: '类型',
      dataIndex: 'type',
      key: 'type',
      width: 100,
      render: (text, record) => (
        <Select
          value={text}
          onChange={(value) => {
            handleBatchDataChange(record.key, 'type', value);
            // 类型变化时，清空分类并重新加载分类列表
            handleBatchDataChange(record.key, 'category', '');
            const loadCategories = async () => {
              try {
                const response = await categoryAPI.getAll(value);
                if (response.data.success) {
                  setCategories(response.data.data);
                }
              } catch (error) {
                console.error('加载分类失败:', error);
              }
            };
            loadCategories();
          }}
          style={{ width: '100%' }}
          placeholder="请选择类型"
        >
          <Option value="income">收入</Option>
          <Option value="expense">支出</Option>
        </Select>
      ),
    },
    {
      title: '金额',
      dataIndex: 'amount',
      key: 'amount',
      width: 150,
      render: (text, record) => (
        <InputNumber
          value={text}
          onChange={(value) => handleBatchDataChange(record.key, 'amount', value)}
          min={0}
          precision={2}
          style={{ width: '100%' }}
          prefix="¥"
        />
      ),
    },
    {
      title: '描述',
      dataIndex: 'description',
      key: 'description',
      width: 260,
      render: (text, record) => (
        <Input.TextArea
          value={text}
          onChange={(e) => handleBatchDataChange(record.key, 'description', e.target.value)}
          placeholder="描述（可选）"
          autoSize={{ minRows: 1, maxRows: 4 }}
          style={{ resize: 'vertical' }}
        />
      ),
    },
    {
      title: '分类',
      dataIndex: 'category',
      key: 'category',
      width: 120,
      render: (text, record) => {
        // 根据当前行的类型获取对应的分类列表
        const typeCategories = record.type ? allCategories[record.type] || [] : [];
        return (
          <Select
            value={text || undefined}
            onChange={(value) => handleBatchDataChange(record.key, 'category', value)}
            style={{ width: '100%' }}
            placeholder="请选择分类"
            showSearch
            filterOption={(input, option) =>
              (option?.children ?? '').toLowerCase().includes(input.toLowerCase())
            }
          >
            {typeCategories.map(cat => (
              <Option key={cat.id} value={cat.name}>
                {cat.name}
              </Option>
            ))}
          </Select>
        );
      },
    },
    {
      title: '账户',
      dataIndex: 'account',
      key: 'account',
      width: 100,
      render: (text, record) => (
        <Select
          value={text || undefined}
          onChange={(value) => handleBatchDataChange(record.key, 'account', value)}
          style={{ width: '100%' }}
          placeholder="请选择账户"
        >
          {accounts.map(acc => (
            <Option key={acc.id} value={acc.name}>
              {acc.name}
            </Option>
          ))}
        </Select>
      ),
    },
    {
      title: '供应商',
      dataIndex: 'supplier',
      key: 'supplier',
      width: 120,
      render: (text, record) => (
        <Select
          value={text || undefined}
          onChange={(value) => handleBatchDataChange(record.key, 'supplier', value)}
          style={{ width: '100%' }}
          placeholder="请选择供应商"
          showSearch
          filterOption={(input, option) =>
            (option?.children ?? '').toLowerCase().includes(input.toLowerCase())
          }
        >
          {suppliers.map(supplier => (
            <Option key={supplier.id} value={supplier.name}>
              {supplier.name}
            </Option>
          ))}
        </Select>
      ),
    },
    {
      title: '操作',
      key: 'action',
      width: 80,
      render: (_, record) => (
        <Button
          type="link"
          danger
          icon={<DeleteOutlined />}
          onClick={() => handleDeleteRow(record.key)}
        />
      ),
    },
  ];

  // 组件挂载时聚焦金额输入框（仅在单条模式）
  useEffect(() => {
    if (!isBatchMode) {
      setTimeout(() => {
        const amountInput = document.querySelector('.ant-input-number-input');
        amountInput?.focus();
      }, 200);
    }
  }, [isBatchMode]);

  return (
    <Card 
      title={
        <Space>
          <span>快速录入</span>
          <Button
            type="text"
            size="small"
            icon={isBatchMode ? <UnorderedListOutlined /> : <AppstoreOutlined />}
            onClick={() => {
              setIsBatchMode(!isBatchMode);
              if (!isBatchMode) {
                // 切换到批量模式，清空批量数据
                setBatchData([]);
              } else {
                // 切换到单条模式，重置表单
                form.resetFields();
                form.setFieldsValue({
                  type: 'income',
                  date: dayjs(),
                  account: defaultAccount || undefined,
                });
              }
            }}
          >
            {isBatchMode ? '单条模式' : '批量模式'}
          </Button>
        </Space>
      }
      size="small"
      style={{ marginBottom: 16 }}
      bodyStyle={{ padding: '16px' }}
    >
      {isBatchMode ? (
        <div>
          <Form form={form} layout="inline" style={{ marginBottom: 16 }}>
            <Form.Item
              name="type"
              rules={[{ required: true, message: '请选择类型' }]}
              initialValue="income"
            >
              <Select style={{ width: 120 }} placeholder="请选择类型" onChange={handleTypeChange}>
                <Option value="income">收入</Option>
                <Option value="expense">支出</Option>
              </Select>
            </Form.Item>
            <Form.Item
              name="date"
              rules={[{ required: true, message: '请选择日期' }]}
              initialValue={dayjs()}
            >
              <DatePicker format="YYYY-MM-DD" locale={locale} placeholder="请选择日期" />
            </Form.Item>
            <Form.Item>
              <Button type="primary" icon={<PlusOutlined />} onClick={handleAddRow}>
                添加行
              </Button>
            </Form.Item>
            <Form.Item>
              <Button 
                type="primary" 
                onClick={handleSubmit}
                loading={loading}
                disabled={batchData.length === 0}
              >
                批量提交 ({batchData.length})
              </Button>
            </Form.Item>
          </Form>
          <Table
            columns={batchColumns}
            dataSource={batchData}
            pagination={false}
            size="small"
            scroll={{ y: 300, x: 1200 }}
            rowClassName={(record) => {
              return highlightRows.has(record.key) ? 'ant-table-row-highlight' : '';
            }}
          />
          <style>{`
            .ant-table-row-highlight {
              background-color: #fff1f0 !important;
            }
            .ant-table-row-highlight td {
              border-left: 3px solid #ff4d4f !important;
            }
            .ant-table-row-highlight:hover {
              background-color: #ffe7e6 !important;
            }
          `}</style>
        </div>
      ) : (
        <div className="quick-entry-single">
          <div className="quick-entry-single-header">
            <span>类型</span>
            <span>金额</span>
            <span>描述</span>
            <span>分类</span>
            <span>账户</span>
            <span>供应商</span>
            <span>操作</span>
          </div>
          <Form
            form={form}
            layout="inline"
            className="quick-entry-single-form"
            onFinish={handleSubmit}
            initialValues={{
              type: 'income',
              date: dayjs(),
              amount: undefined,
              description: '',
              category: undefined,
              account: defaultAccount || undefined,
            }}
          >
            <Form.Item
              name="type"
              rules={[{ required: true, message: '请选择类型' }]}
            >
              <Select placeholder="请选择类型" onChange={handleTypeChange}>
                <Option value="income">收入</Option>
                <Option value="expense">支出</Option>
              </Select>
            </Form.Item>

            <Form.Item
              name="amount"
              rules={[{ required: true, message: '请输入金额' }]}
            >
              <InputNumber
                min={0}
                precision={2}
                placeholder="请输入金额"
                autoFocus
              />
            </Form.Item>

            <Form.Item
              name="description"
            >
              <TextArea 
                placeholder="描述（可选）" 
                rows={1}
                autoSize={{ minRows: 1, maxRows: 4 }}
                style={{ width: '100%', resize: 'vertical' }}
              />
            </Form.Item>

            <Form.Item
              name="category"
              rules={[{ required: true, message: '请选择分类' }]}
            >
              <Select 
                placeholder="请选择分类"
                showSearch
                filterOption={(input, option) =>
                  (option?.children ?? '').toLowerCase().includes(input.toLowerCase())
                }
              >
                {categories.map(cat => (
                  <Option key={cat.id} value={cat.name}>
                    {cat.name}
                  </Option>
                ))}
              </Select>
            </Form.Item>

            <Form.Item
              name="account"
              rules={[{ required: true, message: '请选择账户' }]}
            >
              <Select placeholder="请选择账户">
                {accounts.map(acc => (
                  <Option key={acc.id} value={acc.name}>
                    {acc.name}
                  </Option>
                ))}
              </Select>
            </Form.Item>

            <Form.Item
              name="supplier"
              rules={[{ required: true, message: '请选择供应商' }]}
            >
              <Select 
                placeholder="请选择供应商"
                showSearch
                filterOption={(input, option) =>
                  (option?.children ?? '').toLowerCase().includes(input.toLowerCase())
                }
              >
                {suppliers.map(supplier => (
                  <Option key={supplier.id} value={supplier.name}>
                    {supplier.name}
                  </Option>
                ))}
              </Select>
            </Form.Item>

            <Form.Item
              name="date"
              rules={[{ required: true, message: '请选择日期' }]}
            >
              <DatePicker 
                format="YYYY-MM-DD"
                locale={locale}
                placeholder="请选择日期"
              />
            </Form.Item>

            <Form.Item>
              <Button 
                type="primary" 
                htmlType="submit"
                icon={<PlusOutlined />}
                loading={loading}
              >
                提交
              </Button>
            </Form.Item>
          </Form>
          <style>{`
            .quick-entry-single-header,
            .quick-entry-single-form {
              display: grid;
              grid-template-columns: 90px 140px minmax(200px, 1fr) 120px 110px 140px 90px;
              gap: 8px;
              align-items: center;
            }
            .quick-entry-single-header {
              font-weight: 600;
              color: #666;
              margin-bottom: 8px;
            }
            .quick-entry-single-form .ant-form-item {
              margin-bottom: 0;
            }
            .quick-entry-single-form .ant-form-item-control-input {
              width: 100%;
            }
            .quick-entry-single-form .ant-input-number,
            .quick-entry-single-form .ant-picker,
            .quick-entry-single-form .ant-select {
              width: 100%;
            }
            .quick-entry-single-form button {
              width: 100%;
            }
          `}</style>
        </div>
      )}
    </Card>
  );
};

export default QuickEntryForm;

