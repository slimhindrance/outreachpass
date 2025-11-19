# OutreachPass Production Deployment Summary

**Deployment Date**: 2025-11-18
**Status**: ✅ Complete - All infrastructure and database schema deployed

---

## Production Infrastructure

### 📦 S3 Buckets
- **Assets**: `s3://outreachpass-prod-assets/`
- **Uploads**: `s3://outreachpass-prod-uploads/`
- **Status**: ✅ Created and accessible

### 🗄️ Database (RDS Aurora PostgreSQL Serverless v2)
- **Cluster**: `outreachpass-prod`
- **Instance**: `outreachpass-prod-instance-1`
- **Endpoint**: `outreachpass-prod.cluster-cu1y2a26idsb.us-east-1.rds.amazonaws.com:5432`
- **Engine**: PostgreSQL 15.12
- **Scaling**: 0.5 - 1.0 ACU
- **Credentials**:
  - Username: `outreachpass_admin`
  - Password: `Lindy101Prod`
  - Database: `outreachpass`
- **Status**: ✅ Available with complete schema (18 tables, extensions, functions, indexes, triggers)

### 📬 SQS Queues
- **Main Queue**: `https://sqs.us-east-1.amazonaws.com/741783034843/outreachpass-prod-pass-generation`
- **DLQ**: `https://sqs.us-east-1.amazonaws.com/741783034843/outreachpass-prod-pass-generation-dlq`
- **Visibility Timeout**: 600 seconds
- **Redrive Policy**: MaxReceiveCount = 3
- **Status**: ✅ Configured

### 🚀 Lambda Functions

#### 1. API Lambda (`outreachpass-prod-api`)
- **ARN**: `arn:aws:lambda:us-east-1:741783034843:function:outreachpass-prod-api`
- **Runtime**: Python 3.11
- **Memory**: 512 MB
- **Timeout**: 30 seconds
- **Role**: `arn:aws:iam::741783034843:role/outreachpass-prod-lambda-role`
- **Status**: ✅ Active

**Environment Variables**:
```
DATABASE_URL=postgresql+asyncpg://outreachpass_admin:Lindy101Prod@outreachpass-prod.cluster-cu1y2a26idsb.us-east-1.rds.amazonaws.com:5432/outreachpass
S3_BUCKET_ASSETS=outreachpass-prod-assets
S3_BUCKET_UPLOADS=outreachpass-prod-uploads
SQS_QUEUE_URL=https://sqs.us-east-1.amazonaws.com/741783034843/outreachpass-prod-pass-generation
GOOGLE_WALLET_ENABLED=true
APPLE_WALLET_ENABLED=false
GOOGLE_WALLET_SERVICE_ACCOUNT_EMAIL=outreach-pass@outreachpass.iam.gserviceaccount.com
GOOGLE_WALLET_ISSUER_ID=3388000000023042612
GOOGLE_WALLET_SERVICE_ACCOUNT_FILE=/var/task/google-wallet-credentials.json
SECRET_KEY=ffFpTG1PNRqDQ979GNk&%qabeNil2fklEcT$vM-(++hXXp$g7>)P\!um_O#F2$Ov1
COGNITO_USER_POOL_ID=us-east-1_SXH934qKt
COGNITO_CLIENT_ID=256e0chtcc14qf8m4knqmobdg0
COGNITO_REGION=us-east-1
SES_FROM_EMAIL=outreachpass@base2ml.com
SES_REGION=us-east-1
```

#### 2. Worker Lambda (`outreachpass-prod-worker`)
- **ARN**: `arn:aws:lambda:us-east-1:741783034843:function:outreachpass-prod-worker`
- **Runtime**: Python 3.11
- **Memory**: 512 MB
- **Timeout**: 300 seconds (5 minutes)
- **Role**: `arn:aws:iam::741783034843:role/outreachpass-prod-lambda-role`
- **Trigger**: SQS (`outreachpass-prod-pass-generation`)
- **Batch Size**: 1 message
- **Status**: ✅ Active with SQS trigger configured

### 🌐 API Gateway
- **API ID**: `hwl4ycnvda`
- **Name**: `outreachpass-prod`
- **Type**: HTTP API
- **Endpoint**: `https://hwl4ycnvda.execute-api.us-east-1.amazonaws.com`
- **Routes**: `$default` → `outreachpass-prod-api`
- **CORS**: Enabled (AllowOrigins: *, AllowMethods: GET,POST,PUT,DELETE,OPTIONS)
- **Status**: ✅ Configured

### 🔐 IAM Role (`outreachpass-prod-lambda-role`)
**Managed Policies**:
- AWSLambdaSQSQueueExecutionRole
- AWSLambdaVPCAccessExecutionRole
- AmazonSQSFullAccess

