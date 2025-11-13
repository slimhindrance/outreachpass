#!/bin/bash
set -e

echo "Setting up Poetry environment for OutreachPass..."

# Check if Poetry is installed
if ! command -v poetry &> /dev/null; then
    echo "Poetry not found. Installing Poetry..."
    curl -sSL https://install.python-poetry.org | python3 -

    # Add to PATH for current session
    export PATH="$HOME/.local/bin:$PATH"

    echo ""
    echo "Poetry installed! Add to your shell profile:"
    echo 'export PATH="$HOME/.local/bin:$PATH"'
    echo ""
fi

# Verify Python version
PYTHON_VERSION=$(python3 --version | cut -d' ' -f2 | cut -d'.' -f1,2)
echo "Python version: $PYTHON_VERSION"

PYTHON_MAJOR=$(echo $PYTHON_VERSION | cut -d'.' -f1)
PYTHON_MINOR=$(echo $PYTHON_VERSION | cut -d'.' -f2)

if [[ "$PYTHON_MAJOR" -lt 3 ]] || [[ "$PYTHON_MAJOR" -eq 3 && "$PYTHON_MINOR" -lt 11 ]]; then
    echo "⚠️  Error: Python 3.11 or 3.12 required. Current: $PYTHON_VERSION"
    echo "Install Python 3.12:"
    echo "  macOS: brew install python@3.12"
    echo "  Ubuntu: sudo apt install python3.12"
    exit 1
fi

if [[ "$PYTHON_MAJOR" -eq 3 && "$PYTHON_MINOR" -ge 13 ]]; then
    echo "⚠️  Warning: Python 3.13+ detected. Some dependencies may not be compatible."
    echo "Recommended: Use Python 3.11 or 3.12"
    echo ""
    echo "To install Python 3.12:"
    echo "  macOS: brew install python@3.12"
    echo ""
    echo "Then tell Poetry to use it:"
    echo "  poetry env use python3.12"
    echo ""
    read -p "Continue with Python $PYTHON_VERSION anyway? (y/N) " -n 1 -r
    echo
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        exit 1
    fi
fi

# Configure Poetry to create virtualenvs in project
poetry config virtualenvs.in-project true

# Install dependencies
echo "Installing dependencies..."
poetry install

# Verify installation
echo ""
echo "✅ Poetry environment ready!"
echo ""
echo "Activate the environment:"
echo "  poetry shell"
echo ""
echo "Or run commands with:"
echo "  poetry run <command>"
echo ""
echo "Development commands:"
echo "  poetry run pytest              # Run tests"
echo "  poetry run black backend/      # Format code"
echo "  poetry run ruff backend/       # Lint code"
echo "  poetry run mypy backend/       # Type check"
echo "  poetry run uvicorn app.main:app --reload  # Dev server"
