import axios from 'axios';

const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:5001/api';

const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
  timeout: 10000,
});

export const accountAPI = {
  // 获取所有账户
  getAll: () => api.get('/accounts'),
  
  // 创建账户
  create: (data) => api.post('/accounts', data),
  
  // 更新账户
  update: (id, data) => api.put(`/accounts/${id}`, data),
  
  // 删除账户
  delete: (id) => api.delete(`/accounts/${id}`),
  
  // 设置默认账户
  setDefault: (id) => api.post(`/accounts/${id}/set-default`),
};

