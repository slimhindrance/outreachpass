#!/bin/bash
set -e

echo "Linting OutreachPass codebase..."

# Lint with Ruff
echo "Running Ruff..."
poetry run ruff check backend/

# Type check with mypy
echo "Running mypy..."
poetry run mypy backend/

echo "✅ Linting complete!"
