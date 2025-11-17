# AWS Infrastructure Inventory

**Project**: OutreachPass CI/CD Infrastructure
**Created**: 2025-11-17
**AWS Account**: 741783034843
**Region**: us-east-1

---

## Resources Created

### 1. S3 Bucket - Terraform State

**Purpose**: Remote state storage for Terraform with team collaboration
**Resource**: S3 Bucket
**Name**: `outreachpass-terraform-state`
**Region**: us-east-1
**ARN**: `arn:aws:s3:::outreachpass-terraform-state`

**Configuration**:
- ✅ Versioning: Enabled
- ✅ Encryption: AES256 (SSE-S3) with Bucket Key
- ✅ Public Access: Blocked (all 4 settings)
- 📦 Purpose: Store terraform.tfstate files with version history

**Cost**: ~$0.023/GB/month + request costs (minimal for terraform state)

---

### 2. DynamoDB Table - State Locking

**Purpose**: Prevent concurrent Terraform operations and state corruption
**Resource**: DynamoDB Table
**Name**: `terraform-state-locks`
**Region**: us-east-1
**ARN**: `arn:aws:dynamodb:us-east-1:741783034843:table/terraform-state-locks`
**Table ID**: 8276d52c-5192-4422-80e5-1d33948d104f
**Created**: 2025-11-17T18:21:08.930000-05:00
**Status**: ACTIVE

**Configuration**:
- 🔑 Primary Key: LockID (String, HASH)
- 💵 Billing Mode: PAY_PER_REQUEST (on-demand)
- 🏷️ Tags:
  - Project: OutreachPass
  - Purpose: TerraformStateLocking
  - ManagedBy: CICD

**Cost**: $0 (no activity) + $1.25 per million write requests (minimal usage)

---

### 3. S3 Bucket - Build Artifacts

**Purpose**: Store versioned Lambda deployment packages and Docker images
**Resource**: S3 Bucket
**Name**: `outreachpass-artifacts`
**Region**: us-east-1
**ARN**: `arn:aws:s3:::outreachpass-artifacts`

**Configuration**:
- ✅ Versioning: Enabled
- ✅ Encryption: AES256 (SSE-S3) with Bucket Key
- ✅ Public Access: Blocked (all 4 settings)
- 🔄 Lifecycle Policy: DeleteOldArtifacts
  - Current version expiration: 30 days
  - Noncurrent version expiration: 7 days
  - Abort incomplete multipart uploads: 7 days
- 📦 Purpose: Store Lambda zips, container images metadata

**Cost**: ~$0.023/GB/month + request costs (auto-cleanup after 30 days)

---

## Resource Dependencies

```
┌─────────────────────────────┐
│  terraform-state-locks      │
│  (DynamoDB Table)            │
│  - Prevents concurrent ops   │
└──────────────┬──────────────┘
               │
               │ locks
               ▼
┌─────────────────────────────┐
│ outreachpass-terraform-state│
│ (S3 Bucket)                  │
│ - Stores .tfstate files      │
└─────────────────────────────┘

┌─────────────────────────────┐
│ outreachpass-artifacts      │
│ (S3 Bucket)                  │
│ - Lambda packages            │
│ - Deployment artifacts       │
└─────────────────────────────┘
```

---

## Monthly Cost Estimate

| Resource | Type | Cost |
|----------|------|------|
| Terraform State Bucket | S3 | ~$0.50/month (assuming 20GB state + versions) |
| State Lock Table | DynamoDB | ~$0.25/month (minimal reads/writes) |
| Artifacts Bucket | S3 | ~$5.00/month (artifacts with 30-day lifecycle) |
| **Total** | | **~$5.75/month** |

**Note**: Actual costs depend on:
- Deployment frequency (affects DynamoDB write requests)
- Artifact sizes (Lambda packages, Docker layers)
- Terraform state size and change frequency

---

## Integration Points

### GitHub Actions Secrets Required

These AWS resources require the following GitHub Secrets to be configured:

```bash
# Repository Secrets
AWS_ACCESS_KEY_ID           # IAM user with access to these resources
AWS_SECRET_ACCESS_KEY       # IAM user secret key
AWS_REGION                  # us-east-1
AWS_ACCOUNT_ID              # 741783034843
TERRAFORM_STATE_BUCKET      # outreachpass-terraform-state
ARTIFACT_BUCKET_NAME        # outreachpass-artifacts
```

### Terraform Backend Configuration

