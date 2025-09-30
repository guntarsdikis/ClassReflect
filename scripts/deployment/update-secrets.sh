#!/bin/bash

# Update AWS Secrets Manager secrets
# These are sensitive values that should NOT be in environment variables
# Run this script to update API keys and other secrets

set -e

echo "🔐 Updating AWS Secrets Manager secrets..."

# Check if secrets exist, create if not
check_and_update_secret() {
  local SECRET_NAME=$1
  local SECRET_VALUE=$2

  if aws secretsmanager describe-secret --secret-id $SECRET_NAME --region eu-west-2 &>/dev/null; then
    echo "📝 Updating existing secret: $SECRET_NAME"
    aws secretsmanager put-secret-value \
      --secret-id $SECRET_NAME \
      --secret-string "$SECRET_VALUE" \
      --region eu-west-2 \
      --output text > /dev/null
  else
    echo "➕ Creating new secret: $SECRET_NAME"
    aws secretsmanager create-secret \
      --name $SECRET_NAME \
      --secret-string "$SECRET_VALUE" \
      --region eu-west-2 \
      --output text > /dev/null
  fi
}

# Update secrets from .env file
echo ""
echo "Enter the values for each secret (or press Enter to skip):"
echo ""

# JWT Secret
read -sp "JWT_SECRET (current value hidden): " JWT_SECRET
echo ""
if [ ! -z "$JWT_SECRET" ]; then
  check_and_update_secret "classreflect/jwt-secret" "$JWT_SECRET"
fi

# Database Password
read -sp "DB_PASSWORD (current: FullSMS2025DB): " DB_PASSWORD
echo ""
if [ ! -z "$DB_PASSWORD" ]; then
  check_and_update_secret "classreflect/database/credentials" "{\"password\":\"$DB_PASSWORD\",\"username\":\"gdwd\"}"
fi

# AssemblyAI API Key
read -sp "ASSEMBLYAI_API_KEY: " ASSEMBLYAI_API_KEY
echo ""
if [ ! -z "$ASSEMBLYAI_API_KEY" ]; then
  check_and_update_secret "classreflect/assemblyai-api-key" "$ASSEMBLYAI_API_KEY"
fi

# OpenAI API Key
read -sp "OPENAI_API_KEY: " OPENAI_API_KEY
echo ""
if [ ! -z "$OPENAI_API_KEY" ]; then
  check_and_update_secret "classreflect/openai-api-key" "$OPENAI_API_KEY"
fi

# Google Gemini API Key
read -sp "GOOGLE_API_KEY: " GOOGLE_API_KEY
echo ""
if [ ! -z "$GOOGLE_API_KEY" ]; then
  check_and_update_secret "classreflect/google-api-key" "$GOOGLE_API_KEY"
fi

# Vertex API Key
read -sp "VERTEX_API_KEY: " VERTEX_API_KEY
echo ""
if [ ! -z "$VERTEX_API_KEY" ]; then
  check_and_update_secret "classreflect/vertex-api-key" "$VERTEX_API_KEY"
fi

# Vertex Project ID
read -p "VERTEX_PROJECT_ID (current: plexiform-plane-290207): " VERTEX_PROJECT_ID
if [ ! -z "$VERTEX_PROJECT_ID" ]; then
  check_and_update_secret "classreflect/vertex-project-id" "$VERTEX_PROJECT_ID"
fi

# OpenRouter API Key
read -sp "OPENROUTER_API_KEY: " OPENROUTER_API_KEY
echo ""
if [ ! -z "$OPENROUTER_API_KEY" ]; then
  check_and_update_secret "classreflect/openrouter-api-key" "$OPENROUTER_API_KEY"
fi

# AWS Access Keys (if needed)
read -p "AWS_ACCESS_KEY_ID (optional): " AWS_ACCESS_KEY_ID
if [ ! -z "$AWS_ACCESS_KEY_ID" ]; then
  check_and_update_secret "classreflect/aws-access-key-id" "$AWS_ACCESS_KEY_ID"
fi

read -sp "AWS_SECRET_ACCESS_KEY (optional): " AWS_SECRET_ACCESS_KEY
echo ""
if [ ! -z "$AWS_SECRET_ACCESS_KEY" ]; then
  check_and_update_secret "classreflect/aws-secret-access-key" "$AWS_SECRET_ACCESS_KEY"
fi

echo ""
echo "✅ Secrets updated successfully!"
echo ""
echo "⚠️  Important: After updating secrets, you need to:"
echo "   1. Update the ECS task definition to reference these secrets"
echo "   2. Force a new deployment: aws ecs update-service --cluster classreflect-cluster --service classreflect-api-service --force-new-deployment --region eu-west-2"
echo ""
echo "📋 To view secrets:"
echo "   aws secretsmanager list-secrets --region eu-west-2 | grep classreflect"