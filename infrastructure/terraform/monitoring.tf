# ============================================================================
# CloudWatch Monitoring and Alarms for OutreachPass
#
# Monitors Lambda functions, API Gateway, RDS, and SQS with alerting
# ============================================================================

# ============================================================================
# SNS Topic for Alarm Notifications
# ============================================================================

resource "aws_sns_topic" "alarm_notifications" {
  name              = "${var.project_name}-${var.environment}-alarms"
  display_name      = "OutreachPass Alarms (${var.environment})"
  kms_master_key_id = "alias/aws/sns" # Use AWS-managed encryption

  tags = {
    Name        = "${var.project_name}-${var.environment}-alarms"
    Environment = var.environment
    Project     = var.project_name
  }
}

# Email subscription for alarm notifications
resource "aws_sns_topic_subscription" "alarm_email" {
  count     = var.alarm_email != "" ? 1 : 0
  topic_arn = aws_sns_topic.alarm_notifications.arn
  protocol  = "email"
  endpoint  = var.alarm_email
}

# ============================================================================
# Lambda Function Alarms
# ============================================================================

# Backend API Lambda - Error Rate
resource "aws_cloudwatch_metric_alarm" "lambda_backend_errors" {
  alarm_name          = "${var.project_name}-${var.environment}-lambda-backend-errors"
  alarm_description   = "Backend Lambda error rate exceeds threshold"
  comparison_operator = "GreaterThanThreshold"
  evaluation_periods  = 2
  threshold           = 5 # 5% error rate
  treat_missing_data  = "notBreaching"

  metric_query {
    id          = "error_rate"
    expression  = "(errors / invocations) * 100"
    label       = "Error Rate"
    return_data = true
  }

  metric_query {
    id = "errors"
    metric {
      metric_name = "Errors"
      namespace   = "AWS/Lambda"
      period      = 300 # 5 minutes
      stat        = "Sum"
      dimensions = {
        FunctionName = "${var.project_name}-${var.environment}-backend"
      }
    }
  }

  metric_query {
    id = "invocations"
    metric {
      metric_name = "Invocations"
      namespace   = "AWS/Lambda"
      period      = 300
      stat        = "Sum"
      dimensions = {
        FunctionName = "${var.project_name}-${var.environment}-backend"
      }
    }
  }

  alarm_actions = [aws_sns_topic.alarm_notifications.arn]
  ok_actions    = [aws_sns_topic.alarm_notifications.arn]

  tags = {
    Name        = "${var.project_name}-${var.environment}-lambda-backend-errors"
    Environment = var.environment
    Service     = "Lambda"
  }
}

# Backend API Lambda - Duration (Performance)
resource "aws_cloudwatch_metric_alarm" "lambda_backend_duration" {
  alarm_name          = "${var.project_name}-${var.environment}-lambda-backend-duration"
  alarm_description   = "Backend Lambda duration exceeds threshold"
  comparison_operator = "GreaterThanThreshold"
  evaluation_periods  = 2
  metric_name         = "Duration"
  namespace           = "AWS/Lambda"
  period              = 300
  statistic           = "Average"
  threshold           = 5000 # 5 seconds
  treat_missing_data  = "notBreaching"

  dimensions = {
    FunctionName = "${var.project_name}-${var.environment}-backend"
  }

  alarm_actions = [aws_sns_topic.alarm_notifications.arn]

  tags = {
    Name        = "${var.project_name}-${var.environment}-lambda-backend-duration"
    Environment = var.environment
    Service     = "Lambda"
  }
}

