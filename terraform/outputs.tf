output "custom_domain" {
  description = "Custom domain URL"
  value       = "https://${module.custom_domain.domain_name}"
}

output "api_endpoint" {
  description = "API Gateway endpoint URL (default)"
  value       = module.api_gateway.api_endpoint
}

output "database_endpoint" {
  description = "RDS cluster endpoint"
  value       = module.database.cluster_endpoint
  sensitive   = true
}

output "cognito_user_pool_id" {
  description = "Cognito User Pool ID"
  value       = module.cognito.user_pool_id
}

output "cognito_client_id" {
  description = "Cognito Client ID"
  value       = module.cognito.user_pool_client_id
}

output "assets_bucket" {
  description = "S3 bucket for assets"
  value       = module.storage.assets_bucket_name
}

output "uploads_bucket" {
  description = "S3 bucket for uploads"
  value       = module.storage.uploads_bucket_name
}

output "lambda_function_name" {
  description = "Lambda function name"
  value       = module.lambda.api_lambda_name
}

output "frontend_url" {
  description = "Frontend application URL"
  value       = module.frontend.website_url
}

output "frontend_bucket" {
  description = "S3 bucket for frontend"
  value       = module.frontend.bucket_name
}

output "cloudfront_distribution_id" {
  description = "CloudFront distribution ID"
  value       = module.frontend.cloudfront_distribution_id
}
