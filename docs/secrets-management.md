# Secrets Management Guide

## Overview

This document outlines how secrets and sensitive configuration are managed across different environments for the OutreachPass project.

## Principles

1. **Never commit secrets to git** - Use .gitignore and environment variables
2. **Separate secrets by environment** - Dev, staging, and prod have different credentials
3. **Use AWS Secrets Manager** - For database passwords, API keys, and credentials
4. **Use GitHub Secrets** - For CI/CD pipeline credentials
5. **Rotate regularly** - Change credentials periodically for security

---

## AWS Secrets Manager

### Secrets Structure

```
/outreachpass/dev/database      - Dev database connection string
/outreachpass/dev/google-wallet - Google Wallet API credentials (dev)
/outreachpass/dev/ses-smtp      - SES SMTP credentials

/outreachpass/prod/database      - Production database connection
/outreachpass/prod/google-wallet - Google Wallet API credentials (prod)
/outreachpass/prod/ses-smtp      - SES SMTP credentials
```

### Creating Secrets

```bash
# Database credentials
aws secretsmanager create-secret \
  --name /outreachpass/prod/database \
  --secret-string '{
    "host": "outreachpass-db.xxxx.us-east-1.rds.amazonaws.com",
    "port": 5432,
    "database": "outreachpass_prod",
    "username": "postgres",
    "password": "STRONG_PASSWORD_HERE"
  }' \
  --region us-east-1

# Google Wallet credentials
aws secretsmanager create-secret \
  --name /outreachpass/prod/google-wallet \
  --secret-string file://backend/google-wallet-credentials.json \
  --region us-east-1

# SES SMTP credentials
aws secretsmanager create-secret \
  --name /outreachpass/prod/ses-smtp \
  --secret-string '{
    "smtp_host": "email-smtp.us-east-1.amazonaws.com",
    "smtp_port": 587,
    "smtp_username": "AKIAXXXXXXXXXXXXXXXX",
    "smtp_password": "SMTP_PASSWORD_HERE"
  }' \
  --region us-east-1
```

### Retrieving Secrets in Code

**Python (FastAPI/Lambda)**:
```python
import boto3
import json

def get_secret(secret_name: str) -> dict:
    """Retrieve secret from AWS Secrets Manager."""
    client = boto3.client('secretsmanager', region_name='us-east-1')
    response = client.get_secret_value(SecretId=secret_name)
    return json.loads(response['SecretString'])

# Usage
db_creds = get_secret('/outreachpass/prod/database')
DATABASE_URL = f"postgresql://{db_creds['username']}:{db_creds['password']}@{db_creds['host']}/{db_creds['database']}"
```

**Terraform**:
```hcl
data "aws_secretsmanager_secret_version" "db_password" {
  secret_id = "/outreachpass/${var.environment}/database"
}

locals {
  db_creds = jsondecode(data.aws_secretsmanager_secret_version.db_password.secret_string)
}

resource "aws_db_instance" "main" {
  # ...
  password = local.db_creds.password
}
```

---

## GitHub Secrets

### Required Secrets for CI/CD

Navigate to: **GitHub Repository → Settings → Secrets and variables → Actions**

#### AWS Access

- `AWS_ACCESS_KEY_ID` - AWS IAM user access key for deployments
- `AWS_SECRET_ACCESS_KEY` - AWS IAM user secret key
- `AWS_REGION` - Default: `us-east-1`
- `AWS_ACCOUNT_ID` - Your AWS account ID

**Creating IAM User**:
```bash
# Create deployment user
aws iam create-user --user-name github-actions-outreachpass

# Attach policies
aws iam attach-user-policy \
  --user-name github-actions-outreachpass \
  --policy-arn arn:aws:iam::aws:policy/AWSLambda_FullAccess

aws iam attach-user-policy \
  --user-name github-actions-outreachpass \
  --policy-arn arn:aws:iam::aws:policy/AmazonS3FullAccess

# Create access key
aws iam create-access-key --user-name github-actions-outreachpass
```

#### Terraform

- `TERRAFORM_STATE_BUCKET` - S3 bucket name: `outreachpass-terraform-state`
- `TERRAFORM_LOCK_TABLE` - DynamoDB table: `terraform-state-locks`

