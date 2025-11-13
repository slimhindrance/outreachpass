# OutreachPass Quick Start Guide

Get OutreachPass running in under 10 minutes.

## Prerequisites Checklist

- [ ] AWS account with CLI configured (`aws configure`)
- [ ] Terraform installed (`brew install terraform` or download from terraform.io)
- [ ] Python 3.11+ (`python3 --version`)
- [ ] PostgreSQL client (`brew install postgresql` for psql command)

## Step-by-Step Setup

### 1. Configure AWS Credentials

```bash
aws configure
# Enter your AWS Access Key ID
# Enter your AWS Secret Access Key
# Default region: us-east-1
```

### 2. Update Terraform Variables

```bash
cd ContactSolution

# Edit terraform/terraform.tfvars
vim terraform/terraform.tfvars
```

**Required changes:**
- `database_master_password`: Use a strong password (20+ characters) (Lindy101)
- `ses_from_email`: Use your domain or verified email (clindeman@base2ml.com)

### 3. Deploy Everything

```bash
# Make scripts executable
chmod +x scripts/*.sh



# Deploy infrastructure (takes ~10 minutes)
./scripts/deploy.sh dev
```

**What this does:**
- Creates VPC with public/private subnets
- Provisions Aurora PostgreSQL Serverless v2
- Sets up S3 buckets with encryption
- Creates Cognito User Pool
- Deploys FastAPI Lambda function
- Configures API Gateway

### 4. Initialize Database

```bash
# Run schema migration
./scripts/run_migrations.sh

# Seed with default data
./scripts/seed_database.sh
```

### 5. Verify SES Email

⚠️ **Important**: You must verify your sender email in AWS SES.

**In AWS Console:**
1. Navigate to Amazon SES → Verified identities
2. Create identity → Email address
3. Enter the email from `ses_from_email`
4. Check inbox and click verification link

**Or via CLI:**
```bash
aws ses verify-email-identity --email-address noreply@outreachpass.com
```

### 6. Test Your API

```bash
# Get API endpoint
cd terraform
export API_ENDPOINT=$(terraform output -raw api_endpoint)

# Health check
curl $API_ENDPOINT/health
# Expected: {"status":"ok"}

# Test root
curl $API_ENDPOINT/
# Expected: {"service":"OutreachPass","version":"0.1.0","status":"healthy"}
```

## Create Your First Event

### 1. Get Brand ID

From seed output, use OutreachPass brand:
```
Brand ID: 00000000-0000-0000-0000-000000000010
```

### 2. Create Event (Postman/curl)

```bash
curl -X POST "$API_ENDPOINT/api/v1/admin/events" \
  -H "Content-Type: application/json" \
  -d '{
    "brand_id": "00000000-0000-0000-0000-000000000010",
    "name": "Tech Conference 2025",
    "slug": "tech-conf-2025",
    "starts_at": "2025-03-15T09:00:00Z",
    "ends_at": "2025-03-17T18:00:00Z",
    "timezone": "America/New_York",
    "settings_json": {}
  }'
```

**Save the `event_id` from the response.**

### 3. Import Attendees

Create `attendees.csv`:
```csv
first_name,last_name,email,phone,org_name,title,linkedin_url,role
Alice,Johnson,alice@example.com,+1-555-0100,Tech Corp,Engineer,https://linkedin.com/in/alice,speaker
Bob,Smith,bob@example.com,+1-555-0101,Innovation Inc,CTO,,attendee
```

Upload:
```bash
EVENT_ID="your-event-id-here"

curl -X POST "$API_ENDPOINT/api/v1/admin/events/$EVENT_ID/attendees/import" \
  -F "file=@attendees.csv"
```

### 4. Issue Contact Cards

Get attendee IDs:
```bash
curl "$API_ENDPOINT/api/v1/admin/events/$EVENT_ID/attendees"
```

Issue pass for an attendee:
```bash
ATTENDEE_ID="attendee-id-from-above"

curl -X POST "$API_ENDPOINT/api/v1/admin/attendees/$ATTENDEE_ID/issue" \
  -H "Content-Type: application/json" \
  -d '{
    "attendee_id": "'$ATTENDEE_ID'",
    "include_wallet": false
  }'
```

