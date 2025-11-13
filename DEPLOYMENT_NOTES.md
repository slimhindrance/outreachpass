# Deployment Notes - Base2ML Domain Configuration

Quick reference for deploying OutreachPass to Base2ML infrastructure.

## Domain Structure

All services deploy under `base2ml.com`:

```
outreachpass.base2ml.com  → Main brand frontend
govsafe.base2ml.com       → Government/sensitive events brand
campuscard.base2ml.com    → Academic/university brand
api.outreachpass.base2ml.com → Backend API (optional custom domain)
```

## Pre-Deployment Checklist

### 1. AWS Configuration
- [x] AWS CLI configured with credentials
- [x] Terraform >= 1.0 installed
- [x] Python 3.11+ with Poetry installed

### 2. Environment Setup
- [x] `terraform/terraform.tfvars` configured:
  - Database password: `Lindy101` (change for production!)
  - SES email: `clindeman@base2ml.com`
  - Region: `us-east-1`

### 3. Email Verification
- [ ] Verify `clindeman@base2ml.com` in AWS SES:
```bash
aws ses verify-email-identity --email-address clindeman@base2ml.com
# Check email and click verification link
```

### 4. SSL Certificate (Optional - for custom domain)
- [ ] Request ACM certificate:
```bash
aws acm request-certificate \
  --domain-name outreachpass.base2ml.com \
  --subject-alternative-names \
    govsafe.base2ml.com \
    campuscard.base2ml.com \
  --validation-method DNS \
  --region us-east-1
```

- [ ] Add DNS validation records to Base2ML DNS
- [ ] Wait for validation (takes 5-30 minutes)

## Deployment Steps

### Step 1: Build Lambda Package

```bash
# Install dependencies and build
make build

# Or manually
./scripts/poetry_setup.sh
./scripts/build_lambda.sh
```

**Verify outputs:**
- `terraform/modules/lambda/lambda.zip` (FastAPI code)
- `terraform/modules/lambda/layers/dependencies.zip` (Python packages)

### Step 2: Deploy Infrastructure

```bash
# Deploy everything
make deploy

# Or manually
cd terraform
terraform init
terraform plan -var-file="terraform.tfvars"
terraform apply -var-file="terraform.tfvars"
```

**Expected resources:**
- VPC with public/private subnets
- Aurora PostgreSQL Serverless v2
- S3 buckets (assets + uploads)
- Cognito User Pool
- Lambda function
- API Gateway HTTP API
- CloudWatch Log Groups

**Deployment time:** ~10-15 minutes

### Step 3: Initialize Database

```bash
# Run schema migration
make migrate

# Or manually
./scripts/run_migrations.sh
```

### Step 4: Seed Database

```bash
# Load initial data
make seed

# Or manually
./scripts/seed_database.sh
```

**This creates:**
- Tenant: Base2ML
- Admin user: clindeman@base2ml.com
- Brands: OutreachPass, GovSafe, CampusCard

### Step 5: Verify Deployment

```bash
# Get API endpoint
cd terraform
export API_URL=$(terraform output -raw api_endpoint)

# Test health
curl $API_URL/health
# Expected: {"status":"ok"}

# Test root
curl $API_URL/
# Expected: {"service":"OutreachPass","version":"0.1.0","status":"healthy"}
```

## DNS Configuration (Optional)

If using custom domains, add these CNAME records to Base2ML DNS:

### For API Gateway
```
api.outreachpass.base2ml.com → [API Gateway domain]
```

### For Frontend (Future)
```
outreachpass.base2ml.com → [CloudFront distribution]
govsafe.base2ml.com → [CloudFront distribution]
campuscard.base2ml.com → [CloudFront distribution]
```

## Testing First Event

### 1. Create Cognito User

```bash
USER_POOL_ID=$(cd terraform && terraform output -raw cognito_user_pool_id)
CLIENT_ID=$(cd terraform && terraform output -raw cognito_client_id)

# Create admin user
aws cognito-idp admin-create-user \
  --user-pool-id $USER_POOL_ID \
  --username clindeman@base2ml.com \
  --user-attributes Name=email,Value=clindeman@base2ml.com \
  --temporary-password TempPass123! \
  --message-action SUPPRESS

# Set permanent password
aws cognito-idp admin-set-user-password \
  --user-pool-id $USER_POOL_ID \
  --username clindeman@base2ml.com \
  --password SecurePass123! \
  --permanent
```

### 2. Get Auth Token

