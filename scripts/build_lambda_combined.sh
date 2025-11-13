#!/bin/bash
set -e

echo "Building combined Lambda deployment package..."

# Clean previous builds
rm -rf build/
rm -f terraform/modules/lambda/lambda.zip
mkdir -p terraform/modules/lambda

# Create build directory
mkdir -p build/combined

# Install dependencies directly to build directory
echo "Installing dependencies..."
cp requirements-prod.txt build/requirements.txt
pip install -r build/requirements.txt -t build/combined \
    --platform manylinux2014_x86_64 \
    --implementation cp \
    --python-version 3.11 \
    --only-binary=:all: \
    --upgrade

# Copy application code
echo "Copying application code..."
cp -r backend/app build/combined/
cp -r backend/workers build/combined/

# Copy SQL migration files
echo "Copying SQL migration files..."
cp database/001_initial_schema.sql build/combined/
cp database/002_pass_generation_jobs.sql build/combined/

# Create deployment package
echo "Creating combined deployment package..."
cd build/combined
zip -r ../../terraform/modules/lambda/lambda.zip . -x "*.pyc" "__pycache__/*" "*.git*"
cd ../..

echo "✅ Combined Lambda package created!"
echo ""
echo "Package size: $(du -h terraform/modules/lambda/lambda.zip | cut -f1)"
