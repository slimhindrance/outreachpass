variable "environment" {
  description = "Environment name"
  type        = string
}

variable "lambda_arn" {
  description = "Lambda function invoke ARN"
  type        = string
}

variable "lambda_name" {
  description = "Lambda function name"
  type        = string
}

variable "cognito_user_pool_arn" {
  description = "Cognito User Pool ARN"
  type        = string
}
