# OutreachPass Frontend Deployment Guide

## Deployment Status: ✅ LIVE

**Live URL**: https://outreachpassapp.base2ml.com

---

## Infrastructure Overview

### AWS Resources

**S3 Bucket**
- Name: `dev-outreachpass-frontend`
- Purpose: Static website hosting
- Region: us-east-1
- Public access: Enabled for website hosting

**CloudFront Distribution**
- ID: `E37NUBLQTONXI0`
- Custom Domain: outreachpassapp.base2ml.com
- SSL Certificate: ACM certificate (TLS 1.2)
- Price Class: PriceClass_100 (US, Canada, Europe)
- Caching: 1 hour default, 1 year for static assets

**ACM Certificate**
- ARN: `arn:aws:acm:us-east-1:741783034843:certificate/7a8eb69e-1ba6-4220-bcca-2b79d11200e0`
- Domain: outreachpassapp.base2ml.com
- Status: Issued
- Validation: DNS (Route 53)

**Route 53**
- Hosted Zone ID: Z09099671VTWA1L2CL021
- A Record: outreachpassapp.base2ml.com → CloudFront

---

## Technology Stack

- **Framework**: Next.js 15 with App Router
- **Language**: TypeScript
- **Styling**: Tailwind CSS
- **State Management**: TanStack Query + Zustand
- **Authentication**: AWS Cognito (Hosted UI)
- **Build Output**: Static export (`output: 'export'`)
- **Deployment**: S3 + CloudFront

---

## Quick Deployment

### Automated Deployment

```bash
cd frontend-outreachpass
./scripts/deploy.sh
```

The deploy script will:
1. Install dependencies
2. Run type checking
3. Run linting
4. Build production bundle
5. Sync to S3
6. Invalidate CloudFront cache

### Manual Deployment

```bash
# Build
npm run build

# Deploy to S3
aws s3 sync out/ s3://dev-outreachpass-frontend --delete

# Invalidate CloudFront cache
aws cloudfront create-invalidation \
  --distribution-id E37NUBLQTONXI0 \
  --paths "/*"
```

---

## Environment Configuration

### Environment Variables

Create `.env.local` file:

```bash
# Copy from example
cp .env.local.example .env.local
```

Required variables:
- `NEXT_PUBLIC_API_URL`: Backend API URL (default: https://outreachpass.base2ml.com)
- `NEXT_PUBLIC_COGNITO_USER_POOL_ID`: us-east-1_SXH934qKt
- `NEXT_PUBLIC_COGNITO_CLIENT_ID`: 256e0chtcc14qf8m4knqmobdg0
- `NEXT_PUBLIC_COGNITO_DOMAIN`: outreachpass-dev
- `NEXT_PUBLIC_AWS_REGION`: us-east-1

---

## Development Workflow

### Local Development

```bash
# Install dependencies
npm install

# Run development server
npm run dev
```

Open http://localhost:3000

### Type Checking

```bash
npm run type-check
```

### Linting

```bash
npm run lint
```

### Building

```bash
npm run build
```

Output directory: `out/`

---

## Terraform Management

### Infrastructure Code

Location: `/terraform/modules/frontend/`

Files:
- `main.tf` - S3 bucket, CloudFront distribution, Route 53 record
- `variables.tf` - Module inputs
- `outputs.tf` - Module outputs

### Updating Infrastructure

```bash
cd terraform

# Initialize (if needed)
terraform init

# Plan changes
terraform plan -var-file="terraform.tfvars"

# Apply changes
terraform apply -var-file="terraform.tfvars"
```

### Terraform Outputs

```bash
terraform output
```

Returns:
- `frontend_url`: https://outreachpassapp.base2ml.com
- `frontend_bucket`: dev-outreachpass-frontend
- `cloudfront_distribution_id`: E37NUBLQTONXI0

---

## Monitoring & Debugging

### Check Deployment Status

```bash
# Check S3 bucket contents
aws s3 ls s3://dev-outreachpass-frontend/

# Check CloudFront distribution status
aws cloudfront get-distribution --id E37NUBLQTONXI0

# Check DNS resolution
dig outreachpassapp.base2ml.com
```

### CloudFront Cache

```bash
# Invalidate entire cache
aws cloudfront create-invalidation \
  --distribution-id E37NUBLQTONXI0 \
  --paths "/*"

# Invalidate specific paths
aws cloudfront create-invalidation \
  --distribution-id E37NUBLQTONXI0 \
  --paths "/index.html" "/_next/*"
```

### View Logs

- CloudFront access logs (if enabled)
- S3 bucket logs (if enabled)
- Browser DevTools network tab

---

## Performance Optimization

### Caching Strategy

**HTML Files** (`index.html`, `404.html`):
- Cache-Control: no-cache
- Always fetch fresh from origin

**Static Assets** (`/_next/static/*`):
- Cache-Control: max-age=31536000, immutable
- Cached for 1 year (content-hashed filenames)

**Other Files**:
- Default TTL: 1 hour
- Max TTL: 24 hours

### Bundle Size

Current build:
- First Load JS: ~102 KB
- Route (/) size: 3.45 KB
- Total export: ~1.1 MB

---

## Security

### HTTPS Only
- CloudFront configured with `redirect-to-https`
- SSL certificate: TLS 1.2 minimum

### Origin Access Control
- S3 bucket accessed via CloudFront OAC
- Direct S3 access disabled for security

### CORS
- API requests to backend use proper CORS headers
- Credentials mode for authenticated requests

---

## Troubleshooting

### Issue: 404 errors on refresh

**Solution**: CloudFront configured with custom error responses to serve `index.html` for 403/404 errors (SPA routing).

### Issue: Stale content after deployment

**Solution**:
1. Ensure CloudFront invalidation completed
2. Clear browser cache
3. Wait 1-2 minutes for propagation

### Issue: Build fails

**Solution**:
1. Check TypeScript errors: `npm run type-check`
2. Check linting errors: `npm run lint`
3. Review error messages in build output

### Issue: Cannot connect to API

**Solution**:
1. Verify `NEXT_PUBLIC_API_URL` is correct
2. Check CORS configuration on backend
3. Check browser network tab for errors

---

## Next Steps

### Planned Features

1. **Admin Dashboard** - Event management, attendee management, analytics
2. **Attendee Portal** - Profile management, pass downloads
3. **Exhibitor Portal** - Lead capture, analytics
4. **Public Pages** - Enhanced contact cards, landing pages
5. **Cognito Integration** - Full authentication flow
6. **Real-time Updates** - WebSocket integration for live data

### Additional Infrastructure

1. **WAF** - Web Application Firewall for security
2. **CloudWatch Monitoring** - Metrics and alarms
3. **CloudFront Logs** - Access logging for analytics
4. **CI/CD Pipeline** - GitHub Actions for automated deployment

---

## Support & Documentation

- **Frontend Repository**: `/frontend-outreachpass`
- **Backend API**: https://outreachpass.base2ml.com/docs
- **Terraform Docs**: `/terraform/modules/frontend/`
- **README**: `/frontend-outreachpass/README.md`

---

## Deployment History

**Initial Deployment**: November 10, 2025
- Next.js 15 setup
- S3 + CloudFront infrastructure
- Custom domain configuration
- Landing page deployed

---

**Status**: Production Ready ✅
**Last Updated**: November 10, 2025
