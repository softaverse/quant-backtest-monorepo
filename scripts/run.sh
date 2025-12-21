#!/bin/bash
set -e

# ============================================
# Backtest Portfolio 快速啟動腳本
# ============================================

ACTION="${1:-up}"

case $ACTION in
  up|start)
    echo "🚀 啟動 Backtest Portfolio..."
    docker compose up -d --build
    echo ""
    echo "✅ 啟動完成！"
    echo "   前端介面：http://localhost:1111"
    echo "   API 文件：http://localhost:1111/docs"
    ;;
  down|stop)
    echo "🛑 停止 Backtest Portfolio..."
    docker compose down
    echo "✅ 已停止"
    ;;
  restart)
    echo "🔄 重啟 Backtest Portfolio..."
    docker compose down
    docker compose up -d --build
    echo "✅ 重啟完成！"
    ;;
  logs)
    docker compose logs -f
    ;;
  status)
    docker compose ps
    ;;
  clean)
    echo "🧹 清理 Docker 資源..."
    docker compose down -v --rmi local
    docker system prune -f
    echo "✅ 清理完成"
    ;;
  *)
    echo "用法: ./run.sh [命令]"
    echo ""
    echo "命令:"
    echo "  up, start    啟動服務 (預設)"
    echo "  down, stop   停止服務"
    echo "  restart      重啟服務"
    echo "  logs         查看日誌"
    echo "  status       查看狀態"
    echo "  clean        清理資源"
    ;;
esac
