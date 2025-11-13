#!/bin/bash

# Deploy pass generation worker Lambda function
# This script packages the worker code and deploys it to AWS Lambda

set -e

echo "🚀 Deploying Pass Generation Worker Lambda..."

# Configuration
FUNCTION_NAME="outreachpass-pass-worker"
REGION="us-east-1"
RUNTIME="python3.11"
HANDLER="workers.pass_generation_worker.lambda_handler"
TIMEOUT=300  # 5 minutes
MEMORY=512   # 512 MB

# Get current directory
SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"
BACKEND_DIR="$PROJECT_ROOT/backend"
BUILD_DIR="$PROJECT_ROOT/lambda-worker-build"

echo "📁 Project root: $PROJECT_ROOT"
echo "📁 Backend dir: $BACKEND_DIR"

# Clean and create build directory
echo "🧹 Cleaning build directory..."
rm -rf "$BUILD_DIR"
mkdir -p "$BUILD_DIR"

# Copy backend code
echo "📦 Copying backend code..."
cd "$BACKEND_DIR"
cp -r app "$BUILD_DIR/"
cp -r workers "$BUILD_DIR/"

# Install dependencies
echo "📥 Installing dependencies..."
cd "$BUILD_DIR"

# Create requirements file for worker
cat > requirements.txt <<EOF
sqlalchemy==2.0.23
asyncpg==0.29.0
pydantic==2.5.0
qrcode[pil]==7.4.2
boto3==1.34.0
python-dotenv==1.0.0
EOF

# Install packages to build directory
pip install -r requirements.txt -t .

# Get database URL from AWS Secrets Manager
echo "🔐 Fetching database credentials..."
DB_SECRET=$(aws secretsmanager get-secret-value \
    --secret-id outreachpass-db-credentials \
    --region us-east-1 \
    --query SecretString \
    --output text)

DB_HOST=$(echo $DB_SECRET | python3 -c "import sys, json; print(json.load(sys.stdin)['host'])")
DB_NAME=$(echo $DB_SECRET | python3 -c "import sys, json; print(json.load(sys.stdin)['dbname'])")
DB_USER=$(echo $DB_SECRET | python3 -c "import sys, json; print(json.load(sys.stdin)['username'])")
DB_PASSWORD=$(echo $DB_SECRET | python3 -c "import sys, json; print(json.load(sys.stdin)['password'])")

DATABASE_URL="postgresql+asyncpg://${DB_USER}:${DB_PASSWORD}@${DB_HOST}/${DB_NAME}"

# Create deployment package
echo "📦 Creating deployment package..."
zip -r ../worker-deployment.zip . -x "*.pyc" "__pycache__/*" "*.dist-info/*"

cd "$PROJECT_ROOT"

# Check if Lambda function exists
echo "🔍 Checking if Lambda function exists..."
if aws lambda get-function --function-name "$FUNCTION_NAME" --region "$REGION" >/dev/null 2>&1; then
    echo "♻️  Updating existing Lambda function..."

    # Update function code
    aws lambda update-function-code \
        --function-name "$FUNCTION_NAME" \
        --zip-file fileb://worker-deployment.zip \
        --region "$REGION"

    # Update function configuration
    aws lambda update-function-configuration \
        --function-name "$FUNCTION_NAME" \
        --timeout "$TIMEOUT" \
        --memory-size "$MEMORY" \
        --environment "Variables={DATABASE_URL=$DATABASE_URL,AWS_DEFAULT_REGION=$REGION}" \
        --region "$REGION"

    echo "✅ Lambda function updated"
else
    echo "🆕 Creating new Lambda function..."

    # Get Lambda execution role ARN (reuse existing or create new)
    ROLE_NAME="outreachpass-worker-role"

    if ! aws iam get-role --role-name "$ROLE_NAME" >/dev/null 2>&1; then
        echo "📝 Creating IAM role..."

        # Create trust policy
        cat > /tmp/trust-policy.json <<EOF
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Principal": {
        "Service": "lambda.amazonaws.com"
      },
      "Action": "sts:AssumeRole"
    }
  ]
}
EOF

        # Create role
        aws iam create-role \
            --role-name "$ROLE_NAME" \
            --assume-role-policy-document file:///tmp/trust-policy.json

        # Attach policies
        aws iam attach-role-policy \
            --role-name "$ROLE_NAME" \
            --policy-arn arn:aws:iam::aws:policy/service-role/AWSLambdaBasicExecutionRole

        aws iam attach-role-policy \
            --role-name "$ROLE_NAME" \
            --policy-arn arn:aws:iam::aws:policy/AmazonS3FullAccess

        aws iam attach-role-policy \
            --role-name "$ROLE_NAME" \
            --policy-arn arn:aws:iam::aws:policy/SecretsManagerReadWrite

        echo "⏳ Waiting for role to propagate..."
        sleep 10
    fi

    ROLE_ARN=$(aws iam get-role --role-name "$ROLE_NAME" --query 'Role.Arn' --output text)

    # Create Lambda function
    aws lambda create-function \
        --function-name "$FUNCTION_NAME" \
        --runtime "$RUNTIME" \
        --role "$ROLE_ARN" \
        --handler "$HANDLER" \
        --zip-file fileb://worker-deployment.zip \
        --timeout "$TIMEOUT" \
        --memory-size "$MEMORY" \
        --environment "Variables={DATABASE_URL=$DATABASE_URL,AWS_DEFAULT_REGION=$REGION}" \
        --region "$REGION"

    echo "✅ Lambda function created"
fi

# Clean up
echo "🧹 Cleaning up..."
rm -rf "$BUILD_DIR"
rm -f worker-deployment.zip

echo ""
echo "✨ Deployment complete!"
echo "Function: $FUNCTION_NAME"
echo "Region: $REGION"
echo ""
echo "Next steps:"
echo "1. Create EventBridge rule: run scripts/create_eventbridge_rule.sh"
echo "2. Test the worker: aws lambda invoke --function-name $FUNCTION_NAME --region $REGION output.json"
