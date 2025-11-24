#!/bin/bash
# 清理占用 5000 和 3000 端口的进程

echo "🔍 检查端口占用情况..."

PORTS=(5001 3000)

for PORT in "${PORTS[@]}"; do
  PIDS=$(lsof -ti:$PORT 2>/dev/null)
  
  if [ -z "$PIDS" ]; then
    echo "✅ 端口 $PORT 未被占用"
  else
    echo "⚠️  端口 $PORT 被占用，正在清理..."
    for PID in $PIDS; do
      kill -9 $PID 2>/dev/null && echo "  ✅ 已关闭进程 $PID" || echo "  ❌ 无法关闭进程 $PID"
    done
    sleep 0.5
    # 再次检查
    REMAINING=$(lsof -ti:$PORT 2>/dev/null)
    if [ -z "$REMAINING" ]; then
      echo "✅ 端口 $PORT 已成功释放"
    else
      echo "⚠️  端口 $PORT 仍有进程占用: $REMAINING"
    fi
  fi
done

echo "🎉 端口清理完成"

