# ✅ Poetry Environment Setup Complete!

Your OutreachPass project is now configured with Poetry for professional Python dependency management.

## What Was Added

### Core Configuration
- **pyproject.toml**: Complete Poetry configuration with all dependencies
- **.python-version**: Python 3.11 version file for pyenv/asdf
- **Makefile**: Convenient shortcuts for common tasks

### Development Scripts
- **poetry_setup.sh**: One-command Poetry installation and setup
- **dev_server.sh**: Start local development server
- **test.sh**: Run tests with coverage
- **format.sh**: Format code with Black and Ruff
- **lint.sh**: Lint and type-check code
- **build_lambda.sh**: Updated to build from Poetry (exports production deps only)

### Documentation
- **POETRY_SETUP.md**: Complete Poetry guide with troubleshooting

## Next Steps - Get Running in 3 Minutes

### 1. Install Poetry Environment

```bash
# One command to set up everything
./scripts/poetry_setup.sh

# Or using Makefile
make install
```

**What this does:**
- Installs Poetry if not present
- Creates virtual environment in `.venv/`
- Installs all production + dev dependencies
- Configures everything for development

### 2. Configure Environment

```bash
# Copy template
cp backend/.env.example backend/.env

# Edit with your values
vim backend/.env
```

**Required variables:**
```env
DATABASE_URL=postgresql+asyncpg://user:pass@localhost:5432/outreachpass
AWS_REGION=us-east-1
S3_BUCKET_ASSETS=outreachpass-dev-assets
S3_BUCKET_UPLOADS=outreachpass-dev-uploads
SECRET_KEY=generate-a-random-64-char-string
```

### 3. Start Development

```bash
# Start dev server (auto-reload on changes)
make dev

# Or
./scripts/dev_server.sh

# Or manually
poetry shell
cd backend
uvicorn app.main:app --reload
```

Open http://localhost:8000/docs

## Quick Command Reference

### Using Makefile (Recommended)

```bash
make help          # Show all commands
make install       # Install dependencies
make dev           # Start dev server
make test          # Run tests
make format        # Format code
make lint          # Lint code
make build         # Build Lambda package
make deploy        # Deploy to AWS
make clean         # Clean artifacts
```

### Using Poetry Directly

```bash
# Activate environment
poetry shell

# Run commands
poetry run pytest
poetry run uvicorn app.main:app --reload
poetry run black backend/
poetry run ruff check backend/

# Add dependency
poetry add boto3
poetry add --group dev pytest-mock

# Update dependencies
poetry update
```

### Using Helper Scripts

```bash
./scripts/dev_server.sh    # Dev server
./scripts/test.sh          # Tests
./scripts/format.sh        # Format
./scripts/lint.sh          # Lint
./scripts/build_lambda.sh  # Build for Lambda
```

## Development Workflow

### Daily Development

```bash
# 1. Activate environment
poetry shell

# 2. Make changes to code

# 3. Run tests
make test

# 4. Format and lint
make format
make lint

# 5. Commit
git add .
git commit -m "Your changes"
```

### Testing Workflow

```bash
# Run all tests
make test

# Run specific test file
poetry run pytest tests/test_api.py

# Run with verbose output
poetry run pytest -v

# Run with coverage report
poetry run pytest --cov=backend/app --cov-report=html
open htmlcov/index.html
```

### Building for AWS

```bash
# Build Lambda package (exports production deps from Poetry)
make build

# Deploy to AWS
make deploy

# Or step by step
./scripts/build_lambda.sh
./scripts/deploy.sh dev
```

## What Changed from requirements.txt

### Before (requirements.txt)
```bash
pip install -r requirements.txt
uvicorn app.main:app --reload
```

**Problems:**
- Version conflicts
- No dev/prod separation
- Manual virtual env management
- No lock file

### After (Poetry)
```bash
poetry install          # Auto-creates venv, installs everything
poetry run uvicorn app.main:app --reload
```