These resources enable the following terraform backend config:

```hcl
terraform {
  backend "s3" {
    bucket         = "outreachpass-terraform-state"
    key            = "prod/terraform.tfstate"  # or dev/terraform.tfstate
    region         = "us-east-1"
    encrypt        = true
    dynamodb_table = "terraform-state-locks"
  }
}
```

---

## Access Control

**Required IAM Permissions** for CI/CD:

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Action": [
        "s3:ListBucket",
        "s3:GetObject",
        "s3:PutObject",
        "s3:DeleteObject"
      ],
      "Resource": [
        "arn:aws:s3:::outreachpass-terraform-state",
        "arn:aws:s3:::outreachpass-terraform-state/*",
        "arn:aws:s3:::outreachpass-artifacts",
        "arn:aws:s3:::outreachpass-artifacts/*"
      ]
    },
    {
      "Effect": "Allow",
      "Action": [
        "dynamodb:GetItem",
        "dynamodb:PutItem",
        "dynamodb:DeleteItem"
      ],
      "Resource": "arn:aws:dynamodb:us-east-1:741783034843:table/terraform-state-locks"
    }
  ]
}
```

---

## Cleanup Instructions

**⚠️ WARNING**: The following operations are DESTRUCTIVE and will permanently delete all infrastructure state and build artifacts.

### Manual Cleanup

See `scripts/nuke-aws-infrastructure.sh` for automated cleanup.

### Manual Steps (if script fails)

```bash
# 1. Delete all objects from artifacts bucket
aws s3 rm s3://outreachpass-artifacts --recursive

# 2. Delete all objects and versions from terraform state bucket
aws s3api delete-objects --bucket outreachpass-terraform-state \
  --delete "$(aws s3api list-object-versions \
    --bucket outreachpass-terraform-state \
    --query '{Objects: Versions[].{Key:Key,VersionId:VersionId}}' \
    --output json)"

# 3. Delete buckets
aws s3 rb s3://outreachpass-artifacts --force
aws s3 rb s3://outreachpass-terraform-state --force

# 4. Delete DynamoDB table
aws dynamodb delete-table --table-name terraform-state-locks
```

---

## Validation

To verify all resources exist and are configured correctly:

```bash
# Check S3 buckets
aws s3 ls | grep outreachpass

# Check DynamoDB table
aws dynamodb describe-table --table-name terraform-state-locks

# Check bucket encryption
aws s3api get-bucket-encryption --bucket outreachpass-terraform-state
aws s3api get-bucket-encryption --bucket outreachpass-artifacts

# Check lifecycle policies
aws s3api get-bucket-lifecycle-configuration --bucket outreachpass-artifacts

# Check versioning
aws s3api get-bucket-versioning --bucket outreachpass-terraform-state
aws s3api get-bucket-versioning --bucket outreachpass-artifacts
```

---

## Maintenance

### Terraform State Bucket
- **Retention**: Indefinite (manual cleanup required)
- **Monitoring**: Monitor bucket size monthly
- **Cleanup**: Review and remove old workspace states quarterly

### Artifacts Bucket
- **Retention**: 30 days (automatic)
- **Monitoring**: Monitor for unusual growth patterns
- **Cleanup**: Automatic via lifecycle policy

### DynamoDB Table
- **Retention**: N/A (only holds active locks)
- **Monitoring**: Monitor for stuck locks (items > 1 hour old)
- **Cleanup**: Locks auto-release on terraform operation completion

---

## Troubleshooting

### Terraform State Locks Stuck

```bash
# List all lock items
aws dynamodb scan --table-name terraform-state-locks

# Force unlock (use with caution)
aws dynamodb delete-item \
  --table-name terraform-state-locks \
  --key '{"LockID": {"S": "outreachpass-terraform-state/prod/terraform.tfstate-md5"}}'
```

### Bucket Access Denied

```bash
# Check bucket policy
aws s3api get-bucket-policy --bucket outreachpass-terraform-state

# Check public access block
aws s3api get-public-access-block --bucket outreachpass-terraform-state

# Verify IAM permissions
aws sts get-caller-identity
```

---

**Last Updated**: 2025-11-17
**Maintained By**: CI/CD Infrastructure Team
**Related Docs**:
- `docs/CICD_IMPLEMENTATION_SUMMARY.md`
- `docs/cicd-architecture.md`
- `docs/terraform-state-migration.md`
- `scripts/nuke-aws-infrastructure.sh`
