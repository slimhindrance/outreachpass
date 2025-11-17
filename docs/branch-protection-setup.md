# Branch Protection Rules Setup

## Overview

Branch protection rules prevent direct pushes to important branches and ensure all code goes through proper review and validation.

## Setup Instructions

Navigate to: **GitHub Repository → Settings → Branches → Add branch protection rule**

---

## Main Branch Protection

### Branch name pattern
```
main
```

### Required Settings

#### ✅ Require a pull request before merging
- **Required approvals**: 1
- ☑️ Dismiss stale pull request approvals when new commits are pushed
- ☑️ Require review from Code Owners (optional, if CODEOWNERS file exists)
- ☐ Require approval of the most recent reviewable push

#### ✅ Require status checks to pass before merging
- ☑️ Require branches to be up to date before merging
- **Required status checks**:
  - `Backend Tests & Lint`
  - `Frontend Tests & Lint`
  - `Terraform Validation`
  - `Security Scanning`

#### ✅ Require conversation resolution before merging
- All PR comments must be resolved

#### ✅ Require signed commits (optional but recommended)
- Ensures commits are verified with GPG keys

#### ✅ Require linear history
- Prevents merge commits, enforces rebase or squash

#### ✅ Include administrators
- Apply rules to repository administrators too

#### ✅ Restrict who can push to matching branches (optional)
- Limit to specific teams/users if needed

#### ✅ Allow force pushes: **DISABLED**
- Prevents rewriting history on main

#### ✅ Allow deletions: **DISABLED**
- Prevents accidental branch deletion

---

## Develop Branch Protection (if using)

### Branch name pattern
```
develop
```

### Settings (less strict than main)

- ✅ Require pull request (0-1 approvals)
- ✅ Require status checks to pass
- ✅ Require conversation resolution
- ☐ Include administrators (allow faster iteration)
- ☐ Require linear history (allow merge commits)
- ✅ Block force pushes
- ✅ Block deletions

---

## Feature Branch Convention

No protection rules needed, but recommend:

**Naming convention**:
- `feature/{description}` - New features
- `fix/{description}` - Bug fixes
- `chore/{description}` - Maintenance tasks
- `docs/{description}` - Documentation updates
- `refactor/{description}` - Code refactoring

**Example**:
```bash
git checkout -b feature/add-email-notifications
git checkout -b fix/database-connection-leak
git checkout -b chore/update-dependencies
```

---

## Testing Protection Rules

After setup, verify:

```bash
# Try to push directly to main (should fail)
git checkout main
echo "test" >> README.md
git commit -am "test"
git push origin main
# Expected: remote: error: GH006: Protected branch update failed

# Create PR instead (should work)
git checkout -b test/protection-rules
git push origin test/protection-rules
# Create PR via GitHub UI
```

---

## Bypass Protection (Emergency)

**Only in emergencies!** Repository admins can:

1. Go to PR
2. Click "Merge without waiting for requirements"
3. Document reason in PR comment
4. Fix issues immediately after merge

**Always follow up with**:
- Post-merge testing
- Incident report
- Process improvement

---

## Status Checks Configuration

Ensure these workflows exist in `.github/workflows/`:

1. **pr-validation.yml** - Main validation workflow
   - Includes all required status checks
   - Runs on PR creation/update

2. **backend-deploy.yml** - Backend deployment (runs on main)
3. **frontend-deploy.yml** - Frontend deployment (runs on main)

---

## CODEOWNERS File (Optional)

Create `.github/CODEOWNERS` for automatic review assignment:

```
# Global owners
* @christopherlindeman

# Backend code
/backend/ @christopherlindeman
/backend/app/utils/ @backend-team

# Frontend code
/frontend-outreachpass/ @christopherlindeman
/frontend-outreachpass/src/components/ @frontend-team

# Infrastructure
/terraform/ @christopherlindeman @devops-team
/.github/workflows/ @christopherlindeman

# Documentation
/docs/ @christopherlindeman
*.md @christopherlindeman
```

---

## Troubleshooting

### Status check not appearing

1. Run the workflow at least once
2. Check workflow file syntax
3. Ensure workflow runs on `pull_request` event
4. Wait 1-2 minutes for GitHub to register

### Can't merge even though checks passed

1. Verify branch is up to date with base
2. Check all conversations are resolved
3. Ensure approvals are not stale
4. Check if admin override is needed

### Too many required checks

Start with minimal required checks:
- Backend Tests
- Frontend Tests

Add more as team matures.

---

## Recommendations by Team Size

### Solo Developer
- 0 required approvals
- Require status checks only
- Allow self-merge after checks pass

### Small Team (2-5)
- 1 required approval
- All status checks required
- Conversations must be resolved

### Large Team (6+)
- 2 required approvals
- All status checks required
- CODEOWNERS for automatic review assignment
- Restrict push access to specific teams

---

## Checklist

- [ ] Branch protection rule created for `main`
- [ ] Required status checks configured
- [ ] PR approval requirements set
- [ ] Force push disabled
- [ ] Branch deletion disabled
- [ ] Rules apply to administrators
- [ ] CODEOWNERS file created (optional)
- [ ] Protection rules tested
- [ ] Team notified of new process

---

## Resources

- [GitHub Branch Protection Documentation](https://docs.github.com/en/repositories/configuring-branches-and-merges-in-your-repository/managing-protected-branches/about-protected-branches)
- [Required Status Checks](https://docs.github.com/en/repositories/configuring-branches-and-merges-in-your-repository/managing-protected-branches/about-protected-branches#require-status-checks-before-merging)
- [CODEOWNERS Syntax](https://docs.github.com/en/repositories/managing-your-repositorys-settings-and-features/customizing-your-repository/about-code-owners)
