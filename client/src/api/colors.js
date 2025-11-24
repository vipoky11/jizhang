import axios from 'axios';

const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:5001/api';

const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
  timeout: 10000,
});

export const colorAPI = {
  // 获取所有颜色
  getAll: () => api.get('/colors'),
  
  // 创建颜色
  create: (data) => api.post('/colors', data),
  
  // 更新颜色
  update: (id, data) => api.put(`/colors/${id}`, data),
  
  // 删除颜色
  delete: (id) => api.delete(`/colors/${id}`),
};

