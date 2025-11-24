const http = require('http');

const checkBackend = () => {
  console.log('🔍 检查后端服务器连接...\n');
  
  const options = {
    hostname: 'localhost',
    port: 5000,
    path: '/api/health',
    method: 'GET',
    timeout: 3000
  };

  const req = http.request(options, (res) => {
    let data = '';

    res.on('data', (chunk) => {
      data += chunk;
    });

    res.on('end', () => {
      if (res.statusCode === 200) {
        console.log('✅ 后端服务器运行正常！');
        console.log('📡 响应:', data);
        console.log('\n💡 如果前端仍然无法连接，请检查：');
        console.log('   1. 浏览器控制台是否有 CORS 错误');
        console.log('   2. 前端 API 配置是否正确');
        process.exit(0);
      } else {
        console.log(`❌ 后端服务器响应异常，状态码: ${res.statusCode}`);
        process.exit(1);
      }
    });
  });

  req.on('error', (error) => {
    console.log('❌ 无法连接到后端服务器！');
    console.log(`   错误: ${error.message}\n`);
    console.log('💡 解决方案：');
    console.log('   1. 确保后端服务器已启动: npm run server');
    console.log('   2. 检查端口 5000 是否被占用: lsof -ti:5000');
    console.log('   3. 检查 .env 文件中的 PORT 配置');
    process.exit(1);
  });

  req.on('timeout', () => {
    console.log('❌ 连接超时！');
    console.log('   后端服务器可能未启动或响应缓慢\n');
    console.log('💡 请启动后端服务器: npm run server');
    req.destroy();
    process.exit(1);
  });

  req.end();
};

checkBackend();

