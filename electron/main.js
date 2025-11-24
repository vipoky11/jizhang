const { app, BrowserWindow, Menu } = require('electron');
const path = require('path');
const { spawn } = require('child_process');
const http = require('http');
const fs = require('fs');
const isDev = process.env.NODE_ENV === 'development';

/**
 * 右键菜单配置
 * 定义在页面右键点击时显示的菜单项
 */
const contextMenuTemplate = [
    { role: 'copy', label: '复制' },
    { role: 'paste', label: '粘贴' },
    { role: 'selectAll', label: '全选' },
    { role: 'reload', label: '刷新' },
];

// 立即输出日志，确保能看到启动信息
console.log('🚀 Electron 主进程启动...');
console.log('📅 启动时间:', new Date().toISOString());
console.log('🔍 NODE_ENV:', process.env.NODE_ENV);
console.log('🔍 isDev:', isDev);
console.log('📂 process.cwd():', process.cwd());
console.log('📂 __dirname:', __dirname);

let mainWindow;
let serverProcess;

// 获取应用路径（打包后和开发环境都能正确工作）
function getAppPath() {
  if (isDev) {
    return path.join(__dirname, '..');
  }
  // 打包后，使用 app.getAppPath()，这会返回 asar 文件的路径
  return app.getAppPath();
}

// 检查服务器是否就绪
function checkServerReady(url, maxAttempts = 30, interval = 1000) {
  return new Promise((resolve, reject) => {
    let attempts = 0;
    const check = () => {
      attempts++;
      const req = http.get(url, (res) => {
        if (res.statusCode === 200 || res.statusCode === 404) {
          resolve();
        } else {
          if (attempts < maxAttempts) {
            setTimeout(check, interval);
          } else {
            reject(new Error('服务器启动超时'));
          }
        }
      });
      req.on('error', () => {
        if (attempts < maxAttempts) {
          setTimeout(check, interval);
        } else {
          reject(new Error('无法连接到服务器'));
        }
      });
      req.setTimeout(1000, () => {
        req.destroy();
        if (attempts < maxAttempts) {
          setTimeout(check, interval);
        } else {
          reject(new Error('服务器连接超时'));
        }
      });
    };
    check();
  });
}

