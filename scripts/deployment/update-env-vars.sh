#!/bin/bash

# Update ECS Environment Variables
# This script updates the ECS task definition with new environment variables
# and forces a new deployment

set -e

echo "🔧 Updating ECS Environment Variables..."

# Get current task definition
TASK_DEF_ARN=$(aws ecs describe-services \
  --cluster classreflect-cluster \
  --services classreflect-api-service \
  --region eu-west-2 \
  --query 'services[0].taskDefinition' \
  --output text)

echo "📋 Current task definition: $TASK_DEF_ARN"

# Get the full task definition JSON
TASK_DEF=$(aws ecs describe-task-definition \
  --task-definition $TASK_DEF_ARN \
  --region eu-west-2 \
  --query 'taskDefinition')

# Create new task definition with updated environment variables
# Extract current task def and modify the environment section
NEW_TASK_DEF=$(echo $TASK_DEF | jq '
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
  # Keep only the fields needed for registration
  del(.taskDefinitionArn, .revision, .status, .requiresAttributes, .compatibilities, .registeredAt, .registeredBy)
')

# Register new task definition
echo "📝 Registering new task definition..."
NEW_TASK_DEF_ARN=$(echo $NEW_TASK_DEF | aws ecs register-task-definition \
  --region eu-west-2 \
  --cli-input-json file:///dev/stdin \
  --query 'taskDefinition.taskDefinitionArn' \
  --output text)

echo "✅ New task definition registered: $NEW_TASK_DEF_ARN"

# Update the service to use the new task definition
echo "🔄 Updating ECS service..."
aws ecs update-service \
  --cluster classreflect-cluster \
  --service classreflect-api-service \
  --task-definition $NEW_TASK_DEF_ARN \
  --region eu-west-2 \
  --force-new-deployment \
  > /dev/null

echo "⏳ Waiting for deployment to complete (this may take 2-3 minutes)..."

# Wait for service to stabilize
aws ecs wait services-stable \
  --cluster classreflect-cluster \
  --services classreflect-api-service \
  --region eu-west-2

echo "✅ Deployment complete!"
echo ""
echo "🔗 Verify at: https://api.classreflect.gdwd.co.uk/health"