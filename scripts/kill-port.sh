#!/bin/bash
# 清理占用指定端口的进程

PORT=${1:-5000}
echo "正在清理端口 $PORT 上的进程..."

PIDS=$(lsof -ti:$PORT)

if [ -z "$PIDS" ]; then
  echo "✅ 端口 $PORT 未被占用"
  exit 0
fi

echo "找到以下进程占用端口 $PORT:"
lsof -i:$PORT

echo "正在关闭这些进程..."
for PID in $PIDS; do
  kill -9 $PID 2>/dev/null && echo "  ✅ 已关闭进程 $PID" || echo "  ❌ 无法关闭进程 $PID"
done

sleep 1

# 再次检查
REMAINING=$(lsof -ti:$PORT)
if [ -z "$REMAINING" ]; then
  echo "✅ 端口 $PORT 已成功释放"
else
  echo "⚠️  仍有进程占用端口: $REMAINING"
fi

