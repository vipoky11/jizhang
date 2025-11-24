import axios from 'axios';

const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:5001/api';

const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
  timeout: 10000,
});

export const supplierAPI = {
  // 获取所有供应商
  getAll: () => api.get('/suppliers'),
  
  // 创建供应商
  create: (data) => api.post('/suppliers', data),
  
  // 更新供应商
  update: (id, data) => api.put(`/suppliers/${id}`, data),
  
  // 删除供应商
  delete: (id) => api.delete(`/suppliers/${id}`),
};

