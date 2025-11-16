# CLAUDE.md

## Project Overview
This repository is managed with Claude Code and connected to multiple MCP servers for advanced code review, automation, AWS deployments, and GitHub integration. The primary goal is to maintain high-quality, well-documented, and production-ready code.

## Technology Stack
- Language: Python (3.11+), TypeScript
- Cloud: AWS (EC2, Lambda, S3, ECS)
- Infra as Code: Terraform, AWS CDK
- CI/CD: GitHub Actions, Claude MCP triggers
- Additional MCPs: [list any extra, e.g. database, search, or documentation plugins]

## Development Environment
- Use `pyenv` for Python version management.
- Priority libraries: boto3, fastapi, pytest, requests (keep updated).
- Run `pip install -U -r requirements.txt` weekly.
- Node: v20+, Typescript v5+, npm 10+, AWS CLI v2.

## Code Review & Guidelines
- Adhere to PEP8 (Python) and Airbnb (TypeScript) style guides.
- Use docstrings for all public methods/classes.
- Write/maintain unit and integration tests for new features.
- All PRs must pass type checks, lint, and test jobs in CI before merge.
- Secrets and AWS credentials must never reside in code or repo.
- Review checklist located at `/docs/REVIEW_CHECKLIST.md`.

## Agent Instructions
- Always plan approach before executing code changes (use /plan).
- Request clarification when project goals are ambiguous.
- Reference this file before performing large refactors or cross-cutting changes.
- Link every code change to a GitHub Issue in the #issue format.

## MCP Servers (Active)

| Name      | Purpose        | Example Command                       |
|-----------|---------------|---------------------------------------|
| AWS       | Deploy, infra  | `@aws describe-instances`             |
| GitHub    | PR/issues      | `@github list-pull-requests`          |
| Docs      | Live docs      | `@context7 search boto3 S3 upload`    |

## Deployment & Infrastructure
- Use IaC modules in `/infra` for all cloud resources.
- Deploy via MCP: `@aws cdk deploy backend-stack`
- Production deploys require code review approval via Claude + GitHub MCP.

## CI/CD and Automation
- All code merges trigger test, build, and deploy workflows.
- Claude MCP triggers available for pre- and post-merge hooks.
- Failed builds must be triaged and fixed before proceeding.

## Etiquette & Collaboration
- Branch naming: `feature/<desc>`, `fix/<desc>`, `chore/<desc>`
- Rebase preferred for commits; squash permitted for large feature merges.
- PRs should reference the relevant JIRA/GitHub Issue.

## Troubleshooting
- See `/docs/TROUBLESHOOTING.md` for common errors, MCP diagnostics.
- For AWS or GitHub MCP outages, revert to manual CLI as needed.

## Important Contacts
- Ops lead: [Chris Lindeman/christopherwlindeman@gmail.com]
- Security: [Chris Lindeman/christopherwlindeman@gmail.com]

---
_This file is automatically loaded by Claude sessions and available as context for all active agents in this repository. Update with major process or tech stack changes._

