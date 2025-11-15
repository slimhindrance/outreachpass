#!/bin/bash
set -e

echo "🚀 Deploying OutreachPass Frontend to ECS"

# Configuration
AWS_REGION="us-east-1"
ECR_REPO="741783034843.dkr.ecr.us-east-1.amazonaws.com/outreachpass-frontend"
CLUSTER_NAME="outreachpass-frontend-cluster"
SERVICE_NAME="outreachpass-frontend-service"
IMAGE_TAG="latest"

# Get the directory of this script
SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
PROJECT_DIR="$(dirname "$SCRIPT_DIR")"

cd "$PROJECT_DIR"

echo "📦 Building Docker image..."
DOCKER_BUILDKIT=1 docker build \
  --platform linux/amd64 \
  --build-arg NEXT_PUBLIC_API_URL=https://outreachpass.base2ml.com/api/v1 \
  --build-arg NEXT_PUBLIC_COGNITO_USER_POOL_ID=us-east-1_SXH934qKt \
  --build-arg NEXT_PUBLIC_COGNITO_CLIENT_ID=256e0chtcc14qf8m4knqmobdg0 \
  --build-arg NEXT_PUBLIC_COGNITO_DOMAIN=outreachpass-dev.auth.us-east-1.amazoncognito.com \
  --build-arg NEXT_PUBLIC_AWS_REGION=us-east-1 \
  --build-arg NEXT_PUBLIC_APP_URL=https://app.outreachpass.base2ml.com \
  -t outreachpass-frontend:$IMAGE_TAG \
  .

echo "🔑 Logging in to ECR..."
aws ecr get-login-password --region $AWS_REGION | docker login --username AWS --password-stdin $ECR_REPO

echo "🏷️  Tagging image..."
docker tag outreachpass-frontend:$IMAGE_TAG $ECR_REPO:$IMAGE_TAG

echo "⬆️  Pushing image to ECR..."
docker push $ECR_REPO:$IMAGE_TAG

echo "🔄 Updating ECS service..."
aws ecs update-service \
  --cluster $CLUSTER_NAME \
  --service $SERVICE_NAME \
  --force-new-deployment \
  --region $AWS_REGION

echo "✅ Deployment initiated! ECS will automatically pull the new image and replace the running tasks."
echo "📊 Monitor deployment status:"
echo "   aws ecs describe-services --cluster $CLUSTER_NAME --services $SERVICE_NAME --region $AWS_REGION"
