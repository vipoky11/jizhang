import React, { useState, useEffect } from 'react';
import { Modal, Form, Input, Button, Table, Tag, Space, Popconfirm, message, InputNumber, Switch } from 'antd';
import { EditOutlined, DeleteOutlined, PlusOutlined, StarOutlined, StarFilled } from '@ant-design/icons';
import { accountAPI } from '../api/accounts';

const AccountManager = ({ visible, onCancel, onRefresh }) => {
  const [form] = Form.useForm();
  const [accounts, setAccounts] = useState([]);
  const [loading, setLoading] = useState(false);
  const [editingAccount, setEditingAccount] = useState(null);
  const [formVisible, setFormVisible] = useState(false);

  const loadAccounts = async () => {
    setLoading(true);
    try {
      const response = await accountAPI.getAll();
      if (response.data.success) {
        setAccounts(response.data.data);
      }
    } catch (error) {
      message.error('加载账户失败');
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (visible) {
      loadAccounts();
    }
  }, [visible]);

  const handleSubmit = async (values) => {
    try {
      if (editingAccount) {
        await accountAPI.update(editingAccount.id, values);
        message.success('账户更新成功');
      } else {
        await accountAPI.create(values);
        message.success('账户创建成功');
      }
      setFormVisible(false);
      setEditingAccount(null);
      form.resetFields();
      loadAccounts();
      if (onRefresh) onRefresh();
    } catch (error) {
      const errorMsg = error.response?.data?.message || (editingAccount ? '更新失败' : '创建失败');
      message.error(errorMsg);
    }
  };

  const handleEdit = (record) => {
    setEditingAccount(record);
    form.setFieldsValue({
      ...record,
      is_default: record.is_default === 1
    });
    setFormVisible(true);
  };

  const handleDelete = async (id) => {
    try {
      await accountAPI.delete(id);
      message.success('删除成功');
      loadAccounts();
      if (onRefresh) onRefresh();
    } catch (error) {
      const errorMsg = error.response?.data?.message || '删除失败';
      message.error(errorMsg);
    }
  };

  const handleSetDefault = async (id) => {
    try {
      await accountAPI.setDefault(id);
      message.success('默认账户设置成功');
      loadAccounts();
      if (onRefresh) onRefresh();
    } catch (error) {
      message.error('设置默认账户失败');
    }
  };

  const columns = [
    {
      title: '账户名称',
      dataIndex: 'name',
      key: 'name',
      render: (text, record) => (
        <Space>
          <Tag color={record.color}>{text}</Tag>
          {record.is_default === 1 && <StarFilled style={{ color: '#faad14' }} />}
        </Space>
      ),
    },
    {
      title: '排序',
      dataIndex: 'sort_order',
      key: 'sort_order',
      width: 100,
    },
    {
      title: '默认账户',
      dataIndex: 'is_default',
      key: 'is_default',
      width: 120,
      render: (isDefault, record) => (
        isDefault === 1 ? (
          <Tag color="gold">默认</Tag>
        ) : (
          <Button
            type="link"
            icon={<StarOutlined />}
            onClick={() => handleSetDefault(record.id)}
          >
            设为默认
          </Button>
        )
      ),
    },
    {
      title: '操作',
      key: 'action',
      width: 120,
      render: (_, record) => (
        <Space>
          <Button
            type="link"
            icon={<EditOutlined />}
            onClick={() => handleEdit(record)}
          >
            编辑
          </Button>
          <Popconfirm
            title="确定要删除这个账户吗？"
            onConfirm={() => handleDelete(record.id)}
            okText="确定"
            cancelText="取消"
          >
            <Button type="link" danger icon={<DeleteOutlined />}>
              删除
            </Button>
          </Popconfirm>
        </Space>
      ),
    },
  ];

  return (
    <>
      <Modal
        title="账户管理"
        open={visible}
        onCancel={onCancel}
        footer={null}
        width={800}
      >
        <div style={{ marginBottom: 16 }}>
          <Button
            type="primary"
            icon={<PlusOutlined />}
            onClick={() => {
              setEditingAccount(null);
              form.resetFields();
              form.setFieldsValue({
                color: '#1890ff',
                sort_order: 0,
                is_default: false,
              });
              setFormVisible(true);
            }}
          >
            新增账户
          </Button>
        </div>
        <Table
          columns={columns}
          dataSource={accounts}
          loading={loading}
          rowKey="id"
          pagination={false}
        />
      </Modal>

      <Modal
        title={editingAccount ? '编辑账户' : '新增账户'}
        open={formVisible}
        onCancel={() => {
          setFormVisible(false);
          setEditingAccount(null);
          form.resetFields();
        }}
        onOk={() => form.submit()}
        okText="确定"
        cancelText="取消"
      >
        <Form
          form={form}
          layout="vertical"
          onFinish={handleSubmit}
        >
          <Form.Item
            name="name"
            label="账户名称"
            rules={[{ required: true, message: '请输入账户名称' }]}
          >
            <Input placeholder="请输入账户名称" />
          </Form.Item>
          <Form.Item
            name="color"
            label="颜色"
          >
            <Input type="color" style={{ width: '100%', height: 40 }} />
          </Form.Item>
          <Form.Item
            name="sort_order"
            label="排序"
          >
            <InputNumber min={0} style={{ width: '100%' }} />
          </Form.Item>
          <Form.Item
            name="is_default"
            label="设为默认账户"
            valuePropName="checked"
          >
            <Switch />
          </Form.Item>
        </Form>
      </Modal>
    </>
  );
};

export default AccountManager;

