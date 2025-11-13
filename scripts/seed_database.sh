#!/bin/bash
set -e

echo "Seeding database with initial data..."

# Get database connection info
cd terraform
DB_ENDPOINT=$(terraform output -raw database_endpoint)
cd ..

DB_USER=$(grep database_master_username terraform/terraform.tfvars | cut -d '"' -f 2)
DB_PASS=$(grep database_master_password terraform/terraform.tfvars | cut -d '"' -f 2)
DB_NAME=$(grep database_name terraform/variables.tf | grep default | cut -d '"' -f 2)

export PGPASSWORD="$DB_PASS"

# Create seed SQL
cat > /tmp/seed.sql << 'EOF'
-- Create default tenant
INSERT INTO tenants (tenant_id, name, status)
VALUES ('00000000-0000-0000-0000-000000000001', 'Base2ML', 'active')
ON CONFLICT DO NOTHING;

-- Create brands
INSERT INTO brands (brand_id, tenant_id, brand_key, display_name, domain, theme_json, features_json)
VALUES
  ('00000000-0000-0000-0000-000000000010', '00000000-0000-0000-0000-000000000001', 'OUTREACHPASS', 'OutreachPass', 'outreachpass.base2ml.com', '{"primary_color": "#0066cc"}', '{"wallet": true, "analytics": true}'),
  ('00000000-0000-0000-0000-000000000011', '00000000-0000-0000-0000-000000000001', 'GOVSAFE', 'GovSafe Connect', 'govsafe.base2ml.com', '{"primary_color": "#003366"}', '{"wallet": true, "analytics": false, "privacy_strict": true}'),
  ('00000000-0000-0000-0000-000000000012', '00000000-0000-0000-0000-000000000001', 'CAMPUSCARD', 'CampusCard', 'campuscard.base2ml.com', '{"primary_color": "#6633cc"}', '{"wallet": true, "analytics": true, "scholar_links": true}')
ON CONFLICT DO NOTHING;

-- Create admin user
INSERT INTO users (user_id, tenant_id, email, full_name, role, status)
VALUES ('00000000-0000-0000-0000-000000000100', '00000000-0000-0000-0000-000000000001', 'clindeman@base2ml.com', 'Chris Lindeman', 'OWNER', 'active')
ON CONFLICT DO NOTHING;

SELECT 'Seed data inserted successfully!' as result;
EOF

# Run seed
psql -h "$DB_ENDPOINT" -U "$DB_USER" -d "$DB_NAME" -f /tmp/seed.sql

rm /tmp/seed.sql

echo "Database seeded successfully!"
echo ""
echo "Default tenant:"
echo "  Tenant: Base2ML"
echo "  Tenant ID: 00000000-0000-0000-0000-000000000001"
echo "  Admin Email: clindeman@base2ml.com"
echo ""
echo "Brands created:"
echo "  - OutreachPass → outreachpass.base2ml.com (ID: 00000000-0000-0000-0000-000000000010)"
echo "  - GovSafe Connect → govsafe.base2ml.com (ID: 00000000-0000-0000-0000-000000000011)"
echo "  - CampusCard → campuscard.base2ml.com (ID: 00000000-0000-0000-0000-000000000012)"