function createWindow() {
  console.log('🪟 创建窗口...');
  
  try {
    mainWindow = new BrowserWindow({
      width: 1400,
      height: 900,
      minWidth: 1000,
      minHeight: 600,
      webPreferences: {
        nodeIntegration: false,
        contextIsolation: true,
        webSecurity: false, // 允许加载本地资源
        zoomFactor: 1.0, // 禁用缩放，固定为 100%
      },
      title: '记账系统',
      show: false, // 先不显示，等最大化后再显示
    });
    
    console.log('✅ BrowserWindow 对象创建成功');
    console.log('📊 窗口 ID:', mainWindow.id);
    
    // 禁用缩放功能
    mainWindow.webContents.setZoomFactor(1.0);
    mainWindow.webContents.on('zoom-changed', (event, zoomDirection) => {
      // 阻止缩放变化
      mainWindow.webContents.setZoomFactor(1.0);
    });
    
    // 禁用所有缩放快捷键
    mainWindow.webContents.on('before-input-event', (event, input) => {
      // 阻止 Ctrl/Cmd + Plus, Minus, 0 等缩放快捷键
      if ((input.control || input.meta) && (input.key === '=' || input.key === '+' || input.key === '-' || input.key === '0')) {
        event.preventDefault();
      }
    });
    
    // 默认最大化（不是全屏）
    mainWindow.maximize();
    
    // 最大化后再显示窗口
    mainWindow.show();
    mainWindow.focus();
    console.log('✅ 窗口最大化、显示和聚焦完成');
    
    // 设置右键菜单
    const contextMenu = Menu.buildFromTemplate(contextMenuTemplate);
    mainWindow.webContents.on('context-menu', (event, params) => {
      contextMenu.popup();
    });
    console.log('✅ 右键菜单已设置');
  
  // 窗口准备好后确保显示和最大化
  mainWindow.once('ready-to-show', () => {
    console.log('✅ 窗口已准备好');
    // 确保最大化
    if (!mainWindow.isMaximized()) {
      mainWindow.maximize();
    }
    mainWindow.show();
    mainWindow.focus();
    // 确保缩放为 1.0
    mainWindow.webContents.setZoomFactor(1.0);
    // 生产环境也打开开发者工具以便调试
    if (!isDev) {
      mainWindow.webContents.openDevTools();
    }
  });
  
  // 如果窗口被隐藏，强制显示
  mainWindow.on('hide', () => {
    console.log('⚠️  窗口被隐藏，强制显示');
    mainWindow.show();
  });

  // 处理加载错误
  mainWindow.webContents.on('did-fail-load', (event, errorCode, errorDescription, validatedURL) => {
    console.error('❌ 加载失败:', errorCode, errorDescription);
    console.error('📄 尝试加载的 URL:', validatedURL);
    if (isDev) {
      setTimeout(() => {
        mainWindow.loadURL('http://localhost:3000');
      }, 2000);
    } else {
      // 生产环境重试加载
      loadProductionContent();
    }
  });
  
  // 监听页面加载完成
  mainWindow.webContents.on('did-finish-load', () => {
    console.log('✅ 页面加载完成');
    const url = mainWindow.webContents.getURL();
    console.log('📄 当前 URL:', url);
    
    // 检查页面是否有内容
    mainWindow.webContents.executeJavaScript('document.body ? document.body.innerHTML.length : 0').then((length) => {
      console.log('📄 页面内容长度:', length);
      if (length < 100) {
        console.warn('⚠️  页面内容可能为空，检查静态资源加载');
        // 检查是否有 React root
        mainWindow.webContents.executeJavaScript('document.getElementById("root") ? "存在" : "不存在"').then((rootStatus) => {
          console.log('📦 React root 元素:', rootStatus);
        });
      }
    }).catch((err) => {
      console.error('❌ 检查页面内容失败:', err);
    });
  });
  
  // 监听页面开始加载
  mainWindow.webContents.on('did-start-loading', () => {
    console.log('🔄 页面开始加载');
    const url = mainWindow.webContents.getURL();
    console.log('📄 加载 URL:', url);
  });
  
  // 监听 DOM 就绪
  mainWindow.webContents.on('dom-ready', () => {
    console.log('✅ DOM 就绪');
  });
  
  // 监听控制台消息（用于调试）
  mainWindow.webContents.on('console-message', (event, level, message) => {
    console.log(`[前端控制台 ${level}]`, message);
  });

  // 开发环境：连接到 React 开发服务器
  if (isDev) {
    checkServerReady('http://localhost:3000')
      .then(() => {
        console.log('✅ 前端服务器已就绪');
        mainWindow.loadURL('http://localhost:3000');
      })
      .catch((err) => {
        console.error('❌ 前端服务器启动失败:', err);
        mainWindow.loadURL('http://localhost:3000');
      });
  } else {
    // 生产环境：延迟加载，先显示窗口
    console.log('📄 生产环境，稍后加载内容');
  }

  mainWindow.on('closed', () => {
    console.log('🪟 窗口已关闭');
    mainWindow = null;
  });
  
  // 监听窗口显示事件
  mainWindow.on('show', () => {
    console.log('👁️  窗口显示事件触发');
  });
  
  // 监听窗口隐藏事件
  mainWindow.on('hide', () => {
    console.log('👁️  窗口隐藏事件触发');
  });
  
  } catch (error) {
    console.error('❌ 创建窗口失败:', error);
    console.error('错误堆栈:', error.stack);
    throw error;
  }
}