# Worker Lambda - Error Rate
resource "aws_cloudwatch_metric_alarm" "lambda_worker_errors" {
  alarm_name          = "${var.project_name}-${var.environment}-lambda-worker-errors"
  alarm_description   = "Worker Lambda error rate exceeds threshold"
  comparison_operator = "GreaterThanThreshold"
  evaluation_periods  = 2
  threshold           = 5 # 5% error rate
  treat_missing_data  = "notBreaching"

  metric_query {
    id          = "error_rate"
    expression  = "(errors / invocations) * 100"
    label       = "Error Rate"
    return_data = true
  }

  metric_query {
    id = "errors"
    metric {
      metric_name = "Errors"
      namespace   = "AWS/Lambda"
      period      = 300
      stat        = "Sum"
      dimensions = {
        FunctionName = "${var.project_name}-${var.environment}-worker"
      }
    }
  }

  metric_query {
    id = "invocations"
    metric {
      metric_name = "Invocations"
      namespace   = "AWS/Lambda"
      period      = 300
      stat        = "Sum"
      dimensions = {
        FunctionName = "${var.project_name}-${var.environment}-worker"
      }
    }
  }

  alarm_actions = [aws_sns_topic.alarm_notifications.arn]
  ok_actions    = [aws_sns_topic.alarm_notifications.arn]

  tags = {
    Name        = "${var.project_name}-${var.environment}-lambda-worker-errors"
    Environment = var.environment
    Service     = "Lambda"
  }
}

# ============================================================================
# API Gateway Alarms
# ============================================================================

# API Gateway - 4xx Error Rate
resource "aws_cloudwatch_metric_alarm" "api_gateway_4xx_errors" {
  alarm_name          = "${var.project_name}-${var.environment}-api-4xx-errors"
  alarm_description   = "API Gateway 4xx error rate exceeds threshold"
  comparison_operator = "GreaterThanThreshold"
  evaluation_periods  = 2
  threshold           = 10 # 10% 4xx error rate
  treat_missing_data  = "notBreaching"

  metric_query {
    id          = "error_rate"
    expression  = "(client_errors / total_requests) * 100"
    label       = "4xx Error Rate"
    return_data = true
  }

  metric_query {
    id = "client_errors"
    metric {
      metric_name = "4XXError"
      namespace   = "AWS/ApiGateway"
      period      = 300
      stat        = "Sum"
      dimensions = {
        ApiId = var.api_gateway_id
      }
    }
  }

  metric_query {
    id = "total_requests"
    metric {
      metric_name = "Count"
      namespace   = "AWS/ApiGateway"
      period      = 300
      stat        = "Sum"
      dimensions = {
        ApiId = var.api_gateway_id
      }
    }
  }

  alarm_actions = [aws_sns_topic.alarm_notifications.arn]

  tags = {
    Name        = "${var.project_name}-${var.environment}-api-4xx-errors"
    Environment = var.environment
    Service     = "APIGateway"
  }
}

# API Gateway - 5xx Error Rate
resource "aws_cloudwatch_metric_alarm" "api_gateway_5xx_errors" {
  alarm_name          = "${var.project_name}-${var.environment}-api-5xx-errors"
  alarm_description   = "API Gateway 5xx error rate exceeds threshold"
  comparison_operator = "GreaterThanThreshold"
  evaluation_periods  = 2
  threshold           = 5 # 5% 5xx error rate
  treat_missing_data  = "notBreaching"

  metric_query {
    id          = "error_rate"
    expression  = "(server_errors / total_requests) * 100"
    label       = "5xx Error Rate"
    return_data = true
  }

  metric_query {
    id = "server_errors"
    metric {
      metric_name = "5XXError"
      namespace   = "AWS/ApiGateway"
      period      = 300
      stat        = "Sum"
      dimensions = {
        ApiId = var.api_gateway_id
      }
    }
  }

  metric_query {
    id = "total_requests"
    metric {
      metric_name = "Count"
      namespace   = "AWS/ApiGateway"
      period      = 300
      stat        = "Sum"
      dimensions = {
        ApiId = var.api_gateway_id
      }
    }
  }

  alarm_actions = [aws_sns_topic.alarm_notifications.arn]
  ok_actions    = [aws_sns_topic.alarm_notifications.arn]

  tags = {
    Name        = "${var.project_name}-${var.environment}-api-5xx-errors"
    Environment = var.environment
    Service     = "APIGateway"
  }
}

