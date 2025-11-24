import axios from 'axios';

const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:5001/api';

const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
  timeout: 10000,
});

// 从 localStorage 获取 token
export const getStoredToken = () => {
  const tokenData = localStorage.getItem('authToken');
  if (tokenData) {
    try {
      const { token, expiresAt } = JSON.parse(tokenData);
      // 检查是否过期
      if (Date.now() < expiresAt) {
        return token;
      } else {
        // 已过期，清除
        localStorage.removeItem('authToken');
        return null;
      }
    } catch (e) {
      localStorage.removeItem('authToken');
      return null;
    }
  }
  return null;
};

// 保存 token 到 localStorage
export const saveToken = (token, expiresAt) => {
  localStorage.setItem('authToken', JSON.stringify({ token, expiresAt }));
};

// 清除 token
export const clearToken = () => {
  localStorage.removeItem('authToken');
};

// 检查是否已登录
export const isAuthenticated = () => {
  return getStoredToken() !== null;
};

export const authAPI = {
  // 登录
  login: (password) => api.post('/auth/login', { password }),

  // 验证 token
  verify: (token) => api.post('/auth/verify', { token }),

  // 登出
  logout: (token) => api.post('/auth/logout', { token }),
};

