const { app, BrowserWindow } = require('electron');

console.log('🚀 测试 Electron 启动...');

app.whenReady().then(() => {
  console.log('✅ app.whenReady() 完成');
  
  const win = new BrowserWindow({
    width: 800,
    height: 600,
    show: true,
    webPreferences: {
      webSecurity: false
    }
  });
  
  console.log('✅ 窗口创建成功');
  win.loadURL('data:text/html,<h1>测试窗口</h1><p>如果看到这个，说明 Electron 正常工作</p>');
  win.webContents.openDevTools();
  
  console.log('✅ 内容加载完成');
}).catch(err => {
  console.error('❌ 错误:', err);
});
