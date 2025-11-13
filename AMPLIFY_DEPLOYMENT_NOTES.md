# AWS Amplify Deployment Notes

**Date**: November 13, 2025  
**Status**: 🔄 **In Progress - Deployment Method Reconsidered**

---

## Amplify Deployment Attempt Summary

### What Was Attempted
1. ✅ Created Amplify app (App ID: `d133nkuq8ovkao`)
2. ✅ Configured environment variables in Amplify
3. ✅ Created `main` branch in Amplify
4. ✅ Updated `amplify.yml` build specification
5. 🔄 Attempted to deploy pre-built artifacts

### Challenge Identified

**Issue**: AWS Amplify Hosting expects to build from source code (Git repository), not accept pre-built Next.js artifacts.

**Options Evaluated**:

1. **Amplify Hosting (Git-based)**
   - Requires GitHub/GitLab/Bitbucket repository
   - Builds from source on each deployment
   - Best for CI/CD workflows
   - **Blocker**: No Git repository configured for this project

2. **Amplify Compute (SSR)**
   - Supports Next.js SSR with standalone output
   - More complex setup
   - Requires additional configuration
   - **Status**: Possible but more time-intensive

3. **ECS with Fargate (Recommended)**
   - Already have Docker configuration
   - Same infrastructure as backend
   - Well-tested deployment pattern
   - Full control over environment
   - **Status**: Best option for current situation

---

## Recommended Deployment Path: AWS ECS

### Why ECS is Better for This Situation

1. **Docker-Ready**: Dockerfile is already configured and tested
2. **Infrastructure Consistency**: Backend is already on ECS
3. **No External Dependencies**: Doesn't require Git repository
4. **Full Control**: Complete control over environment and scaling
5. **Proven Pattern**: We've already successfully deployed backend this way

### ECS Deployment Steps

#### 1. Create ECR Repository for Frontend
```bash
aws ecr create-repository \
  --repository-name outreachpass-frontend \
  --region us-east-1 \
  --image-scanning-configuration scanOnPush=true
```

#### 2. Build and Push Docker Image
```bash
cd frontend-outreachpass

# Get ECR login
aws ecr get-login-password --region us-east-1 | \
  docker login --username AWS --password-stdin 741783034843.dkr.ecr.us-east-1.amazonaws.com

# Build image with environment variables
docker build \
  --build-arg NEXT_PUBLIC_API_URL=https://outreachpass.base2ml.com/api/v1 \
  --build-arg NEXT_PUBLIC_COGNITO_USER_POOL_ID=us-east-1_SXH934qKt \
  --build-arg NEXT_PUBLIC_COGNITO_CLIENT_ID=256e0chtcc14qf8m4knqmobdg0 \
  --build-arg NEXT_PUBLIC_COGNITO_DOMAIN=outreachpass-dev \
  --build-arg NEXT_PUBLIC_AWS_REGION=us-east-1 \
  --build-arg NEXT_PUBLIC_APP_URL=https://outreachpassapp.base2ml.com \
  -t outreachpass-frontend:latest .

# Tag and push
docker tag outreachpass-frontend:latest \
  741783034843.dkr.ecr.us-east-1.amazonaws.com/outreachpass-frontend:latest

docker push 741783034843.dkr.ecr.us-east-1.amazonaws.com/outreachpass-frontend:latest
```

#### 3. Create ECS Task Definition
```bash
aws ecs register-task-definition \
  --family outreachpass-frontend \
  --network-mode awsvpc \
  --requires-compatibilities FARGATE \
  --cpu 512 \
  --memory 1024 \
  --execution-role-arn arn:aws:iam::741783034843:role/ecsTaskExecutionRole \
  --container-definitions '[
    {
      "name": "frontend",
      "image": "741783034843.dkr.ecr.us-east-1.amazonaws.com/outreachpass-frontend:latest",
      "portMappings": [
        {
          "containerPort": 3000,
          "protocol": "tcp"
        }
      ],
      "essential": true,
      "environment": [
        {"name": "NODE_ENV", "value": "production"},
        {"name": "NEXT_PUBLIC_API_URL", "value": "https://outreachpass.base2ml.com/api/v1"},
        {"name": "NEXT_PUBLIC_COGNITO_USER_POOL_ID", "value": "us-east-1_SXH934qKt"},
        {"name": "NEXT_PUBLIC_COGNITO_CLIENT_ID", "value": "256e0chtcc14qf8m4knqmobdg0"},
        {"name": "NEXT_PUBLIC_COGNITO_DOMAIN", "value": "outreachpass-dev"},
        {"name": "NEXT_PUBLIC_AWS_REGION", "value": "us-east-1"},
        {"name": "NEXT_PUBLIC_APP_URL", "value": "https://outreachpassapp.base2ml.com"}
      ],
      "logConfiguration": {
        "logDriver": "awslogs",
        "options": {
          "awslogs-group": "/ecs/outreachpass-frontend",
          "awslogs-region": "us-east-1",
          "awslogs-stream-prefix": "frontend"
        }
      }
    }
  ]'
```