// 加载生产环境内容
function loadProductionContent() {
  console.log('🔍 loadProductionContent() 被调用');
  
  if (!mainWindow) {
    console.error('❌ mainWindow 不存在，无法加载内容');
    return;
  }
  
  if (mainWindow.isDestroyed()) {
    console.error('❌ 窗口已被销毁');
    return;
  }
  
  const appPath = getAppPath();
  console.log('📂 应用路径:', appPath);
  console.log('📂 __dirname:', __dirname);
  console.log('📂 process.resourcesPath:', process.resourcesPath);
  
  // 在 asar 中，路径应该是相对于 app.asar 的
  // app.getAppPath() 返回的是 app.asar 的路径
  const indexPath = path.join(appPath, 'client/build/index.html');
  console.log('📄 尝试加载路径:', indexPath);
  console.log('📄 路径规范化后:', path.normalize(indexPath));
  
  // 直接使用 loadFile，它会自动处理 asar 路径
  console.log('🔄 调用 mainWindow.loadFile()...');
  
  mainWindow.loadFile(indexPath).then(() => {
    console.log('✅ loadFile Promise 成功');
    if (!mainWindow.isDestroyed()) {
      mainWindow.show();
      mainWindow.focus();
      console.log('✅ 窗口显示和聚焦完成');
    }
  }).catch((err) => {
    console.error('❌ 文件加载失败:', err);
    console.error('错误详情:', err.message);
    
    // 如果 loadFile 失败，尝试使用 file:// 协议
    const fileUrl = 'file://' + indexPath;
    console.log('🔄 尝试使用 file:// 协议:', fileUrl);
    mainWindow.loadURL(fileUrl).catch((err2) => {
      console.error('❌ file:// 协议也失败:', err2);
      // 显示错误页面
      const errorHtml = `
        <html>
          <head>
            <title>加载失败</title>
            <meta charset="utf-8">
            <style>
              body { font-family: Arial, sans-serif; padding: 40px; background: #f5f5f5; }
              .container { max-width: 800px; margin: 0 auto; background: white; padding: 30px; border-radius: 8px; box-shadow: 0 2px 10px rgba(0,0,0,0.1); }
              h1 { color: #e74c3c; }
              pre { background: #f8f8f8; padding: 15px; border-radius: 4px; overflow-x: auto; }
            </style>
          </head>
          <body>
            <div class="container">
              <h1>❌ 应用加载失败</h1>
              <p>无法加载 index.html 文件</p>
              <h3>尝试的路径：</h3>
              <pre>${indexPath}</pre>
              <h3>应用路径：</h3>
              <pre>${appPath}</pre>
              <h3>错误信息：</h3>
              <pre>${err.message}\n${err2 ? err2.message : ''}</pre>
              <h3>调试信息：</h3>
              <pre>__dirname: ${__dirname}
process.resourcesPath: ${process.resourcesPath || 'N/A'}
isDev: ${isDev}</pre>
            </div>
          </body>
        </html>
      `;
      mainWindow.loadURL('data:text/html;charset=utf-8,' + encodeURIComponent(errorHtml));
    });
  });
}

function startServer() {
  const appPath = getAppPath();
  
  // 在 asar 中，不能直接 spawn asar 内的文件
  // 需要通过 require 直接加载服务器代码（在主进程中运行）
  if (!isDev && appPath.endsWith('.asar')) {
    console.log('⚠️  检测到 asar 文件，使用主进程方式启动服务器');
    
    try {
      console.log('📂 应用路径 (asar):', appPath);
      const serverModulePath = path.join(appPath, 'server/index.js');
      console.log('📄 服务器模块路径:', serverModulePath);
      
      // 设置环境变量（在 require 之前）
      const originalEnv = { ...process.env };
      process.env.NODE_ENV = 'production';
      process.env.USE_SQLITE = 'true';
      process.env.ELECTRON_USER_DATA = app.getPath('userData');
      process.env.PORT = '5001';
      
      console.log('🚀 直接 require 服务器模块（在主进程中运行）...');
      console.log('📂 工作目录:', appPath);
      
      // 直接 require 服务器模块（在同一个进程中运行）
      // app.listen() 是异步的，不会阻塞事件循环
      require(serverModulePath);
      
      console.log('✅ 服务器模块已加载，服务器应该正在启动...');
      
      // 标记服务器已在主进程中运行
      serverProcess = { isMainProcess: true };
      
      // 恢复原始环境变量（如果需要）
      // process.env = originalEnv;
      
      return;
    } catch (error) {
      console.error('❌ 加载服务器模块失败:', error);
      console.error('错误堆栈:', error.stack);
      return;
    }
  }
  
  const serverPath = path.join(appPath, 'server/index.js');
  console.log('📂 应用路径:', appPath);
  console.log('📄 服务器文件:', serverPath);
  
  const serverEnv = {
    ...process.env,
    NODE_ENV: isDev ? 'development' : 'production',
    USE_SQLITE: 'true',
    ELECTRON_USER_DATA: app.getPath('userData'),
    PORT: '5001',
  };

  console.log('🚀 启动后端服务器...');
  console.log('📂 工作目录:', appPath);
  
  try {
    serverProcess = spawn('node', [serverPath], {
      cwd: appPath,
      env: serverEnv,
      stdio: ['ignore', 'pipe', 'pipe'],
    });
  
  // 输出服务器日志
  serverProcess.stdout.on('data', (data) => {
    console.log(`[服务器] ${data.toString()}`);
  });
  
  serverProcess.stderr.on('data', (data) => {
    console.error(`[服务器错误] ${data.toString()}`);
  });

  serverProcess.on('error', (error) => {
    console.error('❌ 启动服务器失败:', error);
  });

    serverProcess.on('exit', (code) => {
      console.log(`服务器进程退出，代码: ${code}`);
    });
  } catch (error) {
    console.error('❌ 启动服务器失败:', error);
    console.error('错误详情:', error.message);
  }
}

