#!/bin/bash

set -e

echo "ClassReflect Deployment Script"
echo "=============================="

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

# Check AWS CLI is installed
if ! command -v aws &> /dev/null; then
    echo -e "${RED}AWS CLI is not installed. Please install it first.${NC}"
    exit 1
fi

# Check Terraform is installed
if ! command -v terraform &> /dev/null; then
    echo -e "${RED}Terraform is not installed. Please install it first.${NC}"
    exit 1
fi

# Get AWS region
AWS_REGION=${AWS_REGION:-eu-west-2}
echo -e "${GREEN}Using AWS Region: $AWS_REGION${NC}"

# Step 1: Initialize Terraform
echo -e "\n${YELLOW}Step 1: Initializing Terraform...${NC}"
cd infrastructure/terraform
terraform init

# Step 2: Plan Terraform changes
echo -e "\n${YELLOW}Step 2: Planning infrastructure changes...${NC}"
terraform plan -out=tfplan

# Step 3: Apply Terraform changes
echo -e "\n${YELLOW}Step 3: Applying infrastructure changes...${NC}"
read -p "Do you want to apply these changes? (yes/no): " confirm
if [ "$confirm" == "yes" ]; then
    terraform apply tfplan
else
    echo -e "${RED}Deployment cancelled.${NC}"
    exit 1
fi

# Step 4: Build and push backend Docker image
echo -e "\n${YELLOW}Step 4: Building and pushing backend Docker image...${NC}"
cd ../../backend

# Get ECR repository URL
ECR_REPO=$(aws ecr describe-repositories --repository-names classreflect-api --region $AWS_REGION --query 'repositories[0].repositoryUri' --output text)

# Login to ECR
aws ecr get-login-password --region $AWS_REGION | docker login --username AWS --password-stdin $ECR_REPO

# Build and push Docker image
docker build -t classreflect-api .
docker tag classreflect-api:latest $ECR_REPO:latest
docker push $ECR_REPO:latest

# Step 5: Deploy ECS service
echo -e "\n${YELLOW}Step 5: Deploying ECS service...${NC}"
aws ecs update-service \
    --cluster classreflect-cluster \
    --service classreflect-api-service \
    --force-new-deployment \
    --region $AWS_REGION

# Step 6: Deploy frontend to Amplify
echo -e "\n${YELLOW}Step 6: Frontend will be deployed automatically via Amplify when you push to GitHub${NC}"

echo -e "\n${GREEN}Deployment complete!${NC}"
echo -e "Frontend URL: https://classreflect.gdwd.co.uk"
echo -e "API URL: https://api.classreflect.gdwd.co.uk"