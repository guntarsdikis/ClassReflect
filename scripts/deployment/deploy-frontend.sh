#!/bin/bash

# Deploy frontend to AWS Amplify
# This script updates the existing Amplify app or creates a new one

set -e

echo "🚀 Starting ClassReflect Frontend Deployment..."

# Configuration
APP_NAME="classreflect-frontend"
FRONTEND_DIR="frontend-new"
REGION="eu-west-2"
BRANCH_NAME="main"

# Check if we're in the right directory
if [ ! -d "$FRONTEND_DIR" ]; then
    echo "❌ Error: $FRONTEND_DIR directory not found"
    echo "Please run this script from the ClassReflect root directory"
    exit 1
fi

# Check if Amplify app exists
echo "🔍 Checking for existing Amplify app..."
APP_ID=$(aws amplify list-apps --region $REGION --query "apps[?name=='$APP_NAME'].appId" --output text 2>/dev/null || echo "")

if [ -z "$APP_ID" ]; then
    echo "📦 Creating new Amplify app..."
    
    # Create the Amplify app
    APP_ID=$(aws amplify create-app \
        --name "$APP_NAME" \
        --description "ClassReflect Teaching Analysis Platform" \
        --repository "https://github.com/yourusername/classreflect" \
        --platform WEB \
        --region $REGION \
        --query 'app.appId' \
        --output text)
    
    echo "✅ Created Amplify app with ID: $APP_ID"
    
    # Create branch
    echo "🌿 Creating branch..."
    aws amplify create-branch \
        --app-id "$APP_ID" \
        --branch-name "$BRANCH_NAME" \
        --region $REGION
    
    echo "✅ Created branch: $BRANCH_NAME"
else
    echo "✅ Found existing Amplify app with ID: $APP_ID"
fi

# Update app settings
echo "⚙️ Updating app settings..."
aws amplify update-app \
    --app-id "$APP_ID" \
    --build-spec "$(cat $FRONTEND_DIR/amplify.yml)" \
    --environment-variables \
        VITE_API_URL=https://api.classreflect.gdwd.co.uk \
        VITE_APP_URL=https://classreflect.gdwd.co.uk \
        VITE_AWS_REGION=$REGION \
    --region $REGION

# Update branch settings for auto-build
echo "🔄 Updating branch settings..."
aws amplify update-branch \
    --app-id "$APP_ID" \
    --branch-name "$BRANCH_NAME" \
    --enable-auto-build \
    --region $REGION

# Start a new build
echo "🏗️ Starting deployment..."
JOB_ID=$(aws amplify start-job \
    --app-id "$APP_ID" \
    --branch-name "$BRANCH_NAME" \
    --job-type RELEASE \
    --region $REGION \
    --query 'jobSummary.jobId' \
    --output text)

echo "✅ Deployment started with Job ID: $JOB_ID"

# Get the app URL
APP_URL=$(aws amplify get-app \
    --app-id "$APP_ID" \
    --region $REGION \
    --query 'app.defaultDomain' \
    --output text)

echo ""
echo "📱 Amplify Console: https://$REGION.console.aws.amazon.com/amplify/home?region=$REGION#/$APP_ID"
echo "🌐 App URL: https://$BRANCH_NAME.$APP_URL"
echo ""

# Monitor deployment
echo "📊 Monitoring deployment status..."
while true; do
    STATUS=$(aws amplify get-job \
        --app-id "$APP_ID" \
        --branch-name "$BRANCH_NAME" \
        --job-id "$JOB_ID" \
        --region $REGION \
        --query 'job.summary.status' \
        --output text)
    
    echo "Status: $STATUS"
    
    if [ "$STATUS" = "SUCCEED" ]; then
        echo "✅ Deployment completed successfully!"
        break
    elif [ "$STATUS" = "FAILED" ] || [ "$STATUS" = "CANCELLED" ]; then
        echo "❌ Deployment failed with status: $STATUS"
        exit 1
    fi
    
    sleep 10
done

echo ""
echo "🎉 Frontend deployment complete!"
echo "🌐 Your app is available at: https://$BRANCH_NAME.$APP_URL"
echo ""
echo "Next steps:"
echo "1. Update DNS records to point classreflect.gdwd.co.uk to the Amplify app"
echo "2. Configure custom domain in Amplify Console"
echo "3. Test the application with the mock authentication"
echo ""