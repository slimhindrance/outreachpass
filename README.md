# OutreachPass

Digital contact cards and event networking platform built on AWS serverless architecture.

## Architecture

- **Backend**: FastAPI (Python 3.11) on AWS Lambda
- **Database**: Aurora PostgreSQL Serverless v2
- **Storage**: S3 for QR codes and assets
- **Auth**: Cognito User Pools
- **Email**: Amazon SES
- **Infrastructure**: Terraform

## Features

### Core (MVP)
- ✅ Event creation and management
- ✅ Attendee import from CSV
- ✅ Digital contact card generation
- ✅ QR code generation and storage
- ✅ VCard (.vcf) download
- ✅ Email delivery of passes
- ✅ Anonymous contact sharing (no login required for attendees)
- ✅ Scan tracking (aggregated, privacy-focused)
- ✅ Multi-tenant architecture
- ✅ Multi-brand support (OutreachPass, GovSafe, CampusCard)

### Coming Soon
- 🔄 Apple Wallet / Google Wallet passes
- 🔄 Exhibitor lead capture
- 🔄 Analytics dashboard
- 🔄 Event expiry automation
- 🔄 Scheduled jobs (EventBridge)

## Project Structure

```
ContactSolution/
├── backend/                 # FastAPI application
│   ├── app/
│   │   ├── api/            # API endpoints
│   │   ├── core/           # Config, database
│   │   ├── models/         # Pydantic & SQLAlchemy models
│   │   ├── services/       # Business logic
│   │   └── utils/          # Utilities (vcard, qr, s3, email)
│   └── requirements.txt
├── database/               # SQL migrations
├── terraform/              # Infrastructure as Code
│   ├── modules/           # Terraform modules
│   │   ├── vpc/
│   │   ├── database/
│   │   ├── storage/
│   │   ├── cognito/
│   │   ├── lambda/
│   │   └── api_gateway/
│   ├── main.tf
│   ├── variables.tf
│   ├── outputs.tf
│   └── terraform.tfvars
├── scripts/               # Deployment scripts
└── frontend-outreachpass/ # Next.js frontend (coming soon)
```

## Quick Start

### Prerequisites

- AWS CLI configured with credentials
- Terraform >= 1.0
- Python 3.11+
- Poetry (Python dependency manager)
- PostgreSQL client (psql)
- Bash

**New to Poetry?** See [POETRY_SETUP.md](POETRY_SETUP.md) for complete setup guide.

### 1. Clone and Setup

```bash
git clone <repo>
cd ContactSolution

# Install Poetry and dependencies
./scripts/poetry_setup.sh

# Copy environment templates
cp backend/.env.example backend/.env

# Configure frontend environment variables (REQUIRED)
cd frontend-outreachpass
cp .env.example .env.local
# Edit .env.local and set Cognito credentials

# Or use the Makefile
make install
```

### 2. Configure Terraform

Edit `terraform/terraform.tfvars`:

```hcl
aws_region  = "us-east-1"
environment = "dev"

database_master_username = "outreachpass_admin"
database_master_password = "CHANGE_ME_SECURE_PASSWORD"  # Use strong password!

ses_from_email = "clindeman@base2ml.com"  # Must verify in SES
```

### 3. Deploy Infrastructure

```bash
# Make scripts executable
chmod +x scripts/*.sh

# Deploy all infrastructure
./scripts/deploy.sh dev
```

This will:
- Build Lambda deployment package
- Create VPC, subnets, NAT gateway
- Provision Aurora PostgreSQL Serverless v2
- Create S3 buckets with encryption
- Set up Cognito User Pool
- Deploy Lambda function
- Configure API Gateway
- Set up CloudWatch logging

### 4. Run Migrations

```bash
./scripts/run_migrations.sh
```

### 5. Seed Database

```bash
./scripts/seed_database.sh
```

This creates:
- Default tenant
- Three brands (OutreachPass, GovSafe, CampusCard)
- Admin user

### 6. Verify SES Email

In AWS Console:
1. Go to Amazon SES
2. Verify the email address in `ses_from_email`
3. Click verification link in email

### 7. Test API

```bash
# Get API endpoint
cd terraform
API_ENDPOINT=$(terraform output -raw api_endpoint)

# Health check
curl $API_ENDPOINT/health

# Expected: {"status":"ok"}
```

## API Endpoints

### Public (No Auth)

- `GET /c/{card_id}` - Render contact card page
- `GET /c/{card_id}/vcard` - Download VCard (.vcf)
- `GET /api/cards/{card_id}` - Get card data (JSON)

### Admin (Cognito JWT Required)

**Events**
- `POST /api/v1/admin/events` - Create event
- `GET /api/v1/admin/events/{event_id}` - Get event
- `PUT /api/v1/admin/events/{event_id}` - Update event

**Attendees**
- `POST /api/v1/admin/events/{event_id}/attendees/import` - Import CSV
- `GET /api/v1/admin/events/{event_id}/attendees` - List attendees
- `POST /api/v1/admin/attendees/{attendee_id}/issue` - Issue card & pass

## CSV Import Format

Upload attendees with this CSV structure:

**Limits**:
- Maximum file size: **5MB**
- Maximum rows: **10,000**
- Encoding: **UTF-8** required

```csv
first_name,last_name,email,phone,org_name,title,linkedin_url,role
John,Doe,john@example.com,+1-555-0100,Acme Corp,CEO,https://linkedin.com/in/johndoe,speaker
Jane,Smith,jane@example.com,+1-555-0101,Tech Inc,CTO,https://linkedin.com/in/janesmith,attendee
```

