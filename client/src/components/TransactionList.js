import React, { useState, useEffect, useRef } from 'react';
import { Table, Tag, Button, Space, Popconfirm, message, Tooltip } from 'antd';
import { EditOutlined, DeleteOutlined } from '@ant-design/icons';
import dayjs from 'dayjs';

const TransactionList = ({ transactions, loading, onEdit, onDelete, onRefresh }) => {
  const [selectedRowKeys, setSelectedRowKeys] = useState([]);
  const [pagination, setPagination] = useState({
    current: 1,
    pageSize: 50,
  });
  const prevTransactionsLengthRef = useRef(transactions.length);

  // 当数据变化时，如果当前页没有数据了，重置到第一页
  useEffect(() => {
    if (transactions.length === 0 && prevTransactionsLengthRef.current > 0) {
      setPagination(prev => ({ ...prev, current: 1 }));
    }
    prevTransactionsLengthRef.current = transactions.length;
  }, [transactions.length]);

  const handleBatchDelete = async () => {
    if (selectedRowKeys.length === 0) {
      message.warning('请先选择要删除的记录');
      return;
    }
    
    try {
      // 批量删除
      for (const id of selectedRowKeys) {
        await onDelete(id);
      }
      message.success(`成功删除 ${selectedRowKeys.length} 条记录`);
      setSelectedRowKeys([]);
      onRefresh();
    } catch (error) {
      message.error('批量删除失败');
    }
  };

  const rowSelection = {
    selectedRowKeys,
    onChange: (selectedKeys) => {
      setSelectedRowKeys(selectedKeys);
    },
    onSelectAll: (selected, selectedRows, changeRows) => {
      // 全选/取消全选处理
    },
  };

  const columns = [
    {
      title: '日期',
      dataIndex: 'date',
      key: 'date',
      width: 110,
      align: 'left',
      render: (date) => {
        // 处理日期格式，确保正确显示
        if (!date) return '-';
        // 如果是ISO格式字符串，提取日期部分
        const dateStr = typeof date === 'string' ? date.split('T')[0] : date;
        return dayjs(dateStr).format('YYYY-MM-DD');
      },
      sorter: (a, b) => {
        const dateA = typeof a.date === 'string' ? a.date.split('T')[0] : a.date;
        const dateB = typeof b.date === 'string' ? b.date.split('T')[0] : b.date;
        return dayjs(dateA).unix() - dayjs(dateB).unix();
      },
      onHeaderCell: () => ({
        style: { textAlign: 'left' }
      })
    },
    {
      title: '类型',
      dataIndex: 'type',
      key: 'type',
      width: 80,
      align: 'left',
      render: (type) => (
        <Tag color={type === 'income' ? 'green' : 'red'} style={{ margin: 0, padding: '0 8px' }}>
          {type === 'income' ? '收入' : '支出'}
        </Tag>
      ),
      onHeaderCell: () => ({
        style: { textAlign: 'left' }
      })
    },
    {
      title: '金额',
      dataIndex: 'amount',
      key: 'amount',
      width: 110,
      align: 'left',
      render: (amount, record) => (
        <span style={{ color: record.type === 'income' ? '#52c41a' : '#ff4d4f' }}>
          {record.type === 'income' ? '+' : '-'}¥{parseFloat(amount).toFixed(2)}
        </span>
      ),
      sorter: (a, b) => parseFloat(a.amount) - parseFloat(b.amount),
      onHeaderCell: () => ({
        style: { textAlign: 'left' }
      })
    },
    {
      title: '分类',
      dataIndex: 'category',
      key: 'category',
      width: 100,
      align: 'left',
      ellipsis: true,
      onHeaderCell: () => ({
        style: { textAlign: 'left' }
      })
    },
    {
      title: '账户',
      dataIndex: 'account',
      key: 'account',
      width: 90,
      align: 'left',
      render: (account) => {
        const colors = {
          '微信': 'green',
          '支付宝': 'blue',
          '现金': 'orange',
          '银联': 'purple',
          '其他': 'default'
        };
        return <Tag color={colors[account] || 'default'} style={{ margin: 0, padding: '0 8px' }}>{account || '现金'}</Tag>;
      },
      onHeaderCell: () => ({
        style: { textAlign: 'left' }
      })
    },
    {
      title: '供应商',
      dataIndex: 'supplier',
      key: 'supplier',
      width: 100,
      align: 'left',
      ellipsis: true,
      render: (supplier) => supplier ? <Tag color="cyan" style={{ margin: 0, padding: '0 8px' }}>{supplier}</Tag> : '-',
      onHeaderCell: () => ({
        style: { textAlign: 'left' }
      })
    },
    {
      title: '描述',
      dataIndex: 'description',
      key: 'description',
      width: 200,
      align: 'left',
      ellipsis: {
        showTitle: false,
      },
      render: (text) => (
        <Tooltip title={text} placement="topLeft">
          <span>{text || '-'}</span>
        </Tooltip>
      ),
      onHeaderCell: () => ({
        style: { textAlign: 'center' }
      })
    },
    {
      title: '操作',
      key: 'action',
      width: 90,
      align: 'left',
      render: (_, record) => (
        <Space size="small">
          <Tooltip title="编辑">
            <Button
              type="link"
              icon={<EditOutlined />}
              onClick={() => onEdit(record)}
              size="small"
            />
          </Tooltip>
          <Popconfirm
            title="确定要删除这条记录吗？"
            onConfirm={async () => {
              try {
                await onDelete(record.id);
                message.success('删除成功');
                onRefresh();
              } catch (error) {
                message.error('删除失败');
              }
            }}
            okText="确定"
            cancelText="取消"
          >
            <Tooltip title="删除">
              <Button 
                type="link" 
                danger 
                icon={<DeleteOutlined />}
                size="small"
              />
            </Tooltip>
          </Popconfirm>
        </Space>
      ),
      onHeaderCell: () => ({
        style: { textAlign: 'left' }
      })
    },
  ];

  return (
    <div>
      {selectedRowKeys.length > 0 && (
        <div style={{ marginBottom: 16 }}>
          <Space>
            <span>已选择 {selectedRowKeys.length} 条记录</span>
            <Popconfirm
              title={`确定要删除选中的 ${selectedRowKeys.length} 条记录吗？`}
              onConfirm={handleBatchDelete}
              okText="确定"
              cancelText="取消"
            >
              <Button type="primary" danger>
                批量删除
              </Button>
            </Popconfirm>
            <Button onClick={() => setSelectedRowKeys([])}>
              取消选择
            </Button>
          </Space>
        </div>
      )}
      <Table
        columns={columns}
        dataSource={transactions}
        loading={loading}
        rowKey="id"
        rowSelection={rowSelection}
        scroll={{ x: 'max-content', y: undefined }}
        size="small"
        pagination={{
          ...pagination,
          showSizeChanger: true,
          showTotal: (total, range) => `共 ${total} 条记录`,
          pageSizeOptions: ['10', '20', '30', '50', '100'],
          showQuickJumper: true,
          hideOnSinglePage: false,
          onChange: (page, pageSize) => {
            setPagination({ current: page, pageSize });
          },
          onShowSizeChange: (current, size) => {
            setPagination({ current: 1, pageSize: size });
          },
        }}
      />
      <style>{`
        .ant-table-thead > tr > th {
          padding-left: 16px !important;
          padding-right: 16px !important;
        }
        .ant-table-thead > tr > th {
          text-align: left !important;
        }
        .ant-table-thead > tr > th:nth-child(8) {
          text-align: center !important;
        }
        .ant-table-tbody > tr > td {
          padding-left: 16px !important;
          padding-right: 16px !important;
          text-align: left !important;
        }
      `}</style>
    </div>
  );
};

export default TransactionList;

