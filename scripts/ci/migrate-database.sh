#!/bin/bash
# Database Migration Script
# Usage: ./migrate-database.sh <environment>

set -e

ENVIRONMENT="${1:-prod}"
REGION="${AWS_REGION:-us-east-1}"

echo "🗄️  Running database migrations for environment: $ENVIRONMENT"

# Get database credentials from Secrets Manager
echo "Fetching database credentials..."
DB_SECRET=$(aws secretsmanager get-secret-value \
    --secret-id "/outreachpass/${ENVIRONMENT}/database" \
    --region "$REGION" \
    --query SecretString \
    --output text)

DB_HOST=$(echo "$DB_SECRET" | jq -r '.host')
DB_PORT=$(echo "$DB_SECRET" | jq -r '.port')
DB_NAME=$(echo "$DB_SECRET" | jq -r '.database')
DB_USER=$(echo "$DB_SECRET" | jq -r '.username')
DB_PASS=$(echo "$DB_SECRET" | jq -r '.password')

DATABASE_URL="postgresql://${DB_USER}:${DB_PASS}@${DB_HOST}:${DB_PORT}/${DB_NAME}"

echo "Database: $DB_HOST/$DB_NAME"

# Check if migrations directory exists
if [ ! -d "backend/app/migrations" ] && [ ! -d "backend/alembic" ]; then
    echo "⚠️  No migrations directory found, skipping..."
    exit 0
fi

# Option 1: Alembic migrations
if [ -f "backend/alembic.ini" ]; then
    echo "Running Alembic migrations..."
    cd backend

    # Check current revision
    echo "Current database revision:"
    DATABASE_URL="$DATABASE_URL" alembic current || echo "No revision found"

    # Show pending migrations
    echo "Pending migrations:"
    DATABASE_URL="$DATABASE_URL" alembic history --verbose | head -20

    # Run migrations
    echo "Applying migrations..."
    DATABASE_URL="$DATABASE_URL" alembic upgrade head

    echo "✅ Alembic migrations completed"
    cd ..
    exit 0
fi

# Option 2: Custom SQL migrations
if [ -d "backend/app/migrations" ]; then
    echo "Running SQL migrations..."

    # Create migrations tracking table if not exists
    PGPASSWORD="$DB_PASS" psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" -c "
        CREATE TABLE IF NOT EXISTS schema_migrations (
            version VARCHAR(255) PRIMARY KEY,
            applied_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        );
    "

    # Run each migration file
    for migration_file in backend/app/migrations/*.sql; do
        if [ -f "$migration_file" ]; then
            version=$(basename "$migration_file" .sql)

            # Check if already applied
            applied=$(PGPASSWORD="$DB_PASS" psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" -t -c "
                SELECT COUNT(*) FROM schema_migrations WHERE version = '$version';
            " | tr -d ' ')

            if [ "$applied" = "0" ]; then
                echo "Applying migration: $version"
                PGPASSWORD="$DB_PASS" psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" -f "$migration_file"

                # Mark as applied
                PGPASSWORD="$DB_PASS" psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" -c "
                    INSERT INTO schema_migrations (version) VALUES ('$version');
                "

                echo "✅ Applied: $version"
            else
                echo "⏭️  Skipped (already applied): $version"
            fi
        fi
    done

    echo "✅ SQL migrations completed"
    exit 0
fi

echo "⚠️  No migration system configured"
exit 0
