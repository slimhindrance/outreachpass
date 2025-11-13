# OutreachPass Terraform Variables
# Copy this to terraform.tfvars and fill in your values

aws_region  = "us-east-1"
environment = "dev"

# Database credentials (use AWS Secrets Manager in production)
database_master_username = "outreachpass_admin"
database_master_password = "Lindy101"

# SES sender email (must be verified in SES)
ses_from_email = "clindeman@base2ml.com"
