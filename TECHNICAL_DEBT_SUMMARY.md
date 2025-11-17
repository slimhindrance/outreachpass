# Technical Debt Summary - Quick Reference
**Generated**: November 16, 2025

## Critical Issues (Fix Immediately)

### 1. 5,600 Build Files Tracked in Git (100MB)
**Path**: `lambda-worker-build/*`  
**Impact**: Massive repo bloat, secrets exposure  
**Fix Time**: 5 minutes  
**Action**:
```bash
git rm --cached -r lambda-worker-build/
echo "lambda-worker-build/" >> .gitignore
git commit -m "Remove lambda-worker-build from git"
```

### 2. Terraform Secrets in Git
**Paths**: 
- `terraform/terraform.tfstate` (89KB)
- `terraform/terraform.tfstate.backup` (89KB)
- `terraform/.terraform/*`

**Impact**: Credentials exposed  
**Fix Time**: 10 minutes  
**Action**:
```bash
git rm --cached terraform/terraform.tfstate*
git rm --cached -r terraform/.terraform/
echo ".terraform/" >> .gitignore
git commit -m "Move Terraform state to remote backend"
```

### 3. Credentials in Version Control
**Paths**:
- `outreachpass-8a62f110aeef.json` (root)
- `backend/outreachpass-8a62f110aeef.json`
- `backend/google-wallet-credentials.json`

**Impact**: Security breach  
**Fix Time**: 5 minutes  
**Action**:
```bash
git rm --cached outreachpass-*.json
git rm --cached backend/google-wallet-credentials.json
echo "*.json" >> .gitignore
git commit -m "Security: Remove credentials from git"
```

---

## High Priority (Clean Up This Week)

### 4. Old Deployment Zip Files (171MB)
**Files to Delete**:
- `worker-deployment 2.zip` (57MB)
- `worker-deployment 3.zip` (57MB)
- `worker-deployment 4.zip` (57MB)

**Keep**: `worker-deployment.zip` (latest)

**Action**:
```bash
rm -f worker-deployment\ {2,3,4}.zip
```

### 5. Duplicate Documentation
**Remove**:
- `QUICK_START.md` → Use `QUICKSTART.md` instead
- `DEPLOYMENT_SUCCESS.md` → Archive
- `DEPLOYMENT_STATUS.md` → Archive
- `SETUP_COMPLETE.md` → Archive

**Create**: Consolidated `DEPLOYMENT.md`

**Action**:
```bash
rm QUICK_START.md
git rm QUICK_START.md
# Archive old dated docs
git commit -m "Consolidate deployment documentation"
```

---

## Medium Priority (Clean Up This Sprint)

### 6. Unused Build Directories
**Delete**:
- `build 2/` (incomplete, only 1KB)
- `lambda_package/` (empty)

**Action**:
```bash
rm -rf "build 2" lambda_package
git add -A && git commit -m "Remove unused build directories"
```

### 7. Unused Dockerfile Variants
**Delete**:
- `frontend-outreachpass/Dockerfile.simple`
- `frontend-outreachpass/Dockerfile.light`

**Keep**: `frontend-outreachpass/Dockerfile`

**Action**:
```bash
rm frontend-outreachpass/Dockerfile.{simple,light}
git add -A && git commit -m "Remove unused Dockerfile variants"
```

### 8. Unclear Script Usage
**Investigate**:
- `scripts/build_lambda_combined.sh` - Is this used?
- `scripts/deploy_worker_via_s3.sh` - Still relevant?

**Action**:
```bash
grep -r "build_lambda_combined\|deploy_worker_via_s3" . --include="*.sh" --include="*.yml"
# If no results, archive or document deprecation
```

---

## Files Status Reference

### CRITICAL - Remove from Git
```
lambda-worker-build/              [5,600 files tracked, should auto-generate]
terraform/terraform.tfstate       [State file with secrets]
terraform/terraform.tfstate.backup [Backup state]
terraform/.terraform/             [Provider binaries]
outreachpass-*.json               [Credentials]
backend/*-credentials.json        [Credentials]
```

### HIGH - Delete Locally
```
worker-deployment 2.zip
worker-deployment 3.zip
worker-deployment 4.zip
QUICK_START.md
DEPLOYMENT_SUCCESS.md
SETUP_COMPLETE.md
DEPLOYMENT_STATUS.md
DOMAIN_UPDATE_SUMMARY.md
```

### MEDIUM - Clean Up
```
build 2/
lambda_package/
frontend-outreachpass/Dockerfile.simple
frontend-outreachpass/Dockerfile.light
scripts/build_lambda_combined.sh  [verify not needed]
scripts/deploy_worker_via_s3.sh   [verify not needed]
```

### SAFE TO KEEP
```
build/                            [auto-generated, can delete locally]
lambda-email-forwarder/           [active SES Lambda]
QUICKSTART.md                     [canonical startup guide]
README.md                         [project overview]
DEPLOYMENT_NOTES.md               [active reference]
FRONTEND_DEPLOYMENT_GUIDE.md      [frontend-specific]
Dockerfile                        [production frontend image]
```

---

## Risk Assessment

| Item | Risk | Impact | Reversibility |
|------|------|--------|----------------|
| Remove lambda-worker-build from git | LOW | Auto-regenerates | Easy |
| Remove terraform state files | LOW | Use S3 backend | Medium |
| Remove credentials | CRITICAL | Security must | Hard - need history rewrite |
| Delete old zip files | LOW | Just old builds | Easy |
| Delete duplicate docs | LOW | Clear up confusion | Easy |
| Delete build directories | LOW | Regenerate with build | Easy |
| Delete Dockerfile variants | LOW | Have production version | Easy |

---

## Full Report

For complete analysis with evidence, remediation steps, and verification checklist, see:
**`TECHNICAL_DEBT_CLEANUP_REPORT.md`**

---

## Implementation Timeline

| Phase | Tasks | Time | When |
|-------|-------|------|------|
| 1. Secure | Remove credentials from git history | 1 hour | Immediately |
| 2. Core | Remove build artifacts from git | 30 min | This week |
| 3. Clean | Delete old files locally | 30 min | This week |
| 4. Consolidate | Merge documentation | 1 hour | This sprint |
| 5. Verify | Test all scripts still work | 30 min | After cleanup |

**Total Time**: ~3.5 hours

---

## Git Commands Cheat Sheet

```bash
# Check what's tracked that shouldn't be
git ls-files | grep -E "^lambda-worker-build|\.tfstate|\.json$"

# Remove from git (safe - files won't delete, just untracked)
git rm --cached -r <path>

# Check current .gitignore
cat .gitignore

# Verify removal before committing
git status

# See what would be committed
git diff --cached

# After cleanup, verify
git log --stat -1  # View last commit
du -sh .git        # Check repo size reduction
```

---

**Status**: Analysis Complete - Ready for Implementation  
**Next Step**: Review TECHNICAL_DEBT_CLEANUP_REPORT.md and execute cleanup
