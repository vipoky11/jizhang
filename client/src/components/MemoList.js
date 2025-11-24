import React, { useState, useEffect } from 'react';
import { Card, List, Tag, Button, Space, Input, Select, Empty, Popconfirm, message, Badge, Row, Col, Statistic, Checkbox } from 'antd';
import { EditOutlined, DeleteOutlined, PlusOutlined, SearchOutlined, EyeOutlined, UpOutlined, DownOutlined, TagsOutlined } from '@ant-design/icons';
import dayjs from 'dayjs';
import 'dayjs/locale/zh-cn';
import { memoAPI } from '../api/memos';
import MemoDetail from './MemoDetail';
import TagManager from './TagManager';

dayjs.locale('zh-cn');

const { Search } = Input;
const { Option } = Select;

const MemoList = ({ year, onAdd, onEdit, onDelete, refreshKey = 0 }) => {
  const [tagManagerVisible, setTagManagerVisible] = useState(false);
  const [memos, setMemos] = useState([]);
  const [loading, setLoading] = useState(false);
  const [searchText, setSearchText] = useState('');
  const [selectedTag, setSelectedTag] = useState('');
  const [selectedPriority, setSelectedPriority] = useState('');
  const [selectedMonth, setSelectedMonth] = useState(dayjs().month() + 1); // 1-12
  const [stats, setStats] = useState({ total: 0, correct: 0, wrong: 0 });
  const [selectedMemoIds, setSelectedMemoIds] = useState([]);
  const [expandedMemos, setExpandedMemos] = useState(new Set());
  const [detailVisible, setDetailVisible] = useState(false);
  const [selectedMemo, setSelectedMemo] = useState(null);

  // 加载备忘录列表
  const loadMemos = async () => {
    setLoading(true);
    try {
      const params = {};
      if (searchText) params.search = searchText;
      if (selectedTag) params.tag = selectedTag;
      if (selectedPriority !== '') params.priority = selectedPriority;
      if (selectedMonth && year) {
        // 结合全局年份和选择的月份计算日期范围
        const startDate = dayjs(`${year}-${String(selectedMonth).padStart(2, '0')}-01`).startOf('month').format('YYYY-MM-DD');
        const endDate = dayjs(`${year}-${String(selectedMonth).padStart(2, '0')}-01`).endOf('month').format('YYYY-MM-DD');
        params.startDate = startDate;
        params.endDate = endDate;
      }

      const response = await memoAPI.getAll(params);
      if (response.data.success) {
        setMemos(response.data.data);
      }
    } catch (error) {
      message.error('加载备忘录失败');
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  // 加载统计信息
  const loadStats = async () => {
    try {
      const response = await memoAPI.getStats();
      if (response.data.success) {
        setStats(response.data.data);
      }
    } catch (error) {
      console.error('加载统计信息失败:', error);
    }
  };

  useEffect(() => {
    loadMemos();
    loadStats();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchText, selectedTag, selectedPriority, selectedMonth, year, refreshKey]);

  // 删除备忘录
  const handleDelete = async (id) => {
    try {
      const response = await memoAPI.delete(id);
      if (response.data.success) {
        message.success('删除成功');
        loadMemos();
        loadStats();
        // 通知父组件刷新
        if (onDelete) onDelete();
      }
    } catch (error) {
      message.error('删除失败');
      console.error(error);
    }
  };

  // 批量删除
  const handleBatchDelete = async () => {
    if (selectedMemoIds.length === 0) {
      message.warning('请选择要删除的备忘录');
      return;
    }
    
    try {
      const response = await memoAPI.batchDelete(selectedMemoIds);
      if (response.data.success) {
        message.success(`成功删除 ${response.data.deletedCount} 条备忘录`);
        setSelectedMemoIds([]);
        loadMemos();
        loadStats();
        if (onDelete) onDelete();
      }
    } catch (error) {
      message.error('批量删除失败');
      console.error(error);
    }
  };

  // 切换内容展开/收起
  const toggleExpand = (memoId) => {
    const newExpanded = new Set(expandedMemos);
    if (newExpanded.has(memoId)) {
      newExpanded.delete(memoId);
    } else {
      newExpanded.add(memoId);
    }
    setExpandedMemos(newExpanded);
  };

  // 查看详情
  const handleViewDetail = (memo) => {
    setSelectedMemo(memo);
    setDetailVisible(true);
  };

  // 获取所有标签
  const allTags = [...new Set(memos.flatMap(memo => 
    memo.tags ? memo.tags.split(',').filter(t => t.trim()) : []
  ))];

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

  // 状态配置
  const statusConfig = {
    0: { text: '对', color: 'success' },
    1: { text: '错', color: 'error' },
  };

  return (
    <div>
      {/* 统计信息 */}
      <Row gutter={16} style={{ marginBottom: 16 }}>
        <Col span={8}>
          <Card>
            <Statistic title="总备忘录" value={stats.total} />
          </Card>
        </Col>
        <Col span={8}>
          <Card>
            <Statistic title="对" value={stats.correct} valueStyle={{ color: '#3f8600' }} />
          </Card>
        </Col>
        <Col span={8}>
          <Card>
            <Statistic title="错" value={stats.wrong} valueStyle={{ color: '#cf1322' }} />
          </Card>
        </Col>
      </Row>

      {/* 搜索和筛选栏 */}
      <Card style={{ marginBottom: 16 }}>
        <Space direction="vertical" style={{ width: '100%' }} size="middle">
          <Space wrap style={{ width: '100%' }}>
            <Search
              placeholder="搜索标题或内容"
              allowClear
              enterButton={<SearchOutlined />}
              style={{ width: 250 }}
              value={searchText}
              onChange={(e) => setSearchText(e.target.value)}
              onSearch={loadMemos}
            />
            <Select
              placeholder="选择月份"
              style={{ width: 120 }}
              value={selectedMonth || undefined}
              onChange={(value) => setSelectedMonth(value || dayjs().month() + 1)}
            >
              <Option value={1}>1月</Option>
              <Option value={2}>2月</Option>
              <Option value={3}>3月</Option>
              <Option value={4}>4月</Option>
              <Option value={5}>5月</Option>
              <Option value={6}>6月</Option>
              <Option value={7}>7月</Option>
              <Option value={8}>8月</Option>
              <Option value={9}>9月</Option>
              <Option value={10}>10月</Option>
              <Option value={11}>11月</Option>
              <Option value={12}>12月</Option>
            </Select>
            <Select
              placeholder="筛选标签"
              allowClear
              style={{ width: 150 }}
              value={selectedTag || undefined}
              onChange={setSelectedTag}
              notFoundContent="暂无标签"
            >
              {allTags.map(tag => (
                <Option key={tag} value={tag}>{tag}</Option>
              ))}
            </Select>
            <Select
              placeholder="筛选状态"
              allowClear
              style={{ width: 120 }}
              value={selectedPriority !== '' ? selectedPriority : undefined}
              onChange={setSelectedPriority}
            >
              <Option value="0">对</Option>
              <Option value="1">错</Option>
            </Select>
            {selectedMemoIds.length > 0 && (
              <Popconfirm
                title={`确定要删除选中的 ${selectedMemoIds.length} 条备忘录吗？`}
                onConfirm={handleBatchDelete}
                okText="确定"
                cancelText="取消"
              >
                <Button danger icon={<DeleteOutlined />}>
                  批量删除 ({selectedMemoIds.length})
                </Button>
              </Popconfirm>
            )}
            <Space style={{ marginLeft: 'auto' }}>
              <Button
                icon={<TagsOutlined />}
                onClick={() => setTagManagerVisible(true)}
              >
                标签管理
              </Button>
              <Button
                type="primary"
                icon={<PlusOutlined />}
                onClick={onAdd}
              >
                新增备忘录
              </Button>
            </Space>
          </Space>
        </Space>
      </Card>

      {/* 备忘录列表 */}
      {memos.length === 0 ? (
        <Card>
          <Empty description="暂无备忘录" />
        </Card>
      ) : (
        <List
          loading={loading}
          grid={{ gutter: 16, xs: 1, sm: 2, md: 2, lg: 3, xl: 3, xxl: 4 }}
          dataSource={memos}
          renderItem={(memo) => {
            const tags = memo.tags ? memo.tags.split(',').filter(t => t.trim()) : [];
            const highlightedContent = highlightTags(memo.content, memo.tags);
            const isExpanded = expandedMemos.has(memo.id);
            const isSelected = selectedMemoIds.includes(memo.id);
            const contentLength = memo.content.length;
            const shouldShowExpand = contentLength > 100;
            
            return (
              <List.Item>
                <Card
                  hoverable
                  style={{
                    height: '100%',
                    transition: 'all 0.3s',
                    border: isSelected ? '2px solid #1890ff' : undefined,
                  }}
                  actions={[
                    <Checkbox
                      key="checkbox"
                      checked={isSelected}
                      onChange={(e) => {
                        if (e.target.checked) {
                          setSelectedMemoIds([...selectedMemoIds, memo.id]);
                        } else {
                          setSelectedMemoIds(selectedMemoIds.filter(id => id !== memo.id));
                        }
                      }}
                      onClick={(e) => e.stopPropagation()}
                    />,
                    <Button
                      key="view"
                      type="link"
                      icon={<EyeOutlined />}
                      onClick={() => handleViewDetail(memo)}
                    >
                      查看
                    </Button>,
                    <Button
                      key="edit"
                      type="link"
                      icon={<EditOutlined />}
                      onClick={() => onEdit(memo)}
                    >
                      编辑
                    </Button>,
                    <Popconfirm
                      key="delete"
                      title="确定要删除这个备忘录吗？"
                      onConfirm={() => handleDelete(memo.id)}
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
                    </Popconfirm>,
                  ]}
                >
                  <div style={{ marginBottom: 12 }}>
                    <Space>
                      <Badge 
                        status={statusConfig[memo.priority]?.color || 'default'} 
                        text={statusConfig[memo.priority]?.text || '对'}
                      />
                      <span style={{
                        fontSize: '16px',
                        fontWeight: 'bold',
                        color: '#262626',
                        cursor: 'pointer',
                      }}
                      onClick={() => handleViewDetail(memo)}
                      >
                        {memo.title}
                      </span>
                    </Space>
                  </div>
                  
                  <div
                    style={{
                      minHeight: '80px',
                      maxHeight: isExpanded ? 'none' : '200px',
                      overflow: isExpanded ? 'visible' : 'auto',
                      marginBottom: 12,
                      color: '#595959',
                      lineHeight: '1.6',
                    }}
                    dangerouslySetInnerHTML={{ __html: highlightedContent }}
                  />
                  
                  {shouldShowExpand && (
                    <Button
                      type="link"
                      size="small"
                      icon={isExpanded ? <UpOutlined /> : <DownOutlined />}
                      onClick={() => toggleExpand(memo.id)}
                      style={{ padding: 0, marginBottom: 8 }}
                    >
                      {isExpanded ? '收起' : '展开'}
                    </Button>
                  )}
                  
                  {tags.length > 0 && (
                    <div style={{ marginBottom: 8 }}>
                      <Space wrap>
                        {tags.map((tag, index) => (
                          <Tag key={index} color="blue">{tag}</Tag>
                        ))}
                      </Space>
                    </div>
                  )}
                  
                  <div style={{ 
                    fontSize: '12px', 
                    color: '#8c8c8c',
                    borderTop: '1px solid #f0f0f0',
                    paddingTop: 8,
                    marginTop: 8
                  }}>
                    {memo.memo_date && (
                      <div style={{ marginBottom: 4 }}>
                        <strong>日期：</strong>{dayjs(memo.memo_date).locale('zh-cn').format('YYYY年MM月DD日 dddd')}
                      </div>
                    )}
                    <div>
                      创建于 {dayjs(memo.created_at).format('YYYY-MM-DD HH:mm')}
                      {memo.updated_at && memo.updated_at !== memo.created_at && (
                        <span style={{ marginLeft: 8 }}>
                          (更新于 {dayjs(memo.updated_at).format('MM-DD HH:mm')})
                        </span>
                      )}
                    </div>
                  </div>
                </Card>
              </List.Item>
            );
          }}
        />
      )}

      {/* 详情模态框 */}
      <MemoDetail
        visible={detailVisible}
        onCancel={() => {
          setDetailVisible(false);
          setSelectedMemo(null);
        }}
        memo={selectedMemo}
        onEdit={(memo) => {
          setDetailVisible(false);
          onEdit(memo);
        }}
      />
      
      {/* 标签管理模态框 */}
      <TagManager
        visible={tagManagerVisible}
        onCancel={() => setTagManagerVisible(false)}
      />
    </div>
  );
};

export default MemoList;