#### Build Artifacts

- `ARTIFACT_BUCKET_NAME` - S3 bucket for build artifacts: `outreachpass-artifacts`

#### Notifications (Optional)

- `SLACK_WEBHOOK_URL` - Slack webhook for deployment notifications
- `DEPLOYMENT_EMAIL` - Email for deployment alerts

### Environment-Specific Secrets

Use **GitHub Environments** for environment-specific secrets:

1. Go to: **Settings → Environments**
2. Create environments: `dev`, `prod`
3. Add secrets specific to each environment
4. Configure protection rules (e.g., require approval for prod)

---

## Local Development

### .env File Structure

**Never commit .env files!** Use `.env.example` as template.

**backend/.env.example**:
```bash
# Database
DATABASE_URL=postgresql://user:pass@localhost:5432/outreachpass_dev

# AWS (for local testing with LocalStack)
AWS_ACCESS_KEY_ID=test
AWS_SECRET_ACCESS_KEY=test
AWS_DEFAULT_REGION=us-east-1
AWS_ENDPOINT_URL=http://localhost:4566

# Application
DEBUG=true
LOG_LEVEL=DEBUG
SECRET_KEY=local-dev-secret-change-in-prod

# Google Wallet (use dev credentials)
GOOGLE_WALLET_CREDENTIALS_PATH=./backend/google-wallet-credentials-dev.json
GOOGLE_ISSUER_ID=your-dev-issuer-id

# Email (use Mailtrap or similar for dev)
SMTP_HOST=smtp.mailtrap.io
SMTP_PORT=2525
SMTP_USERNAME=your-mailtrap-username
SMTP_PASSWORD=your-mailtrap-password
```

### Loading Secrets Locally

**Option 1: python-dotenv** (current approach):
```python
from dotenv import load_dotenv
load_dotenv()  # Loads .env file

# Then access via os.environ
DATABASE_URL = os.getenv('DATABASE_URL')
```

**Option 2: AWS Secrets Manager** (production-like):
```bash
# Fetch secrets and create .env
python scripts/fetch-secrets.py --environment dev --output .env
```

---

## CI/CD Pipeline Secret Usage

### GitHub Actions Workflow Example

```yaml
name: Deploy Backend

on:
  push:
    branches: [main]

jobs:
  deploy:
    runs-on: ubuntu-latest
    environment: production  # Uses prod-specific secrets

    steps:
      - uses: actions/checkout@v4

      - name: Configure AWS Credentials
        uses: aws-actions/configure-aws-credentials@v4
        with:
          aws-access-key-id: ${{ secrets.AWS_ACCESS_KEY_ID }}
          aws-secret-access-key: ${{ secrets.AWS_SECRET_ACCESS_KEY }}
          aws-region: ${{ secrets.AWS_REGION }}

      - name: Get Database Credentials
        run: |
          DB_SECRET=$(aws secretsmanager get-secret-value \
            --secret-id /outreachpass/prod/database \
            --query SecretString \
            --output text)
          echo "DATABASE_URL=$(echo $DB_SECRET | jq -r '.connection_string')" >> $GITHUB_ENV

      - name: Deploy Lambda
        env:
          DATABASE_URL: ${{ env.DATABASE_URL }}
        run: |
          ./scripts/deploy-lambda.sh
```

---

## Security Best Practices

### 1. Principle of Least Privilege

Each service/user should have only the permissions it needs:

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Action": [
        "secretsmanager:GetSecretValue"
      ],
      "Resource": "arn:aws:secretsmanager:us-east-1:ACCOUNT_ID:secret:/outreachpass/prod/*"
    }
  ]
}
```

### 2. Secret Rotation

**Automated Rotation** (for database passwords):
```bash
aws secretsmanager rotate-secret \
  --secret-id /outreachpass/prod/database \
  --rotation-lambda-arn arn:aws:lambda:us-east-1:ACCOUNT_ID:function:SecretsManagerRotation \
  --rotation-rules AutomaticallyAfterDays=30
