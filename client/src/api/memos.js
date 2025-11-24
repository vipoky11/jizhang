import axios from 'axios';

const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:5001/api';

const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
  timeout: 10000,
});

export const memoAPI = {
  // 获取所有备忘录
  getAll: (params = {}) => {
    return api.get('/memos', { params });
  },
  
  // 获取单个备忘录
  getById: (id) => api.get(`/memos/${id}`),
  
  // 创建备忘录
  create: (data) => api.post('/memos', data),
  
  // 更新备忘录
  update: (id, data) => api.put(`/memos/${id}`, data),
  
  // 删除备忘录
  delete: (id) => api.delete(`/memos/${id}`),
  
  // 批量删除备忘录
  batchDelete: (ids) => api.post('/memos/batch-delete', { ids }),
  
  // 获取统计信息
  getStats: () => api.get('/memos/stats/summary'),
};

