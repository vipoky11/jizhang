import React, { useState, useEffect } from 'react';
import { Modal, Form, Input, InputNumber, Button, Table, Space, Popconfirm, message } from 'antd';
import { EditOutlined, DeleteOutlined, PlusOutlined } from '@ant-design/icons';
import { colorAPI } from '../api/colors';

const ColorManager = ({ visible, onCancel }) => {
  const [colors, setColors] = useState([]);
  const [loading, setLoading] = useState(false);
  const [form] = Form.useForm();
  const [editingColor, setEditingColor] = useState(null);
  const [formVisible, setFormVisible] = useState(false);

  // 加载颜色列表
  const loadColors = async () => {
    setLoading(true);
    try {
      const response = await colorAPI.getAll();
      if (response.data.success) {
        setColors(response.data.data);
      }
    } catch (error) {
      message.error('加载颜色失败');
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (visible) {
      loadColors();
    }
  }, [visible]);

  // 处理提交
  const handleSubmit = async () => {
    try {
      const values = await form.validateFields();
      
      // 确保hex值是大写
      const hexValue = values.hex.trim().toUpperCase();
      if (!hexValue.startsWith('#')) {
        form.setFieldsValue({ hex: '#' + hexValue });
        values.hex = '#' + hexValue;
      }

      if (editingColor) {
        await colorAPI.update(editingColor.id, values);
        message.success('更新成功');
      } else {
        await colorAPI.create(values);
        message.success('创建成功');
      }
      
      setFormVisible(false);
      setEditingColor(null);
      form.resetFields();
      loadColors();
    } catch (error) {
      const errorMsg = error.response?.data?.message || (editingColor ? '更新失败' : '创建失败');
      message.error(errorMsg);
      console.error(error);
    }
  };

  // 删除颜色
  const handleDelete = async (id) => {
    try {
      await colorAPI.delete(id);
      message.success('删除成功');
      loadColors();
    } catch (error) {
      const errorMsg = error.response?.data?.message || '删除失败';
      message.error(errorMsg);
      console.error(error);
    }
  };

  // 编辑颜色
  const handleEdit = (color) => {
    setEditingColor(color);
    form.setFieldsValue({
      name: color.name,
      hex: color.hex,
      sort_order: color.sort_order || 0,
    });
    setFormVisible(true);
  };

  // 新增颜色
  const handleAdd = () => {
    setEditingColor(null);
    form.resetFields();
    form.setFieldsValue({
      hex: '#1890ff',
      sort_order: 0,
    });
    setFormVisible(true);
  };

  const columns = [
    {
      title: '颜色名称',
      dataIndex: 'name',
      key: 'name',
      width: 150,
    },
    {
      title: '颜色值',
      dataIndex: 'hex',
      key: 'hex',
      width: 120,
      render: (hex) => (
        <code style={{ fontSize: '12px' }}>{hex}</code>
      ),
    },
    {
      title: '颜色预览',
      key: 'preview',
      width: 150,
      render: (_, record) => (
        <div style={{ display: 'flex', alignItems: 'center' }}>
          <div
            style={{
              width: 40,
              height: 40,
              backgroundColor: record.hex,
              borderRadius: 4,
              border: '1px solid #d9d9d9',
              marginRight: 8,
            }}
          />
          <span>{record.hex}</span>
        </div>
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
            title="确定要删除这个颜色吗？"
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
        title="颜色管理"
        open={visible}
        onCancel={onCancel}
        footer={null}
        width={800}
      >
        <div style={{ marginBottom: 16 }}>
          <Button
            type="primary"
            icon={<PlusOutlined />}
            onClick={handleAdd}
          >
            新增颜色
          </Button>
        </div>
        <Table
          columns={columns}
          dataSource={colors}
          rowKey="id"
          loading={loading}
          pagination={false}
        />
      </Modal>

      <Modal
        title={editingColor ? '编辑颜色' : '新增颜色'}
        open={formVisible}
        onCancel={() => {
          setFormVisible(false);
          setEditingColor(null);
          form.resetFields();
        }}
        onOk={handleSubmit}
        okText="提交"
        cancelText="取消"
      >
        <Form form={form} layout="vertical" style={{ marginTop: 20 }}>
          <Form.Item
            name="name"
            label="颜色名称"
            rules={[{ required: true, message: '请输入颜色名称' }]}
          >
            <Input placeholder="例如：蓝色、红色" />
          </Form.Item>

          <Form.Item
            name="hex"
            label="颜色值（HEX）"
            rules={[
              { required: true, message: '请输入颜色值' },
              { pattern: /^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/, message: '颜色值格式不正确，应为#RRGGBB格式' }
            ]}
          >
            <Input 
              placeholder="#1890ff" 
              prefix="#"
              addonBefore="#"
              style={{ width: '100%' }}
            />
          </Form.Item>

          <Form.Item
            name="sort_order"
            label="排序"
            initialValue={0}
          >
            <InputNumber min={0} style={{ width: '100%' }} />
          </Form.Item>
        </Form>
      </Modal>
    </>
  );
};

export default ColorManager;

