# CI/CD Architecture

## Overview

OutreachPass uses GitHub Actions for continuous integration and deployment, with a fully automated pipeline from code commit to production deployment.

## Pipeline Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                        Developer Workflow                        │
└─────────────────────────────────────────────────────────────────┘
                                │
                        Create Feature Branch
                                │
                        Make Code Changes
                                │
                        Create Pull Request
                                │
                                ▼
┌─────────────────────────────────────────────────────────────────┐
│                      PR Validation (Automated)                   │
├─────────────────────────────────────────────────────────────────┤
│  ✓ Backend Tests (pytest + coverage >80%)                       │
│  ✓ Frontend Tests (Jest/Vitest)                                 │
│  ✓ Linting (Ruff, ESLint, mypy, TypeScript)                     │
│  ✓ Security Scan (Bandit, Trivy, TruffleHog)                    │
│  ✓ Terraform Validation                                         │
│  ✓ Build Verification                                           │
└─────────────────────────────────────────────────────────────────┘
                                │
                        All Checks Pass ✅
                                │
                        Code Review & Approval
                                │
                        Merge to Main Branch
                                │
                                ▼
┌─────────────────────────────────────────────────────────────────┐
│                   Deployment Pipeline (Automated)                │
└─────────────────────────────────────────────────────────────────┘
                                │
        ┌───────────────────────┼───────────────────────┐
        │                       │                       │
        ▼                       ▼                       ▼
┌───────────────┐      ┌───────────────┐      ┌───────────────┐
│   Backend     │      │    Worker     │      │   Frontend    │
│   Pipeline    │      │   Pipeline    │      │   Pipeline    │
└───────────────┘      └───────────────┘      └───────────────┘
        │                       │                       │
        │                       │                       │
        ▼                       ▼                       ▼
┌───────────────┐      ┌───────────────┐      ┌───────────────┐
│  Build Lambda │      │  Build Worker │      │  Build Docker │
│   Package     │      │    Package    │      │     Image     │
└───────────────┘      └───────────────┘      └───────────────┘
        │                       │                       │
        ▼                       ▼                       ▼
┌───────────────┐      ┌───────────────┐      ┌───────────────┐
│  Upload to S3 │      │  Upload to S3 │      │  Push to ECR  │
│   Artifacts   │      │   Artifacts   │      │               │
└───────────────┘      └───────────────┘      └───────────────┘
        │                       │                       │
        ▼                       ▼                       ▼
┌───────────────┐      ┌───────────────┐      ┌───────────────┐
│  Deploy to    │      │  Deploy to    │      │  Deploy to    │
│  Dev Lambda   │      │ Dev Worker    │      │ Dev App Runner│
└───────────────┘      └───────────────┘      └───────────────┘
        │                       │                       │
        ▼                       ▼                       ▼
┌───────────────┐      ┌───────────────┐      ┌───────────────┐
│ Run Migrations│      │Configure Event│      │  Health Check │
│ Health Checks │      │    Bridge     │      │  Smoke Tests  │
└───────────────┘      └───────────────┘      └───────────────┘
        │                       │                       │
        │         Dev Tests Pass ✅                    │
        │                       │                       │
        ▼                       ▼                       ▼
┌─────────────────────────────────────────────────────────────────┐
│               Manual Approval Gate (Production)                  │
└─────────────────────────────────────────────────────────────────┘
        │                       │                       │
        ▼                       ▼                       ▼
┌───────────────┐      ┌───────────────┐      ┌───────────────┐
│  Deploy to    │      │  Deploy to    │      │  Deploy to    │
│  Prod Lambda  │      │ Prod Worker   │      │Prod App Runner│
└───────────────┘      └───────────────┘      └───────────────┘
        │                       │                       │
        ▼                       ▼                       ▼
┌───────────────┐      ┌───────────────┐      ┌───────────────┐
│ Blue/Green    │      │Configure Event│      │  Health Check │
│  Deployment   │      │    Bridge     │      │  Smoke Tests  │
│ Auto Rollback │      │               │      │  Auto Rollback│
└───────────────┘      └───────────────┘      └───────────────┘
        │                       │                       │
        └───────────────────────┴───────────────────────┘
                                │
                                ▼
                        ┌──────────────┐
                        │ Notification │
                        │ (Slack/Email)│
                        └──────────────┘
