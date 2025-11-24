import React, { useState, useEffect } from 'react';
import { Form, Input, Button, Card, message } from 'antd';
import { LockOutlined } from '@ant-design/icons';
import { authAPI, saveToken, getStoredToken, isAuthenticated } from '../api/auth';

const Login = ({ onLoginSuccess }) => {
  const [loading, setLoading] = useState(false);
  const [form] = Form.useForm();

  useEffect(() => {
    // 检查是否已有有效的 token
    if (isAuthenticated()) {
      const token = getStoredToken();
      // 验证 token 是否仍然有效
      authAPI.verify(token)
        .then(() => {
          onLoginSuccess();
        })
        .catch(() => {
          // Token 无效，清除
          localStorage.removeItem('authToken');
        });
    }
  }, [onLoginSuccess]);

  const handleSubmit = async (values) => {
    setLoading(true);
    try {
      const response = await authAPI.login(values.password);
      if (response.data.success) {
        // 保存 token 和过期时间
        saveToken(response.data.token, response.data.expiresAt);
        message.success('登录成功');
        onLoginSuccess();
      } else {
        message.error(response.data.message || '登录失败');
      }
    } catch (error) {
      console.error('登录错误:', error);
      if (error.code === 'ERR_NETWORK' || error.message.includes('ERR_CONNECTION_REFUSED')) {
        message.error('无法连接到服务器，请确保后端服务已启动 (http://localhost:5001)');
      } else if (error.response && error.response.data && error.response.data.message) {
        message.error(error.response.data.message);
      } else {
        message.error('登录失败，请检查网络连接');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{
      display: 'flex',
      justifyContent: 'center',
      alignItems: 'center',
      minHeight: '100vh',
      background: '#f0f2f5'
    }}>
      <Card
        title={
          <div style={{ textAlign: 'center', fontSize: '24px', fontWeight: 'bold' }}>
            记账系统登录
          </div>
        }
        style={{ width: 400 }}
      >
        <Form
          form={form}
          onFinish={handleSubmit}
          layout="vertical"
          size="large"
        >
          <Form.Item
            name="password"
            rules={[
              { required: true, message: '请输入密码' },
            ]}
          >
            <Input.Password
              prefix={<LockOutlined />}
              placeholder="请输入密码"
              autoFocus
              onPressEnter={() => form.submit()}
            />
          </Form.Item>

          <Form.Item>
            <Button
              type="primary"
              htmlType="submit"
              loading={loading}
              block
            >
              登录
            </Button>
          </Form.Item>
        </Form>
      </Card>
    </div>
  );
};

export default Login;

