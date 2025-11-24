import axios from 'axios';

const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:5001/api';

const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
  timeout: 10000, // 10秒超时
});

// 添加请求拦截器
api.interceptors.request.use(
  (config) => {
    console.log('API 请求:', config.method?.toUpperCase(), config.url);
    return config;
  },
  (error) => {
    console.error('API 请求错误:', error);
    return Promise.reject(error);
  }
);

// 添加响应拦截器
api.interceptors.response.use(
  (response) => {
    console.log('API 响应:', response.status, response.data);
    return response;
  },
  (error) => {
    console.error('API 响应错误:', error.message);
    console.error('错误详情:', {
      code: error.code,
      status: error.response?.status,
      statusText: error.response?.statusText,
      data: error.response?.data,
      url: error.config?.url,
      method: error.config?.method
    });
    if (error.code === 'ECONNREFUSED' || error.message.includes('Network Error')) {
      console.error('❌ 无法连接到后端服务器，请确保后端服务已启动 (http://localhost:5001)');
    }
    if (error.response?.status === 500) {
      console.error('❌ 服务器内部错误 (500):', error.response?.data);
    }
    return Promise.reject(error);
  }
);

export const transactionAPI = {
  // 获取所有交易记录
  getAll: () => api.get('/transactions'),
  
  // 创建单条交易记录
  create: (data) => api.post('/transactions', data),
  
  // 批量创建交易记录
  createBatch: (transactions) => api.post('/transactions/batch', { transactions }),
  
  // 更新交易记录
  update: (id, data) => api.put(`/transactions/${id}`, data),
  
  // 删除交易记录
  delete: (id) => api.delete(`/transactions/${id}`),
  
  // 获取统计信息
  getStats: (startDate, endDate) => {
    const params = {};
    if (startDate) params.startDate = startDate;
    if (endDate) params.endDate = endDate;
    return api.get('/transactions/stats', { params });
  },
  
  // 获取财务分析数据
  getAnalysis: (startDate, endDate) => {
    const params = {};
    if (startDate) params.startDate = startDate;
    if (endDate) params.endDate = endDate;
    return api.get('/transactions/analysis', { params });
  },
};

