#!/bin/bash
set -e

echo "Running database migrations..."

# Get database endpoint from Terraform
cd terraform
DB_ENDPOINT=$(terraform output -raw database_endpoint)
cd ..

# Get database credentials from terraform.tfvars
DB_USER=$(grep database_master_username terraform/terraform.tfvars | cut -d '"' -f 2)
DB_PASS=$(grep database_master_password terraform/terraform.tfvars | cut -d '"' -f 2)
DB_NAME=$(grep database_name terraform/variables.tf | grep default | cut -d '"' -f 2)

# Run migration
echo "Connecting to database: $DB_ENDPOINT"
export PGPASSWORD="$DB_PASS"

psql -h "$DB_ENDPOINT" -U "$DB_USER" -d "$DB_NAME" -f database/001_initial_schema.sql

echo "Migrations complete!"
