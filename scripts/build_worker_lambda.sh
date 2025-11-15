#!/bin/bash
set -e

echo "🔨 Building worker Lambda deployment package..."

# Clean previous builds
rm -rf lambda-worker-build/
mkdir -p lambda-worker-build

# Copy application code
echo "📦 Copying application code..."
cp -r backend/app lambda-worker-build/
cp backend/worker.py lambda-worker-build/

# Install dependencies for Linux Lambda runtime
echo "📥 Installing dependencies for linux/amd64 Lambda runtime..."
pip install -r backend/requirements.txt \
    -t lambda-worker-build/ \
    --platform manylinux2014_x86_64 \
    --implementation cp \
    --python-version 3.11 \
    --only-binary=:all: \
    --upgrade

# Create deployment ZIP
echo "📦 Creating deployment package..."
cd lambda-worker-build
zip -r ../worker-deployment.zip . -x "*.pyc" "__pycache__/*" "*.dist-info/*" "*.egg-info/*"
cd ..

echo "✅ Worker Lambda package created: worker-deployment.zip"
echo "📊 Package size: $(du -h worker-deployment.zip | cut -f1)"
