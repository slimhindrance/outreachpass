output "assets_bucket_name" {
  description = "Assets S3 bucket name"
  value       = aws_s3_bucket.assets.id
}

output "assets_bucket_arn" {
  description = "Assets S3 bucket ARN"
  value       = aws_s3_bucket.assets.arn
}

output "uploads_bucket_name" {
  description = "Uploads S3 bucket name"
  value       = aws_s3_bucket.uploads.id
}

output "uploads_bucket_arn" {
  description = "Uploads S3 bucket ARN"
  value       = aws_s3_bucket.uploads.arn
}