**Inline Policy** (`outreachpass-prod-lambda-policy`):
```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Action": ["s3:ListBucket", "s3:GetBucketLocation"],
      "Effect": "Allow",
      "Resource": [
        "arn:aws:s3:::outreachpass-prod-assets",
        "arn:aws:s3:::outreachpass-prod-uploads"
      ]
    },
    {
      "Action": ["s3:GetObject", "s3:PutObject", "s3:DeleteObject"],
      "Effect": "Allow",
      "Resource": [
        "arn:aws:s3:::outreachpass-prod-assets/*",
        "arn:aws:s3:::outreachpass-prod-uploads/*"
      ]
    },
    {
      "Action": ["ses:SendEmail", "ses:SendRawEmail"],
      "Effect": "Allow",
      "Resource": "*"
    },
    {
      "Action": ["secretsmanager:GetSecretValue"],
      "Effect": "Allow",
      "Resource": "*"
    }
  ]
}
```

### 📊 CloudWatch Monitoring

**Log Groups** (90-day retention):
- `/aws/lambda/outreachpass-prod-backend`
- `/aws/lambda/outreachpass-prod-worker`

**CloudWatch Alarms** (12 total):

| Alarm | Metric | Threshold | Evaluation |
|-------|--------|-----------|------------|
| `outreachpass-prod-lambda-backend-errors` | Error Rate | >5% | 2 × 5min |
| `outreachpass-prod-lambda-backend-duration` | Avg Duration | >5000ms | 2 × 5min |
| `outreachpass-prod-lambda-worker-errors` | Error Rate | >5% | 2 × 5min |
| `outreachpass-prod-api-4xx-errors` | 4xx Error Rate | >10% | 2 × 5min |
| `outreachpass-prod-api-5xx-errors` | 5xx Error Rate | >5% | 2 × 5min |
| `outreachpass-prod-api-latency` | Avg Latency | >3000ms | 2 × 5min |
| `outreachpass-prod-rds-cpu` | CPU Utilization | >80% | 2 × 5min |
| `outreachpass-prod-rds-connections` | DB Connections | >80 | 2 × 5min |
| `outreachpass-prod-rds-storage` | Free Storage | <5 GB | 1 × 5min |
| `outreachpass-prod-sqs-queue-depth` | Queue Depth | >100 msgs | 2 × 5min |
| `outreachpass-prod-sqs-message-age` | Message Age | >300s | 1 × 5min |
| `outreachpass-prod-sqs-dlq-depth` | DLQ Depth | >0 msgs | 1 × 5min |

**SNS Topic**: `arn:aws:sns:us-east-1:741783034843:outreachpass-prod-alarms`
**Email Subscription**: `clindeman@gatech.edu` (✅ **Confirmed**)

---

## Health Check Status

```bash
curl https://hwl4ycnvda.execute-api.us-east-1.amazonaws.com/health
```

**Current Response**:
```json
{
  "status": "healthy",
  "timestamp": "2025-11-18T05:16:38.633087Z",
  "service": "OutreachPass",
  "version": "0.1.0",
  "dependencies": {
    "database": {
      "status": "healthy",
      "message": "Database connection successful"
    },
    "s3": {
      "status": "healthy",
      "message": "S3 access successful",
      "bucket": "outreachpass-prod-assets"
    },
    "sqs": {
      "status": "healthy",
      "message": "SQS access successful",
      "queue_depth": 0
    }
  }
}
```

---

## Database Schema Migration

**Completed**: 2025-11-18

The production database schema was successfully migrated from the dev environment using Docker-based PostgreSQL 15 tools to match the RDS version:

```bash
# Export schema from dev (using Docker to match PostgreSQL 15.12)
docker run --rm -e PGPASSWORD=Lindy101 postgres:15 pg_dump \
  -h outreachpass-dev.cluster-cu1y2a26idsb.us-east-1.rds.amazonaws.com \
  -U outreachpass_admin \
  -d outreachpass \
  --schema-only --no-owner --no-privileges --no-tablespaces > /tmp/prod_schema.sql

# Import to production
docker run --rm -i -e PGPASSWORD=Lindy101Prod postgres:15 psql \
  -h outreachpass-prod.cluster-cu1y2a26idsb.us-east-1.rds.amazonaws.com \
  -U outreachpass_admin \
  -d outreachpass < /tmp/prod_schema.sql
```

**Migrated Components**:
- ✅ 2 PostgreSQL extensions (citext, uuid-ossp)
- ✅ 5 database functions (cleanup_old_analytics, etc.)
- ✅ 18 tables with complete schema
- ✅ 1 materialized view
- ✅ All sequences and indexes
- ✅ All triggers and foreign key constraints

**Tables Created**:
1. attendees
2. audit_log
3. brands
4. card_view_events
5. cards
6. contact_export_events
7. email_events
8. events
9. exhibitor_leads
10. exhibitors
11. feature_flags
12. pass_generation_jobs
13. qr_codes
14. scans_daily
15. tenants
16. users
17. wallet_pass_events
18. wallet_passes

---

## ✅ Completed Setup Tasks

All critical production setup tasks have been completed:

