# Frontend Deployment Guide

**Date**: November 13, 2025  
**Status**: 🔄 **In Progress**  
**Priority**: 🔴 **HIGH**

---

## Overview

This guide covers deploying the OutreachPass frontend with proper authentication configuration to production.

---

## Prerequisites

- AWS CLI configured with admin access
- GitHub repository access with Actions enabled
- Cognito User Pool: `us-east-1_SXH934qKt`
- Cognito Client ID: `256e0chtcc14qf8m4knqmobdg0`
- Production domain: `https://outreachpassapp.base2ml.com`

---

## Step 1: Configure GitHub Secrets

Add these secrets to your GitHub repository:

**Navigate to**: Repository Settings → Secrets and variables → Actions → New repository secret

### Required Secrets:

```bash
# Add via GitHub UI or GitHub CLI
gh secret set NEXT_PUBLIC_API_URL --body "https://outreachpass.base2ml.com/api/v1"
gh secret set NEXT_PUBLIC_COGNITO_USER_POOL_ID --body "us-east-1_SXH934qKt"
gh secret set NEXT_PUBLIC_COGNITO_CLIENT_ID --body "256e0chtcc14qf8m4knqmobdg0"
gh secret set NEXT_PUBLIC_COGNITO_DOMAIN --body "outreachpass-dev"
gh secret set NEXT_PUBLIC_AWS_REGION --body "us-east-1"
gh secret set NEXT_PUBLIC_APP_URL --body "https://outreachpassapp.base2ml.com"
gh secret set AWS_ACCESS_KEY_ID --body "YOUR_AWS_ACCESS_KEY"
gh secret set AWS_SECRET_ACCESS_KEY --body "YOUR_AWS_SECRET_KEY"
```

---

## Step 2: Configure Cognito OAuth Settings

Update the Cognito User Pool Client with production callback URLs:

```bash
# First, verify current configuration
aws cognito-idp describe-user-pool-client \
  --user-pool-id us-east-1_SXH934qKt \
  --client-id 256e0chtcc14qf8m4knqmobdg0 \
  --region us-east-1

# Update with production URLs
aws cognito-idp update-user-pool-client \
  --user-pool-id us-east-1_SXH934qKt \
  --client-id 256e0chtcc14qf8m4knqmobdg0 \
  --allowed-o-auth-flows "code" \
  --allowed-o-auth-scopes "email" "openid" "profile" \
  --allowed-o-auth-flows-user-pool-client \
  --callback-urls \
    "https://outreachpassapp.base2ml.com/auth/callback" \
    "http://localhost:3000/auth/callback" \
  --logout-urls \
    "https://outreachpassapp.base2ml.com" \
    "http://localhost:3000" \
  --supported-identity-providers "COGNITO" \
  --region us-east-1

# Verify the update
aws cognito-idp describe-user-pool-client \
  --user-pool-id us-east-1_SXH934qKt \
  --client-id 256e0chtcc14qf8m4knqmobdg0 \
  --region us-east-1 \
  --query 'UserPoolClient.{CallbackURLs:CallbackURLs,LogoutURLs:LogoutURLs}'
```

---

## Step 3: Determine Deployment Target

Based on the project structure, we have multiple deployment options:

### Option 1: AWS Amplify (Recommended - Already Configured)
- ✅ GitHub Actions workflow exists (`.github/workflows/amplify-deploy.yml`)
- ✅ Supports Next.js 15 with SSR
- ✅ Auto-scaling and CDN included
- ✅ Custom domain support

### Option 2: AWS ECS (Alternative - Previously Used for Backend)
- Infrastructure exists from backend deployment
- Requires Docker containerization
- More control over infrastructure
- Higher maintenance overhead

### Option 3: Vercel (Simplest)
- Native Next.js platform
- Zero configuration required
- Automatic deployments from GitHub
- Free tier available

**Recommendation**: Use AWS Amplify since the workflow is already configured.

---

## Step 4: Deploy via AWS Amplify

### Option A: GitHub Actions (Automated)

The workflow at `.github/workflows/amplify-deploy.yml` will automatically:
1. Trigger on push to `main` branch
2. Build Next.js application with proper environment variables
3. Deploy to AWS Amplify
4. Provide deployment URL

**To trigger deployment**:
```bash
# Ensure you're on main branch
git checkout main

# Push changes (if any pending)
git add .
git commit -m "Configure authentication and deployment"
git push origin main

# OR manually trigger via GitHub UI
# Go to Actions → Deploy to AWS Amplify → Run workflow
```