```bash
aws cognito-idp initiate-auth \
  --auth-flow USER_PASSWORD_AUTH \
  --client-id $CLIENT_ID \
  --auth-parameters USERNAME=clindeman@base2ml.com,PASSWORD=SecurePass123! \
  --query 'AuthenticationResult.IdToken' \
  --output text > token.txt

export TOKEN=$(cat token.txt)
```

### 3. Create Test Event

```bash
curl -X POST "$API_URL/api/v1/admin/events" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "brand_id": "00000000-0000-0000-0000-000000000010",
    "name": "Base2ML Demo Event",
    "slug": "base2ml-demo",
    "starts_at": "2025-03-15T09:00:00Z",
    "ends_at": "2025-03-17T18:00:00Z",
    "timezone": "America/New_York"
  }'
```

### 4. Import Test Attendees

```bash
# Create CSV
cat > attendees.csv << 'EOF'
first_name,last_name,email,phone,org_name,title,linkedin_url
Chris,Lindeman,clindeman@base2ml.com,+1-555-0100,Base2ML,Founder,https://linkedin.com/in/clindeman
Test,User,test@base2ml.com,+1-555-0101,Base2ML,Engineer,
EOF

# Get event ID from previous response
EVENT_ID="your-event-id-here"

# Upload
curl -X POST "$API_URL/api/v1/admin/events/$EVENT_ID/attendees/import" \
  -H "Authorization: Bearer $TOKEN" \
  -F "file=@attendees.csv"
```

### 5. Issue Contact Cards

```bash
# Get attendees
curl "$API_URL/api/v1/admin/events/$EVENT_ID/attendees" \
  -H "Authorization: Bearer $TOKEN"

# Issue pass (get attendee_id from above)
ATTENDEE_ID="your-attendee-id"

curl -X POST "$API_URL/api/v1/admin/attendees/$ATTENDEE_ID/issue" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"attendee_id": "'$ATTENDEE_ID'", "include_wallet": false}'
```

## Monitoring

### CloudWatch Logs

```bash
# Lambda logs
aws logs tail /aws/lambda/outreachpass-dev-api --follow

# API Gateway logs
aws logs tail /aws/apigateway/outreachpass-dev --follow
```

### Metrics

Access in AWS Console:
- Lambda: Invocations, errors, duration
- API Gateway: Requests, 4xx, 5xx
- RDS: Connections, CPU, queries

## Troubleshooting

### Lambda Can't Connect to RDS

```bash
# Check Lambda is in correct subnets
aws lambda get-function-configuration \
  --function-name outreachpass-dev-api \
  --query 'VpcConfig.SubnetIds'

# Should be private subnets with NAT gateway access
```

### SES Email Bouncing

```bash
# Verify email status
aws ses get-identity-verification-attributes \
  --identities clindeman@base2ml.com

# Check sending quota
aws ses get-send-quota
```

### Database Connection Issues

Check security groups allow Lambda → RDS on port 5432.

## Cost Estimate

**Development environment (~$70-110/month):**
- Aurora Serverless v2: $30-50
- NAT Gateway: $30-40
- Lambda: $5-10
- API Gateway: $3-5
- S3: $1-3

**Optimization:**
- Remove NAT Gateway, use VPC endpoints: Save $30/month
- Scale Aurora min capacity to 0.5: Save $10-15/month

## Production Hardening

Before production:

- [ ] Change database password in Secrets Manager
- [ ] Enable CloudTrail logging
- [ ] Set up CloudWatch alarms
- [ ] Configure WAF on API Gateway
- [ ] Request SES production access (remove sandbox limits)
- [ ] Enable RDS automated backups (30 days)
- [ ] Add CloudFront CDN for static assets
- [ ] Implement rate limiting
- [ ] Set up monitoring dashboards

## Rollback Plan

If deployment fails:

```bash
# Destroy infrastructure
cd terraform
terraform destroy -var-file="terraform.tfvars"

# Fix issues, then redeploy
terraform apply -var-file="terraform.tfvars"
```

## Next Steps

1. **Frontend Development**: Build Next.js apps for each brand
2. **Custom Domain**: Configure Route 53 + CloudFront
3. **Wallet Passes**: Implement Apple/Google Wallet
4. **Analytics**: Build dashboard for event metrics
5. **Exhibitor Portal**: Lead capture interface

---

**Deployment Owner**: Chris Lindeman
**Email**: clindeman@base2ml.com
**Last Updated**: 2025-01-10
