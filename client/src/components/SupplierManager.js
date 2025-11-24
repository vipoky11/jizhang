import React, { useState, useEffect } from 'react';
import { Modal, Form, Input, Button, Table, Space, Popconfirm, message } from 'antd';
import { EditOutlined, DeleteOutlined, PlusOutlined } from '@ant-design/icons';
import { supplierAPI } from '../api/suppliers';

const SupplierManager = ({ visible, onCancel, onRefresh }) => {
  const [form] = Form.useForm();
  const [suppliers, setSuppliers] = useState([]);
  const [loading, setLoading] = useState(false);
  const [editingSupplier, setEditingSupplier] = useState(null);
  const [formVisible, setFormVisible] = useState(false);

  const loadSuppliers = async () => {
    setLoading(true);
    try {
      const response = await supplierAPI.getAll();
      if (response.data.success) {
        setSuppliers(response.data.data);
      }
    } catch (error) {
      message.error('加载供应商失败');
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (visible) {
      loadSuppliers();
    }
  }, [visible]);

  const handleSubmit = async (values) => {
    try {
      if (editingSupplier) {
        await supplierAPI.update(editingSupplier.id, values);
        message.success('供应商更新成功');
      } else {
        await supplierAPI.create(values);
        message.success('供应商创建成功');
      }
      setFormVisible(false);
      setEditingSupplier(null);
      form.resetFields();
      loadSuppliers();
      if (onRefresh) onRefresh();
    } catch (error) {
      const errorMsg = error.response?.data?.message || (editingSupplier ? '更新失败' : '创建失败');
      message.error(errorMsg);
    }
  };

  const handleEdit = (record) => {
    setEditingSupplier(record);
    form.setFieldsValue(record);
    setFormVisible(true);
  };

  const handleDelete = async (id) => {
    try {
      await supplierAPI.delete(id);
      message.success('删除成功');
      loadSuppliers();
      if (onRefresh) onRefresh();
    } catch (error) {
      const errorMsg = error.response?.data?.message || '删除失败';
      message.error(errorMsg);
    }
  };

  const columns = [
    {
      title: '供应商名称',
      dataIndex: 'name',
      key: 'name',
    },
    {
      title: '操作',
      key: 'action',
      width: 150,
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
            title="确定要删除这个供应商吗？"
            onConfirm={() => handleDelete(record.id)}
            okText="确定"
            cancelText="取消"
          >
            <Button
              type="link"
              danger
              icon={<DeleteOutlined />}
            >
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
        title="供应商管理"
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
              setEditingSupplier(null);
              form.resetFields();
              setFormVisible(true);
            }}
          >
            新增供应商
          </Button>
        </div>
        <Table
          columns={columns}
          dataSource={suppliers}
          rowKey="id"
          loading={loading}
          pagination={false}
        />
      </Modal>

      <Modal
        title={editingSupplier ? '编辑供应商' : '新增供应商'}
        open={formVisible}
        onCancel={() => {
          setFormVisible(false);
          setEditingSupplier(null);
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
            label="供应商名称"
            rules={[{ required: true, message: '请输入供应商名称' }]}
          >
            <Input placeholder="请输入供应商名称" />
          </Form.Item>
        </Form>
      </Modal>
    </>
  );
};

export default SupplierManager;