**Response includes:**
- `card_id`: Unique card identifier
- `qr_url`: Public card URL
- `qr_s3_key`: S3 path to QR code PNG

### 5. View Contact Card

```bash
CARD_ID="card-id-from-above"

# Open in browser
open "$API_ENDPOINT/c/$CARD_ID"

# Or curl
curl "$API_ENDPOINT/c/$CARD_ID"

# Download VCard
curl "$API_ENDPOINT/c/$CARD_ID/vcard" -o contact.vcf
```

## Next Steps

### Production Checklist

- [ ] Change database password to secure value
- [ ] Set up custom domain with Route 53
- [ ] Configure CloudFront CDN
- [ ] Enable production-grade logging
- [ ] Set up CloudWatch alarms
- [ ] Configure backup retention
- [ ] Review IAM permissions
- [ ] Enable AWS WAF on API Gateway
- [ ] Request SES production access (remove sending limits)

### Add Wallet Passes

Implement Apple/Google Wallet in Phase 2:
- Store PassKit certificates in Secrets Manager
- Add wallet pass generation to `card_service.py`
- Update `PassIssuanceResponse` with wallet URLs

### Build Frontend

Next.js frontend for each brand:
- `frontend-outreachpass/` → outreachpass.com
- `frontend-govsafe/` → govsafeconnect.com
- `frontend-campuscard/` → campuscard.io

### Monitoring Setup

```bash
# Watch Lambda logs
aws logs tail /aws/lambda/outreachpass-dev-api --follow

# Check API Gateway metrics
aws cloudwatch get-metric-statistics \
  --namespace AWS/ApiGateway \
  --metric-name Count \
  --dimensions Name=ApiId,Value=$(terraform output -raw api_id) \
  --start-time 2025-01-01T00:00:00Z \
  --end-time 2025-01-10T00:00:00Z \
  --period 3600 \
  --statistics Sum
```

## Troubleshooting

### Lambda timeout connecting to RDS

**Issue**: Lambda can't reach database.

**Fix**:
```bash
# Check Lambda is in private subnet with NAT gateway
cd terraform
terraform state show module.lambda.aws_lambda_function.api | grep subnet_ids

# Verify security groups allow traffic
terraform state show module.database.aws_security_group.rds
```

### SES email not sending

**Issue**: Emails fail to send.

**Fix**:
```bash
# Verify email identity
aws ses get-identity-verification-attributes \
  --identities noreply@outreachpass.com

# Check sending quota
aws ses get-send-quota
```

### "Module not found" in Lambda

**Issue**: Lambda can't import packages.

**Fix**: Rebuild Lambda layer:
```bash
./scripts/build_lambda.sh
cd terraform
terraform apply -var-file="terraform.tfvars"
```

## Useful Commands

```bash
# Rebuild and redeploy Lambda only
./scripts/build_lambda.sh && cd terraform && terraform apply -target=module.lambda -var-file="terraform.tfvars"

# View all Terraform outputs
cd terraform && terraform output

# Connect to database directly
psql -h $(terraform output -raw database_endpoint) -U outreachpass_admin -d outreachpass

# View recent Lambda logs
aws logs tail /aws/lambda/outreachpass-dev-api --since 10m

# Invoke Lambda directly (test)
aws lambda invoke --function-name outreachpass-dev-api \
  --payload '{"rawPath":"/health","requestContext":{}}' \
  response.json && cat response.json
```

## Cost Optimization

**Current monthly cost: ~$70-110**

**Save ~$30/month**: Remove NAT Gateway
```hcl
# In terraform/modules/vpc/main.tf, comment out:
# - aws_eip.nat
# - aws_nat_gateway.main
# - Route table private route to NAT

# Add VPC endpoints instead (S3, SES, Secrets Manager)
```

**Aurora optimization**: Use Aurora Serverless v2 scaling
```hcl
serverlessv2_scaling_configuration {
  max_capacity = 1.0  # Reduce from 2.0
  min_capacity = 0.5
}
```

## Support

- Documentation: See [README.md](README.md)
- Issues: GitHub Issues
- AWS Documentation: docs.aws.amazon.com

---

**Need help?** Check the full [README.md](README.md) for detailed information.
