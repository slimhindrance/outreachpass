# Terraform Remote State Configuration
# This file configures S3 backend for storing Terraform state
#
# IMPORTANT: Before applying, create the S3 bucket and DynamoDB table:
# 1. aws s3 mb s3://outreachpass-terraform-state --region us-east-1
# 2. aws s3api put-bucket-versioning --bucket outreachpass-terraform-state \
#    --versioning-configuration Status=Enabled
# 3. aws s3api put-bucket-encryption --bucket outreachpass-terraform-state \
#    --server-side-encryption-configuration \
#    '{"Rules":[{"ApplyServerSideEncryptionByDefault":{"SSEAlgorithm":"AES256"}}]}'
# 4. aws dynamodb create-table --table-name terraform-state-locks \
#    --attribute-definitions AttributeName=LockID,AttributeType=S \
#    --key-schema AttributeName=LockID,KeyType=HASH \
#    --billing-mode PAY_PER_REQUEST --region us-east-1

terraform {
  backend "s3" {
    bucket         = "outreachpass-terraform-state"
    key            = "prod/terraform.tfstate"
    region         = "us-east-1"
    encrypt        = true
    dynamodb_table = "terraform-state-locks"

    # Prevent accidental deletion or modification
    skip_credentials_validation = false
    skip_metadata_api_check     = false
    skip_region_validation      = false
  }
}
