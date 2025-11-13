#!/bin/bash
set -e

echo "Starting OutreachPass development server..."

# Check if .env exists
if [ ! -f backend/.env ]; then
    echo "⚠️  No .env file found. Creating from template..."
    cp backend/.env.example backend/.env
    echo "✏️  Edit backend/.env with your configuration before proceeding."
    exit 1
fi

# Load environment variables
export $(grep -v '^#' backend/.env | xargs)

# Start development server with Poetry
cd backend
poetry run uvicorn app.main:app \
    --reload \
    --host 0.0.0.0 \
    --port 8000 \
    --log-level info

echo "Development server running at http://localhost:8000"
echo "API docs: http://localhost:8000/docs"