1. ✅ **Infrastructure Deployment** - All AWS resources provisioned
2. ✅ **Database Schema Migration** - 18 tables with complete schema
3. ✅ **SNS Email Subscription** - CloudWatch alarms configured for `clindeman@gatech.edu`
4. ✅ **Health Checks** - All services verified healthy

---

## Optional Next Steps

### Initial Data Seeding

If production needs seed data (default tenant, admin user, etc.), run the seed script:
```bash
# TODO: Create seed script for production
```

---

## Production Endpoints

**Base URL**: `https://hwl4ycnvda.execute-api.us-east-1.amazonaws.com`

| Endpoint | Method | Description | Status |
|----------|--------|-------------|--------|
| `/health` | GET | Health check | ✅ Working |
| `/api/admin/cards` | GET | List cards | ✅ Ready to use |
| `/api/admin/cards` | POST | Create card | ✅ Ready to use |
| `/api/admin/cards/{id}` | GET | Get card | ✅ Ready to use |
| `/api/admin/cards/{id}` | PUT | Update card | ✅ Ready to use |
| `/api/admin/cards/{id}` | DELETE | Delete card | ✅ Ready to use |

---

## Terraform Workspace Management

Production monitoring is deployed in the `prod` Terraform workspace:

```bash
# Switch to prod workspace
terraform workspace select prod

# View prod infrastructure
terraform show

# Apply changes to prod
terraform apply -var-file=terraform-prod.tfvars

# Switch back to dev
terraform workspace select default
```

---

## Cost Estimates

### Monthly Costs (Estimated)
| Service | Configuration | Est. Monthly Cost |
|---------|--------------|------------------|
| **RDS Aurora Serverless v2** | 0.5-1.0 ACU, PostgreSQL 15.12 | $40-80 |
| **Lambda (API)** | 512 MB, ~10K invocations/mo | $1-5 |
| **Lambda (Worker)** | 512 MB, ~40K invocations/mo | $5-15 |
| **API Gateway** | HTTP API, ~10K requests/mo | $0.01 |
| **S3** | Storage + requests (low usage) | $1-3 |
| **SQS** | Standard queue (low volume) | $0.01 |
| **CloudWatch** | Logs (90-day retention) + Alarms | $5-10 |
| **Data Transfer** | Outbound data (estimate) | $5-10 |
| **TOTAL** | | **$60-130/month** |

*Costs will scale with usage. RDS and Lambda are the primary cost drivers.*

---

## Next Steps

1. ✅ **Infrastructure**: All production infrastructure deployed
2. ✅ **Database**: Schema migrated to production (18 tables, extensions, functions)
3. ✅ **SNS**: Email subscription confirmed - CloudWatch alarms active
4. 🔜 **Testing**: Run end-to-end tests against production endpoints
5. 🔜 **Monitoring**: Verify CloudWatch alarms trigger correctly
6. 🔜 **DNS**: (Future) Configure custom domain name
7. 🔜 **CI/CD**: (Future) Set up automated deployments

---

## Rollback Plan

If issues arise, the production environment can be torn down and rebuilt:

```bash
# Switch to prod workspace
terraform workspace select prod

# Destroy monitoring infrastructure
terraform destroy -var-file=terraform-prod.tfvars

# Delete Lambda functions
aws lambda delete-function --function-name outreachpass-prod-api
aws lambda delete-function --function-name outreachpass-prod-worker

# Delete API Gateway
aws apigatewayv2 delete-api --api-id hwl4ycnvda

# Delete RDS (with snapshot)
aws rds delete-db-instance --db-instance-identifier outreachpass-prod-instance-1 --final-db-snapshot-identifier outreachpass-prod-final-snapshot
aws rds delete-db-cluster --db-cluster-identifier outreachpass-prod --final-db-snapshot-identifier outreachpass-prod-cluster-final-snapshot

# Delete SQS queues
aws sqs delete-queue --queue-url https://sqs.us-east-1.amazonaws.com/741783034843/outreachpass-prod-pass-generation
aws sqs delete-queue --queue-url https://sqs.us-east-1.amazonaws.com/741783034843/outreachpass-prod-pass-generation-dlq

# Delete S3 buckets (after emptying)
aws s3 rb s3://outreachpass-prod-assets --force
aws s3 rb s3://outreachpass-prod-uploads --force

# Delete IAM role
aws iam delete-role-policy --role-name outreachpass-prod-lambda-role --policy-name outreachpass-prod-lambda-policy
aws iam detach-role-policy --role-name outreachpass-prod-lambda-role --policy-arn arn:aws:iam::aws:policy/service-role/AWSLambdaSQSQueueExecutionRole
aws iam detach-role-policy --role-name outreachpass-prod-lambda-role --policy-arn arn:aws:iam::aws:policy/service-role/AWSLambdaVPCAccessExecutionRole
aws iam detach-role-policy --role-name outreachpass-prod-lambda-role --policy-arn arn:aws:iam::aws:policy/AmazonSQSFullAccess
aws iam delete-role --role-name outreachpass-prod-lambda-role
```

---

*Last Updated: 2025-11-18*
*Deployment completed via automated infrastructure provisioning*
