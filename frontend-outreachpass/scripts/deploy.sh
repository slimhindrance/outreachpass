#!/bin/bash

# OutreachPass Frontend Deployment Script
# Builds and deploys the Next.js app to S3 + CloudFront

set -e  # Exit on error

echo "🚀 Starting OutreachPass frontend deployment..."

# Configuration
S3_BUCKET="dev-outreachpass-frontend"
CLOUDFRONT_DIST_ID="E37NUBLQTONXI0"
BUILD_DIR="out"

# Colors for output
GREEN='\033[0;32m'
BLUE='\033[0;34m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# Step 1: Install dependencies
echo -e "${BLUE}📦 Installing dependencies...${NC}"
npm install

# Step 2: Type check
echo -e "${BLUE}🔍 Running type check...${NC}"
npm run type-check

# Step 3: Lint
echo -e "${BLUE}✨ Running linter...${NC}"
npm run lint

# Step 4: Build
echo -e "${BLUE}🔨 Building production bundle...${NC}"
npm run build

# Check if build was successful
if [ ! -d "$BUILD_DIR" ]; then
    echo -e "${RED}❌ Build failed: $BUILD_DIR directory not found${NC}"
    exit 1
fi

# Step 5: Deploy to S3
echo -e "${BLUE}☁️  Syncing to S3 bucket: $S3_BUCKET${NC}"
aws s3 sync $BUILD_DIR/ s3://$S3_BUCKET --delete

# Step 6: Invalidate CloudFront cache
echo -e "${BLUE}🔄 Invalidating CloudFront cache...${NC}"
INVALIDATION_ID=$(aws cloudfront create-invalidation \
    --distribution-id $CLOUDFRONT_DIST_ID \
    --paths "/*" \
    --query 'Invalidation.Id' \
    --output text)

echo -e "${GREEN}✅ Deployment successful!${NC}"
echo -e "${GREEN}Invalidation ID: $INVALIDATION_ID${NC}"
echo -e "${GREEN}Frontend URL: https://outreachpassapp.base2ml.com${NC}"
echo -e "${BLUE}Note: CloudFront invalidation may take 1-2 minutes to propagate.${NC}"
