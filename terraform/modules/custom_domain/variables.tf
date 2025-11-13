variable "environment" {
  description = "Environment name"
  type        = string
}

variable "domain_name" {
  description = "Custom domain name for API"
  type        = string
}

variable "certificate_arn" {
  description = "ACM certificate ARN"
  type        = string
}

variable "api_id" {
  description = "API Gateway API ID"
  type        = string
}

variable "api_stage" {
  description = "API Gateway stage name"
  type        = string
  default     = "$default"
}

variable "hosted_zone_id" {
  description = "Route 53 hosted zone ID"
  type        = string
}
