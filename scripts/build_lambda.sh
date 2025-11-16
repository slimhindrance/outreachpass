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

# Copy Google Wallet credentials if they exist
if [ -f "backend/google-wallet-credentials.json" ]; then
    echo "Copying Google Wallet credentials..."
    cp backend/google-wallet-credentials.json build/lambda/
fi

# Install ALL dependencies directly in Lambda package (no layer)
echo "Installing ALL dependencies in Lambda package..."
pip install \
    fastapi==0.109.0 \
    uvicorn==0.27.0 \
    pydantic==2.5.3 \
    pydantic-settings==2.1.0 \
    sqlalchemy==2.0.25 \
    asyncpg==0.29.0 \
    greenlet==3.1.0 \
    psycopg2-binary==2.9.9 \
    python-jose[cryptography]==3.3.0 \
    python-multipart==0.0.6 \
    boto3==1.34.34 \
    qrcode[pil]==7.4.2 \
    vobject==0.9.9 \
    email-validator==2.1.0 \
    mangum==0.17.0 \
    google-auth==2.27.0 \
    google-api-python-client==2.115.0 \
    -t build/lambda \
    --platform manylinux2014_x86_64 \
    --implementation cp \
    --python-version 3.11 \
    --only-binary=:all: \
    --upgrade

# Create deployment package
echo "Creating deployment package..."
cd build/lambda
zip -r ../../terraform/modules/lambda/lambda.zip . -x "*.pyc" "__pycache__/*" "*.git*"
cd ../..

echo "Lambda package created: terraform/modules/lambda/lambda.zip"
echo "✅ Build complete!"
echo ""
echo "Package size: $(du -h terraform/modules/lambda/lambda.zip | cut -f1)"