### Option B: Manual AWS CLI Deployment

If you prefer manual control:

```bash
# Navigate to frontend directory
cd frontend-outreachpass

# Install dependencies
npm ci

# Build the application
NEXT_PUBLIC_API_URL="https://outreachpass.base2ml.com/api/v1" \
NEXT_PUBLIC_COGNITO_USER_POOL_ID="us-east-1_SXH934qKt" \
NEXT_PUBLIC_COGNITO_CLIENT_ID="256e0chtcc14qf8m4knqmobdg0" \
NEXT_PUBLIC_COGNITO_DOMAIN="outreachpass-dev" \
NEXT_PUBLIC_AWS_REGION="us-east-1" \
NEXT_PUBLIC_APP_URL="https://outreachpassapp.base2ml.com" \
npm run build

# Check for existing Amplify app
APP_ID=$(aws amplify list-apps --region us-east-1 \
  --query "apps[?name=='outreachpass-frontend'].appId" \
  --output text)

if [ -z "$APP_ID" ]; then
  echo "Creating new Amplify app..."
  APP_ID=$(aws amplify create-app \
    --name outreachpass-frontend \
    --description "OutreachPass event management frontend" \
    --platform WEB \
    --region us-east-1 \
    --environment-variables \
      NEXT_PUBLIC_API_URL=https://outreachpass.base2ml.com/api/v1 \
      NEXT_PUBLIC_COGNITO_USER_POOL_ID=us-east-1_SXH934qKt \
      NEXT_PUBLIC_COGNITO_CLIENT_ID=256e0chtcc14qf8m4knqmobdg0 \
      NEXT_PUBLIC_COGNITO_DOMAIN=outreachpass-dev \
      NEXT_PUBLIC_AWS_REGION=us-east-1 \
      NEXT_PUBLIC_APP_URL=https://outreachpassapp.base2ml.com \
    --query 'app.appId' \
    --output text)
  echo "Created app: $APP_ID"
fi

# Create deployment package
cd .next
zip -r ../deployment.zip . -x "*.git*"
cd ..

# Create and start deployment
DEPLOYMENT=$(aws amplify create-deployment \
  --app-id $APP_ID \
  --branch-name main \
  --region us-east-1)

JOB_ID=$(echo $DEPLOYMENT | jq -r '.jobId')
UPLOAD_URL=$(echo $DEPLOYMENT | jq -r '.zipUploadUrl')

echo "Uploading deployment..."
curl -X PUT "$UPLOAD_URL" \
  --upload-file deployment.zip \
  -H "Content-Type: application/zip"

aws amplify start-deployment \
  --app-id $APP_ID \
  --branch-name main \
  --job-id $JOB_ID \
  --region us-east-1

echo "Deployment started. Check status with:"
echo "aws amplify get-job --app-id $APP_ID --branch-name main --job-id $JOB_ID --region us-east-1"
```

---

## Step 5: Configure Custom Domain (Optional)

If using custom domain `outreachpassapp.base2ml.com`:

```bash
# Get Amplify app ID
APP_ID=$(aws amplify list-apps --region us-east-1 \
  --query "apps[?name=='outreachpass-frontend'].appId" \
  --output text)

# Add custom domain
aws amplify create-domain-association \
  --app-id $APP_ID \
  --domain-name base2ml.com \
  --sub-domain-settings \
    prefix=outreachpassapp,branchName=main \
  --region us-east-1

# Get DNS records to configure
aws amplify get-domain-association \
  --app-id $APP_ID \
  --domain-name base2ml.com \
  --region us-east-1
```

Add the provided DNS records to your Route53 or DNS provider.

---

## Step 6: Local Testing Before Deployment

Test authentication flow locally first:

```bash
cd frontend-outreachpass

# Create .env.local
cat > .env.local <<EOF
NEXT_PUBLIC_API_URL=https://outreachpass.base2ml.com/api/v1
NEXT_PUBLIC_COGNITO_USER_POOL_ID=us-east-1_SXH934qKt
NEXT_PUBLIC_COGNITO_CLIENT_ID=256e0chtcc14qf8m4knqmobdg0
NEXT_PUBLIC_COGNITO_DOMAIN=outreachpass-dev
NEXT_PUBLIC_AWS_REGION=us-east-1
NEXT_PUBLIC_APP_URL=http://localhost:3000
EOF

# Install dependencies
npm install

# Start development server
npm run dev

# Test in browser:
# 1. Visit http://localhost:3000
# 2. Click "Sign In"
# 3. Should redirect to Cognito hosted UI
# 4. Login with test user
# 5. Should redirect back to /admin/dashboard
# 6. Try accessing /admin/events directly (should work if logged in)
# 7. Sign out and try /admin/events (should redirect to /)
```

