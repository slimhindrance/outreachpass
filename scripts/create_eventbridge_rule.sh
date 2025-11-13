#!/bin/bash

# Create EventBridge rule to trigger pass generation worker
# This rule runs the worker Lambda every 2 minutes to process pending jobs

set -e

echo "⏰ Creating EventBridge rule for pass generation worker..."

# Configuration
FUNCTION_NAME="outreachpass-pass-worker"
RULE_NAME="outreachpass-pass-worker-schedule"
REGION="us-east-1"
SCHEDULE="rate(2 minutes)"  # Run every 2 minutes

# Get Lambda function ARN
echo "🔍 Getting Lambda function ARN..."
FUNCTION_ARN=$(aws lambda get-function \
    --function-name "$FUNCTION_NAME" \
    --region "$REGION" \
    --query 'Configuration.FunctionArn' \
    --output text)

echo "📋 Function ARN: $FUNCTION_ARN"

# Check if rule exists
if aws events describe-rule --name "$RULE_NAME" --region "$REGION" >/dev/null 2>&1; then
    echo "♻️  Rule already exists, updating..."

    # Update rule
    aws events put-rule \
        --name "$RULE_NAME" \
        --schedule-expression "$SCHEDULE" \
        --state ENABLED \
        --description "Triggers pass generation worker every 2 minutes" \
        --region "$REGION"
else
    echo "🆕 Creating new rule..."

    # Create rule
    aws events put-rule \
        --name "$RULE_NAME" \
        --schedule-expression "$SCHEDULE" \
        --state ENABLED \
        --description "Triggers pass generation worker every 2 minutes" \
        --region "$REGION"
fi

# Get rule ARN
RULE_ARN=$(aws events describe-rule \
    --name "$RULE_NAME" \
    --region "$REGION" \
    --query 'Arn' \
    --output text)

echo "📋 Rule ARN: $RULE_ARN"

# Add Lambda as target
echo "🎯 Adding Lambda as target..."
aws events put-targets \
    --rule "$RULE_NAME" \
    --targets "Id=1,Arn=$FUNCTION_ARN" \
    --region "$REGION"

# Grant EventBridge permission to invoke Lambda
echo "🔐 Granting EventBridge permission to invoke Lambda..."
STATEMENT_ID="EventBridgeInvokePermission"

# Remove existing permission if it exists
aws lambda remove-permission \
    --function-name "$FUNCTION_NAME" \
    --statement-id "$STATEMENT_ID" \
    --region "$REGION" 2>/dev/null || true

# Add permission
aws lambda add-permission \
    --function-name "$FUNCTION_NAME" \
    --statement-id "$STATEMENT_ID" \
    --action lambda:InvokeFunction \
    --principal events.amazonaws.com \
    --source-arn "$RULE_ARN" \
    --region "$REGION"

echo ""
echo "✅ EventBridge rule created successfully!"
echo "Rule: $RULE_NAME"
echo "Schedule: $SCHEDULE"
echo "Target: $FUNCTION_NAME"
echo ""
echo "The worker will now run automatically every 2 minutes."
echo ""
echo "To disable the rule:"
echo "  aws events disable-rule --name $RULE_NAME --region $REGION"
echo ""
echo "To enable the rule:"
echo "  aws events enable-rule --name $RULE_NAME --region $REGION"
echo ""
echo "To test manually:"
echo "  aws lambda invoke --function-name $FUNCTION_NAME --region $REGION output.json && cat output.json"
