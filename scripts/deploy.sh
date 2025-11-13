#!/bin/bash
set -e

ENVIRONMENT=${1:-dev}

echo "Deploying OutreachPass to environment: $ENVIRONMENT"

# Build Lambda package
echo "Step 1: Building Lambda package..."
./scripts/build_lambda.sh

# Initialize Terraform
echo "Step 2: Initializing Terraform..."
cd terraform
terraform init

# Plan
echo "Step 3: Planning infrastructure changes..."
terraform plan -var-file="terraform.tfvars" -out=tfplan

# Apply
echo "Step 4: Applying infrastructure..."
terraform apply tfplan

# Get outputs
echo "Step 5: Deployment complete! Outputs:"
terraform output

echo ""
echo "Next steps:"
echo "1. Run database migrations: ./scripts/run_migrations.sh"
echo "2. Seed initial data: ./scripts/seed_database.sh"
echo "3. Verify SES email: Check AWS SES console and verify sender email"
echo "4. Test API: curl \$(terraform output -raw api_endpoint)/health"
