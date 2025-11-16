# IAM Role for Lambda
resource "aws_iam_role" "lambda_execution" {
  name = "outreachpass-${var.environment}-lambda-role"

  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Action = "sts:AssumeRole"
        Effect = "Allow"
        Principal = {
          Service = "lambda.amazonaws.com"
        }
      }
    ]
  })

  tags = {
    Name = "outreachpass-${var.environment}-lambda-role"
  }
}

# Attach AWS managed policies
resource "aws_iam_role_policy_attachment" "lambda_vpc_execution" {
  role       = aws_iam_role.lambda_execution.name
  policy_arn = "arn:aws:iam::aws:policy/service-role/AWSLambdaVPCAccessExecutionRole"
}

# Custom policy for S3, SES, Secrets Manager
resource "aws_iam_role_policy" "lambda_custom" {
  name = "outreachpass-${var.environment}-lambda-policy"
  role = aws_iam_role.lambda_execution.id

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Effect = "Allow"
        Action = [
          "s3:GetObject",
          "s3:PutObject",
          "s3:DeleteObject"
        ]
        Resource = [
          "arn:aws:s3:::outreachpass-${var.environment}-assets/*",
          "arn:aws:s3:::outreachpass-${var.environment}-uploads/*"
        ]
      },
      {
        Effect = "Allow"
        Action = [
          "ses:SendEmail",
          "ses:SendRawEmail"
        ]
        Resource = "*"
      },
      {
        Effect = "Allow"
        Action = [
          "secretsmanager:GetSecretValue"
        ]
        Resource = "*"
      }
    ]
  })
}

# Main API Lambda Function (with dependencies bundled)
resource "aws_lambda_function" "api" {
  filename         = "${path.module}/lambda.zip"
  function_name    = "outreachpass-${var.environment}-api"
  role             = aws_iam_role.lambda_execution.arn
  handler          = "app.main.lambda_handler"
  runtime          = "python3.11"
  timeout          = 30
  memory_size      = 512
  source_code_hash = fileexists("${path.module}/lambda.zip") ? filebase64sha256("${path.module}/lambda.zip") : null

  # Lambda Layer for dependencies
  layers = ["arn:aws:lambda:us-east-1:741783034843:layer:outreachpass-dependencies:1"]

  vpc_config {
    subnet_ids         = var.private_subnet_ids
    security_group_ids = [var.security_group_id]
  }

  environment {
    variables = {
      DATABASE_URL          = var.database_url
      S3_BUCKET_ASSETS      = var.s3_bucket_assets
      S3_BUCKET_UPLOADS     = var.s3_bucket_uploads
      COGNITO_USER_POOL_ID  = var.cognito_user_pool_id
      COGNITO_CLIENT_ID     = var.cognito_client_id
      COGNITO_REGION        = data.aws_region.current.name
      SES_FROM_EMAIL        = "outreachpass@base2ml.com"
      SES_REGION            = data.aws_region.current.name
      SECRET_KEY            = random_password.secret_key.result

      # Google Wallet Configuration
      GOOGLE_WALLET_ENABLED                = "true"
      GOOGLE_WALLET_ISSUER_ID              = "3388000000023042612"
      GOOGLE_WALLET_SERVICE_ACCOUNT_EMAIL  = "outreach-pass@outreachpass.iam.gserviceaccount.com"
      GOOGLE_WALLET_SERVICE_ACCOUNT_FILE   = "/var/task/google-wallet-credentials.json"

      # Apple Wallet Configuration (disabled until credentials available)
      APPLE_WALLET_ENABLED = "false"
    }
  }

  lifecycle {
    ignore_changes = [source_code_hash]
  }

  tags = {
    Name = "outreachpass-${var.environment}-api"
  }
}

# CloudWatch Log Group
resource "aws_cloudwatch_log_group" "lambda_logs" {
  name              = "/aws/lambda/${aws_lambda_function.api.function_name}"
  retention_in_days = 30

  tags = {
    Name = "outreachpass-${var.environment}-lambda-logs"
  }
}

# Random secret key for JWT
resource "random_password" "secret_key" {
  length  = 64
  special = true
}

# Data sources
data "aws_region" "current" {}
