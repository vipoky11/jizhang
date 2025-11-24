import React, { useState } from 'react';
import { message } from 'antd';
import MemoList from './MemoList';
import MemoForm from './MemoForm';
import { memoAPI } from '../api/memos';

const MemoManager = ({ year }) => {
  const [memoFormVisible, setMemoFormVisible] = useState(false);
  const [editingMemo, setEditingMemo] = useState(null);
  const [refreshKey, setRefreshKey] = useState(0);

  const handleSubmit = async (data) => {
    try {
      console.log('MemoManager - 提交数据:', data);
      if (editingMemo) {
        const response = await memoAPI.update(editingMemo.id, data);
        console.log('MemoManager - 更新响应:', response.data);
        message.success('更新成功');
      } else {
        const response = await memoAPI.create(data);
        console.log('MemoManager - 创建响应:', response.data);
        message.success('创建成功');
      }
      setMemoFormVisible(false);
      setEditingMemo(null);
      setRefreshKey(prev => prev + 1); // 触发列表刷新
    } catch (error) {
      message.error(editingMemo ? '更新失败' : '创建失败');
      console.error(error);
    }
  };

  return (
    <div style={{ padding: '24px' }}>
      <MemoList
        year={year}
        refreshKey={refreshKey}
        onAdd={() => {
          setEditingMemo(null);
          setMemoFormVisible(true);
        }}
        onEdit={(memo) => {
          console.log('MemoManager - 编辑备忘录:', memo);
          setEditingMemo(memo);
          setMemoFormVisible(true);
        }}
        onDelete={() => {
          setRefreshKey(prev => prev + 1);
        }}
      />
      <MemoForm
        visible={memoFormVisible}
        onCancel={() => {
          setMemoFormVisible(false);
          setEditingMemo(null);
        }}
        onSubmit={handleSubmit}
        initialValues={editingMemo}
      />
    </div>
  );
};

export default MemoManager;

