# Updating Environment Variables in Production

This guide explains how to update environment variables and secrets for the ClassReflect API running on AWS ECS.

> ⚠️ **Security Note:** Never commit API keys to git! See [SECURITY.md](../../SECURITY.md) for security guidelines.

## Overview

The ClassReflect backend uses two types of configuration:

1. **Environment Variables** - Non-sensitive configuration (stored in ECS Task Definition)
2. **Secrets** - Sensitive data like API keys (stored in AWS Secrets Manager)

## Quick Update (Recommended)

Use the comprehensive update script that handles everything:

```bash
./scripts/deployment/update-ecs-config.sh
```

This script will:
1. ✅ Update all API keys in AWS Secrets Manager
2. ✅ Create a new ECS task definition with updated environment variables
3. ✅ Deploy the new configuration to production
4. ✅ Wait for deployment to complete

**Deployment time:** ~2-3 minutes

## Manual Methods

### Method 1: Update Only Environment Variables

If you only need to change non-sensitive config (like `ANALYSIS_PROVIDER`, model names, etc.):

```bash
./scripts/deployment/update-env-vars.sh
```

### Method 2: Update Only Secrets

If you only need to update API keys:

```bash
./scripts/deployment/update-secrets.sh
```

Then force a new deployment:

```bash
aws ecs update-service \
  --cluster classreflect-cluster \
  --service classreflect-api-service \
  --force-new-deployment \
  --region eu-west-2
```

### Method 3: AWS Console (Manual)

1. Go to [ECS Console](https://console.aws.amazon.com/ecs)
2. Navigate to: Clusters → classreflect-cluster → classreflect-api-service
3. Click "Update service"
4. Create new task definition revision
5. Update environment variables or secrets
6. Force new deployment

## Current Configuration

### Environment Variables

These are stored in the ECS Task Definition:

| Variable | Current Value | Purpose |
|----------|---------------|---------|
| `NODE_ENV` | `production` | Environment mode |
| `PORT` | `3000` | Server port |
| `FRONTEND_URL` | `https://classreflect.gdwd.co.uk` | CORS configuration |
| `AWS_REGION` | `eu-west-2` | AWS region |
| `S3_BUCKET_NAME` | `classreflect-audio-files-573524060586` | Audio storage |
| `ANALYSIS_PROVIDER` | `openrouter` | AI analysis provider |
| `OPENROUTER_MODEL` | `google/gemini-2.5-flash` | Model for analysis |
| `GEMINI_MODEL` | `gemini-1.5-pro` | Gemini model version |
| `OPENAI_MODEL` | `gpt-4o` | OpenAI model version |

See full list in: `backend/.env` (local) or `scripts/deployment/update-ecs-config.sh`

### Secrets (AWS Secrets Manager)

These are stored securely and referenced by the task definition:

| Secret Name | Contains | Usage |
|-------------|----------|-------|
| `classreflect/database/credentials` | DB host, port, name, user, password | Database connection |
| `classreflect/assemblyai/api-key` | AssemblyAI API key | Audio transcription |
| `classreflect/openai/api-key` | OpenAI API key | GPT-4 analysis |
| `classreflect/google/api-key` | Google Gemini API key | Gemini analysis |
| `classreflect/vertex/config` | Vertex AI key + project ID | Vertex AI analysis |
| `classreflect/openrouter/api-key` | OpenRouter API key | Multi-model access |
| `classreflect/jwt-secret` | JWT signing secret | Authentication |

### View Current Secrets

```bash
# List all secrets
aws secretsmanager list-secrets --region eu-west-2 | grep classreflect

# View a specific secret (replace SECRET_NAME)
aws secretsmanager get-secret-value --secret-id SECRET_NAME --region eu-west-2
```

## Common Tasks

### Switch Analysis Provider

To change from OpenRouter to OpenAI (or any other provider):

1. Edit `scripts/deployment/update-ecs-config.sh`
2. Change: `{"name": "ANALYSIS_PROVIDER", "value": "openai"}`
3. Run: `./scripts/deployment/update-ecs-config.sh`

### Update API Key

To update an API key (e.g., OpenAI):

```bash
aws secretsmanager put-secret-value \
  --secret-id classreflect/openai/api-key \
  --secret-string '{"apikey":"your-new-key-here"}' \
  --region eu-west-2

# Force new deployment to pick up the change
aws ecs update-service \
  --cluster classreflect-cluster \
  --service classreflect-api-service \
  --force-new-deployment \
  --region eu-west-2
```

### Add New Environment Variable

1. Edit `scripts/deployment/update-ecs-config.sh`
2. Add to the `environment` array:
   ```json
   {"name": "YOUR_VAR_NAME", "value": "your-value"}
   ```
3. Run the script: `./scripts/deployment/update-ecs-config.sh`

### Add New Secret

1. Create the secret:
   ```bash
   aws secretsmanager create-secret \
     --name classreflect/your-secret-name \
     --secret-string '{"key":"value"}' \
     --region eu-west-2
   ```

2. Edit `scripts/deployment/update-ecs-config.sh`
3. Add to the `secrets` array with the ARN
4. Run the script

## Verification

After updating configuration:

```bash
# Check API health
curl https://api.classreflect.gdwd.co.uk/health

# View recent logs
aws logs tail /ecs/classreflect-api --since 5m --follow --region eu-west-2

# Check service status
aws ecs describe-services \
  --cluster classreflect-cluster \
  --services classreflect-api-service \
  --region eu-west-2 \
  --query 'services[0].{Status:status,Running:runningCount,Desired:desiredCount}'
```

## Rollback

If something goes wrong:

```bash
# Get previous task definition revision number
aws ecs describe-services \
  --cluster classreflect-cluster \
  --services classreflect-api-service \
  --region eu-west-2 \
  --query 'services[0].taskDefinition'

# Update to previous revision (replace X with revision number)
aws ecs update-service \
  --cluster classreflect-cluster \
  --service classreflect-api-service \
  --task-definition classreflect-api:X \
  --region eu-west-2
```

## Best Practices

1. ✅ **Always test locally first** - Update `backend/.env` and test before deploying
2. ✅ **Use Secrets Manager for sensitive data** - Never put API keys in environment variables
3. ✅ **Document changes** - Update this file when adding new variables
4. ✅ **Monitor after deployment** - Check logs for 5-10 minutes after updating
5. ✅ **Keep secrets in sync** - Make sure all required secrets exist before deploying

## Troubleshooting

### Service won't start after update

Check CloudWatch logs:
```bash
aws logs tail /ecs/classreflect-api --since 30m --region eu-west-2
```

Common issues:
- Missing secret in Secrets Manager
- Invalid JSON in secret value
- Incorrect secret ARN reference
- Database connection failure

### Old configuration still active

ECS might be using cached task definition. Force new deployment:

```bash
aws ecs update-service \
  --cluster classreflect-cluster \
  --service classreflect-api-service \
  --force-new-deployment \
  --region eu-west-2
```

### Cannot access secrets

Check ECS task role has permission to read secrets:

```bash
aws iam get-role \
  --role-name classreflect-ecs-task-role \
  --query 'Role.Arn'
```

The role should have `secretsmanager:GetSecretValue` permission.

## Related Documentation

- [Backend Deployment](../../CLAUDE.md#deployment)
- [AWS ECS Documentation](https://docs.aws.amazon.com/ecs/)
- [AWS Secrets Manager Documentation](https://docs.aws.amazon.com/secretsmanager/)