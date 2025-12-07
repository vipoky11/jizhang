import React, { useState, useEffect } from 'react';
import { Modal, Form, Input, InputNumber, DatePicker, Select } from 'antd';
import dayjs from 'dayjs';
import 'dayjs/locale/zh-cn';
import locale from 'antd/locale/zh_CN';
import { categoryAPI } from '../api/categories';
import { accountAPI } from '../api/accounts';
import { supplierAPI } from '../api/suppliers';

dayjs.locale('zh-cn');

const { Option } = Select;

const TransactionForm = ({ visible, onCancel, onSubmit, initialValues, categoryRefreshKey = 0, accountRefreshKey = 0, supplierRefreshKey = 0 }) => {
  const [form] = Form.useForm();
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
      form.resetFields();
    } else {
      // 当弹窗打开时，设置初始值
      if (initialValues) {
        // 编辑模式：使用传入的初始值
        form.setFieldsValue({
          ...initialValues,
          date: initialValues.date ? dayjs(initialValues.date) : dayjs(),
        });
      }
    }
  }, [visible, form, initialValues]);

  const handleSubmit = async () => {
    try {
      const values = await form.validateFields();
      onSubmit({
        ...values,
        date: values.date.format('YYYY-MM-DD'),
      });
    } catch (error) {
      console.error('表单验证失败:', error);
    }
  };

  return (
    <Modal
      title="编辑记录"
      open={visible}
      onCancel={onCancel}
      onOk={handleSubmit}
      width={600}
      okText="提交"
      cancelText="取消"
    >
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
    </Modal>
  );
};

export default TransactionForm;