# API Gateway - Latency
resource "aws_cloudwatch_metric_alarm" "api_gateway_latency" {
  alarm_name          = "${var.project_name}-${var.environment}-api-latency"
  alarm_description   = "API Gateway latency exceeds threshold"
  comparison_operator = "GreaterThanThreshold"
  evaluation_periods  = 2
  metric_name         = "Latency"
  namespace           = "AWS/ApiGateway"
  period              = 300
  statistic           = "Average"
  threshold           = 3000 # 3 seconds
  treat_missing_data  = "notBreaching"

  dimensions = {
    ApiId = var.api_gateway_id
  }

  alarm_actions = [aws_sns_topic.alarm_notifications.arn]

  tags = {
    Name        = "${var.project_name}-${var.environment}-api-latency"
    Environment = var.environment
    Service     = "APIGateway"
  }
}

# ============================================================================
# RDS Alarms
# ============================================================================

# RDS - CPU Utilization
resource "aws_cloudwatch_metric_alarm" "rds_cpu_utilization" {
  alarm_name          = "${var.project_name}-${var.environment}-rds-cpu"
  alarm_description   = "RDS CPU utilization exceeds threshold"
  comparison_operator = "GreaterThanThreshold"
  evaluation_periods  = 2
  metric_name         = "CPUUtilization"
  namespace           = "AWS/RDS"
  period              = 300
  statistic           = "Average"
  threshold           = 80 # 80% CPU
  treat_missing_data  = "notBreaching"

  dimensions = {
    DBClusterIdentifier = var.rds_cluster_identifier
  }

  alarm_actions = [aws_sns_topic.alarm_notifications.arn]

  tags = {
    Name        = "${var.project_name}-${var.environment}-rds-cpu"
    Environment = var.environment
    Service     = "RDS"
  }
}

# RDS - Database Connections
resource "aws_cloudwatch_metric_alarm" "rds_connections" {
  alarm_name          = "${var.project_name}-${var.environment}-rds-connections"
  alarm_description   = "RDS connection count exceeds threshold"
  comparison_operator = "GreaterThanThreshold"
  evaluation_periods  = 2
  metric_name         = "DatabaseConnections"
  namespace           = "AWS/RDS"
  period              = 300
  statistic           = "Average"
  threshold           = 80 # Depends on instance size, adjust as needed
  treat_missing_data  = "notBreaching"

  dimensions = {
    DBClusterIdentifier = var.rds_cluster_identifier
  }

  alarm_actions = [aws_sns_topic.alarm_notifications.arn]

  tags = {
    Name        = "${var.project_name}-${var.environment}-rds-connections"
    Environment = var.environment
    Service     = "RDS"
  }
}

# RDS - Free Storage Space
resource "aws_cloudwatch_metric_alarm" "rds_storage" {
  alarm_name          = "${var.project_name}-${var.environment}-rds-storage"
  alarm_description   = "RDS free storage space is low"
  comparison_operator = "LessThanThreshold"
  evaluation_periods  = 1
  metric_name         = "FreeStorageSpace"
  namespace           = "AWS/RDS"
  period              = 300
  statistic           = "Average"
  threshold           = 5000000000 # 5 GB in bytes
  treat_missing_data  = "notBreaching"

  dimensions = {
    DBClusterIdentifier = var.rds_cluster_identifier
  }

  alarm_actions = [aws_sns_topic.alarm_notifications.arn]

  tags = {
    Name        = "${var.project_name}-${var.environment}-rds-storage"
    Environment = var.environment
    Service     = "RDS"
  }
}

# ============================================================================
# SQS Alarms
# ============================================================================

# SQS - Queue Depth (ApproximateNumberOfMessagesVisible)
resource "aws_cloudwatch_metric_alarm" "sqs_queue_depth" {
  alarm_name          = "${var.project_name}-${var.environment}-sqs-queue-depth"
  alarm_description   = "SQS queue depth exceeds threshold"
  comparison_operator = "GreaterThanThreshold"
  evaluation_periods  = 2
  metric_name         = "ApproximateNumberOfMessagesVisible"
  namespace           = "AWS/SQS"
  period              = 300
  statistic           = "Average"
  threshold           = 100 # 100 messages
  treat_missing_data  = "notBreaching"

  dimensions = {
    QueueName = var.sqs_queue_name
  }

  alarm_actions = [aws_sns_topic.alarm_notifications.arn]

  tags = {
    Name        = "${var.project_name}-${var.environment}-sqs-queue-depth"
    Environment = var.environment
    Service     = "SQS"
  }
}

