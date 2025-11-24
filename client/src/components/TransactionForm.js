import React, { useState, useEffect } from 'react';
import { Modal, Form, Input, InputNumber, DatePicker, Select, Button, Table } from 'antd';
import { PlusOutlined, DeleteOutlined } from '@ant-design/icons';
import dayjs from 'dayjs';
import 'dayjs/locale/zh-cn';
import locale from 'antd/locale/zh_CN';
import { categoryAPI } from '../api/categories';
import { accountAPI } from '../api/accounts';
import { supplierAPI } from '../api/suppliers';

dayjs.locale('zh-cn');

const { Option } = Select;

const TransactionForm = ({ visible, onCancel, onSubmit, initialValues, isBatch = false, categoryRefreshKey = 0, accountRefreshKey = 0, supplierRefreshKey = 0 }) => {
  const [form] = Form.useForm();
  const [batchData, setBatchData] = useState([]);
  const [categories, setCategories] = useState([]);
  const [accounts, setAccounts] = useState([]);
  const [suppliers, setSuppliers] = useState([]);
  const [defaultAccount, setDefaultAccount] = useState('');

  // 加载账户列表
  useEffect(() => {
    if (visible) {
      const loadAccounts = async () => {
        try {
          const response = await accountAPI.getAll();
          if (response.data.success) {
            setAccounts(response.data.data);
            // 找到默认账户
            const defaultAcc = response.data.data.find(acc => acc.is_default === 1);
            if (defaultAcc) {
              setDefaultAccount(defaultAcc.name);
              // 如果是新增且没有设置账户，使用默认账户
              if (!initialValues) {
                form.setFieldsValue({ account: defaultAcc.name });
              }
            } else if (response.data.data.length > 0) {
              setDefaultAccount(response.data.data[0].name);
              if (!initialValues) {
                form.setFieldsValue({ account: response.data.data[0].name });
              }
            }
          }
        } catch (error) {
          console.error('加载账户失败:', error);
        }
      };
      loadAccounts();
    }
  }, [visible, form, initialValues, accountRefreshKey]);

  // 加载供应商列表
  useEffect(() => {
    if (visible) {
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
    }
  }, [visible, supplierRefreshKey]);

  // 加载分类列表
  useEffect(() => {
    if (visible) {
      const loadCategories = async () => {
        try {
          const type = form.getFieldValue('type') || initialValues?.type || 'income';
          const response = await categoryAPI.getAll(type);
          if (response.data.success) {
            setCategories(response.data.data);
            // 不再自动选择第一个分类，让用户手动选择
          }
        } catch (error) {
          console.error('加载分类失败:', error);
        }
      };
      loadCategories();
    }
  }, [visible, form, initialValues, categoryRefreshKey]);

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
        }
      } catch (error) {
        console.error('加载分类失败:', error);
      }
    };
    loadCategories();
  };

  // 当弹窗关闭时清空数据
  useEffect(() => {
    if (!visible) {
      setBatchData([]);
      form.resetFields();
    } else {
      // 当弹窗打开时，设置初始值
      if (initialValues) {
        // 编辑模式：使用传入的初始值
        form.setFieldsValue({
          ...initialValues,
          date: initialValues.date ? dayjs(initialValues.date) : dayjs(),
        });
      } else {
        // 新增模式：设置默认值
        form.setFieldsValue({
          type: 'income',
          date: dayjs(),
        });
        // 默认账户会在 loadAccounts 中设置
      }
      if (isBatch) {
        // 批量录入时，设置默认日期为当前日期
        form.setFieldsValue({ date: dayjs() });
      }
    }
  }, [visible, form, isBatch, initialValues]);

  const handleSubmit = async () => {
    try {
      const values = await form.validateFields();
      
      if (isBatch) {
        if (batchData.length === 0) {
          Modal.warning({ title: '提示', content: '请至少添加一条记录' });
          return;
        }
        // 验证批量数据中的分类是否都已填写
        const invalidCategoryRows = batchData.filter(item => !item.category || item.category.trim() === '');
        if (invalidCategoryRows.length > 0) {
          Modal.warning({ 
            title: '提示', 
            content: `有 ${invalidCategoryRows.length} 条记录的分类未填写，请填写完整后再提交` 
          });
          return;
        }
        // 验证批量数据中的供应商是否都已填写
        const invalidSupplierRows = batchData.filter(item => !item.supplier || item.supplier.trim() === '');
        if (invalidSupplierRows.length > 0) {
          Modal.warning({ 
            title: '提示', 
            content: `有 ${invalidSupplierRows.length} 条记录的供应商未填写，请填写完整后再提交` 
          });
          return;
        }
        onSubmit(batchData);
      } else {
        onSubmit({
          ...values,
          date: values.date.format('YYYY-MM-DD'),
        });
      }
    } catch (error) {
      console.error('表单验证失败:', error);
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
              Modal.warning({ 
                title: '提示', 
                content: `该类型（${values.type === 'income' ? '收入' : '支出'}）暂无分类，请先创建分类后再添加记录` 
              });
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
            Modal.warning({ 
              title: '提示', 
              content: '加载分类失败，请稍后重试' 
            });
          }
        } catch (error) {
          console.error('加载分类失败:', error);
          Modal.warning({ 
            title: '提示', 
            content: '加载分类失败，请稍后重试' 
          });
        }
      };
      loadCategories();
    }).catch(() => {
      Modal.warning({ title: '提示', content: '请先选择类型和日期' });
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
  };

  const batchColumns = [
    {
      title: '类型',
      dataIndex: 'type',
      key: 'type',
      width: 100,
      render: (text, record) => (
        <Select
          value={text || undefined}
          onChange={(value) => {
            handleBatchDataChange(record.key, 'type', value);
            // 类型变化时，清空分类并重新加载分类列表
            handleBatchDataChange(record.key, 'category', undefined);
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
      render: (text, record) => (
        <Input.TextArea
          value={text}
          onChange={(e) => handleBatchDataChange(record.key, 'description', e.target.value)}
          placeholder="请输入描述（支持回车换行）"
          rows={2}
          autoSize={{ minRows: 2, maxRows: 4 }}
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
        // 获取当前行的类型对应的分类列表
        const typeCategories = categories.filter(cat => 
          cat.type === record.type || cat.type === 'both'
        );
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

  return (
    <Modal
      title={isBatch ? '批量录入' : initialValues ? '编辑记录' : '新增记录'}
      open={visible}
      onCancel={onCancel}
      onOk={handleSubmit}
      width={isBatch ? 900 : 600}
      okText="提交"
      cancelText="取消"
    >
      {isBatch ? (
        <div>
          <Form form={form} layout="inline" style={{ marginBottom: 16 }}>
            <Form.Item
              name="type"
              label="类型"
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
              label="日期"
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
          </Form>
          <Table
            columns={batchColumns}
            dataSource={batchData}
            pagination={false}
            size="small"
            scroll={{ y: 300 }}
          />
        </div>
      ) : (
        <Form
          form={form}
          layout="vertical"
          initialValues={initialValues ? {
            ...initialValues,
            date: initialValues.date ? dayjs(initialValues.date) : dayjs(),
          } : {
            date: dayjs(),
            type: 'income',
          }}
        >
          <Form.Item
            name="type"
            label="类型"
            rules={[{ required: true, message: '请选择类型' }]}
          >
            <Select placeholder="请选择类型">
              <Option value="income">收入</Option>
              <Option value="expense">支出</Option>
            </Select>
          </Form.Item>
          <Form.Item
            name="amount"
            label="金额"
            rules={[{ required: true, message: '请输入金额' }]}
          >
            <InputNumber
              min={0}
              precision={2}
              style={{ width: '100%' }}
              prefix="¥"
              placeholder="请输入金额"
            />
          </Form.Item>
          <Form.Item
            name="description"
            label="描述"
          >
            <Input.TextArea rows={3} placeholder="请输入描述" />
          </Form.Item>
          <Form.Item
            name="category"
            label="分类"
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
            label="账户"
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
            label="供应商"
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
            label="日期"
            rules={[{ required: true, message: '请选择日期' }]}
          >
            <DatePicker 
              format="YYYY-MM-DD"
              style={{ width: '100%' }} 
              locale={locale}
              placeholder="请选择日期"
            />
          </Form.Item>
        </Form>
      )}
    </Modal>
  );
};

export default TransactionForm;

