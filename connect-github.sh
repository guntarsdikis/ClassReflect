#!/bin/bash

# Script to connect Amplify app to GitHub with webhook
# This will enable auto-deployment on git changes

APP_ID="d14hcrbx0hhror"
REPO_URL="https://github.com/guntarsdikis/classreflect"

echo "🔗 Connecting Amplify app to GitHub..."

# Note: This requires a GitHub personal access token to be set up
# You can do this through the AWS Console at:
# https://eu-west-2.console.aws.amazon.com/amplify/home?region=eu-west-2#/d14hcrbx0hhror/settings/general

echo "To complete GitHub integration:"
echo "1. Go to: https://eu-west-2.console.aws.amazon.com/amplify/home?region=eu-west-2#/$APP_ID/settings/general"
echo "2. Click 'Connect to Git provider'"
echo "3. Select GitHub and authorize"
echo "4. Select repository: guntarsdikis/classreflect"
echo "5. Select branch: main"
echo ""

# Update the branch to enable auto-build
echo "📝 Enabling auto-build..."
aws amplify update-branch \
  --app-id "$APP_ID" \
  --branch-name main \
  --enable-auto-build

echo "✅ Auto-build enabled for main branch"
echo ""
echo "📋 Summary:"
echo "- App ID: $APP_ID"
echo "- App URL: https://main.d14hcrbx0hhror.amplifyapp.com"
echo "- Custom Domain: https://classreflect.gdwd.co.uk (setting up...)"
echo ""
echo "Once GitHub is connected, the app will auto-deploy on every git push!"