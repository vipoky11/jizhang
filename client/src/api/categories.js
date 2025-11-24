import axios from 'axios';

const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:5001/api';

const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
  timeout: 10000,
});

export const categoryAPI = {
  // 获取所有分类
  getAll: (type) => {
    const params = type ? { type } : {};
    return api.get('/categories', { params });
  },
  
  // 创建分类
  create: (data) => api.post('/categories', data),
  
  // 更新分类
  update: (id, data) => api.put(`/categories/${id}`, data),
  
  // 删除分类
  delete: (id) => api.delete(`/categories/${id}`),
};