**Required columns**: `first_name`, `last_name`, `email`  
**Optional columns**: `phone`, `org_name`, `title`, `linkedin_url`, `role`

## Local Development

### Frontend Configuration

**Required Environment Variables**:

The frontend requires Cognito credentials to be set as environment variables. These **must not** be hardcoded.

1. Copy the template:
```bash
cd frontend-outreachpass
cp .env.example .env.local
```

2. Edit `.env.local` and set your values:
```bash
NEXT_PUBLIC_COGNITO_USER_POOL_ID=us-east-1_XXXXXXXXX    # From AWS Console
NEXT_PUBLIC_COGNITO_CLIENT_ID=xxxxxxxxxxxxxxxxxxxxxxxxxx # From AWS Console
NEXT_PUBLIC_COGNITO_DOMAIN=your-cognito-domain           # Your Cognito domain
```

3. Get values from AWS Console:
   - Go to **AWS Console > Cognito > User Pools**
   - Select your user pool
   - Copy **User Pool ID** and **App Client ID**

**Security Note**: Never commit `.env.local` to version control. The `.gitignore` is configured to exclude it.

### Run FastAPI Locally

```bash
# Quick start with helper script
./scripts/dev_server.sh

# Or use Makefile
make dev

# Or manually with Poetry
cd backend
poetry run uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

Access:
- API: http://localhost:8000
- Docs: http://localhost:8000/docs
- ReDoc: http://localhost:8000/redoc

### Local Database

```bash
# Start PostgreSQL with Docker
docker run -d \
  --name outreachpass-db \
  -e POSTGRES_DB=outreachpass \
  -e POSTGRES_USER=outreachpass \
  -e POSTGRES_PASSWORD=dev_password \
  -p 5432:5432 \
  postgres:15

# Run migrations
psql -h localhost -U outreachpass -d outreachpass -f database/001_initial_schema.sql
```

## Deployment

### Update Lambda Code

```bash
# Rebuild and deploy
./scripts/build_lambda.sh
cd terraform
terraform apply -var-file="terraform.tfvars"
```

### Update Database Schema

```bash
# Create new migration file
echo "-- Migration description" > database/002_new_migration.sql

# Edit with schema changes
vim database/002_new_migration.sql

# Run migration
psql -h $DB_ENDPOINT -U $DB_USER -d outreachpass -f database/002_new_migration.sql
```

## Multi-Brand Configuration

OutreachPass supports multiple brands with different themes and features under the Base2ML domain:

**OutreachPass** (Primary)
- Domain: outreachpass.base2ml.com
- Features: Full feature set
- Target: General events, conferences

**GovSafe Connect**
- Domain: govsafe.base2ml.com
- Features: Privacy-focused, no analytics
- Target: Government, sensitive events

**CampusCard**
- Domain: campuscard.base2ml.com
- Features: Scholar links, student-focused
- Target: Universities, academic conferences

See [DOMAIN_CONFIG.md](DOMAIN_CONFIG.md) for complete domain setup.

Configure brand features in `brands.features_json`:

```json
{
  "wallet": true,
  "analytics": false,
  "privacy_strict": true,
  "scholar_links": true
}
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

- Lambda invocations, errors, duration
- API Gateway requests, 4xx, 5xx
- Database connections, CPU, memory

## Security

- **Encryption**: S3 server-side encryption (AES256), RDS encryption at rest
- **VPC**: Lambda and RDS in private subnets
- **IAM**: Least-privilege roles for Lambda
- **Secrets**: Database credentials in Secrets Manager
- **Auth**: Cognito JWT for admin endpoints
- **Privacy**: Aggregate-only analytics, no PII logging

## Troubleshooting

### Lambda can't connect to RDS

```bash
# Check security groups
cd terraform
terraform output

# Verify Lambda is in VPC with RDS access
# Check Lambda security group has egress to RDS security group
```

### SES email not sending

```bash
# Verify email in SES
aws ses verify-email-identity --email-address noreply@outreachpass.com

# Check SES sending limits
aws ses get-send-quota
```

### Database connection issues

```bash
# Test connection from Lambda
aws lambda invoke \
  --function-name outreachpass-dev-api \
  --payload '{"rawPath":"/health","requestContext":{}}' \
  response.json

cat response.json
```

## Cost Estimate (MVP)

**Low Usage** (~100 events/month, ~5K attendees):
- Aurora Serverless v2: $30-50/month
- Lambda: $5-10/month
- API Gateway: $3-5/month
- S3: $1-3/month
- NAT Gateway: $30-40/month
- **Total: ~$70-110/month**

**Optimizations**:
- Remove NAT Gateway (use VPC endpoints): Save $30/month
- Use RDS Proxy for connection pooling
- Enable S3 Intelligent-Tiering

## Roadmap

### Phase 1 (✅ Complete - Week 1)
- Core API structure
- Event & attendee management
- Card generation & QR codes
- Email delivery
- Infrastructure automation

### Phase 2 (Week 2)
- [ ] Apple Wallet integration
- [ ] Google Wallet integration
- [ ] Exhibitor lead capture
- [ ] Analytics dashboard API
- [ ] EventBridge scheduled jobs

### Phase 3 (Week 3-4)
- [ ] Next.js frontend (all 3 brands)
- [ ] Admin dashboard UI
- [ ] Stripe integration
- [ ] CDN (CloudFront)
- [ ] Custom domains

## Contributing

1. Create feature branch
2. Make changes
3. Test locally
4. Deploy to dev environment
5. Create pull request

## License

Proprietary - All rights reserved

## Support

For issues: [GitHub Issues](https://github.com/yourusername/ContactSolution/issues)

---

Built with FastAPI, AWS, and ❤️ by OutreachPass
