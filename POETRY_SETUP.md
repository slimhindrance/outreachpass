# Poetry Development Setup

Complete guide for using Poetry with OutreachPass.

## Why Poetry?

- **Dependency Resolution**: No version conflicts
- **Reproducible Builds**: Lock file ensures consistency
- **Virtual Environments**: Isolated Python environments
- **Dev Dependencies**: Separate dev/test tools from production

## Quick Setup

### 1. Install Poetry

```bash
# macOS/Linux
curl -sSL https://install.python-poetry.org | python3 -

# Add to PATH (add to ~/.zshrc or ~/.bashrc)
export PATH="$HOME/.local/bin:$PATH"

# Verify installation
poetry --version
```

### 2. Install Project Dependencies

```bash
# Run setup script (installs everything)
./scripts/poetry_setup.sh

# Or manually
poetry install
```

This creates a `.venv/` folder in your project with all dependencies.

## Development Workflow

### Activate Environment

**Option 1: Poetry Shell** (Recommended)
```bash
poetry shell
# Now you're in the virtual environment
python --version  # Python 3.11+
uvicorn app.main:app --reload
```

**Option 2: Run Commands Directly**
```bash
poetry run uvicorn app.main:app --reload
poetry run pytest
```

### Common Commands

#### Development Server
```bash
# With helper script
./scripts/dev_server.sh

# Or with Poetry directly
cd backend
poetry run uvicorn app.main:app --reload --port 8000
```

Open: http://localhost:8000/docs

#### Run Tests
```bash
# All tests with coverage
poetry run pytest

# Specific test file
poetry run pytest tests/test_api.py

# With verbose output
poetry run pytest -v

# Stop on first failure
poetry run pytest -x
```

#### Code Quality

```bash
# Format code
poetry run black backend/

# Lint
poetry run ruff check backend/

# Type check
poetry run mypy backend/

# Or use helper scripts
./scripts/format.sh
./scripts/lint.sh
```

#### Interactive Shell
```bash
poetry run ipython

# Inside IPython
from app.models.database import Event
from app.core.config import settings
```

## Using the Makefile

We've included a Makefile for common tasks:

```bash
# See all commands
make help

# Install dependencies
make install

# Start dev server
make dev

# Run tests
make test

# Format code
make format

# Lint code
make lint

# Build Lambda package
make build

# Deploy to AWS
make deploy

# Clean build artifacts
make clean
```

## Managing Dependencies

### Add New Dependency

**Production dependency:**
```bash
poetry add requests
```

**Dev dependency:**
```bash
poetry add --group dev pytest-mock
```

**Specific version:**
```bash
poetry add "fastapi@^0.109.0"
```

### Remove Dependency

```bash
poetry remove requests
```

### Update Dependencies

```bash
# Update all
poetry update

# Update specific package
poetry update fastapi

# Update lock file only
poetry lock --no-update
```

### View Installed Packages

```bash
# List all
poetry show

# Show dependency tree
poetry show --tree

# Check outdated
poetry show --outdated
```

## Building for Lambda

The build script now uses Poetry:

```bash
./scripts/build_lambda.sh
```

**What it does:**
1. Exports production dependencies from Poetry (no dev packages)
2. Installs to Lambda-compatible layer
3. Creates deployment zip files

**Manual export:**
```bash
# Export to requirements.txt
poetry export -f requirements.txt --output requirements.txt --without-hashes

# Production only (no dev dependencies)
poetry export -f requirements.txt --output requirements.txt --without-hashes --only main
```

## Environment Variables

Poetry doesn't manage env vars, so we still use `.env`:

```bash
# Create from template
cp backend/.env.example backend/.env

# Edit with your values
vim backend/.env
```

## Troubleshooting

### "Poetry not found"

```bash
# Check PATH
echo $PATH

# Should include: /Users/yourname/.local/bin

# Add to shell profile (~/.zshrc or ~/.bashrc)
export PATH="$HOME/.local/bin:$PATH"

# Reload
source ~/.zshrc
```

### "Python version mismatch"

```bash
# Check current Python
python3 --version

# Tell Poetry which Python to use
poetry env use python3.11

# Or specify full path
poetry env use /usr/local/bin/python3.11
```

### "Virtual environment issues"

```bash
# Remove and recreate
poetry env remove python
poetry install

# Or delete .venv manually
rm -rf .venv
poetry install
```

