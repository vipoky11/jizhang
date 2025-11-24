import axios from 'axios';

const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:5001/api';

const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
  timeout: 10000,
});

export const tagAPI = {
  // 获取所有标签
  getAll: () => api.get('/tags'),
  
  // 创建标签
  create: (data) => api.post('/tags', data),
  
  // 更新标签
  update: (id, data) => api.put(`/tags/${id}`, data),
  
  // 删除标签
  delete: (id) => api.delete(`/tags/${id}`),
};

