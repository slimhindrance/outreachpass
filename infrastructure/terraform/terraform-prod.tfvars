# OutreachPass Production Environment Configuration
# Created: 2025-11-18
# Environment: Production

# Project configuration
project_name = "outreachpass"
environment  = "prod"

# Alarm notifications
alarm_email = "clindeman@gatech.edu"

# API Gateway monitoring
api_gateway_id = "hwl4ycnvda"

# RDS monitoring
# Note: RDS cluster will be created during deployment
rds_cluster_identifier = "outreachpass-prod"

# SQS monitoring
sqs_queue_name = "outreachpass-prod-pass-generation"
sqs_dlq_name   = "outreachpass-prod-pass-generation-dlq"

# CloudWatch log retention (90 days for production)
log_retention_days = 90
