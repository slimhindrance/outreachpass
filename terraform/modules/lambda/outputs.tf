output "api_lambda_arn" {
  description = "API Lambda function ARN"
  value       = aws_lambda_function.api.arn
}

output "api_lambda_name" {
  description = "API Lambda function name"
  value       = aws_lambda_function.api.function_name
}

output "api_lambda_invoke_arn" {
  description = "API Lambda function invoke ARN"
  value       = aws_lambda_function.api.invoke_arn
}
