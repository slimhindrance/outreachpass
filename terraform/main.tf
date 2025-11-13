terraform {
  required_version = ">= 1.0"

  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 5.0"
    }
  }

  # Using local state for now
  # For production, uncomment and configure S3 backend:
  # backend "s3" {
  #   bucket = "your-terraform-state-bucket"
  #   key    = "outreachpass/terraform.tfstate"
  #   region = "us-east-1"
  # }
}

provider "aws" {
  region = var.aws_region

  default_tags {
    tags = {
      Project     = "OutreachPass"
      Environment = var.environment
      ManagedBy   = "Terraform"
    }
  }
}

# Use Default VPC (can migrate to dedicated VPC later)
data "aws_vpc" "default" {
  default = true
}

data "aws_subnets" "default" {
  filter {
    name   = "vpc-id"
    values = [data.aws_vpc.default.id]
  }
}

# RDS Aurora PostgreSQL Serverless v2
module "database" {
  source = "./modules/database"

  environment         = var.environment
  vpc_id              = data.aws_vpc.default.id
  private_subnet_ids  = data.aws_subnets.default.ids
  database_name       = var.database_name
  master_username     = var.database_master_username
  master_password     = var.database_master_password
}

# S3 Buckets
module "storage" {
  source = "./modules/storage"

  environment = var.environment
}

# Cognito User Pool
module "cognito" {
  source = "./modules/cognito"

  environment = var.environment
}

# Lambda Functions
module "lambda" {
  source = "./modules/lambda"

  environment        = var.environment
  vpc_id             = data.aws_vpc.default.id
  private_subnet_ids = data.aws_subnets.default.ids
  security_group_id  = module.database.lambda_security_group_id

  # Environment variables for Lambda
  database_url          = module.database.database_url
  s3_bucket_assets      = module.storage.assets_bucket_name
  s3_bucket_uploads     = module.storage.uploads_bucket_name
  cognito_user_pool_id  = module.cognito.user_pool_id
  cognito_client_id     = module.cognito.user_pool_client_id
  ses_from_email        = var.ses_from_email
}

# API Gateway
module "api_gateway" {
  source = "./modules/api_gateway"

  environment      = var.environment
  lambda_arn       = module.lambda.api_lambda_arn
  lambda_name      = module.lambda.api_lambda_name
  cognito_user_pool_arn = module.cognito.user_pool_arn
}

# Custom Domain
module "custom_domain" {
  source = "./modules/custom_domain"

  environment      = var.environment
  domain_name      = "outreachpass.base2ml.com"
  certificate_arn  = "arn:aws:acm:us-east-1:741783034843:certificate/bb1cbe9e-d6ed-4b4c-8f7c-fa8f687b10c0"
  api_id           = module.api_gateway.api_id
  api_stage        = "$default"
  hosted_zone_id   = "Z09099671VTWA1L2CL021"
}

# Frontend (S3 + CloudFront)
module "frontend" {
  source = "./modules/frontend"

  environment      = var.environment
  domain_name      = "outreachpassapp.base2ml.com"
  certificate_arn  = "arn:aws:acm:us-east-1:741783034843:certificate/7a8eb69e-1ba6-4220-bcca-2b79d11200e0"
  hosted_zone_id   = "Z09099671VTWA1L2CL021"
}

# SES Email
resource "aws_ses_email_identity" "from_email" {
  email = var.ses_from_email
}