```

## Workflows

### 1. PR Validation (`pr-validation.yml`)

**Trigger**: Pull request to `main`

**Jobs**:
- `backend-tests`: Python tests, linting, type checking, coverage
- `frontend-tests`: TypeScript tests, linting, type checking, build verification
- `terraform-validation`: Format check, validation, TFLint
- `security-scan`: Trivy vulnerability scanner, TruffleHog secret detection
- `pr-summary`: Comment results on PR

**Outputs**: Status checks that block merge if failed

---

### 2. Backend Deployment (`backend-deploy.yml`)

**Trigger**: Push to `main` (backend changes), manual dispatch

**Jobs**:
1. `build`:
   - Install dependencies with Poetry
   - Create Lambda deployment package
   - Upload to S3 artifacts bucket
   - Generate version metadata

2. `deploy-dev`:
   - Download artifact from S3
   - Update Lambda function code
   - Run database migrations
   - Health checks + smoke tests

3. `deploy-prod`:
   - Manual approval gate
   - Backup current version
   - Update Lambda function
   - Run database migrations
   - Update Lambda alias (blue/green)
   - Health checks
   - Auto-rollback on failure

4. `notify`:
   - Send deployment notification

**Artifacts**: `s3://outreachpass-artifacts/backend/{version}/lambda.zip`

---

### 3. Worker Deployment (`worker-deploy.yml`)

**Trigger**: Push to `main` (worker changes), manual dispatch

**Jobs**:
1. `build-worker`:
   - Build worker Lambda package
   - Upload to S3

2. `deploy-worker-dev`:
   - Update worker Lambda
   - Configure EventBridge rules
   - Test with sample event

3. `deploy-worker-prod`:
   - Manual approval
   - Update worker Lambda
   - Configure EventBridge
   - Test deployment

**Artifacts**: `s3://outreachpass-artifacts/worker/{version}/lambda.zip`

---

### 4. Frontend Deployment (`frontend-deploy.yml`)

**Trigger**: Push to `main` (frontend changes), manual dispatch

**Jobs**:
1. `build`:
   - Build Docker image
   - Push to Amazon ECR
   - Tag with version and `latest`

2. `deploy-dev`:
   - Update App Runner service
   - Health checks

3. `deploy-prod`:
   - Manual approval
   - Update App Runner service
   - Health checks
   - Auto-rollback on failure

**Artifacts**: Docker image in ECR

---

### 5. Terraform Plan (`terraform-plan.yml`)

**Trigger**: Pull request with terraform changes

**Jobs**:
- `terraform-plan`:
  - Format check
  - Initialize with remote state
  - Run plan for dev and prod
  - Comment plan output on PR
  - Upload plan artifact

---

### 6. Terraform Apply (`terraform-apply.yml`)

**Trigger**: Push to `main` (terraform changes), manual dispatch

**Jobs**:
1. `terraform-apply-dev`:
   - Apply infrastructure changes to dev
   - Output resource details

2. `terraform-apply-prod`:
   - Manual approval gate
   - Apply infrastructure changes to prod
   - Output resource details

---

## Environments

### Development (`dev`)
- **Purpose**: Testing and validation
- **Approval**: None required
- **Resources**: Smaller instance sizes, shorter retention
- **URL**: https://dev.outreachpass.base2ml.com

### Production (`prod`)
- **Purpose**: Live production environment
- **Approval**: Required for all deployments
- **Resources**: Production-grade sizing, full backups
- **URL**: https://app.outreachpass.base2ml.com

---

## Artifact Management

### S3 Artifacts Bucket

**Bucket**: `outreachpass-artifacts`

**Structure**:
```
outreachpass-artifacts/
├── backend/
│   └── {version}/
│       ├── lambda.zip
│       └── metadata.json
└── worker/
    └── {version}/
        ├── lambda.zip
        └── metadata.json
```

**Lifecycle**: Artifacts deleted after 30 days

---

## Secrets Management

### GitHub Secrets (Repository)
- `AWS_ACCESS_KEY_ID`
- `AWS_SECRET_ACCESS_KEY`
- `AWS_REGION`
- `AWS_ACCOUNT_ID`
- `ARTIFACT_BUCKET_NAME`
- `TERRAFORM_STATE_BUCKET`