**Benefits:**
- ✅ Dependency resolution (no conflicts)
- ✅ Reproducible builds (poetry.lock)
- ✅ Separate dev dependencies
- ✅ Virtual env management
- ✅ Modern Python tooling

## Project Structure with Poetry

```
ContactSolution/
├── .venv/                    # Virtual environment (auto-created)
├── pyproject.toml            # Dependencies & config
├── poetry.lock               # Lock file (commit this!)
├── Makefile                  # Convenient shortcuts
├── .python-version           # Python version (3.11)
│
├── backend/
│   ├── .env                  # Your config (don't commit!)
│   ├── .env.example          # Template
│   └── app/                  # FastAPI application
│
├── scripts/
│   ├── poetry_setup.sh       # Setup script
│   ├── dev_server.sh         # Dev server
│   ├── test.sh               # Tests
│   ├── format.sh             # Formatting
│   ├── lint.sh               # Linting
│   └── build_lambda.sh       # Lambda build (Poetry-aware)
│
└── POETRY_SETUP.md           # Complete Poetry guide
```

## Dependencies Included

### Production (`poetry install`)
- fastapi, uvicorn - Web framework
- pydantic, pydantic-settings - Data validation
- sqlalchemy, asyncpg - Database
- boto3 - AWS SDK
- qrcode, vobject - Card generation
- python-jose - JWT auth
- mangum - Lambda adapter

### Development (`poetry install` includes these too)
- pytest, pytest-asyncio, pytest-cov - Testing
- black - Code formatting
- ruff - Linting
- mypy - Type checking
- httpx - Test client
- ipython - Interactive shell

## IDE Setup

### VS Code

Poetry auto-detected if you:
1. Open Command Palette (Cmd+Shift+P)
2. "Python: Select Interpreter"
3. Choose `./.venv/bin/python`

Or create `.vscode/settings.json`:
```json
{
  "python.defaultInterpreterPath": "${workspaceFolder}/.venv/bin/python"
}
```

### PyCharm

Auto-detects Poetry. If not:
1. Settings → Project → Python Interpreter
2. Add → Poetry Environment
3. Select: `.venv`

## Troubleshooting

### "Poetry not found"

```bash
# Install Poetry
curl -sSL https://install.python-poetry.org | python3 -

# Add to PATH (~/.zshrc or ~/.bashrc)
export PATH="$HOME/.local/bin:$PATH"
source ~/.zshrc
```

### "Wrong Python version"

```bash
# Check version
python3 --version

# Install Python 3.11
brew install python@3.11

# Tell Poetry to use it
poetry env use python3.11
```

### "Can't find dependencies"

```bash
# Recreate environment
rm -rf .venv
poetry install
```

### "Build fails"

```bash
# Clean and rebuild
make clean
make build
```

## Common Tasks

### Add a New Package

```bash
# Production dependency
poetry add requests

# Dev dependency
poetry add --group dev pytest-mock

# Rebuild Lambda
make build
```

### Update All Dependencies

```bash
poetry update
poetry run pytest  # Test everything still works
make build         # Rebuild Lambda
```

### Check for Outdated Packages

```bash
poetry show --outdated
```

### Export to requirements.txt (if needed)

```bash
poetry export -f requirements.txt --output requirements.txt
```

## Next: Deploy to AWS

Now that your local environment is set up:

```bash
# 1. Configure Terraform
vim terraform/terraform.tfvars

# 2. Build Lambda package
make build

# 3. Deploy infrastructure
make deploy

# 4. Run migrations
make migrate

# 5. Seed database
make seed
```

See [QUICKSTART.md](QUICKSTART.md) for AWS deployment steps.

## Resources

- **Poetry Documentation**: https://python-poetry.org/docs/
- **Full Setup Guide**: [POETRY_SETUP.md](POETRY_SETUP.md)
- **API Documentation**: [README.md](README.md)
- **Quick Start**: [QUICKSTART.md](QUICKSTART.md)
- **API Examples**: [API_EXAMPLES.md](API_EXAMPLES.md)

---

**You're all set!** Run `make dev` to start developing. 🚀
