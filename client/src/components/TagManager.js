import React, { useState, useEffect } from 'react';
import { Modal, Form, Input, InputNumber, ColorPicker, Button, Table, Space, Popconfirm, message, Tag as AntTag } from 'antd';
import { EditOutlined, DeleteOutlined, PlusOutlined } from '@ant-design/icons';
import { tagAPI } from '../api/tags';

const TagManager = ({ visible, onCancel }) => {
  const [tags, setTags] = useState([]);
  const [loading, setLoading] = useState(false);
  const [form] = Form.useForm();
  const [editingTag, setEditingTag] = useState(null);
  const [formVisible, setFormVisible] = useState(false);

  // 加载标签列表
  const loadTags = async () => {
    setLoading(true);
    try {
      const response = await tagAPI.getAll();
      if (response.data.success) {
        setTags(response.data.data);
      }
    } catch (error) {
      message.error('加载标签失败');
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (visible) {
      loadTags();
    }
  }, [visible]);

  // 处理提交
  const handleSubmit = async () => {
    try {
      const values = await form.validateFields();
      
      // 处理颜色值
      let colorValue = values.color;
      if (colorValue && typeof colorValue === 'object') {
        if (colorValue.toHexString) {
          colorValue = colorValue.toHexString();
        } else if (colorValue.toHex) {
          colorValue = colorValue.toHex();
        } else if (colorValue.metaColor && colorValue.metaColor.hex) {
          colorValue = colorValue.metaColor.hex;
        } else if (colorValue.hex) {
          colorValue = colorValue.hex;
        } else {
          colorValue = '#1890ff';
        }
      }
      if (typeof colorValue !== 'string') {
        colorValue = '#1890ff';
      }

      const data = {
        ...values,
        color: colorValue || '#1890ff',
      };

      if (editingTag) {
        await tagAPI.update(editingTag.id, data);
        message.success('更新成功');
      } else {
        await tagAPI.create(data);
        message.success('创建成功');
      }
      
      setFormVisible(false);
      setEditingTag(null);
      form.resetFields();
      loadTags();
    } catch (error) {
      message.error(editingTag ? '更新失败' : '创建失败');
      console.error(error);
    }
  };

  // 删除标签
  const handleDelete = async (id) => {
    try {
      await tagAPI.delete(id);
      message.success('删除成功');
      loadTags();
    } catch (error) {
      message.error('删除失败');
      console.error(error);
    }
  };

  // 编辑标签
  const handleEdit = (tag) => {
    setEditingTag(tag);
    form.setFieldsValue({
      name: tag.name,
      color: tag.color,
      sort_order: tag.sort_order || 0,
    });
    setFormVisible(true);
  };

  // 新增标签
  const handleAdd = () => {
    setEditingTag(null);
    form.resetFields();
    form.setFieldsValue({
      color: '#1890ff',
      sort_order: 0,
    });
    setFormVisible(true);
  };

  const columns = [
    {
      title: '标签名称',
      dataIndex: 'name',
      key: 'name',
      render: (text, record) => (
        <AntTag color={record.color}>{text}</AntTag>
      ),
    },
    {
      title: '颜色',
      dataIndex: 'color',
      key: 'color',
      render: (color) => (
        <div style={{ display: 'flex', alignItems: 'center' }}>
          <div
            style={{
              width: 20,
              height: 20,
              backgroundColor: color,
              borderRadius: 4,
              border: '1px solid #d9d9d9',
            }}
          />
          <span style={{ marginLeft: 8 }}>{color}</span>
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
            title="确定要删除这个标签吗？"
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
        title="标签管理"
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
            新增标签
          </Button>
        </div>
        <Table
          columns={columns}
          dataSource={tags}
          rowKey="id"
          loading={loading}
          pagination={false}
        />
      </Modal>

      <Modal
        title={editingTag ? '编辑标签' : '新增标签'}
        open={formVisible}
        onCancel={() => {
          setFormVisible(false);
          setEditingTag(null);
          form.resetFields();
        }}
        onOk={handleSubmit}
        okText="提交"
        cancelText="取消"
      >
        <Form form={form} layout="vertical" style={{ marginTop: 20 }}>
          <Form.Item
            name="name"
            label="标签名称"
            rules={[{ required: true, message: '请输入标签名称' }]}
          >
            <Input placeholder="请输入标签名称" />
          </Form.Item>

          <Form.Item
            name="color"
            label="标签颜色"
            initialValue="#1890ff"
          >
            <ColorPicker
              showText
              format="hex"
              presets={[
                {
                  label: '推荐颜色',
                  colors: [
                    '#1890ff', '#52c41a', '#ff4d4f', '#faad14',
                    '#722ed1', '#eb2f96', '#13c2c2', '#fa8c16',
                  ],
                },
              ]}
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

export default TagManager;