### GitHub Secrets (Environment-specific)
- `APP_RUNNER_SERVICE_ARN_DEV`
- `APP_RUNNER_SERVICE_ARN_PROD`
- `NEXT_PUBLIC_API_URL_DEV`
- `NEXT_PUBLIC_API_URL_PROD`

### AWS Secrets Manager
- `/outreachpass/{env}/database` - Database credentials
- `/outreachpass/{env}/google-wallet` - Google Wallet API credentials
- `/outreachpass/{env}/ses-smtp` - Email credentials

---

## Deployment Strategy

### Blue/Green Deployment (Lambda)

1. Deploy new version as numbered version
2. Run health checks
3. If healthy: Update `live` alias to new version
4. If unhealthy: Rollback `live` alias to previous version

**Benefits**:
- Zero downtime
- Instant rollback
- Easy testing with version numbers

### Rolling Deployment (App Runner)

1. Build new Docker image
2. Push to ECR
3. App Runner automatically deploys with health checks
4. Auto-rollback if health checks fail

---

## Monitoring & Observability

### Metrics
- Lambda execution duration
- Lambda error rate
- API Gateway 4xx/5xx errors
- App Runner request count
- Database connections

### Alarms
- Lambda errors > 5% (15-minute window)
- API Gateway 5xx > 1% (5-minute window)
- Database CPU > 80% (10-minute window)

### Logs
- CloudWatch Logs for all Lambda functions
- CloudWatch Logs for App Runner
- Deployment logs in GitHub Actions

---

## Rollback Procedures

### Automatic Rollback
- Health check failures trigger automatic rollback
- Lambda alias reverted to previous version
- No manual intervention required

### Manual Rollback

**Backend**:
```bash
./scripts/ci/rollback.sh outreachpass-api-prod 42
```

**Worker**:
```bash
./scripts/ci/rollback.sh outreachpass-worker-prod 15
```

**Frontend**: Use App Runner console to select previous deployment

---

## Security

### Code Scanning
- Bandit (Python security)
- Trivy (vulnerability scanning)
- TruffleHog (secret detection)

### Access Control
- Least-privilege IAM roles
- Manual approval for production
- Branch protection on `main`

### Compliance
- All secrets in AWS Secrets Manager
- Encryption at rest (S3, RDS, Secrets Manager)
- Audit trail (CloudTrail, GitHub audit log)

---

## Performance

### Build Times
- Backend build: ~3 minutes
- Worker build: ~2 minutes
- Frontend build: ~5 minutes
- Total deployment: ~15 minutes

### Optimization
- Docker layer caching
- pip dependency caching
- Parallel job execution
- Artifact reuse

---

## Troubleshooting

### Deployment Failed

1. Check GitHub Actions logs
2. Review health check output
3. Check CloudWatch Logs
4. Verify AWS resources exist
5. Check Secrets Manager for credentials

### Health Checks Failing

```bash
# Manual health check
./scripts/ci/health-check.sh https://api.outreachpass.base2ml.com

# Check Lambda logs
aws logs tail /aws/lambda/outreachpass-api-prod --follow

# Check function status
aws lambda get-function --function-name outreachpass-api-prod
```

### Rollback Required

```bash
# Get previous version
aws lambda list-versions-by-function --function-name outreachpass-api-prod

# Rollback
./scripts/ci/rollback.sh outreachpass-api-prod <version>
```

---

## Future Enhancements

### Planned
- [ ] Automated integration tests
- [ ] Load testing in CI
- [ ] Canary deployments (weighted routing)
- [ ] Multi-region deployment
- [ ] Cost optimization analysis
- [ ] Performance regression detection

### Under Consideration
- [ ] GitOps with ArgoCD/Flux
- [ ] Service mesh (App Mesh/Istio)
- [ ] Feature flags (LaunchDarkly/AppConfig)
- [ ] Synthetic monitoring (CloudWatch Synthetics)

---

## Resources

- [GitHub Actions Documentation](https://docs.github.com/en/actions)
- [AWS Lambda Best Practices](https://docs.aws.amazon.com/lambda/latest/dg/best-practices.html)
- [Terraform Cloud](https://www.terraform.io/cloud)
- [AWS App Runner](https://docs.aws.amazon.com/apprunner/)