```

**Manual Rotation Checklist**:
1. Generate new credential
2. Update AWS Secrets Manager
3. Update GitHub Secrets (if applicable)
4. Trigger deployment to pick up new secret
5. Verify services are working
6. Revoke old credential

### 3. Audit Secret Access

```bash
# CloudTrail query for secret access
aws cloudtrail lookup-events \
  --lookup-attributes AttributeKey=EventName,AttributeValue=GetSecretValue \
  --max-items 50
```

### 4. Encryption at Rest

All secrets in AWS Secrets Manager are encrypted with KMS:

```bash
# Use custom KMS key
aws secretsmanager create-secret \
  --name /outreachpass/prod/database \
  --secret-string "..." \
  --kms-key-id alias/outreachpass-secrets
```

---

## Secrets Checklist

### Development Environment

- [ ] `.env` file created from `.env.example`
- [ ] `.env` added to `.gitignore`
- [ ] Dev credentials stored in AWS Secrets Manager
- [ ] Local database accessible
- [ ] Google Wallet dev credentials configured

### CI/CD Setup

- [ ] GitHub Secrets configured
  - [ ] AWS_ACCESS_KEY_ID
  - [ ] AWS_SECRET_ACCESS_KEY
  - [ ] AWS_REGION
  - [ ] ARTIFACT_BUCKET_NAME
- [ ] GitHub Environments created (dev, prod)
- [ ] IAM user created with minimal permissions
- [ ] Terraform backend bucket accessible

### Production Environment

- [ ] All secrets stored in AWS Secrets Manager
- [ ] No hardcoded credentials in code
- [ ] Database password rotated
- [ ] API keys have proper restrictions
- [ ] Secrets encrypted with KMS
- [ ] Access logging enabled

---

## Troubleshooting

### "AccessDeniedException" when accessing secrets

```bash
# Check IAM permissions
aws sts get-caller-identity

# Verify secret exists
aws secretsmanager list-secrets --query 'SecretList[?contains(Name, `outreachpass`)]'

# Check IAM policy
aws iam get-user-policy --user-name github-actions-outreachpass --policy-name SecretsManagerAccess
```

### GitHub Actions can't access AWS

1. Verify AWS credentials are set in GitHub Secrets
2. Check IAM user has necessary permissions
3. Verify AWS region matches secret location
4. Check if MFA is required (shouldn't be for service accounts)

### Secrets not updating in Lambda

```bash
# Lambda caches environment variables
# Force update:
aws lambda update-function-configuration \
  --function-name outreachpass-api \
  --environment Variables={FORCE_UPDATE=true}

# Then remove the variable
aws lambda update-function-configuration \
  --function-name outreachpass-api \
  --environment Variables={}
```

---

## Migration from .env to Secrets Manager

### Step 1: Audit Current Secrets

```bash
# List all secrets in .env
grep -E '^[A-Z_]+=' backend/.env

# Check what's in codebase (DANGEROUS - review carefully)
git grep -i 'password\|secret\|key' | grep -v .gitignore
```

### Step 2: Move to AWS Secrets Manager

```bash
# For each secret:
aws secretsmanager create-secret \
  --name /outreachpass/prod/SECRET_NAME \
  --secret-string "SECRET_VALUE"
```

### Step 3: Update Code

Replace:
```python
import os
SECRET = os.getenv('SECRET_NAME')
```

With:
```python
from app.core.secrets import get_secret
SECRET = get_secret('/outreachpass/prod/SECRET_NAME')
```

### Step 4: Remove from .env

```bash
# Comment out in .env.example
# Update .gitignore to ensure .env never committed
echo ".env" >> .gitignore
```

---

## Cost Estimate

- **AWS Secrets Manager**: $0.40/secret/month + $0.05 per 10,000 API calls
- **Typical usage**: 5 secrets × $0.40 = $2/month
- **API calls**: ~100,000/month = $0.50/month
- **Total**: ~$2.50/month

---

## Resources

- [AWS Secrets Manager Documentation](https://docs.aws.amazon.com/secretsmanager/)
- [GitHub Encrypted Secrets](https://docs.github.com/en/actions/security-guides/encrypted-secrets)
- [OWASP Secrets Management Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/Secrets_Management_Cheat_Sheet.html)
- [12-Factor App Config](https://12factor.net/config)
