# OutreachPass Monitoring Configuration
# Created during Phase 3: Production Readiness deployment

# Project configuration
project_name = "outreachpass"
environment  = "dev"

# Alarm notifications
alarm_email = "clindeman@gatech.edu"

# API Gateway monitoring
api_gateway_id = "r2h140rt0a"

# RDS monitoring
rds_cluster_identifier = "outreachpass-dev"

# SQS monitoring
sqs_queue_name = "outreachpass-pass-generation"
sqs_dlq_name   = "outreachpass-pass-generation-dlq"

# CloudWatch log retention
log_retention_days = 30