#### 4. Create Application Load Balancer Target Group
```bash
# Get VPC ID
VPC_ID=$(aws ec2 describe-vpcs \
  --filters "Name=tag:Name,Values=outreachpass-vpc" \
  --query "Vpcs[0].VpcId" \
  --output text \
  --region us-east-1)

# Create target group for frontend
aws elbv2 create-target-group \
  --name outreachpass-frontend-tg \
  --protocol HTTP \
  --port 3000 \
  --vpc-id $VPC_ID \
  --target-type ip \
  --health-check-path /health \
  --health-check-interval-seconds 30 \
  --health-check-timeout-seconds 5 \
  --healthy-threshold-count 2 \
  --unhealthy-threshold-count 3 \
  --region us-east-1
```

#### 5. Update ALB Listener (or Create New ALB)

**Option A: Create New ALB for Frontend**
```bash
# Get public subnets
SUBNETS=$(aws ec2 describe-subnets \
  --filters "Name=vpc-id,Values=$VPC_ID" "Name=tag:Type,Values=Public" \
  --query "Subnets[*].SubnetId" \
  --output text \
  --region us-east-1)

# Create security group for frontend ALB
aws ec2 create-security-group \
  --group-name outreachpass-frontend-alb-sg \
  --description "Security group for OutreachPass frontend ALB" \
  --vpc-id $VPC_ID \
  --region us-east-1

# Allow HTTPS and HTTP
aws ec2 authorize-security-group-ingress \
  --group-id <SECURITY_GROUP_ID> \
  --protocol tcp \
  --port 443 \
  --cidr 0.0.0.0/0 \
  --region us-east-1

aws ec2 authorize-security-group-ingress \
  --group-id <SECURITY_GROUP_ID> \
  --protocol tcp \
  --port 80 \
  --cidr 0.0.0.0/0 \
  --region us-east-1

# Create ALB
aws elbv2 create-load-balancer \
  --name outreachpass-frontend-alb \
  --subnets $SUBNETS \
  --security-groups <SECURITY_GROUP_ID> \
  --scheme internet-facing \
  --type application \
  --region us-east-1
```

**Option B: Use Existing Backend ALB with Different Listener**
- Add new listener on different port or hostname
- Share infrastructure with backend

#### 6. Create ECS Service
```bash
# Get cluster name
CLUSTER_NAME="outreachpass-backend"

# Get subnets and security group
SUBNETS=$(aws ec2 describe-subnets \
  --filters "Name=vpc-id,Values=$VPC_ID" \
  --query "Subnets[*].SubnetId" \
  --output text \
  --region us-east-1 | tr '\t' ',')

# Create ECS service
aws ecs create-service \
  --cluster $CLUSTER_NAME \
  --service-name outreachpass-frontend \
  --task-definition outreachpass-frontend \
  --desired-count 1 \
  --launch-type FARGATE \
  --network-configuration "awsvpcConfiguration={subnets=[$SUBNETS],securityGroups=[<SECURITY_GROUP_ID>],assignPublicIp=ENABLED}" \
  --load-balancers "targetGroupArn=<TARGET_GROUP_ARN>,containerName=frontend,containerPort=3000" \
  --region us-east-1
```

#### 7. Configure Route53
```bash
# Get ALB DNS name
ALB_DNS=$(aws elbv2 describe-load-balancers \
  --names outreachpass-frontend-alb \
  --query "LoadBalancers[0].DNSName" \
  --output text \
  --region us-east-1)

# Create Route53 record
aws route53 change-resource-record-sets \
  --hosted-zone-id <HOSTED_ZONE_ID> \
  --change-batch '{
    "Changes": [{
      "Action": "CREATE",
      "ResourceRecordSet": {
        "Name": "outreachpassapp.base2ml.com",
        "Type": "A",
        "AliasTarget": {
          "HostedZoneId": "<ALB_HOSTED_ZONE_ID>",
          "DNSName": "'$ALB_DNS'",
          "EvaluateTargetHealth": true
        }
      }
    }]
  }'
```

---

## Amplify App Cleanup (Optional)

Since we're not using Amplify, we can delete the app:

```bash
aws amplify delete-app \
  --app-id d133nkuq8ovkao \
  --region us-east-1
```

---

## Alternative: Amplify Hosting with Git Repository

If you want to use Amplify Hosting in the future:

### Prerequisites
1. Create GitHub repository
2. Push code to repository
3. Connect Amplify app to repository

### Steps
```bash
# Connect app to GitHub (via Amplify Console)
# Then trigger deployment:
aws amplify start-job \
  --app-id d133nkuq8ovkao \
  --branch-name main \
  --job-type RELEASE \
  --region us-east-1
```

---

## Current Status

- ✅ Amplify app created (can be deleted or saved for future)
- ✅ Environment variables configured
- ✅ Build specification ready
- ✅ Docker configuration ready for ECS
- 🔄 **Recommended**: Deploy to ECS instead of Amplify
- 📋 **Next Step**: Create ECR repository and deploy via ECS

---

## Decision

**Chosen Deployment Method**: AWS ECS with Fargate

**Rationale**:
1. Faster deployment (no Git repository needed)
2. Consistent with backend infrastructure
3. Docker configuration already tested
4. Full control over environment
5. Same VPC as backend for secure communication

---

## Time Estimate

- **ECS Deployment**: 30-45 minutes
- **Amplify with Git**: 1-2 hours (including Git setup)

**Recommendation**: Proceed with ECS deployment for faster MVP launch.
