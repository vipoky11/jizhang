const express = require('express');
const router = express.Router();
const crypto = require('crypto');

// 默认密码（可以从环境变量读取，或存储在数据库中）
const DEFAULT_PASSWORD = process.env.APP_PASSWORD || '666888';

// 生成 token
function generateToken() {
  return crypto.randomBytes(32).toString('hex');
}

// 简单的内存存储（生产环境建议使用 Redis 或数据库）
const activeTokens = new Map();

// 登录接口
router.post('/login', (req, res) => {
  try {
    const { password } = req.body;

    if (!password) {
      return res.status(400).json({
        success: false,
        message: '请输入密码'
      });
    }

    // 验证密码
    if (password === DEFAULT_PASSWORD) {
      // 生成 token
      const token = generateToken();
      const expiresAt = Date.now() + 7 * 24 * 60 * 60 * 1000; // 7天后过期

      // 存储 token
      activeTokens.set(token, {
        expiresAt,
        createdAt: Date.now()
      });

      // 清理过期 token（可选，定期清理）
      cleanupExpiredTokens();

      return res.json({
        success: true,
        message: '登录成功',
        token,
        expiresAt
      });
    } else {
      return res.status(401).json({
        success: false,
        message: '密码错误'
      });
    }
  } catch (error) {
    console.error('登录错误:', error);
    res.status(500).json({
      success: false,
      message: '登录失败'
    });
  }
});

// 验证 token 接口
router.post('/verify', (req, res) => {
  try {
    const { token } = req.body;

    if (!token) {
      return res.status(400).json({
        success: false,
        message: '缺少 token'
      });
    }

    const tokenData = activeTokens.get(token);

    if (!tokenData) {
      return res.status(401).json({
        success: false,
        message: 'Token 无效'
      });
    }

    // 检查是否过期
    if (Date.now() > tokenData.expiresAt) {
      activeTokens.delete(token);
      return res.status(401).json({
        success: false,
        message: 'Token 已过期'
      });
    }

    return res.json({
      success: true,
      message: 'Token 有效',
      expiresAt: tokenData.expiresAt
    });
  } catch (error) {
    console.error('验证 token 错误:', error);
    res.status(500).json({
      success: false,
      message: '验证失败'
    });
  }
});

// 登出接口
router.post('/logout', (req, res) => {
  try {
    const { token } = req.body;

    if (token) {
      activeTokens.delete(token);
    }

    return res.json({
      success: true,
      message: '登出成功'
    });
  } catch (error) {
    console.error('登出错误:', error);
    res.status(500).json({
      success: false,
      message: '登出失败'
    });
  }
});

// 清理过期 token
function cleanupExpiredTokens() {
  const now = Date.now();
  for (const [token, data] of activeTokens.entries()) {
    if (now > data.expiresAt) {
      activeTokens.delete(token);
    }
  }
}

// 定期清理过期 token（每小时清理一次）
setInterval(cleanupExpiredTokens, 60 * 60 * 1000);

module.exports = router;

