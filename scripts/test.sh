#!/bin/bash
set -e

echo "Running OutreachPass tests..."

# Run tests with Poetry
poetry run pytest "$@"

echo ""
echo "✅ Tests complete!"
echo ""
echo "Coverage report: htmlcov/index.html"