---

## Step 7: Verify Production Deployment

After deployment completes:

### Check Deployment Status:
```bash
APP_ID=$(aws amplify list-apps --region us-east-1 \
  --query "apps[?name=='outreachpass-frontend'].appId" \
  --output text)

# Get deployment URL
aws amplify get-app \
  --app-id $APP_ID \
  --region us-east-1 \
  --query 'app.defaultDomain' \
  --output text

# Check recent jobs
aws amplify list-jobs \
  --app-id $APP_ID \
  --branch-name main \
  --region us-east-1 \
  --max-results 5
```

### Test Production Authentication:
1. Visit production URL (e.g., `https://main.d1234abcd.amplifyapp.com` or `https://outreachpassapp.base2ml.com`)
2. Click "Sign In" → Should redirect to Cognito
3. Login → Should redirect to `/admin/dashboard`
4. Verify protected routes work
5. Test sign-out functionality
6. Verify unauthenticated access redirects to `/`

### Test API Integration:
```bash
# Verify API connectivity from frontend
# Open browser console on /admin/dashboard
# Should see successful API calls with Authorization headers
```

---

## Deployment Checklist

- [ ] GitHub secrets configured
- [ ] Cognito OAuth callback URLs updated
- [ ] Local authentication testing passed
- [ ] Deployment triggered (GitHub Actions or manual)
- [ ] Deployment completed successfully
- [ ] Production URL accessible
- [ ] Authentication flow works in production
- [ ] Protected routes enforce authentication
- [ ] API calls include JWT tokens
- [ ] Sign-out functionality works
- [ ] Custom domain configured (if applicable)
- [ ] DNS records updated (if applicable)

---

## Troubleshooting

### Issue: "Invalid redirect_uri" error
**Cause**: Cognito callback URLs not configured  
**Fix**: Run Step 2 to update Cognito OAuth settings

### Issue: "Missing environment variables" in build
**Cause**: GitHub secrets not set  
**Fix**: Run Step 1 to add all required secrets

### Issue: Authentication succeeds but redirects to error page
**Cause**: APP_URL mismatch between Cognito and frontend config  
**Fix**: Ensure NEXT_PUBLIC_APP_URL matches exactly in both places

### Issue: Deployment fails with "module not found"
**Cause**: Dependencies not installed or package.json issues  
**Fix**: Run `npm ci` locally to verify, check package.json

### Issue: Page loads but shows "Loading..." forever
**Cause**: Amplify configuration not loading correctly  
**Fix**: Check browser console for errors, verify environment variables in Amplify console

---

## Current Deployment Targets

### Backend API
- **URL**: `https://outreachpass.base2ml.com/api/v1`
- **Platform**: AWS ECS with Application Load Balancer
- **Status**: ✅ Deployed and operational

### Frontend Application
- **Target URL**: `https://outreachpassapp.base2ml.com`
- **Platform**: AWS Amplify (recommended)
- **Status**: 🔄 Ready for deployment

---

## Next Steps After Deployment

1. **End-to-End Testing**
   - Complete authentication flows
   - Test all admin features
   - Verify API integration

2. **CSV Validation Testing**
   - Test file size limits (>5MB)
   - Test row count limits (>10K)
   - Test encoding validation

3. **Performance Testing**
   - Load time analysis
   - API response times
   - Authentication flow performance

4. **Security Validation**
   - Verify all routes protected
   - Check JWT token handling
   - Test session management

---

## Additional Resources

- [AWS Amplify Documentation](https://docs.aws.amazon.com/amplify/)
- [Next.js Deployment Guide](https://nextjs.org/docs/deployment)
- [Cognito OAuth Configuration](https://docs.aws.amazon.com/cognito/latest/developerguide/cognito-user-pools-app-integration.html)
- [GitHub Actions Secrets](https://docs.github.com/en/actions/security-guides/encrypted-secrets)

---

**Status**: Ready to deploy after completing Steps 1-2
