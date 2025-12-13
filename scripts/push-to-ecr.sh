#!/bin/bash
set -e

# ============================================
# AWS ECR 推送腳本
# ============================================

# 配置變數（請修改為你的設定）
AWS_REGION="${AWS_REGION:-ap-northeast-1}"
AWS_ACCOUNT_ID="${AWS_ACCOUNT_ID:-YOUR_ACCOUNT_ID}"
ECR_REGISTRY="${AWS_ACCOUNT_ID}.dkr.ecr.${AWS_REGION}.amazonaws.com"
IMAGE_TAG="${IMAGE_TAG:-latest}"

# 映像名稱
API_IMAGE="quantipy-api"
WEB_IMAGE="quantipy-web"
NGINX_IMAGE="quantipy-nginx"

echo "🚀 開始推送到 AWS ECR..."
echo "   Region: ${AWS_REGION}"
echo "   Account: ${AWS_ACCOUNT_ID}"
echo "   Tag: ${IMAGE_TAG}"
echo ""

# 1. 登入 ECR
echo "📦 登入 AWS ECR..."
aws ecr get-login-password --region ${AWS_REGION} | \
    docker login --username AWS --password-stdin ${ECR_REGISTRY}

# 2. 建立 ECR 儲存庫（如果不存在）
echo "📁 確認 ECR 儲存庫..."
for repo in ${API_IMAGE} ${WEB_IMAGE} ${NGINX_IMAGE}; do
    aws ecr describe-repositories --repository-names ${repo} --region ${AWS_REGION} 2>/dev/null || \
    aws ecr create-repository --repository-name ${repo} --region ${AWS_REGION}
done

# 3. 建構映像
echo "🔨 建構 Docker 映像..."
docker compose build

# 4. 標記映像
echo "🏷️  標記映像..."
docker tag quant-backtest-monorepo-api:latest ${ECR_REGISTRY}/${API_IMAGE}:${IMAGE_TAG}
docker tag quant-backtest-monorepo-web:latest ${ECR_REGISTRY}/${WEB_IMAGE}:${IMAGE_TAG}
docker tag nginx:alpine ${ECR_REGISTRY}/${NGINX_IMAGE}:${IMAGE_TAG}

# 5. 推送映像
echo "⬆️  推送映像到 ECR..."
docker push ${ECR_REGISTRY}/${API_IMAGE}:${IMAGE_TAG}
docker push ${ECR_REGISTRY}/${WEB_IMAGE}:${IMAGE_TAG}
docker push ${ECR_REGISTRY}/${NGINX_IMAGE}:${IMAGE_TAG}

echo ""
echo "✅ 推送完成！"
echo ""
echo "映像位置："
echo "  - ${ECR_REGISTRY}/${API_IMAGE}:${IMAGE_TAG}"
echo "  - ${ECR_REGISTRY}/${WEB_IMAGE}:${IMAGE_TAG}"
echo "  - ${ECR_REGISTRY}/${NGINX_IMAGE}:${IMAGE_TAG}"
