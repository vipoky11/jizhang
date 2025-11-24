#!/bin/bash

echo "🧪 测试打包后的应用..."
echo ""

APP_PATH="dist/mac-arm64/记账系统.app/Contents/MacOS/记账系统"

if [ ! -f "$APP_PATH" ]; then
    echo "❌ 应用文件不存在: $APP_PATH"
    echo "请先运行: npm run electron:build"
    exit 1
fi

echo "✅ 找到应用文件"
echo "🚀 运行应用并显示所有输出..."
echo "=========================================="
echo ""

# 运行应用并显示所有输出
"$APP_PATH" 2>&1 | while IFS= read -r line; do
    echo "[应用] $line"
done

