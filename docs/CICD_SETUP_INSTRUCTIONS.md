# CI/CD Setup Instructions

**Status**: ✅ Infrastructure Created | ⏳ Awaiting GitHub Configuration
**Branch**: `feature/cicd-pipeline` (pushed to remote)
**Date**: 2025-11-17

---

## Quick Start Summary

✅ **Already Completed:**
- AWS S3 buckets created (terraform-state, artifacts)
- DynamoDB table created (state locking)
- All CI/CD workflows implemented
- Feature branch pushed to GitHub

⏳ **Next Steps:**
1. Configure GitHub Secrets
2. Create GitHub Environments
3. Set up Branch Protection Rules
4. Test the PR validation workflow
5. Merge to main when validated

---

## Step 1: Configure GitHub Secrets

Navigate to: **https://github.com/slimhindrance/outreachpass/settings/secrets/actions**

### Repository Secrets (Required)

Click **"New repository secret"** for each:

```
Name: AWS_ACCESS_KEY_ID
Value: [Your AWS access key]

Name: AWS_SECRET_ACCESS_KEY
Value: [Your AWS secret key]

Name: AWS_REGION
Value: us-east-1

Name: AWS_ACCOUNT_ID
Value: 741783034843

Name: TERRAFORM_STATE_BUCKET
Value: outreachpass-terraform-state

Name: ARTIFACT_BUCKET_NAME
Value: outreachpass-artifacts
```

### Environment Secrets (Required)

You'll add these in Step 2 when creating environments.

---

## Step 2: Create GitHub Environments

Navigate to: **https://github.com/slimhindrance/outreachpass/settings/environments**

### Create Development Environment

1. Click **"New environment"**
2. Name: `development`
3. No protection rules needed
4. Click **"Configure environment"**
5. Add environment secrets:

```
Name: APP_RUNNER_SERVICE_ARN_DEV
Value: [Your dev App Runner service ARN]
Example: arn:aws:apprunner:us-east-1:741783034843:service/outreachpass-dev/xxxxx

Name: NEXT_PUBLIC_API_URL_DEV
Value: https://dev-api.outreachpass.base2ml.com
(or your dev API URL)
```

6. Save environment

### Create Production Environment

1. Click **"New environment"**
2. Name: `production`
3. **Enable "Required reviewers"**
4. Add yourself as a required reviewer
5. Add environment secrets:

```
Name: APP_RUNNER_SERVICE_ARN_PROD
Value: [Your prod App Runner service ARN]
Example: arn:aws:apprunner:us-east-1:741783034843:service/outreachpass-prod/xxxxx

Name: NEXT_PUBLIC_API_URL_PROD
Value: https://api.outreachpass.base2ml.com
(or your prod API URL)
```

6. Save environment

---

## Step 3: Set Up Branch Protection Rules

Navigate to: **https://github.com/slimhindrance/outreachpass/settings/branches**

### Protect `main` Branch

1. Click **"Add branch protection rule"**
2. Branch name pattern: `main`
3. Enable the following settings:

**Required:**
- ✅ Require a pull request before merging
- ✅ Require approvals: 1
- ✅ Require status checks to pass before merging
  - Search and add these required checks:
    - `Backend Tests & Lint`
    - `Frontend Tests & Lint`
    - `Terraform Validation`
    - `Security Scanning`
- ✅ Require conversation resolution before merging
- ✅ Do not allow bypassing the above settings (includes administrators)
- ✅ Require linear history
- ✅ Block force pushes

4. Click **"Create"**

---

## Step 4: Test the CI/CD Pipeline

### Option A: Test PR Validation (Recommended)

Create a test PR from your feature branch:

```bash
# On GitHub, click "Create Pull Request" for feature/cicd-pipeline
# Or use GitHub CLI:
gh pr create --base main --head feature/cicd-pipeline \
  --title "CI/CD Pipeline Implementation" \
  --body "Complete CI/CD infrastructure with automated testing and deployment"
```

