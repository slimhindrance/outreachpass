#!/bin/bash
# Apply Analytics Performance Indexes
# This script adds optimized indexes to analytics tables for improved query performance

set -e  # Exit on any error

# Colors for output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

echo -e "${GREEN}========================================${NC}"
echo -e "${GREEN}Analytics Index Migration${NC}"
echo -e "${GREEN}========================================${NC}"
echo ""

# Check if DATABASE_URL is set
if [ -z "$DATABASE_URL" ]; then
    echo -e "${RED}ERROR: DATABASE_URL environment variable not set${NC}"
    echo "Please set it in your .env file or export it:"
    echo "  export DATABASE_URL='postgresql://user:password@host:port/database'"
    exit 1
fi

# Parse DATABASE_URL to get connection details
# Format: postgresql://user:password@host:port/database
if [[ $DATABASE_URL =~ postgresql://([^:]+):([^@]+)@([^:]+):([^/]+)/(.+) ]]; then
    DB_USER="${BASH_REMATCH[1]}"
    DB_PASS="${BASH_REMATCH[2]}"
    DB_HOST="${BASH_REMATCH[3]}"
    DB_PORT="${BASH_REMATCH[4]}"
    DB_NAME="${BASH_REMATCH[5]}"
else
    echo -e "${RED}ERROR: Invalid DATABASE_URL format${NC}"
    echo "Expected: postgresql://user:password@host:port/database"
    exit 1
fi

echo -e "${YELLOW}Database Connection:${NC}"
echo "  Host: $DB_HOST"
echo "  Port: $DB_PORT"
echo "  Database: $DB_NAME"
echo "  User: $DB_USER"
echo ""

# Check if migration file exists
MIGRATION_FILE="$(dirname "$0")/../migrations/add_analytics_indexes.sql"
if [ ! -f "$MIGRATION_FILE" ]; then
    echo -e "${RED}ERROR: Migration file not found: $MIGRATION_FILE${NC}"
    exit 1
fi

echo -e "${YELLOW}Migration file: ${NC}$MIGRATION_FILE"
echo ""

# Ask for confirmation
read -p "Apply analytics indexes to $DB_NAME? (y/N) " -n 1 -r
echo
if [[ ! $REPLY =~ ^[Yy]$ ]]; then
    echo -e "${YELLOW}Migration cancelled${NC}"
    exit 0
fi

echo -e "${GREEN}Applying indexes...${NC}"
echo ""

# Apply the migration
export PGPASSWORD="$DB_PASS"
psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" -f "$MIGRATION_FILE"

if [ $? -eq 0 ]; then
    echo ""
    echo -e "${GREEN}✓ Indexes applied successfully!${NC}"
    echo ""

    # Show created indexes
    echo -e "${YELLOW}Created indexes:${NC}"
    psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" -c "
        SELECT
            schemaname,
            tablename,
            indexname,
            pg_size_pretty(pg_relation_size(indexrelid)) as size
        FROM pg_stat_user_indexes
        WHERE indexname LIKE 'idx_%_tenant_%'
           OR indexname LIKE 'idx_%_event_%'
           OR indexname LIKE 'idx_%_card_%'
        ORDER BY tablename, indexname;
    "

    echo ""
    echo -e "${GREEN}========================================${NC}"
    echo -e "${GREEN}Migration Complete!${NC}"
    echo -e "${GREEN}========================================${NC}"
    echo ""
    echo -e "${YELLOW}Next steps:${NC}"
    echo "  1. Run ANALYZE on tables to update statistics:"
    echo "     ANALYZE email_events;"
    echo "     ANALYZE card_view_events;"
    echo "     ANALYZE wallet_pass_events;"
    echo "     ANALYZE contact_export_events;"
    echo ""
    echo "  2. Monitor index usage with:"
    echo "     SELECT * FROM pg_stat_user_indexes WHERE schemaname = 'public';"
    echo ""
else
    echo ""
    echo -e "${RED}✗ Migration failed!${NC}"
    echo "Check the error messages above"
    exit 1
fi
