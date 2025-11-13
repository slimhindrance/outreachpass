#!/bin/bash
set -e

echo "Building Lambda deployment package with Poetry..."

# Clean previous builds
rm -rf build/
rm -f terraform/modules/lambda/lambda.zip
mkdir -p terraform/modules/lambda/layers

# Create build directory
mkdir -p build/lambda

# Copy application code
echo "Copying application code..."
cp -r backend/app build/lambda/

# Create deployment package
echo "Creating deployment package..."
cd build/lambda
zip -r ../../terraform/modules/lambda/lambda.zip . -x "*.pyc" "__pycache__/*" "*.git*"
cd ../..

echo "Lambda package created: terraform/modules/lambda/lambda.zip"

# Build dependencies layer using Poetry
echo "Building dependencies layer from Poetry..."
mkdir -p build/layer/python

# Use production-only requirements file
echo "Using production requirements..."
cp requirements-prod.txt build/requirements.txt

# Install dependencies to layer for Lambda runtime
pip install -r build/requirements.txt -t build/layer/python \
    --platform manylinux2014_x86_64 \
    --implementation cp \
    --python-version 3.11 \
    --only-binary=:all: \
    --upgrade

# Create layer package
echo "Creating dependencies layer zip..."
cd build/layer
zip -r ../../terraform/modules/lambda/layers/dependencies.zip . -x "*.pyc" "__pycache__/*" "*.dist-info/*" "*.egg-info/*"
cd ../..

echo "Dependencies layer created: terraform/modules/lambda/layers/dependencies.zip"
echo "✅ Build complete!"
echo ""
echo "Layer size: $(du -h terraform/modules/lambda/layers/dependencies.zip | cut -f1)"
echo "Code size: $(du -h terraform/modules/lambda/lambda.zip | cut -f1)"
