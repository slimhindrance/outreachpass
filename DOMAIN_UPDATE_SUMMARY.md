# Domain Configuration Update Summary

All OutreachPass domains have been updated to use the Base2ML domain structure.

## What Changed

### Brand Domains
**Old:**
- outreachpass.com
- govsafeconnect.com
- campuscard.io

**New:**
- outreachpass.base2ml.com
- govsafe.base2ml.com
- campuscard.base2ml.com

### Updated Files

#### Application Configuration
✅ `backend/app/core/config.py`
- CORS origins updated to Base2ML subdomains
- Brand domain mappings updated

#### Environment Configuration
✅ `backend/.env.example`
- CORS origins updated
- Default SES email: clindeman@base2ml.com
- Secret key provided

#### Database Seed
✅ `scripts/seed_database.sh`
- Tenant name: "Base2ML" (was "Default Tenant")
- Admin user: clindeman@base2ml.com
- Brand domains updated to base2ml.com subdomains

#### Documentation
✅ `README.md`
- Multi-brand section updated
- SES email examples updated

✅ `DOMAIN_CONFIG.md` (NEW)
- Complete domain setup guide
- DNS configuration instructions
- SSL/TLS certificate setup
- Brand management guide

✅ `DEPLOYMENT_NOTES.md` (NEW)
- Step-by-step deployment guide
- Testing procedures
- Monitoring setup
- Troubleshooting

## Current Configuration Summary

### Domains
```
Primary:     outreachpass.base2ml.com
Government:  govsafe.base2ml.com
Academic:    campuscard.base2ml.com
API:         [api-gateway-url] (or api.outreachpass.base2ml.com with custom domain)
```

### Admin User
```
Email:       clindeman@base2ml.com
Tenant:      Base2ML
Role:        OWNER
```

### Brand IDs
```
OutreachPass:    00000000-0000-0000-0000-000000000010
GovSafe:         00000000-0000-0000-0000-000000000011
CampusCard:      00000000-0000-0000-0000-000000000012
```

## No Changes Required

These files don't need updating (already correct or not domain-specific):
- Database schema (001_initial_schema.sql)
- Terraform infrastructure code
- Python application code (uses config.py)
- Build scripts
- Test scripts

## Before Deployment

### 1. Verify SES Email

```bash
aws ses verify-email-identity --email-address clindeman@base2ml.com
```

Check your email and click the verification link.

### 2. Update terraform.tfvars (Already Done!)

Your file already has:
```hcl
ses_from_email = "clindeman@base2ml.com"
database_master_password = "Lindy101"  # Change for production!
```

### 3. Optional: DNS Setup

For custom domains, you'll need to:
- Request ACM certificate for all Base2ML subdomains
- Configure DNS CNAME records
- Set up API Gateway custom domain

See [DOMAIN_CONFIG.md](DOMAIN_CONFIG.md) for details.

## Deployment Ready

Everything is configured for Base2ML domains. You can now deploy:

```bash
# Build Lambda package
make build

# Deploy infrastructure
make deploy

# Initialize database
make migrate
make seed

# Test
curl $(cd terraform && terraform output -raw api_endpoint)/health
```

## Testing URLs

Once deployed, your API will be at the API Gateway URL:

```
Health:      https://[api-id].execute-api.us-east-1.amazonaws.com/health
API Docs:    https://[api-id].execute-api.us-east-1.amazonaws.com/docs
Admin API:   https://[api-id].execute-api.us-east-1.amazonaws.com/api/v1/admin/events
```

Card URLs will use the configured brand domains:
```
Card view:   https://outreachpass.base2ml.com/c/{card_id}
VCF download: https://outreachpass.base2ml.com/c/{card_id}/vcard
```

## Next Steps

1. ✅ Domain configuration updated
2. ✅ Environment variables configured
3. ✅ Database seed data updated
4. ⏳ Deploy to AWS: `make deploy`
5. ⏳ Verify SES email
6. ⏳ Run migrations: `make migrate`
7. ⏳ Seed database: `make seed`
8. ⏳ Test API endpoints
9. ⏳ (Optional) Configure custom domains

## Questions?

See detailed documentation:
- [DOMAIN_CONFIG.md](DOMAIN_CONFIG.md) - Domain setup guide
- [DEPLOYMENT_NOTES.md](DEPLOYMENT_NOTES.md) - Deployment walkthrough
- [README.md](README.md) - Full technical documentation
- [QUICKSTART.md](QUICKSTART.md) - Quick start guide

---

**All systems configured for Base2ML deployment!** 🚀
