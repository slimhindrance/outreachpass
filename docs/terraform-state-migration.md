# Terraform State Migration Guide

This guide walks you through migrating from local Terraform state to remote S3 backend.

## Prerequisites

- AWS CLI configured with appropriate credentials
- Terraform 1.5+ installed
- AWS region: `us-east-1`

## Step 1: Create S3 Bucket for State Storage

```bash
# Create the S3 bucket
aws s3 mb s3://outreachpass-terraform-state --region us-east-1

# Enable versioning (critical for state recovery)
aws s3api put-bucket-versioning \
  --bucket outreachpass-terraform-state \
  --versioning-configuration Status=Enabled

# Enable encryption at rest
aws s3api put-bucket-encryption \
  --bucket outreachpass-terraform-state \
  --server-side-encryption-configuration \
  '{"Rules":[{"ApplyServerSideEncryptionByDefault":{"SSEAlgorithm":"AES256"}}]}'

# Block public access (security best practice)
aws s3api put-public-access-block \
  --bucket outreachpass-terraform-state \
  --public-access-block-configuration \
  "BlockPublicAcls=true,IgnorePublicAcls=true,BlockPublicPolicy=true,RestrictPublicBuckets=true"

# Add bucket policy for team access (optional)
aws s3api put-bucket-policy \
  --bucket outreachpass-terraform-state \
  --policy file://terraform-state-bucket-policy.json
```

## Step 2: Create DynamoDB Table for State Locking

```bash
# Create DynamoDB table for state locking
aws dynamodb create-table \
  --table-name terraform-state-locks \
  --attribute-definitions AttributeName=LockID,AttributeType=S \
  --key-schema AttributeName=LockID,KeyType=HASH \
  --billing-mode PAY_PER_REQUEST \
  --region us-east-1

# Add tags for organization
aws dynamodb tag-resource \
  --resource-arn arn:aws:dynamodb:us-east-1:ACCOUNT_ID:table/terraform-state-locks \
  --tags Key=Project,Value=OutreachPass Key=Purpose,Value=TerraformStateLocking
```

## Step 3: Backup Current Local State

**CRITICAL: Always backup before migration!**

```bash
# Navigate to terraform directory
cd terraform/

# Create backup directory
mkdir -p backups/$(date +%Y%m%d)

# Backup current state files
cp terraform.tfstate backups/$(date +%Y%m%d)/terraform.tfstate.backup
cp terraform.tfstate.backup backups/$(date +%Y%m%d)/terraform.tfstate.backup.old 2>/dev/null || true

# Verify backup
ls -lh backups/$(date +%Y%m%d)/
```

## Step 4: Configure Remote Backend

The backend configuration is already in `terraform/backend.tf`. Review it:

```hcl
terraform {
  backend "s3" {
    bucket         = "outreachpass-terraform-state"
    key            = "prod/terraform.tfstate"
    region         = "us-east-1"
    encrypt        = true
    dynamodb_table = "terraform-state-locks"
  }
}
```

## Step 5: Initialize Remote Backend

```bash
# Initialize Terraform with the new backend
terraform init

# Terraform will detect the backend change and prompt:
# "Do you want to copy existing state to the new backend?"
# Answer: yes

# Verify migration
terraform state list

# Check remote state
aws s3 ls s3://outreachpass-terraform-state/prod/
```

## Step 6: Verify Migration Success

```bash
# Pull remote state to verify
terraform state pull > /tmp/remote-state-check.json

# Compare with local backup (should be identical)
diff backups/$(date +%Y%m%d)/terraform.tfstate.backup /tmp/remote-state-check.json

# Test state locking
terraform plan  # Should acquire lock successfully
```

## Step 7: Cleanup Local State Files

**ONLY after verifying remote state works!**

```bash
# Remove local state files (they're now in S3)
rm terraform.tfstate
rm terraform.tfstate.backup

# Keep backups for 30 days
# DO NOT delete backups immediately!
```

## Environment-Specific Migration

### Dev Environment

```bash
cd terraform/environments/dev/

# Copy relevant modules/configs
# ...

# Init with dev backend
terraform init

# Migrate (if had local state)
# Answer yes to migration prompt
```

### Prod Environment

Use the main `terraform/` directory (already configured for prod).

## Troubleshooting

### Issue: "Failed to get existing workspaces"

```bash
# Solution: Check AWS credentials
aws sts get-caller-identity

# Verify S3 bucket exists
aws s3 ls s3://outreachpass-terraform-state
```

### Issue: "Error locking state"

```bash
# Check for stuck locks
aws dynamodb scan --table-name terraform-state-locks

# Force unlock (use with caution!)
terraform force-unlock LOCK_ID
```

### Issue: "Backend configuration changed"

```bash
# Reinitialize
terraform init -reconfigure

# Or migrate to new configuration
terraform init -migrate-state
```

## Rollback Procedure

If migration fails and you need to rollback:

```bash
# 1. Remove backend configuration temporarily
# Comment out backend block in backend.tf

# 2. Reinitialize with local backend
terraform init -migrate-state

# 3. Restore from backup
cp backups/$(date +%Y%m%d)/terraform.tfstate.backup terraform.tfstate

# 4. Verify
terraform state list
```

## Security Best Practices

1. **Bucket Policy**: Restrict access to team members only
2. **Encryption**: State contains sensitive data, always encrypt
3. **Versioning**: Enable for state recovery
4. **Backup**: Maintain local backups for 30+ days
5. **Access Logs**: Enable S3 access logging for audit trail

```bash
# Enable S3 access logging
aws s3api put-bucket-logging \
  --bucket outreachpass-terraform-state \
  --bucket-logging-status \
  '{"LoggingEnabled":{"TargetBucket":"outreachpass-logs","TargetPrefix":"terraform-state-access/"}}'
```

## Cost Estimate

- **S3 Storage**: ~$0.023/GB/month (state files are typically <10MB = ~$0.001/month)
- **S3 Requests**: ~$0.0004 per 1,000 requests (negligible)
- **DynamoDB**: Pay-per-request ($0.25 per million writes, minimal for locking)
- **Total**: ~$1-2/month

## Team Collaboration

Once remote state is configured:

1. All team members run `terraform init`
2. State locking prevents concurrent modifications
3. State changes are automatically synced
4. No need to commit state files to git

## Verification Checklist

- [ ] S3 bucket created with versioning enabled
- [ ] S3 bucket encryption configured
- [ ] Public access blocked on S3 bucket
- [ ] DynamoDB table created for locking
- [ ] Local state backed up
- [ ] `terraform init` successful
- [ ] State migrated to S3 (verified with `aws s3 ls`)
- [ ] `terraform state list` works correctly
- [ ] `terraform plan` acquires lock successfully
- [ ] Local state files removed (after verification)
- [ ] Team members notified of migration

## Next Steps

After successful migration:

1. Update CI/CD workflows to use remote state
2. Remove `.tfstate` from `.gitignore` (no longer needed)
3. Document backend configuration for team
4. Set up state file monitoring/alerts
5. Configure automatic backups (S3 versioning handles this)

## References

- [Terraform S3 Backend Documentation](https://developer.hashicorp.com/terraform/language/settings/backends/s3)
- [Terraform State Locking](https://developer.hashicorp.com/terraform/language/state/locking)
- [AWS S3 Versioning](https://docs.aws.amazon.com/AmazonS3/latest/userguide/Versioning.html)
