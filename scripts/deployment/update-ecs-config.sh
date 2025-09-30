#!/bin/bash

# Comprehensive ECS Configuration Update Script
# This script updates both environment variables and secrets for the ClassReflect API

set -e

CLUSTER="classreflect-cluster"
SERVICE="classreflect-api-service"
REGION="eu-west-2"

echo "🚀 ClassReflect ECS Configuration Update"
echo "========================================"
echo ""

# Function to update secrets in Secrets Manager
update_secret() {
  local SECRET_NAME=$1
  local SECRET_VALUE=$2

  echo "🔐 Updating secret: $SECRET_NAME"

  if aws secretsmanager describe-secret --secret-id "$SECRET_NAME" --region $REGION &>/dev/null; then
    aws secretsmanager put-secret-value \
      --secret-id "$SECRET_NAME" \
      --secret-string "$SECRET_VALUE" \
      --region $REGION \
      --output text > /dev/null
    echo "   ✅ Updated existing secret"
  else
    aws secretsmanager create-secret \
      --name "$SECRET_NAME" \
      --secret-string "$SECRET_VALUE" \
      --region $REGION \
      --output text > /dev/null
    echo "   ✅ Created new secret"
  fi
}

# Step 1: Update Secrets (API Keys)
echo "Step 1: Checking API Keys in Secrets Manager"
echo "---------------------------------------------"
echo ""

# Check if secrets exist, only update if requested
if [ "$UPDATE_SECRETS" = "true" ]; then
  echo "⚠️  UPDATE_SECRETS=true - Will update secrets from environment variables"
  echo ""

  # Read from environment variables (safer than hardcoding)
  if [ ! -z "$GOOGLE_API_KEY" ]; then
    echo "Updating Google/Gemini API key..."
    update_secret "classreflect/google/api-key" "{\"apikey\":\"$GOOGLE_API_KEY\"}"
  fi

  if [ ! -z "$VERTEX_API_KEY" ] && [ ! -z "$VERTEX_PROJECT_ID" ]; then
    echo "Updating Vertex AI configuration..."
    update_secret "classreflect/vertex/config" "{\"apikey\":\"$VERTEX_API_KEY\",\"projectid\":\"$VERTEX_PROJECT_ID\"}"
  fi

  if [ ! -z "$OPENROUTER_API_KEY" ]; then
    echo "Updating OpenRouter API key..."
    update_secret "classreflect/openrouter/api-key" "{\"apikey\":\"$OPENROUTER_API_KEY\"}"
  fi

  if [ ! -z "$JWT_SECRET" ]; then
    echo "Updating JWT secret..."
    update_secret "classreflect/jwt-secret" "{\"secret\":\"$JWT_SECRET\"}"
  fi

  echo ""
  echo "✅ Secrets updated from environment variables!"
else
  echo "ℹ️  Skipping secret updates (secrets already exist in AWS)"
  echo "   To update secrets, run: UPDATE_SECRETS=true ./scripts/deployment/update-ecs-config.sh"
  echo "   Or update manually: ./scripts/deployment/update-secrets.sh"
fi

echo ""

# Step 2: Get current task definition
echo "Step 2: Updating ECS Task Definition"
echo "-------------------------------------"
echo ""

TASK_DEF_ARN=$(aws ecs describe-services \
  --cluster $CLUSTER \
  --services $SERVICE \
  --region $REGION \
  --query 'services[0].taskDefinition' \
  --output text)

echo "📋 Current task definition: $TASK_DEF_ARN"

# Get the full task definition
TASK_DEF=$(aws ecs describe-task-definition \
  --task-definition $TASK_DEF_ARN \
  --region $REGION)

# Get secret ARNs
DB_SECRET_ARN=$(aws secretsmanager describe-secret --secret-id "classreflect/database/credentials" --region $REGION --query 'ARN' --output text)
ASSEMBLYAI_SECRET_ARN=$(aws secretsmanager describe-secret --secret-id "classreflect/assemblyai/api-key" --region $REGION --query 'ARN' --output text)
OPENAI_SECRET_ARN=$(aws secretsmanager describe-secret --secret-id "classreflect/openai/api-key" --region $REGION --query 'ARN' --output text)
GOOGLE_SECRET_ARN=$(aws secretsmanager describe-secret --secret-id "classreflect/google/api-key" --region $REGION --query 'ARN' --output text 2>/dev/null || echo "")
VERTEX_SECRET_ARN=$(aws secretsmanager describe-secret --secret-id "classreflect/vertex/config" --region $REGION --query 'ARN' --output text 2>/dev/null || echo "")
OPENROUTER_SECRET_ARN=$(aws secretsmanager describe-secret --secret-id "classreflect/openrouter/api-key" --region $REGION --query 'ARN' --output text 2>/dev/null || echo "")
JWT_SECRET_ARN=$(aws secretsmanager describe-secret --secret-id "classreflect/jwt-secret" --region $REGION --query 'ARN' --output text 2>/dev/null || echo "")

# Create updated task definition JSON
echo "📝 Creating new task definition with updated configuration..."

