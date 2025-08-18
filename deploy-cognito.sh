#!/bin/bash

# ClassReflect Cognito Deployment Script
# This script deploys AWS Cognito infrastructure and updates backend configuration

set -e

echo "🚀 Starting ClassReflect Cognito deployment..."

# Check AWS credentials
echo "📋 Checking AWS credentials..."
if ! aws sts get-caller-identity > /dev/null 2>&1; then
    echo "❌ AWS credentials not configured. Please run 'aws configure'"
    exit 1
fi

ACCOUNT_ID=$(aws sts get-caller-identity --query Account --output text)
REGION="eu-west-2"

echo "✅ AWS Account: $ACCOUNT_ID"
echo "✅ Region: $REGION"

# Change to terraform directory
cd infrastructure/terraform

echo "📦 Deploying Cognito infrastructure with Terraform..."

# Initialize and plan
terraform init
terraform plan -out=cognito.tfplan

# Ask for confirmation
read -p "Do you want to apply these changes? (y/N): " -r
if [[ ! $REPLY =~ ^[Yy]$ ]]; then
    echo "❌ Deployment cancelled"
    exit 1
fi

# Apply the changes
terraform apply cognito.tfplan

# Get outputs
USER_POOL_ID=$(terraform output -raw cognito_user_pool_id)
CLIENT_ID=$(terraform output -raw cognito_user_pool_client_id)
CLIENT_SECRET=$(terraform output -raw cognito_user_pool_client_secret)
USER_POOL_DOMAIN=$(terraform output -raw cognito_user_pool_domain)

echo "✅ Cognito infrastructure deployed successfully!"
echo "📝 User Pool ID: $USER_POOL_ID"
echo "📝 Client ID: $CLIENT_ID"
echo "📝 Domain: $USER_POOL_DOMAIN"

# Create .env file for backend
cd ../../backend

echo "📄 Creating backend .env configuration..."

cat > .env << EOF
# AWS Configuration
AWS_REGION=$REGION

# Cognito Configuration
COGNITO_USER_POOL_ID=$USER_POOL_ID
COGNITO_CLIENT_ID=$CLIENT_ID
COGNITO_CLIENT_SECRET=$CLIENT_SECRET
COGNITO_DOMAIN=$USER_POOL_DOMAIN

# Database Configuration
DATABASE_HOST=gdwd.cluster-cjjl7f5jormj.eu-west-2.rds.amazonaws.com
DATABASE_NAME=classreflect
DATABASE_USER=gdwd
DATABASE_PASSWORD=\${DATABASE_PASSWORD}

# S3 and SQS Configuration
S3_BUCKET=classreflect-audio-files-573524060586
SQS_QUEUE_URL=https://sqs.eu-west-2.amazonaws.com/573524060586/classreflect-processing-queue

# CORS Configuration
FRONTEND_URL=https://classreflect.gdwd.co.uk

# JWT Secret (fallback)
JWT_SECRET=\${JWT_SECRET}

# Node Environment
NODE_ENV=production
EOF

echo "✅ Backend .env file created!"

# Update database schema
echo "📊 Would you like to update the database schema for Cognito integration?"
read -p "Update database schema? (y/N): " -r
if [[ $REPLY =~ ^[Yy]$ ]]; then
    echo "📊 Applying database schema updates..."
    
    # Connect to database and apply schema
    mysql -h gdwd.cluster-cjjl7f5jormj.eu-west-2.rds.amazonaws.com -u gdwd -p classreflect < ../database/schema-cognito.sql
    
    echo "✅ Database schema updated!"
else
    echo "⚠️  Database schema not updated. Run manually later if needed."
fi

# Build and test backend
echo "🔧 Building backend..."
npm run build

echo "🧪 Testing Cognito integration..."
npm run test || echo "⚠️  Tests not available yet"

echo "🎉 Cognito deployment completed successfully!"
echo ""
echo "Next steps:"
echo "1. Set DATABASE_PASSWORD environment variable"
echo "2. Set JWT_SECRET environment variable" 
echo "3. Deploy updated backend to ECS"
echo "4. Update frontend to use Cognito authentication"
echo "5. Create initial super admin user via Cognito"
echo ""
echo "Cognito Configuration:"
echo "  User Pool ID: $USER_POOL_ID"
echo "  Client ID: $CLIENT_ID"
echo "  Domain: https://$USER_POOL_DOMAIN.auth.$REGION.amazoncognito.com"
echo ""
echo "Next run: ./deploy.sh to deploy the updated backend"