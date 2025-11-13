# OutreachPass - Quick Start Guide

## 🔗 Access Points

**Custom Domain**: https://outreachpass.base2ml.com ✅
**API Documentation**: https://outreachpass.base2ml.com/docs
**Default Endpoint**: https://r2h140rt0a.execute-api.us-east-1.amazonaws.com

## 🔐 Test Credentials

### Admin User
```
Email: admin@base2ml.com
Password: AdminPass123!
```

### Test User
```
Email: test@base2ml.com
Password: TestPass123!
```

## 🎯 Quick Test Commands

### Health Check
```bash
curl https://outreachpass.base2ml.com/health
```

### Database Status
```bash
curl https://outreachpass.base2ml.com/admin/db/status
```

### Get Brand IDs (for creating events)
```bash
# OutreachPass Brand
51f79a08-8613-4eeb-9b31-7ab819139fb8

# GovSafe Brand
14ade288-dab2-42fc-bc3c-42345c53d721

# CampusCard Brand
a34bd4d3-bde0-4257-880d-7ff7667766ed
```

## 📧 Important: SES Email Verification

⚠️ **Action Required**: Check your email at `clindeman@base2ml.com` for the AWS SES verification email and click the verification link. Until verified, emails will not be sent.

## 🚀 Next Steps

1. **Verify Email** - Check inbox for SES verification
2. **Explore API** - Visit https://outreachpass.base2ml.com/docs
3. **Create Test Event** - Use Swagger UI with admin credentials
4. **Test Card Issuance** - Create attendees and issue wallet passes

## 📚 Documentation

- Full deployment details: See `DEPLOYMENT_SUCCESS.md`
- API examples: See `API_EXAMPLES.md`
- Domain configuration: See `DOMAIN_CONFIG.md`

## 🛠️ AWS Resources

- **Lambda Function**: outreachpass-dev-api
- **User Pool**: us-east-1_SXH934qKt
- **Database Cluster**: outreachpass-dev
- **Assets Bucket**: outreachpass-dev-assets
- **Uploads Bucket**: outreachpass-dev-uploads
