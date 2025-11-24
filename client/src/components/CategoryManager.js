import React, { useState, useEffect } from 'react';
import { Modal, Form, Input, Button, Table, Tag, Space, Popconfirm, message, InputNumber } from 'antd';
import { EditOutlined, DeleteOutlined, PlusOutlined } from '@ant-design/icons';
import { categoryAPI } from '../api/categories';

const CategoryManager = ({ visible, onCancel, onRefresh }) => {
  const [form] = Form.useForm();
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(false);
  const [editingCategory, setEditingCategory] = useState(null);
  const [formVisible, setFormVisible] = useState(false);

  const loadCategories = async () => {
    setLoading(true);
    try {
      const response = await categoryAPI.getAll();
      if (response.data.success) {
        setCategories(response.data.data);
      }
    } catch (error) {
      message.error('加载分类失败');
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (visible) {
      loadCategories();
    }
  }, [visible]);

  const handleSubmit = async (values) => {
    try {
      if (editingCategory) {
        await categoryAPI.update(editingCategory.id, values);
        message.success('分类更新成功');
      } else {
        await categoryAPI.create(values);
        message.success('分类创建成功');
      }
      setFormVisible(false);
      setEditingCategory(null);
      form.resetFields();
      loadCategories();
      if (onRefresh) onRefresh();
    } catch (error) {
      const errorMsg = error.response?.data?.message || (editingCategory ? '更新失败' : '创建失败');
      message.error(errorMsg);
    }
  };

  const handleEdit = (record) => {
    setEditingCategory(record);
    form.setFieldsValue(record);
    setFormVisible(true);
  };

  const handleDelete = async (id) => {
    try {
      await categoryAPI.delete(id);
      message.success('删除成功');
      loadCategories();
      if (onRefresh) onRefresh();
    } catch (error) {
      const errorMsg = error.response?.data?.message || '删除失败';
      message.error(errorMsg);
    }
  };

  const columns = [
    {
      title: '分类名称',
      dataIndex: 'name',
      key: 'name',
      render: (text, record) => (
        <Tag color={record.color}>{text}</Tag>
      ),
    },
    {
      title: '排序',
      dataIndex: 'sort_order',
      key: 'sort_order',
      width: 100,
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
            title="确定要删除这个分类吗？"
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
        title="分类管理"
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
              setEditingCategory(null);
              form.resetFields();
              form.setFieldsValue({
                color: '#1890ff',
                sort_order: 0,
              });
              setFormVisible(true);
            }}
          >
            新增分类
          </Button>
        </div>
        <Table
          columns={columns}
          dataSource={categories}
          loading={loading}
          rowKey="id"
          pagination={false}
        />
      </Modal>

      <Modal
        title={editingCategory ? '编辑分类' : '新增分类'}
        open={formVisible}
        onCancel={() => {
          setFormVisible(false);
          setEditingCategory(null);
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
            label="分类名称"
            rules={[{ required: true, message: '请输入分类名称' }]}
          >
            <Input placeholder="请输入分类名称" />
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
        </Form>
      </Modal>
    </>
  );
};

export default CategoryManager;

