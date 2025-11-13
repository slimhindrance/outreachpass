variable "aws_region" {
  description = "AWS region"
  type        = string
  default     = "us-east-1"
}

variable "environment" {
  description = "Environment name (dev, staging, prod)"
  type        = string
  default     = "dev"
}

variable "vpc_cidr" {
  description = "CIDR block for VPC"
  type        = string
  default     = "10.0.0.0/16"
}

variable "database_name" {
  description = "Database name"
  type        = string
  default     = "outreachpass"
}

variable "database_master_username" {
  description = "Database master username"
  type        = string
  sensitive   = true
}

variable "database_master_password" {
  description = "Database master password"
  type        = string
  sensitive   = true
}

variable "ses_from_email" {
  description = "SES verified sender email"
  type        = string
}
