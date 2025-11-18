# Production Environment - Terraform Backend Configuration

terraform {
  backend "s3" {
    bucket         = "outreachpass-terraform-state"
    key            = "prod/terraform.tfstate"
    region         = "us-east-1"
    encrypt        = true
    dynamodb_table = "terraform-state-locks"

    # Workspace isolation for prod environment
    workspace_key_prefix = "workspaces"
  }
}
