import React, { useState, useEffect } from 'react';
import { Modal, Form, Input, Select, DatePicker, Button, Space, Tag, message } from 'antd';
import dayjs from 'dayjs';
import 'dayjs/locale/zh-cn';
import locale from 'antd/locale/zh_CN';
import { tagAPI } from '../api/tags';

dayjs.locale('zh-cn');

const { TextArea } = Input;
const { Option } = Select;

const MemoForm = ({ visible, onCancel, onSubmit, initialValues }) => {
  const [form] = Form.useForm();
  const [availableTags, setAvailableTags] = useState([]); // 可用的标签列表

  // 加载可用标签列表
  useEffect(() => {
    if (visible) {
      const loadData = async () => {
        try {
          // 加载标签
          const tagResponse = await tagAPI.getAll();
          if (tagResponse.data.success) {
            setAvailableTags(tagResponse.data.data);
          }
        } catch (error) {
          console.error('加载数据失败:', error);
        }
      };
      loadData();
    }
  }, [visible]);

  useEffect(() => {
    if (visible) {
      // 确保标签列表已加载（编辑模式需要）
      if (initialValues && availableTags.length === 0) {
        return;
      }
      
      if (initialValues) {
        // 编辑模式：根据标签名称找到对应的ID
        const tagNames = initialValues.tags 
          ? initialValues.tags.split(',').filter(t => t.trim())
          : [];
        const ids = tagNames.map(name => {
          const tag = availableTags.find(t => t.name === name);
          return tag ? tag.id : null;
        }).filter(id => id !== null);
        
        form.setFieldsValue({
          title: initialValues.title,
          content: initialValues.content,
          priority: initialValues.priority !== undefined ? initialValues.priority : 0,
          tagIds: ids,
          memo_date: initialValues.memo_date ? dayjs(initialValues.memo_date) : dayjs(),
        });
      } else {
        // 新增模式
        form.resetFields();
        form.setFieldsValue({
          priority: 0,
          tagIds: [],
          memo_date: dayjs(),
        });
      }
    }
  }, [visible, initialValues, form, availableTags]);

  const handleSubmit = async () => {
    try {
      const values = await form.validateFields();
      
      // 根据选中的标签ID获取标签名称（使用表单字段值）
      const tagIds = values.tagIds || [];
      const selectedTags = availableTags
        .filter(tag => tagIds.includes(tag.id))
        .map(tag => tag.name);
      
      // 格式化日期为 YYYY-MM-DD
      const formattedDate = values.memo_date 
        ? (dayjs.isDayjs(values.memo_date) ? values.memo_date.format('YYYY-MM-DD') : values.memo_date)
        : dayjs().format('YYYY-MM-DD');
      
      const data = {
        title: values.title,
        content: values.content,
        priority: values.priority !== undefined ? values.priority : 0,
        tags: selectedTags.join(','),
        memo_date: formattedDate,
      };
      
      console.log('MemoForm - 提交数据:', data);
      
      onSubmit(data);
    } catch (error) {
      console.error('表单验证失败:', error);
      // 显示验证错误信息
      if (error.errorFields) {
        error.errorFields.forEach(field => {
          message.error(field.errors[0]);
        });
      }
    }
  };

  const handleTagChange = (value) => {
    // Form.Item 会自动管理字段值
  };

  return (
    <Modal
      title={initialValues ? '编辑备忘录' : '新增备忘录'}
      open={visible}
      onCancel={onCancel}
      footer={null}
      width={600}
    >
      <Form
        form={form}
        layout="vertical"
        onFinish={handleSubmit}
      >
        <Form.Item
          name="title"
          label="标题"
          rules={[{ required: true, message: '请输入标题' }]}
        >
          <Input placeholder="请输入标题" />
        </Form.Item>

        <Form.Item
          name="content"
          label="内容"
          rules={[{ required: true, message: '请输入内容' }]}
        >
          <TextArea
            rows={6}
            placeholder="请输入内容"
            autoSize={{ minRows: 6, maxRows: 10 }}
            style={{ resize: 'vertical' }}
          />
        </Form.Item>

        <Form.Item
          name="memo_date"
          label="备忘录日期"
          rules={[{ required: true, message: '请选择备忘录日期' }]}
        >
          <DatePicker 
            style={{ width: '100%' }} 
            format="YYYY-MM-DD" 
            locale={locale}
            placeholder="请选择备忘录日期"
          />
        </Form.Item>

        <Form.Item
          name="tagIds"
          label="标签"
          rules={[{ required: true, message: '请选择标签' }]}
          extra="提示：标签会在内容中自动高亮显示。如需新增标签，请先在标签管理中创建。"
        >
          <Select
            mode="multiple"
            placeholder="请选择标签（可在标签管理中新增标签）"
            onChange={handleTagChange}
            showSearch
            filterOption={(input, option) =>
              (option?.children ?? '').toLowerCase().includes(input.toLowerCase())
            }
          >
            {availableTags.map(tag => (
              <Option key={tag.id} value={tag.id}>
                <Tag color={tag.color}>{tag.name}</Tag>
              </Option>
            ))}
          </Select>
        </Form.Item>

        <Form.Item
          name="priority"
          label="状态"
          initialValue={0}
        >
          <Select placeholder="请选择状态">
            <Option value={0}>对</Option>
            <Option value={1}>错</Option>
          </Select>
        </Form.Item>

        <Form.Item>
          <Space>
            <Button type="primary" htmlType="submit">
              提交
            </Button>
            <Button onClick={onCancel}>取消</Button>
          </Space>
        </Form.Item>
      </Form>
    </Modal>
  );
};

export default MemoForm;
