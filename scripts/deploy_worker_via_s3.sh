#!/bin/bash

# Deploy pass generation worker Lambda via S3 (Option 1 - Automated)
# This script uploads the Lambda package to S3 first, then creates/updates the function

set -e

echo "🚀 Deploying Pass Generation Worker Lambda via S3..."

# Configuration
FUNCTION_NAME="outreachpass-pass-worker"
REGION="us-east-1"
RUNTIME="python3.11"
HANDLER="workers.pass_generation_worker.lambda_handler"
TIMEOUT=300
MEMORY=512
ROLE_NAME="outreachpass-dev-lambda-role"
S3_BUCKET="outreachpass-dev-assets"
S3_KEY="lambda/worker-deploy.zip"

# Paths
SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"
ZIP_PATH="$PROJECT_ROOT/terraform/modules/lambda/lambda.zip"

echo "📁 Project root: $PROJECT_ROOT"
echo "📦 Lambda package: $ZIP_PATH"

# Verify zip file exists
if [ ! -f "$ZIP_PATH" ]; then
    echo "❌ Lambda package not found at $ZIP_PATH"
    echo "Run ./scripts/build_lambda_combined.sh first"
    exit 1
fi

# Get package size
ZIP_SIZE=$(du -h "$ZIP_PATH" | cut -f1)
echo "📊 Package size: $ZIP_SIZE"

# Step 1: Upload to S3
echo ""
echo "☁️  Step 1: Uploading to S3..."
echo "   Bucket: s3://$S3_BUCKET/$S3_KEY"

aws s3 cp "$ZIP_PATH" "s3://$S3_BUCKET/$S3_KEY" \
    --region "$REGION" \
    --no-progress

if [ $? -eq 0 ]; then
    echo "✅ Upload successful"
else
    echo "❌ Upload failed"
    exit 1
fi

# Step 2: Get IAM role ARN
echo ""
echo "🔐 Step 2: Getting IAM role ARN..."

ROLE_ARN=$(aws iam get-role \
    --role-name "$ROLE_NAME" \
    --query 'Role.Arn' \
    --output text 2>/dev/null)

if [ -z "$ROLE_ARN" ]; then
    echo "❌ Role $ROLE_NAME not found"
    exit 1
fi

echo "   Role ARN: $ROLE_ARN"

# Step 3: Get database connection string
echo ""
echo "🔗 Step 3: Getting database connection..."

DB_CLUSTER=$(aws rds describe-db-clusters \
    --region "$REGION" \
    --query 'DBClusters[?DatabaseName==`outreachpass`].[Endpoint]' \
    --output text)

if [ -z "$DB_CLUSTER" ]; then
    echo "❌ Database cluster not found"
    exit 1
fi

DATABASE_URL="postgresql+asyncpg://postgres:Lindy101@${DB_CLUSTER}/outreachpass"
echo "   Database: $DB_CLUSTER"

# Step 4: Create or update Lambda function
echo ""
echo "🔨 Step 4: Creating/updating Lambda function..."

# Check if function exists
if aws lambda get-function --function-name "$FUNCTION_NAME" --region "$REGION" >/dev/null 2>&1; then
    echo "   Function exists, updating..."

    # Update function code from S3
    aws lambda update-function-code \
        --function-name "$FUNCTION_NAME" \
        --s3-bucket "$S3_BUCKET" \
        --s3-key "$S3_KEY" \
        --region "$REGION" \
        --query '[FunctionName,LastModified,CodeSize]' \
        --output text

    if [ $? -ne 0 ]; then
        echo "❌ Failed to update function code"
        exit 1
    fi

    echo "   Waiting for update to complete..."
    sleep 5

    # Update function configuration
    aws lambda update-function-configuration \
        --function-name "$FUNCTION_NAME" \
        --timeout "$TIMEOUT" \
        --memory-size "$MEMORY" \
        --handler "$HANDLER" \
        --environment "Variables={DATABASE_URL=$DATABASE_URL}" \
        --region "$REGION" \
        --query '[FunctionName,Timeout,MemorySize]' \
        --output text

    if [ $? -eq 0 ]; then
        echo "✅ Function updated successfully"
    else
        echo "❌ Failed to update function configuration"
        exit 1
    fi

else
    echo "   Function doesn't exist, creating..."

    # Create function from S3
    aws lambda create-function \
        --function-name "$FUNCTION_NAME" \
        --runtime "$RUNTIME" \
        --role "$ROLE_ARN" \
        --handler "$HANDLER" \
        --code "S3Bucket=$S3_BUCKET,S3Key=$S3_KEY" \
        --timeout "$TIMEOUT" \
        --memory-size "$MEMORY" \
        --environment "Variables={DATABASE_URL=$DATABASE_URL}" \
        --region "$REGION" \
        --query '[FunctionName,Runtime,Timeout,MemorySize]' \
        --output text

    if [ $? -eq 0 ]; then
        echo "✅ Function created successfully"
    else
        echo "❌ Failed to create function"
        exit 1
    fi