NEW_TASK_DEF=$(echo "$TASK_DEF" | jq --arg db_arn "$DB_SECRET_ARN" \
  --arg assemblyai_arn "$ASSEMBLYAI_SECRET_ARN" \
  --arg openai_arn "$OPENAI_SECRET_ARN" \
  --arg google_arn "$GOOGLE_SECRET_ARN" \
  --arg vertex_arn "$VERTEX_SECRET_ARN" \
  --arg openrouter_arn "$OPENROUTER_SECRET_ARN" \
  --arg jwt_arn "$JWT_SECRET_ARN" \
  '.taskDefinition |
  .containerDefinitions[0].environment = [
    {"name": "NODE_ENV", "value": "production"},
    {"name": "PORT", "value": "3000"},
    {"name": "FRONTEND_URL", "value": "https://classreflect.gdwd.co.uk"},
    {"name": "AWS_REGION", "value": "eu-west-2"},
    {"name": "AWS_SES_REGION", "value": "eu-west-1"},
    {"name": "SES_FROM_EMAIL", "value": "info@gdwd.co.uk"},
    {"name": "S3_BUCKET_NAME", "value": "classreflect-audio-files-573524060586"},
    {"name": "SQS_QUEUE_URL", "value": "https://sqs.eu-west-2.amazonaws.com/573524060586/classreflect-processing-queue"},
    {"name": "ASSEMBLYAI_UPLOAD_MODE", "value": "s3"},
    {"name": "ASSEMBLYAI_DIRECT_MAX_MB", "value": "25"},
    {"name": "S3_PRESIGNED_EXPIRES_SECONDS", "value": "7200"},
    {"name": "S3_PRESIGNED_PUT_EXPIRES_SECONDS", "value": "3600"},
    {"name": "ANALYSIS_PROVIDER", "value": "openrouter"},
    {"name": "OPENAI_MODEL", "value": "gpt-4o"},
    {"name": "GEMINI_MODEL", "value": "gemini-1.5-pro"},
    {"name": "GEMINI_USE_JSON_MIME", "value": "true"},
    {"name": "GEMINI_MAX_OUTPUT_TOKENS", "value": "16000"},
    {"name": "GEMINI_CRITERIA_BATCH_SIZE", "value": "16"},
    {"name": "GEMINI_TEMPERATURE", "value": "0.4"},
    {"name": "GEMINI_TOP_K", "value": "40"},
    {"name": "GEMINI_TOP_P", "value": "0.9"},
    {"name": "GEMINI_FORCE_SINGLE_PROMPT", "value": "true"},
    {"name": "GEMINI_DISABLE_FALLBACK", "value": "false"},
    {"name": "GEMINI_OUTPUT_MODE", "value": "rich"},
    {"name": "VERTEX_LOCATION", "value": "europe-west1"},
    {"name": "VERTEX_MODEL", "value": "gemini-1.5-pro"},
    {"name": "OPENROUTER_MODEL", "value": "google/gemini-2.5-flash"},
    {"name": "OPENROUTER_TEMPERATURE", "value": "0.6"},
    {"name": "OPENROUTER_MAX_TOKENS", "value": "16384"},
    {"name": "OPENROUTER_BATCH_SIZE", "value": "3"},
    {"name": "OPENROUTER_FORCE_SINGLE_PROMPT", "value": "false"},
    {"name": "OPENROUTER_DISABLE_FALLBACK", "value": "false"},
    {"name": "OPENROUTER_OUTPUT_MODE", "value": "minimal"},
    {"name": "PROMPT_LOG_ENABLED", "value": "true"}
  ] |
  .containerDefinitions[0].secrets = [
    {"name": "DB_HOST", "valueFrom": "\($db_arn):host::"},
    {"name": "DB_PORT", "valueFrom": "\($db_arn):port::"},
    {"name": "DB_NAME", "valueFrom": "\($db_arn):dbname::"},
    {"name": "DB_USER", "valueFrom": "\($db_arn):username::"},
    {"name": "DB_PASSWORD", "valueFrom": "\($db_arn):password::"},
    {"name": "ASSEMBLYAI_API_KEY", "valueFrom": "\($assemblyai_arn):apikey::"},
    {"name": "OPENAI_API_KEY", "valueFrom": "\($openai_arn):apikey::"},
    {"name": "GOOGLE_API_KEY", "valueFrom": "\($google_arn):apikey::"},
    {"name": "VERTEX_API_KEY", "valueFrom": "\($vertex_arn):apikey::"},
    {"name": "VERTEX_PROJECT_ID", "valueFrom": "\($vertex_arn):projectid::"},
    {"name": "OPENROUTER_API_KEY", "valueFrom": "\($openrouter_arn):apikey::"},
    {"name": "JWT_SECRET", "valueFrom": "\($jwt_arn):secret::"}
  ] |
  del(.taskDefinitionArn, .revision, .status, .requiresAttributes, .compatibilities, .registeredAt, .registeredBy)
')

# Register new task definition
echo "📝 Registering new task definition..."
NEW_TASK_DEF_ARN=$(echo "$NEW_TASK_DEF" | aws ecs register-task-definition \
  --region $REGION \
  --cli-input-json file:///dev/stdin \
  --query 'taskDefinition.taskDefinitionArn' \
  --output text)

echo "✅ New task definition registered: $NEW_TASK_DEF_ARN"
echo ""

# Step 3: Update the service
echo "Step 3: Deploying to ECS"
echo "------------------------"
echo ""

aws ecs update-service \
  --cluster $CLUSTER \
  --service $SERVICE \
  --task-definition $NEW_TASK_DEF_ARN \
  --region $REGION \
  --force-new-deployment \
  > /dev/null

echo "⏳ Waiting for deployment to complete (this may take 2-3 minutes)..."

# Wait for service to stabilize
aws ecs wait services-stable \
  --cluster $CLUSTER \
  --services $SERVICE \
  --region $REGION

echo ""
echo "✅ Deployment Complete!"
echo ""
echo "🔗 API Health Check: https://api.classreflect.gdwd.co.uk/health"
echo ""
echo "📋 To view logs:"
echo "   aws logs tail /ecs/classreflect-api --since 5m --follow --region eu-west-2"
echo ""
echo "📊 To view ECS service:"
echo "   aws ecs describe-services --cluster $CLUSTER --services $SERVICE --region $REGION"