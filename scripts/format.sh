#!/bin/bash
set -e

echo "Formatting code with Black and Ruff..."

# Format with Black
echo "Running Black..."
poetry run black backend/

# Sort imports and lint with Ruff
echo "Running Ruff..."
poetry run ruff check backend/ --fix

echo "✅ Code formatted!"
