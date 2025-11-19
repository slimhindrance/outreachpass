# OutreachPass AWS Architecture

**Version:** 2.0.0
**Last Updated:** 2025-11-18
**AWS Region:** us-east-1 (N. Virginia)
**Status:** Production

---

## Table of Contents

1. [AWS Architecture Overview](#aws-architecture-overview)
2. [Network Architecture](#network-architecture)
3. [Compute Architecture](#compute-architecture)
4. [Database Architecture](#database-architecture)
5. [Storage Architecture](#storage-architecture)
6. [Application Services](#application-services)
7. [Monitoring & Observability](#monitoring--observability)
8. [Security & Compliance](#security--compliance)
9. [Cost Optimization](#cost-optimization)
10. [Deployment Guide](#deployment-guide)

---

## AWS Architecture Overview

### High-Level AWS Infrastructure Diagram

```
┌─────────────────────────────────────────────────────────────────────┐
│                           AWS Cloud (us-east-1)                      │
├─────────────────────────────────────────────────────────────────────┤
│                                                                       │
│  ┌───────────────────────────────────────────────────────────────┐  │
│  │                        Route 53 DNS                            │  │
│  │  • outreachpass.base2ml.com → API Gateway                     │  │
│  │  • app.outreachpass.base2ml.com → CloudFront                  │  │
│  └────────────┬──────────────────────────────┬───────────────────┘  │
│               │                              │                       │
│  ┌────────────▼─────────┐      ┌─────────────▼──────────┐          │
│  │   CloudFront CDN     │      │   API Gateway          │          │
│  │  (Frontend Assets)   │      │   (HTTP API v2)        │          │
│  └────────────┬─────────┘      └─────────────┬──────────┘          │
│               │                              │                       │
│  ┌────────────▼─────────┐      ┌─────────────▼──────────────────┐  │
│  │    S3 Bucket         │      │       Lambda Functions         │  │
│  │  (Static Website)    │      │  ┌──────────────────────────┐  │  │
│  └──────────────────────┘      │  │ Backend API              │  │  │
│                                 │  │ • Event Management       │  │  │
│  ┌───────────────────────────┐ │  │ • Card Generation        │  │  │
│  │    S3 Buckets             │ │  │ • Analytics API          │  │  │
│  │  • Assets (QR, Logos)     │◄┼──┤ Runtime: Python 3.11     │  │  │
│  │  • Uploads (CSV)          │ │  │ Memory: 512MB-1GB        │  │  │
│  └───────────────────────────┘ │  └──────────┬───────────────┘  │  │
│                                 │             │                   │  │
│  ┌───────────────────────────┐ │  ┌──────────▼───────────────┐  │  │
│  │    SQS Queue              │ │  │ Worker Lambda            │  │  │
│  │  • Pass Generation        │◄┼──┤ • Async Processing       │  │  │
│  │  • Email Jobs             │ │  │ • Wallet Pass Gen        │  │  │
│  │  • DLQ for Failures       │ │  │ • Bulk Operations        │  │  │
│  └───────────────────────────┘ │  └──────────────────────────┘  │  │
│                                 └──────────────┬──────────────────┘  │
│                                                │                     │
│  ┌────────────────────────────────────────────▼───────────────────┐ │
│  │                   VPC (Default VPC)                             │ │
│  │  ┌──────────────────────────────────────────────────────────┐  │ │
│  │  │            Private Subnets (Multi-AZ)                     │  │ │
│  │  │                                                            │  │ │
│  │  │  ┌──────────────────────────────────────────┐            │  │ │
│  │  │  │  RDS Aurora PostgreSQL Serverless v2     │            │  │ │
│  │  │  │  ┌────────────┐       ┌────────────┐    │            │  │ │
│  │  │  │  │ Primary    │◄─────►│  Replica   │    │            │  │ │
│  │  │  │  │   (AZ-a)   │       │   (AZ-b)   │    │            │  │ │
│  │  │  │  └────────────┘       └────────────┘    │            │  │ │
│  │  │  │  • Engine: PostgreSQL 15                │            │  │ │
│  │  │  │  • ACUs: 0.5 - 16 (auto-scaling)       │            │  │ │
│  │  │  │  • Storage: Auto-scaling (10GB start)   │            │  │ │
│  │  │  │  • Backup: Daily snapshots (7 days)     │            │  │ │
│  │  │  └──────────────────────────────────────────┘            │  │ │
│  │  └──────────────────────────────────────────────────────────┘  │ │
│  └─────────────────────────────────────────────────────────────────┘ │
│                                                                       │
│  ┌─────────────────────────────────────────────────────────────────┐ │
│  │                    Cognito User Pool                             │ │
│  │  • User authentication (email/password)                         │ │
│  │  • JWT token issuance                                           │ │
│  │  • MFA support (optional)                                       │ │
│  └─────────────────────────────────────────────────────────────────┘ │
│                                                                       │
│  ┌─────────────────────────────────────────────────────────────────┐ │
│  │                    SES (Email Service)                           │ │
│  │  • Transactional emails                                         │ │
│  │  • Pass delivery                                                │ │
│  │  • Event notifications                                          │ │
│  └─────────────────────────────────────────────────────────────────┘ │
│                                                                       │
│  ┌─────────────────────────────────────────────────────────────────┐ │
│  │               CloudWatch (Monitoring & Logging)                  │ │
│  │  • Lambda execution logs                                        │ │
│  │  • API Gateway access logs                                      │ │
│  │  • RDS performance metrics                                      │ │
│  │  • Custom application metrics                                   │ │
│  │  • Alarms and SNS notifications                                 │ │
│  └─────────────────────────────────────────────────────────────────┘ │
│                                                                       │
└───────────────────────────────────────────────────────────────────────┘
```

### AWS Service Summary

| Service | Purpose | Configuration | Cost Category |
|---------|---------|---------------|---------------|
| **Route 53** | DNS management | Hosted zone, A records | Low |
| **CloudFront** | CDN for frontend | Single distribution | Low-Medium |
| **S3** | Object storage | 3 buckets (frontend, assets, uploads) | Low |
| **API Gateway** | HTTP API endpoint | Regional HTTP API v2 | Low (pay-per-request) |
| **Lambda** | Serverless compute | 2 functions (backend, worker) | Medium |
| **RDS Aurora** | PostgreSQL database | Serverless v2, Multi-AZ | High |
| **SQS** | Message queue | Standard queue + DLQ | Low |
| **Cognito** | Authentication | User pool + app client | Low |
| **SES** | Email delivery | Verified domain | Low |
| **CloudWatch** | Monitoring | Logs, metrics, alarms | Medium |
| **Secrets Manager** | Secrets storage | Database credentials, API keys | Low |

### Infrastructure as Code

**Terraform Modules**:
```
terraform/
├── main.tf                    # Root module orchestration
├── variables.tf               # Input variables
├── outputs.tf                 # Output values
├── backend.tf                 # State management
├── modules/
│   ├── vpc/                  # Network infrastructure
│   ├── database/             # RDS Aurora cluster
│   ├── storage/              # S3 buckets
│   ├── lambda/               # Lambda functions
│   ├── api_gateway/          # API Gateway
│   ├── cognito/              # User authentication
│   ├── custom_domain/        # Route 53 + ACM
│   └── frontend/             # CloudFront + S3
└── environments/
    ├── dev/                  # Development environment
    └── prod/                 # Production environment
```

---

## Network Architecture

### VPC Configuration

**Default VPC Strategy** (Current):
- VPC ID: `vpc-default`
- CIDR: `172.31.0.0/16`
- Availability Zones: `us-east-1a`, `us-east-1b`, `us-east-1c`
- Subnets: Public subnets in each AZ

**Benefits**:
- Quick deployment
- No VPC management overhead
- AWS-managed networking

**Future Migration to Custom VPC**:
```
Custom VPC (10.0.0.0/16)
├── Public Subnets (10.0.1.0/24, 10.0.2.0/24, 10.0.3.0/24)
│   └── NAT Gateways, ALB (if needed)
└── Private Subnets (10.0.11.0/24, 10.0.12.0/24, 10.0.13.0/24)
    └── Lambda (VPC mode), RDS Aurora
```

### Security Groups

**Lambda Security Group**:
```hcl
resource "aws_security_group" "lambda" {
  name        = "outreachpass-lambda-sg"
  description = "Security group for Lambda functions"
  vpc_id      = var.vpc_id

  # Outbound: All traffic (for API calls, database, S3)
  egress {
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks = ["0.0.0.0/0"]
  }
}
```

**RDS Security Group**:
```hcl
resource "aws_security_group" "rds" {
  name        = "outreachpass-rds-sg"
  description = "Security group for RDS Aurora"
  vpc_id      = var.vpc_id

  # Inbound: PostgreSQL from Lambda only
  ingress {
    from_port       = 5432
    to_port         = 5432
    protocol        = "tcp"
    security_groups = [aws_security_group.lambda.id]
  }

  egress {
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks = ["0.0.0.0/0"]
  }
}
```

### DNS & Domain Configuration

**Route 53 Hosted Zone**:
```
Domain: base2ml.com
Hosted Zone ID: Z09099671VTWA1L2CL021

DNS Records:
├── outreachpass.base2ml.com (A, ALIAS) → API Gateway
├── app.outreachpass.base2ml.com (A, ALIAS) → CloudFront
├── govsafe.base2ml.com (A, ALIAS) → API Gateway
└── campuscard.base2ml.com (A, ALIAS) → API Gateway
```

**SSL/TLS Certificates** (ACM):
- API Gateway: `arn:aws:acm:us-east-1:741783034843:certificate/bb1cbe9e-d6ed-4b4c-8f7c-fa8f687b10c0`
- CloudFront: `arn:aws:acm:us-east-1:741783034843:certificate/7a8eb69e-1ba6-4220-bcca-2b79d11200e0`

---

## Compute Architecture

### Lambda Functions

#### 1. Backend API Lambda

**Function Name**: `outreachpass-dev-backend`

**Configuration**:
```yaml
Runtime: Python 3.11
Memory: 512 MB - 1 GB (configurable)
Timeout: 30 seconds
Concurrency: 1000 (reserved, adjustable)
Ephemeral Storage: 512 MB
Architecture: x86_64
```

**Environment Variables**:
```bash
DATABASE_URL=postgresql+asyncpg://user:pass@host:5432/db
AWS_REGION=us-east-1
S3_BUCKET_ASSETS=outreachpass-dev-assets
S3_BUCKET_UPLOADS=outreachpass-dev-uploads
SQS_QUEUE_URL=https://sqs.us-east-1.amazonaws.com/.../outreachpass-queue
COGNITO_USER_POOL_ID=us-east-1_xxxxx
COGNITO_CLIENT_ID=xxxxx
SES_FROM_EMAIL=noreply@outreachpass.base2ml.com
SECRET_KEY=<from_secrets_manager>
GOOGLE_WALLET_ISSUER_ID=<from_secrets_manager>
GOOGLE_WALLET_SERVICE_ACCOUNT_FILE=/tmp/google-wallet-key.json
```

**IAM Role Permissions**:
```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Action": [
        "logs:CreateLogGroup",
        "logs:CreateLogStream",
        "logs:PutLogEvents"
      ],
      "Resource": "arn:aws:logs:*:*:*"
    },
    {
      "Effect": "Allow",
      "Action": [
        "s3:GetObject",
        "s3:PutObject",
        "s3:DeleteObject"
      ],
      "Resource": [
        "arn:aws:s3:::outreachpass-dev-assets/*",
        "arn:aws:s3:::outreachpass-dev-uploads/*"
      ]
    },
    {
      "Effect": "Allow",
      "Action": [
        "sqs:SendMessage",
        "sqs:ReceiveMessage",
        "sqs:DeleteMessage"
      ],
      "Resource": "arn:aws:sqs:us-east-1:*:outreachpass-*"
    },
    {
      "Effect": "Allow",
      "Action": [
        "ses:SendEmail",
        "ses:SendRawEmail"
      ],
      "Resource": "*"
    },
    {
      "Effect": "Allow",
      "Action": [
        "secretsmanager:GetSecretValue"
      ],
      "Resource": "arn:aws:secretsmanager:us-east-1:*:secret:outreachpass/*"
    }
  ]
}
```

**VPC Configuration**:
```yaml
VPC: Default VPC
Subnets: Private subnets (Multi-AZ)
Security Groups: lambda-sg
```

**Deployment Package**:
```bash
# Build process
./scripts/build_lambda.sh

# Package contents
lambda-package.zip
├── app/                    # Application code
├── dependencies/           # Python packages
└── bootstrap              # Lambda runtime
```

#### 2. Worker Lambda

**Function Name**: `outreachpass-dev-worker`

**Purpose**: Asynchronous background processing
- Wallet pass generation
- Bulk email sends
- CSV import processing
- Image processing

**Configuration**:
```yaml
Runtime: Python 3.11
Memory: 1 GB
Timeout: 300 seconds (5 minutes)
Concurrency: 100
Event Source: SQS Queue
Batch Size: 1
```

**SQS Trigger**:
```yaml
Queue: outreachpass-dev-queue
Batch Size: 1 message
Maximum Concurrency: 10
Visibility Timeout: 360 seconds (6 minutes)
```

### Lambda Performance Optimization

**Cold Start Mitigation**:
1. **Minimal imports**: Import only what's needed
2. **Connection pooling**: Reuse database connections
3. **Provisioned concurrency**: For critical endpoints (optional, $$$)
4. **Code optimization**: Lazy loading of heavy modules

**Metrics**:
- **Cold Start**: 1-2 seconds
- **Warm Invocation**: 50-200ms
- **Database Query**: 10-50ms
- **S3 Upload**: 100-500ms (depends on file size)

---

## Database Architecture

### RDS Aurora PostgreSQL Serverless v2

**Cluster Identifier**: `outreachpass-dev`

**Configuration**:
```yaml
Engine: Aurora PostgreSQL
Version: 15.12 (compatible with PostgreSQL 15)
Mode: Serverless v2
Capacity: 0.5 - 16 ACUs (Aurora Capacity Units)
Multi-AZ: Yes (2 instances across AZs)
Encryption: AES-256 at rest
Backup: Automated daily snapshots
Retention: 7 days
```

**Endpoint**:
```
Writer: outreachpass-dev.cluster-cu1y2a26idsb.us-east-1.rds.amazonaws.com:5432
Reader: outreachpass-dev.cluster-ro-cu1y2a26idsb.us-east-1.rds.amazonaws.com:5432
```

**Database**: `outreachpass`
**Master User**: `outreachpass_admin`
**Password**: Stored in AWS Secrets Manager

### Auto-Scaling Configuration

**ACU (Aurora Capacity Units)**:
- **Minimum**: 0.5 ACU (~1 GB RAM)
- **Maximum**: 16 ACU (~32 GB RAM)
- **Auto-Pause**: Disabled (production)

**Scaling Triggers**:
- CPU utilization > 70% → Scale up
- Connection count > 80% of max → Scale up
- Low usage for 5 minutes → Scale down

### Backup & Recovery

**Automated Backups**:
```yaml
Backup Window: 03:00-04:00 UTC (nightly)
Retention: 7 days
Point-in-Time Recovery: Enabled (up to 7 days)
```

**Manual Snapshots**:
- Before major schema changes
- Before data migrations
- Weekly production backups (retained 30 days)

**Disaster Recovery**:
- **RTO (Recovery Time Objective)**: 4 hours
- **RPO (Recovery Point Objective)**: 1 hour
- **Multi-AZ Failover**: Automatic (30-120 seconds)

### Database Monitoring

**CloudWatch Metrics**:
- `CPUUtilization` → Alarm if > 80% for 10 min
- `DatabaseConnections` → Alarm if > 80 connections
- `FreeStorageSpace` → Alarm if < 5 GB
- `ReadLatency` / `WriteLatency` → Alarm if > 50ms p99

**Performance Insights**:
- Enabled with 7-day retention
- Query performance analysis
- Wait event analysis

---

## Storage Architecture

### S3 Buckets

#### 1. Assets Bucket

**Bucket Name**: `outreachpass-dev-assets`

**Purpose**: Public-readable static assets
- QR code images
- User avatars
- Brand logos
- Event images

**Configuration**:
```yaml
Region: us-east-1
Versioning: Enabled
Encryption: SSE-S3 (AES-256)
Public Access: Block public ACLs, allow GetObject via bucket policy
CORS: Enabled for frontend domain
Lifecycle: Delete old versions after 30 days
```

**Bucket Policy**:
```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Sid": "PublicReadGetObject",
      "Effect": "Allow",
      "Principal": "*",
      "Action": "s3:GetObject",
      "Resource": "arn:aws:s3:::outreachpass-dev-assets/*"
    }
  ]
}
```

**Directory Structure**:
```
s3://outreachpass-dev-assets/
├── qr/{tenant_id}/{card_id}.png
├── avatars/{tenant_id}/{user_id}.jpg
└── logos/{tenant_id}/{brand_id}.png
```

#### 2. Uploads Bucket

**Bucket Name**: `outreachpass-dev-uploads`

**Purpose**: Private user uploads
- CSV attendee imports
- Bulk data uploads
- Temporary processing files

**Configuration**:
```yaml
Region: us-east-1
Versioning: Disabled
Encryption: SSE-S3 (AES-256)
Public Access: Blocked
Lifecycle: Delete files after 7 days
```

**Directory Structure**:
```
s3://outreachpass-dev-uploads/
└── csv/{tenant_id}/{event_id}/attendees-{timestamp}.csv
```

#### 3. Frontend Bucket

**Bucket Name**: `outreachpass-frontend-dev`

**Purpose**: Static website hosting
- Next.js build output
- Static assets (JS, CSS, images)
- _next/ directory

**Configuration**:
```yaml
Region: us-east-1
Versioning: Enabled
Encryption: SSE-S3
Static Website Hosting: Enabled
Index Document: index.html
Error Document: 404.html
CloudFront Origin: Yes
```

### S3 Best Practices

**Performance**:
- Use S3 Transfer Acceleration for large uploads (optional)
- Multipart upload for files > 5 MB
- CloudFront caching for frequently accessed assets

**Security**:
- Enable MFA delete for versioned buckets
- Bucket policies follow least-privilege
- VPC endpoints for Lambda → S3 communication (future)

**Cost Optimization**:
- Lifecycle policies to delete old versions
- Intelligent-Tiering for infrequent access (future)
- Compress assets before upload

---

## Application Services

### API Gateway

**API Name**: `outreachpass-dev-api`
**Type**: HTTP API (v2)
**Protocol**: HTTPS only

**Configuration**:
```yaml
Endpoint Type: Regional
CORS: Enabled (frontend domains)
Authorization: None (JWT validation in Lambda)
Throttling: 10,000 requests/second (soft limit)
```

**Routes**:
```
ANY /{proxy+} → Backend Lambda
  ├── GET  /health → Health check
  ├── GET  /c/{card_id} → Public card view
  ├── POST /api/v1/admin/events → Create event
  ├── GET  /api/v1/admin/analytics/overview → Analytics
  └── ... (all other routes)
```

**Custom Domain**:
```
Domain: outreachpass.base2ml.com
Certificate: ACM certificate
Base Path Mapping: / → $default stage
```

**Logging**:
```yaml
Access Logs: Enabled
CloudWatch Log Group: /aws/apigateway/outreachpass-dev
Format: JSON
Retention: 30 days
```

### SQS Queue

**Queue Name**: `outreachpass-dev-pass-generation`

**Configuration**:
```yaml
Type: Standard Queue
Visibility Timeout: 360 seconds (6 minutes)
Message Retention: 4 days
Receive Wait Time: 0 seconds (short polling)
Maximum Message Size: 256 KB
Encryption: SSE-SQS (AWS-managed)
```

**Dead Letter Queue**:
```yaml
DLQ Name: outreachpass-dev-pass-generation-dlq
Max Receive Count: 3
Redrive Policy: After 3 failures → move to DLQ
```

**Use Cases**:
1. **Pass Generation**: Card → wallet pass creation
2. **Email Jobs**: Bulk email sending
3. **CSV Processing**: Bulk attendee imports

**Message Format**:
```json
{
  "job_id": "uuid",
  "job_type": "pass_generation",
  "attendee_id": "uuid",
  "tenant_id": "uuid",
  "event_id": "uuid",
  "metadata": {
    "brand_key": "OUTREACHPASS",
    "delivery_email": "user@example.com"
  }
}
```

### Cognito User Pool

**User Pool Name**: `outreachpass-dev-users`

**Configuration**:
```yaml
Sign-in Options: Email
MFA: Optional
Password Policy:
  - Minimum Length: 8 characters
  - Require Uppercase: Yes
  - Require Lowercase: Yes
  - Require Numbers: Yes
  - Require Symbols: Yes
```

**App Client**:
```yaml
Client Name: outreachpass-web-client
Authentication Flows:
  - USER_PASSWORD_AUTH
  - REFRESH_TOKEN_AUTH
Token Expiration:
  - Access Token: 60 minutes
  - ID Token: 60 minutes
  - Refresh Token: 30 days
```

**Custom Attributes**:
```yaml
custom:tenant_id: String (tenant UUID)
custom:role: String (admin, user, exhibitor)
```

**Lambda Triggers** (Future):
- Pre-signup: Validate email domain
- Post-confirmation: Create user record in database
- Pre-token generation: Add custom claims

### SES (Email Service)

**Configuration**:
```yaml
Region: us-east-1
Production Access: Yes
Sending Limit: 50,000 emails/day (adjustable)
From Email: noreply@outreachpass.base2ml.com
```

**Verified Identities**:
- Domain: `outreachpass.base2ml.com`
- Email: `noreply@outreachpass.base2ml.com`

**Email Types**:
1. **Transactional**: Wallet pass delivery
2. **Notifications**: Event reminders
3. **System**: Password resets, verification

**Bounce/Complaint Handling**:
```yaml
Bounce Notifications: SNS topic
Complaint Notifications: SNS topic
Bounce Rate Threshold: < 5%
Complaint Rate Threshold: < 0.1%
```

---

## Monitoring & Observability

### CloudWatch Logs

**Log Groups**:
```
/aws/lambda/outreachpass-dev-backend (30-day retention)
/aws/lambda/outreachpass-dev-worker (30-day retention)
/aws/apigateway/outreachpass-dev (30-day retention)
/aws/rds/cluster/outreachpass-dev/postgresql (7-day retention)
```

**Structured Logging Format**:
```json
{
  "timestamp": "2025-11-18T10:30:00Z",
  "level": "INFO",
  "correlation_id": "uuid",
  "service": "backend",
  "message": "Card created successfully",
  "extra_fields": {
    "card_id": "uuid",
    "tenant_id": "uuid",
    "user_id": "uuid"
  }
}
```

### CloudWatch Metrics

**Lambda Metrics**:
- Invocations
- Errors
- Duration (p50, p95, p99)
- Throttles
- Concurrent Executions

**API Gateway Metrics**:
- Count (request count)
- 4XXError
- 5XXError
- Latency (p50, p95, p99)
- IntegrationLatency

**RDS Metrics**:
- CPUUtilization
- DatabaseConnections
- ReadLatency / WriteLatency
- FreeStorageSpace
- ServerlessDatabaseCapacity (ACUs)

**Custom Metrics**:
```python
import boto3
cloudwatch = boto3.client('cloudwatch')

cloudwatch.put_metric_data(
    Namespace='OutreachPass',
    MetricData=[
        {
            'MetricName': 'CardsGenerated',
            'Value': 1,
            'Unit': 'Count',
            'Dimensions': [
                {'Name': 'TenantId', 'Value': tenant_id},
                {'Name': 'Environment', 'Value': 'dev'}
            ]
        }
    ]
)
```

### CloudWatch Alarms

See `infrastructure/terraform/monitoring.tf` for complete alarm definitions.

**Critical Alarms** (SNS → Email):
- Lambda error rate > 5%
- API Gateway 5xx error rate > 5%
- RDS CPU > 80%
- RDS storage < 5 GB
- SQS DLQ has messages

**Warning Alarms**:
- Lambda duration > 5 seconds
- API Gateway latency > 3 seconds
- RDS connections > 80

**Alarm Actions**:
```yaml
SNS Topic: outreachpass-dev-alarms
Email Subscription: christopherwlindeman@gmail.com
```

### Distributed Tracing (Future)

**AWS X-Ray** (Planned):
- End-to-end request tracing
- Service map visualization
- Performance bottleneck identification
- Error trace analysis

---

## Security & Compliance

### IAM Roles & Policies

**Lambda Execution Role**:
```
Role Name: outreachpass-dev-lambda-execution-role
Managed Policies:
  - AWSLambdaBasicExecutionRole (CloudWatch Logs)
  - AWSLambdaVPCAccessExecutionRole (VPC networking)
Custom Policies:
  - S3 access (assets, uploads)
  - SQS access (send/receive)
  - SES access (send email)
  - Secrets Manager (read secrets)
```

**RDS IAM Authentication** (Future):
- Replace password-based auth with IAM tokens
- Short-lived credentials (15 minutes)
- Audit trail in CloudTrail

### Encryption

**At Rest**:
- RDS: AES-256 encryption
- S3: SSE-S3 (AES-256)
- SQS: SSE-SQS (AWS-managed keys)
- Secrets Manager: KMS-encrypted

**In Transit**:
- TLS 1.2+ for all connections
- API Gateway: HTTPS only
- RDS: SSL/TLS enforced
- S3: HTTPS required

### Secrets Management

**AWS Secrets Manager**:
```
Secrets:
├── outreachpass/dev/database/master-password
├── outreachpass/dev/jwt-secret-key
├── outreachpass/dev/google-wallet/service-account-key
└── outreachpass/dev/apple-wallet/certificate-password
```

**Rotation**:
- Database passwords: 90-day rotation (automated)
- API keys: Manual rotation as needed
- JWT secrets: Manual rotation (requires token invalidation)

### Network Security

**Security Groups**:
- Least-privilege access
- No public RDS access
- Lambda → RDS only on port 5432

**NACLs** (Future):
- Additional network layer security
- IP allowlisting for admin access

### Compliance

**Data Residency**:
- All data stored in `us-east-1` region
- No cross-region replication (currently)

**Logging & Auditing**:
- CloudTrail: All API calls logged
- Audit Log table: User actions tracked
- 2-year retention for compliance

---

## Cost Optimization

### Monthly AWS Cost Breakdown (Estimated)

| Service | Usage | Monthly Cost |
|---------|-------|--------------|
| **RDS Aurora Serverless v2** | 0.5-4 ACUs avg, 20 GB storage | $50-150 |
| **Lambda** | 1M invocations, 512MB, 500ms avg | $10-30 |
| **API Gateway** | 1M requests | $3.50 |
| **S3** | 50 GB storage, 10 GB transfer | $5-10 |
| **CloudFront** | 100 GB transfer | $8 |
| **SQS** | 100K messages | $0.50 |
| **Cognito** | 5,000 MAUs | $0 (free tier) |
| **SES** | 10,000 emails | $1 |
| **CloudWatch** | Logs, metrics, alarms | $10-20 |
| **Route 53** | Hosted zone, queries | $1 |
| **Secrets Manager** | 5 secrets | $2.50 |
| **Total** | | **$90-230/month** |

### Cost Optimization Strategies

1. **Lambda**:
   - Right-size memory (512MB vs 1GB)
   - Optimize cold starts
   - Use Lambda Power Tuning tool

2. **RDS**:
   - Serverless v2 auto-scaling (pay for what you use)
   - Auto-pause during low traffic (disabled in prod)
   - Reserved capacity for predictable workloads (future)

3. **S3**:
   - Lifecycle policies (delete old versions)
   - Intelligent-Tiering for infrequent access
   - CloudFront caching to reduce transfer costs

4. **API Gateway**:
   - HTTP API (cheaper than REST API)
   - Caching for read-heavy endpoints (optional)

5. **CloudWatch**:
   - Shorter log retention (7-30 days)
   - Log filtering to reduce ingestion
   - Metric filters instead of custom metrics

---

## Deployment Guide

### Prerequisites

1. **AWS CLI**: v2.x installed and configured
2. **Terraform**: v1.0+ installed
3. **Python**: 3.11+ for local testing
4. **Node.js**: v20+ for frontend
5. **AWS Credentials**: Access key and secret key with admin permissions

### Initial Infrastructure Setup

#### Step 1: Configure Terraform Backend

```bash
cd terraform

# Initialize Terraform
terraform init

# Create workspace (if using workspaces)
terraform workspace new dev
terraform workspace select dev
```

#### Step 2: Set Variables

Create `terraform/environments/dev/terraform.tfvars`:
```hcl
environment              = "dev"
aws_region               = "us-east-1"
database_name            = "outreachpass"
database_master_username = "outreachpass_admin"
database_master_password = "<strong_password>"  # Use Secrets Manager
ses_from_email           = "noreply@outreachpass.base2ml.com"
alarm_email              = "christopherwlindeman@gmail.com"
```

#### Step 3: Plan and Apply

```bash
# Preview changes
terraform plan -var-file=environments/dev/terraform.tfvars

# Apply infrastructure
terraform apply -var-file=environments/dev/terraform.tfvars

# Note outputs
terraform output
```

### Backend Deployment

#### Build Lambda Package

```bash
cd backend

# Build Lambda deployment package
./scripts/build_lambda.sh

# Package will be created at: lambda-package.zip
```

#### Deploy to Lambda

```bash
# Upload to S3 (intermediate step)
aws s3 cp lambda-package.zip s3://outreachpass-artifacts/lambda/backend-latest.zip

# Update Lambda function
aws lambda update-function-code \
  --function-name outreachpass-dev-backend \
  --s3-bucket outreachpass-artifacts \
  --s3-key lambda/backend-latest.zip \
  --region us-east-1

# Wait for update to complete
aws lambda wait function-updated \
  --function-name outreachpass-dev-backend \
  --region us-east-1
```

#### Run Database Migrations

```bash
# Option 1: Via Lambda API (recommended)
curl -X POST https://outreachpass.base2ml.com/api/v1/admin/migrations/run

# Option 2: Direct PostgreSQL connection
PGPASSWORD="<password>" psql \
  -h outreachpass-dev.cluster-cu1y2a26idsb.us-east-1.rds.amazonaws.com \
  -U outreachpass_admin \
  -d outreachpass \
  -f backend/migrations/001_initial_schema.sql
```

### Frontend Deployment

#### Build Next.js Application

```bash
cd frontend-outreachpass

# Install dependencies
npm install

# Build for production
npm run build

# Output will be in: .next/ and out/
```

#### Deploy to S3 + CloudFront

```bash
# Sync to S3
aws s3 sync out/ s3://outreachpass-frontend-dev/ --delete

# Invalidate CloudFront cache
DISTRIBUTION_ID=$(aws cloudfront list-distributions \
  --query "DistributionList.Items[?Comment=='outreachpass-frontend-dev'].Id" \
  --output text)

aws cloudfront create-invalidation \
  --distribution-id $DISTRIBUTION_ID \
  --paths "/*"
```

### Environment Variables

**Backend Lambda**:
Set via AWS Console or Terraform:
```bash
aws lambda update-function-configuration \
  --function-name outreachpass-dev-backend \
  --environment Variables="{
    DATABASE_URL=$DATABASE_URL,
    AWS_REGION=us-east-1,
    S3_BUCKET_ASSETS=outreachpass-dev-assets,
    COGNITO_USER_POOL_ID=$COGNITO_USER_POOL_ID
  }"
```

**Frontend (Next.js)**:
Create `.env.production`:
```bash
NEXT_PUBLIC_API_URL=https://outreachpass.base2ml.com
NEXT_PUBLIC_COGNITO_USER_POOL_ID=us-east-1_xxxxx
NEXT_PUBLIC_COGNITO_CLIENT_ID=xxxxx
NEXT_PUBLIC_REGION=us-east-1
```

### Post-Deployment Verification

1. **Health Check**:
   ```bash
   curl https://outreachpass.base2ml.com/health
   # Expected: {"status": "healthy"}
   ```

2. **Database Connectivity**:
   ```bash
   curl https://outreachpass.base2ml.com/api/v1/admin/stats
   # Expected: {"totalEvents": 0, "activeEvents": 0, ...}
   ```

3. **Frontend**:
   ```bash
   curl https://app.outreachpass.base2ml.com
   # Expected: HTML response with Next.js app
   ```

4. **CloudWatch Logs**:
   ```bash
   aws logs tail /aws/lambda/outreachpass-dev-backend --follow
   ```

---

## Disaster Recovery & Backup

### Backup Strategy

**RDS Automated Backups**:
- Daily snapshots at 03:00 UTC
- 7-day retention
- Cross-region backup (future)

**Manual Snapshots**:
```bash
# Create manual snapshot
aws rds create-db-cluster-snapshot \
  --db-cluster-identifier outreachpass-dev \
  --db-cluster-snapshot-identifier outreachpass-dev-manual-$(date +%Y%m%d)

# List snapshots
aws rds describe-db-cluster-snapshots \
  --db-cluster-identifier outreachpass-dev
```

**S3 Versioning**:
- Enabled on all buckets
- 30-day lifecycle for old versions

### Recovery Procedures

**Database Restore**:
```bash
# Restore from snapshot
aws rds restore-db-cluster-from-snapshot \
  --db-cluster-identifier outreachpass-dev-restored \
  --snapshot-identifier outreachpass-dev-snapshot-20251118 \
  --engine aurora-postgresql
```

**Point-in-Time Recovery**:
```bash
# Restore to specific time
aws rds restore-db-cluster-to-point-in-time \
  --db-cluster-identifier outreachpass-dev-restored \
  --source-db-cluster-identifier outreachpass-dev \
  --restore-to-time 2025-11-18T10:00:00Z
```

---

**Document End** • [Back to Top](#outreachpass-aws-architecture)
