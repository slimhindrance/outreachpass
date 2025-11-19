#!/bin/bash
set -e

echo "🚀 Deploying Frontend to ECS..."

# Configuration
REGION="us-east-1"
ECR_REPO="741783034843.dkr.ecr.us-east-1.amazonaws.com/outreachpass-frontend"
CLUSTER="outreachpass-frontend-cluster"
SERVICE="outreachpass-frontend-service"
FRONTEND_DIR="/Users/christopherlindeman/Desktop/Base2ML/Projects/ContactSolution/frontend-outreachpass"

# Build for linux/amd64 (ECS Fargate requirement)
echo "📦 Building Docker image for linux/amd64..."
cd "$FRONTEND_DIR"
docker buildx build --platform linux/amd64 -t outreachpass-frontend:latest --load .

# Login to ECR
echo "🔐 Logging in to ECR..."
aws ecr get-login-password --region $REGION | docker login --username AWS --password-stdin $ECR_REPO

# Tag and push
echo "⬆️  Pushing to ECR..."
docker tag outreachpass-frontend:latest $ECR_REPO:latest
docker push $ECR_REPO:latest

# Force new deployment
echo "🔄 Forcing new ECS deployment..."
aws ecs update-service \
  --cluster $CLUSTER \
  --service $SERVICE \
  --force-new-deployment \
  --region $REGION

echo "✅ Deployment initiated!"
echo ""
echo "Monitor deployment status:"
echo "  aws ecs describe-services --cluster $CLUSTER --services $SERVICE --region $REGION"
echo ""
echo "Your app will be live at: https://app.outreachpass.base2ml.com"
