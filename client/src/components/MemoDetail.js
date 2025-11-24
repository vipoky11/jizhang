import React from 'react';
import { Modal, Descriptions, Tag, Badge, Space, Button } from 'antd';
import { EditOutlined } from '@ant-design/icons';
import dayjs from 'dayjs';
import 'dayjs/locale/zh-cn';

dayjs.locale('zh-cn');

const MemoDetail = ({ visible, onCancel, memo, onEdit }) => {
  if (!memo) return null;

  const tags = memo.tags ? memo.tags.split(',').filter(t => t.trim()) : [];
  
  // 高亮标签
  const highlightTags = (content, tags) => {
    if (!tags || !tags.trim()) return content;
    const tagList = tags.split(',').map(t => t.trim()).filter(t => t);
    let highlightedContent = content;
    
    tagList.forEach(tag => {
      const regex = new RegExp(`(${tag.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})`, 'gi');
      highlightedContent = highlightedContent.replace(
        regex, 
        `<mark style="background-color: #fff566; padding: 2px 4px; border-radius: 2px;">$1</mark>`
      );
    });
    
    return highlightedContent;
  };

  const highlightedContent = highlightTags(memo.content, memo.tags);

  // 状态配置
  const statusConfig = {
    0: { text: '对', color: 'success' },
    1: { text: '错', color: 'error' },
  };

  return (
    <Modal
      title="备忘录详情"
      open={visible}
      onCancel={onCancel}
      footer={[
        <Button key="edit" type="primary" icon={<EditOutlined />} onClick={() => {
          onCancel();
          if (onEdit) onEdit(memo);
        }}>
          编辑
        </Button>,
        <Button key="close" onClick={onCancel}>
          关闭
        </Button>,
      ]}
      width={700}
    >
      <Descriptions column={1} bordered>
        <Descriptions.Item label="标题">
          <Space>
            <Badge 
              status={statusConfig[memo.priority]?.color || 'default'} 
              text={statusConfig[memo.priority]?.text || '对'}
            />
            <span style={{ fontSize: '16px', fontWeight: 'bold' }}>{memo.title}</span>
          </Space>
        </Descriptions.Item>
        
        <Descriptions.Item label="内容">
          <div
            style={{
              maxHeight: '400px',
              overflow: 'auto',
              padding: '12px',
              backgroundColor: '#fafafa',
              borderRadius: '4px',
              lineHeight: '1.8',
              whiteSpace: 'pre-wrap',
            }}
            dangerouslySetInnerHTML={{ __html: highlightedContent }}
          />
        </Descriptions.Item>
        
        {tags.length > 0 && (
          <Descriptions.Item label="标签">
            <Space wrap>
              {tags.map((tag, index) => (
                <Tag key={index} color="blue">{tag}</Tag>
              ))}
            </Space>
          </Descriptions.Item>
        )}
        
        {memo.memo_date && (
          <Descriptions.Item label="备忘录日期">
            {dayjs(memo.memo_date).locale('zh-cn').format('YYYY年MM月DD日 dddd')}
          </Descriptions.Item>
        )}
        
        <Descriptions.Item label="创建时间">
          {dayjs(memo.created_at).format('YYYY-MM-DD HH:mm:ss')}
        </Descriptions.Item>
        
        {memo.updated_at && memo.updated_at !== memo.created_at && (
          <Descriptions.Item label="更新时间">
            {dayjs(memo.updated_at).format('YYYY-MM-DD HH:mm:ss')}
          </Descriptions.Item>
        )}
      </Descriptions>
    </Modal>
  );
};

export default MemoDetail;

