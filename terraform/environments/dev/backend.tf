# Development Environment - Terraform Backend Configuration

terraform {
  backend "s3" {
    bucket         = "outreachpass-terraform-state"
    key            = "dev/terraform.tfstate"
    region         = "us-east-1"
    encrypt        = true
    dynamodb_table = "terraform-state-locks"

    # Workspace isolation for dev environment
    workspace_key_prefix = "workspaces"
  }
}
