# GitHub Secrets Setup Guide

## Quick Setup

Navigate to your GitHub repository:
**Settings → Secrets and variables → Actions → New repository secret**

---

## Required Secrets

### 1. AWS Credentials

**AWS_ACCESS_KEY_ID**
```
AKIAXXXXXXXXXXXXXXXX
```

**AWS_SECRET_ACCESS_KEY**
```
xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
```

**AWS_REGION**
```
us-east-1
```

**AWS_ACCOUNT_ID**
```
123456789012
```

---

### 2. Terraform Backend

**TERRAFORM_STATE_BUCKET**
```
outreachpass-terraform-state
```

**TERRAFORM_LOCK_TABLE**
```
terraform-state-locks
```

---

### 3. Build Artifacts

**ARTIFACT_BUCKET_NAME**
```
outreachpass-artifacts
```

---

### 4. Notifications (Optional)

**SLACK_WEBHOOK_URL** (optional - for deployment notifications)
```
https://hooks.slack.com/services/YOUR_WORKSPACE_ID/YOUR_CHANNEL_ID/YOUR_WEBHOOK_TOKEN
```

**DEPLOYMENT_EMAIL**
```
deployments@outreachpass.com
```

---

## GitHub Environments

Create production environment with approval gates:

1. Go to **Settings → Environments → New environment**
2. Name: `production`
3. Configure protection rules:
   - ✅ Required reviewers (add team members)
   - ✅ Wait timer: 5 minutes
   - ✅ Deployment branches: `main` only

4. Add environment-specific secrets (override repository secrets if needed)

Repeat for `development` environment (no protection rules needed).

---

## Verification

After adding secrets, test with:

```bash
# Trigger a workflow manually or push to a test branch
git push origin feature/cicd-pipeline
```

Check workflow run logs for:
- ✅ AWS credentials configured successfully
- ✅ Terraform backend accessible
- ✅ Build artifacts bucket accessible

---

## Security Notes

- Never log secrets in workflow outputs
- Use `secrets.` context to reference secrets
- Rotate AWS access keys every 90 days
- Use least-privilege IAM policies
- Enable MFA for IAM user (if human access needed)