fi

# Step 5: Test the function
echo ""
echo "🧪 Step 5: Testing function..."

aws lambda invoke \
    --function-name "$FUNCTION_NAME" \
    --region "$REGION" \
    --log-type Tail \
    --query 'LogResult' \
    --output text \
    /tmp/worker-test-output.json 2>/dev/null | base64 -d

echo ""
echo "Response:"
cat /tmp/worker-test-output.json
echo ""

# Check if test was successful
if grep -q '"statusCode": 200' /tmp/worker-test-output.json; then
    echo "✅ Function test passed"
else
    echo "⚠️  Function test may have issues, check logs"
fi

# Step 6: Create EventBridge schedule
echo ""
echo "⏰ Step 6: Setting up EventBridge schedule..."

RULE_NAME="outreachpass-pass-worker-schedule"
SCHEDULE="rate(2 minutes)"

# Check if rule exists
if aws events describe-rule --name "$RULE_NAME" --region "$REGION" >/dev/null 2>&1; then
    echo "   Rule exists, updating..."

    aws events put-rule \
        --name "$RULE_NAME" \
        --schedule-expression "$SCHEDULE" \
        --state ENABLED \
        --description "Triggers pass generation worker every 2 minutes" \
        --region "$REGION" >/dev/null
else
    echo "   Creating new rule..."

    aws events put-rule \
        --name "$RULE_NAME" \
        --schedule-expression "$SCHEDULE" \
        --state ENABLED \
        --description "Triggers pass generation worker every 2 minutes" \
        --region "$REGION" >/dev/null
fi

# Get function ARN
FUNCTION_ARN=$(aws lambda get-function \
    --function-name "$FUNCTION_NAME" \
    --region "$REGION" \
    --query 'Configuration.FunctionArn' \
    --output text)

# Add Lambda as target
echo "   Adding Lambda as target..."
aws events put-targets \
    --rule "$RULE_NAME" \
    --targets "Id=1,Arn=$FUNCTION_ARN" \
    --region "$REGION" >/dev/null

# Grant EventBridge permission to invoke Lambda
echo "   Granting EventBridge permissions..."
STATEMENT_ID="EventBridgeInvokePermission"

# Remove existing permission if it exists
aws lambda remove-permission \
    --function-name "$FUNCTION_NAME" \
    --statement-id "$STATEMENT_ID" \
    --region "$REGION" 2>/dev/null || true

# Get rule ARN
RULE_ARN=$(aws events describe-rule \
    --name "$RULE_NAME" \
    --region "$REGION" \
    --query 'Arn' \
    --output text)

# Add permission
aws lambda add-permission \
    --function-name "$FUNCTION_NAME" \
    --statement-id "$STATEMENT_ID" \
    --action lambda:InvokeFunction \
    --principal events.amazonaws.com \
    --source-arn "$RULE_ARN" \
    --region "$REGION" >/dev/null

echo "✅ EventBridge schedule configured"

# Cleanup
rm -f /tmp/worker-test-output.json

# Summary
echo ""
echo "═══════════════════════════════════════════════════════════════"
echo "✨ Deployment Complete!"
echo "═══════════════════════════════════════════════════════════════"
echo ""
echo "📋 Configuration:"
echo "   Function: $FUNCTION_NAME"
echo "   Region: $REGION"
echo "   Runtime: $RUNTIME"
echo "   Memory: ${MEMORY}MB"
echo "   Timeout: ${TIMEOUT}s"
echo "   Schedule: $SCHEDULE"
echo ""
echo "🔗 Resources:"
echo "   Lambda: https://console.aws.amazon.com/lambda/home?region=$REGION#/functions/$FUNCTION_NAME"
echo "   EventBridge: https://console.aws.amazon.com/events/home?region=$REGION#/eventbus/default/rules/$RULE_NAME"
echo "   S3 Package: s3://$S3_BUCKET/$S3_KEY"
echo ""
echo "🧪 Test Commands:"
echo "   # Create a test job"
echo "   curl -X POST 'https://outreachpass.base2ml.com/api/v1/admin/attendees/ATTENDEE_ID/issue'"
echo ""
echo "   # Check job status"
echo "   curl 'https://outreachpass.base2ml.com/api/v1/admin/passes/jobs/JOB_ID'"
echo ""
echo "   # Manually invoke worker"
echo "   aws lambda invoke --function-name $FUNCTION_NAME --region $REGION output.json && cat output.json"
echo ""
echo "   # View worker logs"
echo "   aws logs tail /aws/lambda/$FUNCTION_NAME --follow --region $REGION"
echo ""
echo "═══════════════════════════════════════════════════════════════"