**Expected Results:**
- ✅ PR Validation workflow runs automatically
- ✅ All 4 jobs complete (backend, frontend, terraform, security)
- ✅ PR comment with summary appears
- ✅ Status checks show as required

### Option B: Manual Workflow Dispatch

You can also manually trigger workflows:

1. Go to **Actions** tab
2. Select a workflow (e.g., "PR Validation")
3. Click **"Run workflow"**
4. Select branch: `feature/cicd-pipeline`
5. Click **"Run workflow"**

---

## Step 5: Deployment Testing (Optional)

**⚠️ WARNING**: Only proceed if you want to test actual deployments

### Test Backend Deployment

```bash
# Make a small change to trigger backend workflow
echo "# CI/CD Test" >> backend/README.md
git add backend/README.md
git commit -m "test: Trigger backend deployment"
git push origin feature/cicd-pipeline
```

Watch in GitHub Actions:
1. Build job creates Lambda package
2. Deploy to dev (automatic)
3. Health checks run
4. Manual approval gate for prod

### Test Worker Deployment

```bash
# Trigger worker deployment
touch backend/app/services/test_worker.py
git add backend/app/services/test_worker.py
git commit -m "test: Trigger worker deployment"
git push origin feature/cicd-pipeline
```

### Test Frontend Deployment

```bash
# Trigger frontend deployment (if frontend directory exists)
echo "# CI/CD Test" >> frontend-outreachpass/README.md
git add frontend-outreachpass/README.md
git commit -m "test: Trigger frontend deployment"
git push origin feature/cicd-pipeline
```

### Test Terraform Workflows

```bash
# Make a terraform change
echo "# Test" >> terraform/README.md
git add terraform/README.md
git commit -m "test: Trigger terraform plan"
git push origin feature/cicd-pipeline

# Create PR to see terraform plan output
```

---

## Step 6: Monitor Deployments

### GitHub Actions Dashboard

View all workflow runs:
**https://github.com/slimhindrance/outreachpass/actions**

### Useful Commands

```bash
# View recent workflow runs
gh run list --limit 10

# Watch a specific run
gh run watch <run-id>

# View logs for a failed run
gh run view <run-id> --log-failed
```

### AWS Resources to Monitor

```bash
# Check Lambda function status
aws lambda get-function --function-name outreachpass-api-dev
aws lambda get-function --function-name outreachpass-worker-dev

# Check Lambda logs
aws logs tail /aws/lambda/outreachpass-api-dev --follow

# Check App Runner service
aws apprunner list-services --region us-east-1

# Check S3 artifacts
aws s3 ls s3://outreachpass-artifacts/

# Check Terraform state
aws s3 ls s3://outreachpass-terraform-state/
```

---

## Step 7: Merge to Main

Once all tests pass:

1. **Review the PR**
   - Check all workflow runs completed successfully
   - Review the code changes
   - Ensure documentation is up to date

2. **Merge the PR**
   ```bash
   # Option 1: GitHub UI
   # Click "Squash and merge" or "Merge pull request"

   # Option 2: GitHub CLI
   gh pr merge feature/cicd-pipeline --squash
   ```

3. **Verify main branch**
   ```bash
   git checkout main
   git pull origin main
   git log --oneline -n 3
   ```

4. **Delete feature branch** (optional)
   ```bash
   git branch -d feature/cicd-pipeline
   git push origin --delete feature/cicd-pipeline
   ```

---

## Troubleshooting

### Workflow Fails with "Resource not found"

**Issue**: AWS resources (Lambda, App Runner) don't exist yet
**Solution**: Create base infrastructure first using Terraform

### Secrets Not Found

**Issue**: `Error: Secret AWS_ACCESS_KEY_ID not found`
**Solution**: Double-check secret names match exactly (case-sensitive)

### Permission Denied