### "Lock file out of date"

```bash
# Update lock file
poetry lock

# Install from updated lock
poetry install
```

### "Dependency conflicts"

```bash
# See what's causing the conflict
poetry show --tree

# Update problematic package
poetry update <package-name>

# Force reinstall
poetry install --sync
```

## IDE Configuration

### VS Code

Create `.vscode/settings.json`:

```json
{
  "python.defaultInterpreterPath": "${workspaceFolder}/.venv/bin/python",
  "python.formatting.provider": "black",
  "python.linting.enabled": true,
  "python.linting.ruffEnabled": true,
  "python.testing.pytestEnabled": true,
  "python.testing.unittestEnabled": false,
  "[python]": {
    "editor.formatOnSave": true,
    "editor.codeActionsOnSave": {
      "source.organizeImports": true
    }
  }
}
```

**Select Python Interpreter:**
1. Cmd+Shift+P → "Python: Select Interpreter"
2. Choose `./.venv/bin/python`

### PyCharm

1. Settings → Project → Python Interpreter
2. Add Interpreter → Poetry Environment
3. Select existing environment: `.venv`

## Pre-commit Hooks (Optional)

Install pre-commit to run checks before commits:

```bash
poetry add --group dev pre-commit

# Create .pre-commit-config.yaml
cat > .pre-commit-config.yaml << 'EOF'
repos:
  - repo: https://github.com/psf/black
    rev: 23.12.1
    hooks:
      - id: black
        language_version: python3.11

  - repo: https://github.com/astral-sh/ruff-pre-commit
    rev: v0.1.11
    hooks:
      - id: ruff
        args: [--fix]

  - repo: https://github.com/pre-commit/mirrors-mypy
    rev: v1.8.0
    hooks:
      - id: mypy
        additional_dependencies: [types-all]
EOF

# Install hooks
poetry run pre-commit install

# Run manually
poetry run pre-commit run --all-files
```

## CI/CD with Poetry

### GitHub Actions Example

```yaml
name: Tests

on: [push, pull_request]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3

      - name: Install Poetry
        run: pipx install poetry

      - name: Set up Python
        uses: actions/setup-python@v4
        with:
          python-version: '3.11'
          cache: 'poetry'

      - name: Install dependencies
        run: poetry install

      - name: Run tests
        run: poetry run pytest

      - name: Lint
        run: |
          poetry run black --check backend/
          poetry run ruff check backend/
          poetry run mypy backend/
```

## Best Practices

### 1. Always Use Lock File

```bash
# Commit poetry.lock to git
git add poetry.lock
git commit -m "Update dependencies"
```

### 2. Keep Dependencies Updated

```bash
# Weekly/monthly
poetry update
poetry run pytest  # Verify nothing broke
```

### 3. Separate Dev Dependencies

```bash
# Production dependency
poetry add boto3

# Dev/test only
poetry add --group dev pytest
```

### 4. Use Exact Versions for Critical Packages

```bash
# Allow minor updates (recommended)
poetry add "fastapi@^0.109.0"

# Exact version (for critical dependencies)
poetry add "boto3==1.34.34"
```

### 5. Regenerate Lock Regularly

```bash
poetry lock --no-update  # Update hashes only
poetry lock              # Update all packages
```

## Quick Reference Card

```bash
# Setup
poetry install              # Install all dependencies
poetry shell               # Activate virtual environment

# Dependencies
poetry add <package>       # Add production dependency
poetry add --group dev <package>  # Add dev dependency
poetry remove <package>    # Remove dependency
poetry update              # Update all dependencies
poetry show                # List installed packages

# Development
poetry run pytest          # Run tests
poetry run black backend/  # Format code
poetry run ruff backend/   # Lint code
poetry run mypy backend/   # Type check

# Build
poetry export -f requirements.txt --output requirements.txt

# Environment
poetry env info            # Show environment info
poetry env list            # List environments
poetry env remove python   # Remove environment
```

## Migration from requirements.txt

If you had `requirements.txt` before:

```bash
# Poetry will read it automatically
poetry add $(cat requirements.txt)

# Or import specific requirements
poetry add -r requirements.txt
```

**Note:** We keep `requirements.txt` for backwards compatibility and Lambda builds, but Poetry is now the source of truth.

---

For issues, see the main [README.md](README.md) or ask in the team channel.