# SQS - Age of Oldest Message
resource "aws_cloudwatch_metric_alarm" "sqs_message_age" {
  alarm_name          = "${var.project_name}-${var.environment}-sqs-message-age"
  alarm_description   = "Oldest SQS message age exceeds threshold"
  comparison_operator = "GreaterThanThreshold"
  evaluation_periods  = 1
  metric_name         = "ApproximateAgeOfOldestMessage"
  namespace           = "AWS/SQS"
  period              = 300
  statistic           = "Maximum"
  threshold           = 300 # 5 minutes in seconds
  treat_missing_data  = "notBreaching"

  dimensions = {
    QueueName = var.sqs_queue_name
  }

  alarm_actions = [aws_sns_topic.alarm_notifications.arn]

  tags = {
    Name        = "${var.project_name}-${var.environment}-sqs-message-age"
    Environment = var.environment
    Service     = "SQS"
  }
}

# SQS - Dead Letter Queue Depth
resource "aws_cloudwatch_metric_alarm" "sqs_dlq_depth" {
  count               = var.sqs_dlq_name != "" ? 1 : 0
  alarm_name          = "${var.project_name}-${var.environment}-sqs-dlq-depth"
  alarm_description   = "SQS dead letter queue has messages"
  comparison_operator = "GreaterThanThreshold"
  evaluation_periods  = 1
  metric_name         = "ApproximateNumberOfMessagesVisible"
  namespace           = "AWS/SQS"
  period              = 300
  statistic           = "Average"
  threshold           = 0 # Alert on any DLQ messages
  treat_missing_data  = "notBreaching"

  dimensions = {
    QueueName = var.sqs_dlq_name
  }

  alarm_actions = [aws_sns_topic.alarm_notifications.arn]

  tags = {
    Name        = "${var.project_name}-${var.environment}-sqs-dlq-depth"
    Environment = var.environment
    Service     = "SQS"
  }
}

# ============================================================================
# CloudWatch Log Group for Application Logs
# ============================================================================

resource "aws_cloudwatch_log_group" "backend_logs" {
  name              = "/aws/lambda/${var.project_name}-${var.environment}-backend"
  retention_in_days = var.log_retention_days

  tags = {
    Name        = "${var.project_name}-${var.environment}-backend-logs"
    Environment = var.environment
    Service     = "Lambda"
  }
}

resource "aws_cloudwatch_log_group" "worker_logs" {
  name              = "/aws/lambda/${var.project_name}-${var.environment}-worker"
  retention_in_days = var.log_retention_days

  tags = {
    Name        = "${var.project_name}-${var.environment}-worker-logs"
    Environment = var.environment
    Service     = "Lambda"
  }
}

# ============================================================================
# Variables
# ============================================================================

variable "project_name" {
  description = "Project name"
  type        = string
  default     = "outreachpass"
}

variable "environment" {
  description = "Environment (dev, staging, prod)"
  type        = string
}

variable "alarm_email" {
  description = "Email address for alarm notifications"
  type        = string
  default     = ""
}

variable "api_gateway_id" {
  description = "API Gateway ID for monitoring"
  type        = string
}

variable "rds_cluster_identifier" {
  description = "RDS cluster identifier for monitoring"
  type        = string
}

variable "sqs_queue_name" {
  description = "SQS queue name for monitoring"
  type        = string
}

variable "sqs_dlq_name" {
  description = "SQS dead letter queue name for monitoring"
  type        = string
  default     = ""
}

variable "log_retention_days" {
  description = "CloudWatch log retention in days"
  type        = number
  default     = 30
}

# ============================================================================
# Outputs
# ============================================================================

output "alarm_topic_arn" {
  description = "SNS topic ARN for alarms"
  value       = aws_sns_topic.alarm_notifications.arn
}

output "backend_log_group_name" {
  description = "Backend Lambda log group name"
  value       = aws_cloudwatch_log_group.backend_logs.name
}

output "worker_log_group_name" {
  description = "Worker Lambda log group name"
  value       = aws_cloudwatch_log_group.worker_logs.name
}
