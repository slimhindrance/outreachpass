# Security Group for RDS
resource "aws_security_group" "rds" {
  name        = "outreachpass-${var.environment}-rds-sg"
  description = "Security group for RDS Aurora cluster"
  vpc_id      = var.vpc_id

  ingress {
    description = "PostgreSQL from Lambda"
    from_port   = 5432
    to_port     = 5432
    protocol    = "tcp"
    security_groups = [aws_security_group.lambda.id]
  }

  egress {
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks = ["0.0.0.0/0"]
  }

  tags = {
    Name = "outreachpass-${var.environment}-rds-sg"
  }
}

# Security Group for Lambda
resource "aws_security_group" "lambda" {
  name        = "outreachpass-${var.environment}-lambda-sg"
  description = "Security group for Lambda functions"
  vpc_id      = var.vpc_id

  egress {
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks = ["0.0.0.0/0"]
  }

  tags = {
    Name = "outreachpass-${var.environment}-lambda-sg"
  }
}

# DB Subnet Group
resource "aws_db_subnet_group" "main" {
  name       = "outreachpass-${var.environment}-db-subnet"
  subnet_ids = var.private_subnet_ids

  tags = {
    Name = "outreachpass-${var.environment}-db-subnet"
  }
}

# Aurora Serverless v2 Cluster
resource "aws_rds_cluster" "main" {
  cluster_identifier      = "outreachpass-${var.environment}"
  engine                  = "aurora-postgresql"
  engine_mode             = "provisioned"
  engine_version          = "15.8"
  database_name           = var.database_name
  master_username         = var.master_username
  master_password         = var.master_password
  db_subnet_group_name    = aws_db_subnet_group.main.name
  vpc_security_group_ids  = [aws_security_group.rds.id]
  skip_final_snapshot     = var.environment != "prod"
  final_snapshot_identifier = var.environment == "prod" ? "outreachpass-${var.environment}-final-${formatdate("YYYY-MM-DD-hhmm", timestamp())}" : null

  serverlessv2_scaling_configuration {
    max_capacity = 2.0
    min_capacity = 0.5
  }

  backup_retention_period = var.environment == "prod" ? 30 : 7
  preferred_backup_window = "03:00-04:00"
  preferred_maintenance_window = "sun:04:00-sun:05:00"

  enabled_cloudwatch_logs_exports = ["postgresql"]

  tags = {
    Name = "outreachpass-${var.environment}-cluster"
  }
}

# Aurora Serverless v2 Instance
resource "aws_rds_cluster_instance" "main" {
  identifier         = "outreachpass-${var.environment}-instance-1"
  cluster_identifier = aws_rds_cluster.main.id
  instance_class     = "db.serverless"
  engine             = aws_rds_cluster.main.engine
  engine_version     = aws_rds_cluster.main.engine_version

  tags = {
    Name = "outreachpass-${var.environment}-instance-1"
  }
}

# Secrets Manager for DB credentials
resource "aws_secretsmanager_secret" "db_credentials" {
  name = "outreachpass/${var.environment}/database"

  tags = {
    Name = "outreachpass-${var.environment}-db-credentials"
  }
}

resource "aws_secretsmanager_secret_version" "db_credentials" {
  secret_id = aws_secretsmanager_secret.db_credentials.id
  secret_string = jsonencode({
    username = var.master_username
    password = var.master_password
    host     = aws_rds_cluster.main.endpoint
    port     = 5432
    database = var.database_name
  })
}