**Issue**: AWS permissions error
**Solution**: Verify IAM user has required permissions:
- S3: Full access to terraform-state and artifacts buckets
- DynamoDB: Read/write to terraform-state-locks table
- Lambda: Full access (for deployments)
- ECR: Full access (for Docker images)
- App Runner: Full access (for frontend)

### Health Checks Failing

**Issue**: Health check endpoint returns 404 or 500
**Solution**:
```bash
# Test locally
curl -v https://dev-api.outreachpass.base2ml.com/health

# Check Lambda logs
aws logs tail /aws/lambda/outreachpass-api-dev --follow
```

### Terraform Plan Fails

**Issue**: Terraform can't initialize or plan
**Solution**:
```bash
# Verify Terraform state bucket
aws s3 ls s3://outreachpass-terraform-state/

# Verify DynamoDB table
aws dynamodb describe-table --table-name terraform-state-locks

# Test terraform locally
cd terraform
terraform init -backend-config="key=dev/terraform.tfstate"
terraform plan -var-file="environments/dev/terraform.tfvars"
```

---

## Rollback Procedures

### If CI/CD Causes Issues

1. **Don't panic** - feature branch is isolated
2. **Revert the merge** (if already merged to main)
   ```bash
   git revert -m 1 <merge-commit-hash>
   git push origin main
   ```

3. **Disable workflows** (temporary)
   - Go to Actions tab
   - Click on workflow
   - Click "..." → "Disable workflow"

4. **Manual deployment** still works
   - All previous deployment scripts unchanged
   - Can deploy manually using existing methods

### Nuke All Infrastructure

**⚠️ DESTRUCTIVE - Only use to completely deprecate project**

```bash
./scripts/nuke-aws-infrastructure.sh
```

This will:
- Delete all S3 buckets and contents
- Delete DynamoDB table
- Require explicit confirmation
- Generate detailed log file

---

## Success Checklist

Before considering CI/CD fully operational:

- [ ] All GitHub secrets configured
- [ ] Development environment created
- [ ] Production environment created with approval gate
- [ ] Branch protection rules active on `main`
- [ ] PR validation workflow tested and passing
- [ ] Backend deployment tested in dev
- [ ] Worker deployment tested in dev
- [ ] Frontend deployment tested in dev (if applicable)
- [ ] Terraform workflows tested
- [ ] Manual approval workflow tested for prod
- [ ] Health checks working correctly
- [ ] Rollback procedure tested
- [ ] Team trained on new workflows
- [ ] Documentation reviewed and understood

---

## Next Steps After Merge

1. **Update team processes**
   - New PR workflow: create PR → wait for checks → merge
   - Deployment approval: designated approvers for prod
   - Monitoring: regular check of GitHub Actions tab

2. **Consider enhancements**
   - Integration tests in CI
   - Load testing automation
   - Canary deployments
   - Multi-region support
   - Slack/email notifications

3. **Maintain infrastructure**
   - Monthly review of S3 artifact storage
   - Quarterly review of Terraform state size
   - Update documentation as processes evolve

---

## Resources

- **Implementation Summary**: `docs/CICD_IMPLEMENTATION_SUMMARY.md`
- **Architecture Docs**: `docs/cicd-architecture.md`
- **AWS Resources**: `docs/AWS_INFRASTRUCTURE_INVENTORY.md`
- **Secrets Guide**: `docs/secrets-management.md`
- **Terraform Migration**: `docs/terraform-state-migration.md`
- **Branch Protection**: `docs/branch-protection-setup.md`

**Support**:
- GitHub Actions Docs: https://docs.github.com/en/actions
- AWS Lambda Docs: https://docs.aws.amazon.com/lambda/
- Terraform Docs: https://www.terraform.io/docs

---

**Status**: Ready for GitHub configuration and testing
**Created**: 2025-11-17
**Last Updated**: 2025-11-17
