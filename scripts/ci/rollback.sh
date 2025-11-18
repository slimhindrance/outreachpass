#!/bin/bash
# Rollback Script for Lambda Deployment
# Usage: ./rollback.sh <function-name> <version>

set -e

FUNCTION_NAME="${1}"
VERSION="${2}"
REGION="${AWS_REGION:-us-east-1}"

if [ -z "$FUNCTION_NAME" ] || [ -z "$VERSION" ]; then
    echo "Usage: ./rollback.sh <function-name> <version>"
    echo "Example: ./rollback.sh outreachpass-api-prod 42"
    exit 1
fi

echo "🔄 Rolling back Lambda function: $FUNCTION_NAME to version $VERSION"

# Verify version exists
echo "Verifying version exists..."
aws lambda get-function \
    --function-name "$FUNCTION_NAME" \
    --qualifier "$VERSION" \
    --region "$REGION" \
    > /dev/null

# Update alias to point to previous version
echo "Updating 'live' alias to version $VERSION..."
aws lambda update-alias \
    --function-name "$FUNCTION_NAME" \
    --name live \
    --function-version "$VERSION" \
    --region "$REGION"

echo "✅ Rollback completed"

# Verify rollback
echo "Verifying rollback..."
CURRENT_VERSION=$(aws lambda get-alias \
    --function-name "$FUNCTION_NAME" \
    --name live \
    --region "$REGION" \
    --query 'FunctionVersion' \
    --output text)

echo "Live alias now points to version: $CURRENT_VERSION"

if [ "$CURRENT_VERSION" = "$VERSION" ]; then
    echo "✅ Rollback verification successful"
    exit 0
else
    echo "❌ Rollback verification failed!"
    exit 1
fi
