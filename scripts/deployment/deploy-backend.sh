#!/bin/bash

# ClassReflect Backend Deployment Script
# This script builds, pushes, and deploys the backend API to AWS ECS
#
# Usage: ./scripts/deployment/deploy-backend.sh
# Run from: ClassReflect project root directory

set -e  # Exit immediately if a command exits with a non-zero status

echo "🚀 Starting ClassReflect Backend Deployment..."

# Configuration
ECR_REPO="573524060586.dkr.ecr.eu-west-2.amazonaws.com/classreflect-api"
AWS_REGION="eu-west-2"
ECS_CLUSTER="classreflect-cluster" 
ECS_SERVICE="classreflect-api-service"

# Check if we're in the correct directory
if [ ! -f "backend/package.json" ]; then
    echo "❌ Error: Run this script from the ClassReflect project root directory"
    echo "   Current directory: $(pwd)"
    echo "   Expected: backend/package.json should exist"
    exit 1
fi

echo "📁 Working from: $(pwd)"
echo "📦 ECR Repository: $ECR_REPO"

# Step 1: Navigate to backend directory
cd backend
echo "✅ Step 1: Navigated to backend directory"

# Step 2: Build Docker image for x64 architecture (required for ECS Fargate)
echo "🔨 Step 2: Building Docker image for linux/amd64..."
docker build --platform linux/amd64 -t $ECR_REPO:latest .
echo "✅ Docker image built successfully"

# Step 3: Login to ECR
echo "🔐 Step 3: Logging into AWS ECR..."
aws ecr get-login-password --region $AWS_REGION | docker login --username AWS --password-stdin $ECR_REPO
echo "✅ ECR login successful"

# Step 4: Push image to ECR
echo "⬆️  Step 4: Pushing image to ECR..."
docker push $ECR_REPO:latest
echo "✅ Image pushed to ECR successfully"

# Step 5: Get current image SHA
IMAGE_SHA=$(docker inspect $ECR_REPO:latest --format='{{index .RepoDigests 0}}' | cut -d'@' -f2 | cut -c1-8)
echo "📋 New image SHA: $IMAGE_SHA"

# Step 6: Force new ECS deployment
echo "🔄 Step 5: Updating ECS service..."
aws ecs update-service \
    --cluster $ECS_CLUSTER \
    --service $ECS_SERVICE \
    --force-new-deployment \
    --region $AWS_REGION > /dev/null

echo "✅ ECS service update initiated"

# Step 7: Wait for deployment to complete
echo "⏳ Step 6: Waiting for deployment to complete..."
echo "   This may take 2-3 minutes..."

# Monitor deployment status
DEPLOYMENT_IN_PROGRESS=true
COUNTER=0
MAX_WAIT=180  # 3 minutes

while [ "$DEPLOYMENT_IN_PROGRESS" = true ] && [ $COUNTER -lt $MAX_WAIT ]; do
    sleep 10
    COUNTER=$((COUNTER + 10))
    
    # Get service status
    SERVICE_STATUS=$(aws ecs describe-services \
        --cluster $ECS_CLUSTER \
        --services $ECS_SERVICE \
        --region $AWS_REGION \
        --query 'services[0].{RunningCount: runningCount, DesiredCount: desiredCount, PendingCount: pendingCount}' \
        --output json)
    
    RUNNING=$(echo $SERVICE_STATUS | jq -r '.RunningCount')
    DESIRED=$(echo $SERVICE_STATUS | jq -r '.DesiredCount')
    PENDING=$(echo $SERVICE_STATUS | jq -r '.PendingCount')
    
    echo "   Status: Running: $RUNNING, Desired: $DESIRED, Pending: $PENDING (${COUNTER}s elapsed)"
    
    # Check if deployment is complete
    if [ "$RUNNING" -eq "$DESIRED" ] && [ "$PENDING" -eq 0 ]; then
        DEPLOYMENT_IN_PROGRESS=false
    fi
done

# Final status check
if [ "$DEPLOYMENT_IN_PROGRESS" = true ]; then
    echo "⚠️  Warning: Deployment is still in progress after $MAX_WAIT seconds"
    echo "   Check AWS ECS console for status: https://console.aws.amazon.com/ecs"
    exit 1
fi

echo "✅ Step 7: Deployment completed successfully!"

# Step 8: Verify API health
echo "🩺 Step 8: Verifying API health..."
sleep 10  # Give the API a moment to fully start

API_HEALTH=$(curl -s -o /dev/null -w "%{http_code}" https://api.classreflect.gdwd.co.uk/health)
if [ "$API_HEALTH" = "200" ]; then
    echo "✅ API health check passed (HTTP $API_HEALTH)"
    
    # Get actual health response
    curl -s https://api.classreflect.gdwd.co.uk/health | jq .
else
    echo "❌ API health check failed (HTTP $API_HEALTH)"
    echo "   Check CloudWatch logs: aws logs tail /ecs/classreflect-api --since 5m"
    exit 1
fi

# Return to project root
cd ..

echo ""
echo "🎉 Backend deployment completed successfully!"
echo ""
echo "📊 Summary:"
echo "   • Docker image built for linux/amd64"
echo "   • Image pushed to ECR: $ECR_REPO:latest"
echo "   • ECS service updated and deployed"
echo "   • API health check: ✅ PASSED"
echo ""
echo "🔗 Endpoints:"
echo "   • API Health: https://api.classreflect.gdwd.co.uk/health"
echo "   • Frontend: https://classreflect.gdwd.co.uk"
echo ""
echo "📋 Monitoring:"
echo "   • ECS Console: https://console.aws.amazon.com/ecs"
echo "   • CloudWatch Logs: aws logs tail /ecs/classreflect-api --since 10m"
echo ""
echo "✅ Deployment complete! 🚀"