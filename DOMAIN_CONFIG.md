# Domain Configuration

OutreachPass is deployed under the Base2ML domain structure.

## Brand Domains

All brands are deployed as subdomains of `base2ml.com`:

### OutreachPass (Primary)
- **Domain**: `outreachpass.base2ml.com`
- **Purpose**: General events, conferences, networking
- **Features**: Full feature set (wallet, analytics, leads)
- **Brand ID**: `00000000-0000-0000-0000-000000000010`

### GovSafe Connect
- **Domain**: `govsafe.base2ml.com`
- **Purpose**: Government, sensitive events
- **Features**: Privacy-focused, no analytics, strict mode
- **Brand ID**: `00000000-0000-0000-0000-000000000011`

### CampusCard
- **Domain**: `campuscard.base2ml.com`
- **Purpose**: Universities, academic conferences
- **Features**: Scholar links, student-focused
- **Brand ID**: `00000000-0000-0000-0000-000000000012`

## DNS Setup Required

To complete deployment, configure these DNS records in your Base2ML domain:

### For API (API Gateway Custom Domain)

```
Type: CNAME
Name: api.outreachpass.base2ml.com
Value: [API Gateway domain from Terraform output]
TTL: 300
```

### For Frontend (CloudFront - Future)

```
Type: CNAME
Name: outreachpass.base2ml.com
Value: [CloudFront distribution domain]
TTL: 300

Type: CNAME
Name: govsafe.base2ml.com
Value: [CloudFront distribution domain]
TTL: 300

Type: CNAME
Name: campuscard.base2ml.com
Value: [CloudFront distribution domain]
TTL: 300
```

## SSL/TLS Certificates

### Option 1: AWS Certificate Manager (Recommended)

```bash
# Request certificate for all domains
aws acm request-certificate \
  --domain-name outreachpass.base2ml.com \
  --subject-alternative-names \
    govsafe.base2ml.com \
    campuscard.base2ml.com \
    api.outreachpass.base2ml.com \
  --validation-method DNS \
  --region us-east-1

# Follow DNS validation instructions in ACM console
```

### Option 2: Existing Certificate

If you already have a wildcard certificate for `*.base2ml.com`, use that ARN in your Terraform configuration.

## Current Configuration

All configuration is centralized in:

### Backend Config
**File**: `backend/app/core/config.py`

```python
CORS_ORIGINS = [
    "http://localhost:3000",
    "https://outreachpass.base2ml.com",
    "https://govsafe.base2ml.com",
    "https://campuscard.base2ml.com"
]

BRAND_DOMAINS = {
    "OUTREACHPASS": "https://outreachpass.base2ml.com",
    "GOVSAFE": "https://govsafe.base2ml.com",
    "CAMPUSCARD": "https://campuscard.base2ml.com"
}
```

### Database Seed Data
**File**: `scripts/seed_database.sh`

Creates three brands with respective domains in the database.

### Environment Variables
**File**: `backend/.env`

```env
CORS_ORIGINS=http://localhost:3000,https://outreachpass.base2ml.com
```

## URL Examples

After deployment:

### API Endpoints
- Health: `https://api.outreachpass.base2ml.com/health`
- Docs: `https://api.outreachpass.base2ml.com/docs`
- Admin: `https://api.outreachpass.base2ml.com/api/v1/admin/events`

### Public Card URLs
- Card view: `https://outreachpass.base2ml.com/c/{card_id}`
- VCard download: `https://outreachpass.base2ml.com/c/{card_id}/vcard`

### Event Landing Pages
- Event: `https://outreachpass.base2ml.com/e/{event_slug}`

## Testing Locally

For local development, use `localhost:8000`:

```bash
# Start dev server
make dev

# Test endpoints
curl http://localhost:8000/health
curl http://localhost:8000/docs
```

## Deployment Checklist

- [x] Update `backend/app/core/config.py` with Base2ML domains
- [x] Update `backend/.env.example` with correct CORS
- [x] Update `scripts/seed_database.sh` with correct domains
- [ ] Request ACM certificate for all domains
- [ ] Validate ACM certificate via DNS
- [ ] Configure API Gateway custom domain
- [ ] Update DNS CNAME records
- [ ] Deploy infrastructure with `make deploy`
- [ ] Test all brand domains

## Adding New Brands

To add a new brand under Base2ML:

1. **Choose subdomain**: `newbrand.base2ml.com`

2. **Update config** (`backend/app/core/config.py`):
```python
CORS_ORIGINS.append("https://newbrand.base2ml.com")
BRAND_DOMAINS["NEWBRAND"] = "https://newbrand.base2ml.com"
```

3. **Add to database**:
```sql
INSERT INTO brands (brand_id, tenant_id, brand_key, display_name, domain, theme_json, features_json)
VALUES (
  gen_random_uuid(),
  '00000000-0000-0000-0000-000000000001',
  'NEWBRAND',
  'New Brand',
  'newbrand.base2ml.com',
  '{"primary_color": "#ff0000"}',
  '{}'
);
```

4. **Add DNS record** for `newbrand.base2ml.com`

5. **Update ACM certificate** to include new subdomain

## Security Notes

- All domains require HTTPS (enforced by API Gateway/CloudFront)
- CORS is restricted to configured Base2ML subdomains only
- API authentication via Cognito for admin endpoints
- Public endpoints (cards, VCF) are unauthenticated for easy sharing

---

**Domain Owner**: Base2ML
**Managed By**: Chris Lindeman (clindeman@base2ml.com)