// 在应用启动前就输出日志
console.log('⏳ 等待 app.whenReady()...');

app.whenReady().then(() => {
  console.log('✅ Electron 应用已就绪');
  console.log('📂 应用路径:', getAppPath());
  console.log('🔍 环境:', isDev ? '开发模式' : '生产模式');
  console.log('📂 app.getAppPath():', app.getAppPath());
  console.log('📂 app.getPath(userData):', app.getPath('userData'));
  
  try {
    // 立即创建窗口（不等待服务器）
    console.log('🪟 立即创建窗口...');
    createWindow();
    console.log('✅ 窗口创建函数执行完成');
  } catch (error) {
    console.error('❌ 创建窗口时发生错误:', error);
    console.error('错误堆栈:', error.stack);
  }
  
  // 启动后端服务器（独立处理，不影响页面加载）
  try {
    console.log('🚀 准备启动后端服务器...');
    startServer();
  } catch (error) {
    console.error('❌ 启动服务器时发生错误:', error);
    console.error('错误堆栈:', error.stack);
    // 服务器启动失败不影响页面加载
  }
  
  // 等待后加载内容（确保执行）
  const waitTime = isDev ? 3000 : 100;
  console.log(`⏳ 等待 ${waitTime}ms 后加载内容...`);
  
  setTimeout(() => {
    console.log('⏰ 定时器触发，开始加载内容...');
    if (!isDev) {
      console.log('📄 生产环境，调用 loadProductionContent()...');
      try {
        loadProductionContent();
      } catch (error) {
        console.error('❌ loadProductionContent() 调用失败:', error);
        console.error('错误堆栈:', error.stack);
      }
    } else {
      checkServerReady('http://localhost:5001/api/health', 5, 500)
        .then(() => {
          console.log('✅ 后端服务器已就绪');
        })
        .catch((err) => {
          console.warn('⚠️  后端服务器可能未启动:', err.message);
        });
    }
  }, waitTime);

  app.on('activate', () => {
    console.log('🔄 应用激活');
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
      if (!isDev) {
        setTimeout(() => loadProductionContent(), 1000);
      }
    } else {
      const windows = BrowserWindow.getAllWindows();
      windows.forEach(win => {
        if (win.isVisible()) {
          win.focus();
        } else {
          win.show();
          win.focus();
        }
      });
    }
  });
}).catch((error) => {
  console.error('❌ app.whenReady() 失败:', error);
  console.error('错误堆栈:', error.stack);
});

app.on('window-all-closed', () => {
  console.log('🪟 所有窗口已关闭');
  if (serverProcess && !serverProcess.isMainProcess && typeof serverProcess.kill === 'function') {
    console.log('🛑 关闭服务器进程');
    serverProcess.kill();
  }
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('before-quit', () => {
  if (serverProcess && !serverProcess.isMainProcess) {
    serverProcess.kill();
  }
});

// 处理应用退出
process.on('SIGTERM', () => {
  console.log('🛑 收到 SIGTERM 信号');
  if (serverProcess) {
    serverProcess.kill();
  }
  app.quit();
});

// 处理未捕获的异常
process.on('uncaughtException', (error) => {
  console.error('❌ 未捕获的异常:', error);
  console.error('错误堆栈:', error.stack);
  console.error('错误名称:', error.name);
  console.error('错误消息:', error.message);
  
  // 尝试创建一个简单的错误窗口
  if (!mainWindow) {
    try {
      const errorWindow = new BrowserWindow({
        width: 800,
        height: 600,
        show: true,
      });
      errorWindow.loadURL('data:text/html;charset=utf-8,' + encodeURIComponent(`
        <html>
          <head><title>应用错误</title></head>
          <body style="font-family: Arial; padding: 20px;">
            <h1>应用启动错误</h1>
            <pre>${error.message}\n\n${error.stack}</pre>
          </body>
        </html>
      `));
    } catch (e) {
      console.error('❌ 无法创建错误窗口:', e);
    }
  }
});

// 处理未处理的 Promise 拒绝
process.on('unhandledRejection', (reason, promise) => {
  console.error('❌ 未处理的 Promise 拒绝:', reason);
});
