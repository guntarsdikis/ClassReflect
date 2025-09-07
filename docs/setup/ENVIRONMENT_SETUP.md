# ClassReflect Environment Setup Guide

This guide explains how to run ClassReflect in different environments with automatic environment detection and appropriate processing backends.

## 🏗️ Architecture Overview

### Local Development Environment
- **Authentication**: JWT-only (no Cognito required)
- **File Storage**: Local filesystem (`/tmp/classreflect-audio/`)
- **Audio Processing**: Local Docker container with Whisper
- **Database**: Local MySQL (localhost:3306)
- **Queue System**: Direct HTTP API calls (no SQS)

### Production Environment  
- **Authentication**: AWS Cognito with JWT tokens
- **File Storage**: AWS S3 (`classreflect-audio-files`)
- **Audio Processing**: Auto-scaling EC2 instance with Whisper
- **Database**: AWS Aurora MySQL cluster
- **Queue System**: AWS SQS + Lambda auto-scaler

## 🔄 Environment Detection

The system automatically detects the environment based on:

1. **AWS Credentials**: If `AWS_ACCESS_KEY_ID` and `S3_BUCKET_NAME` are present → Production
2. **NODE_ENV**: If explicitly set to `production` → Production  
3. **Default**: Local development mode

## 🏠 Local Development Setup

### Prerequisites
- Docker and Docker Compose
- Node.js 18+
- MySQL 8.0 (local installation or Docker)

### Step 1: Start Local Whisper Service
```bash
# Navigate to Docker directory
cd docker/whisper

# Start Whisper HTTP service
docker-compose -f docker-compose.http.yml up -d

# Verify service is running
curl http://localhost:8000/health
```

### Step 2: Start Backend API
```bash
# Navigate to backend directory
cd backend

# Install dependencies (if not already done)
npm install

# Start development server
npm run dev
```

The backend will automatically:
- Detect local environment
- Use local file storage at `/tmp/classreflect-audio/`
- Connect to Whisper service at `http://localhost:8000`
- Connect to local MySQL database

### Step 3: Environment Variables (Local)
Create `backend/.env` file:
```bash
NODE_ENV=development
DATABASE_HOST=localhost
DATABASE_USER=root
DATABASE_PASSWORD=
DATABASE_NAME=classreflect

# Local audio storage
LOCAL_AUDIO_PATH=/tmp/classreflect-audio

# Whisper service
WHISPER_DOCKER_URL=http://localhost:8000

# Authentication - JWT only for local dev
JWT_SECRET=your-local-jwt-secret

# Cognito (PRODUCTION ONLY - not needed for local dev)
# COGNITO_USER_POOL_ID=eu-west-2_E3SFkCKPU
# COGNITO_CLIENT_ID=your-client-id
# COGNITO_CLIENT_SECRET=your-client-secret
# AWS_REGION=eu-west-2
```

### Step 4: Test Local Setup
```bash
# Upload a test file
curl -X POST http://localhost:3001/api/upload/direct \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -F "audio=@test-audio.wav" \
  -F "teacherId=3" \
  -F "schoolId=1"

# Check processing status
curl -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  http://localhost:3001/api/upload/status/JOB_ID
```

## ☁️ Production Deployment

### Prerequisites
- AWS Account with appropriate permissions
- Terraform (for infrastructure)
- AWS CLI configured

### Step 1: Deploy Infrastructure
```bash
# Navigate to infrastructure directory
cd infrastructure/terraform

# Deploy AWS resources
terraform init
terraform plan
terraform apply
```

### Step 2: Environment Variables (Production)
Set in ECS Task Definition or AWS Systems Manager:
```bash
NODE_ENV=production
AWS_ACCESS_KEY_ID=your-access-key
AWS_SECRET_ACCESS_KEY=your-secret-key
AWS_REGION=eu-west-2

# S3 and SQS
S3_BUCKET_NAME=classreflect-audio-files-573524060586
SQS_QUEUE_URL=https://sqs.eu-west-2.amazonaws.com/573524060586/classreflect-processing-queue

# Database (from AWS Secrets Manager)
DATABASE_HOST=gdwd.cluster-cjjl7f5jormj.eu-west-2.rds.amazonaws.com
DATABASE_USER=gdwd
DATABASE_PASSWORD=from-secrets-manager
DATABASE_NAME=classreflect

# Cognito
COGNITO_USER_POOL_ID=eu-west-2_E3SFkCKPU
COGNITO_CLIENT_ID=your-client-id
COGNITO_CLIENT_SECRET=your-client-secret

# AssemblyAI & Upload Strategy
ASSEMBLYAI_API_KEY=your-assemblyai-api-key
ASSEMBLYAI_UPLOAD_MODE=s3
ASSEMBLYAI_DIRECT_MAX_MB=25
S3_PRESIGNED_EXPIRES_SECONDS=7200
S3_PRESIGNED_PUT_EXPIRES_SECONDS=3600
```

### Step 3: Deploy Backend
```bash
# Build and push Docker image
./deploy.sh

# The deployment script will:
# 1. Build Docker image
# 2. Push to ECR
# 3. Update ECS service
# 4. EC2 Whisper processor will auto-start when needed
```

## 🔀 Switching Between Environments

The system automatically switches between environments, but you can force a specific mode:

### Force Local Mode
```bash
export NODE_ENV=development
unset AWS_ACCESS_KEY_ID
unset S3_BUCKET_NAME
npm run dev
```

### Step 4: S3 Bucket CORS (required for browser → S3 uploads)

Configure the bucket CORS so the browser can PUT directly and report progress:

```json
[
  {
    "AllowedHeaders": ["*"],
    "AllowedMethods": ["PUT", "GET"],
    "AllowedOrigins": [
      "http://localhost:3002",
      "https://classreflect.gdwd.co.uk",
      "https://main.djiffqj77jjfx.amplifyapp.com"
    ],
    "ExposeHeaders": ["ETag"],
    "MaxAgeSeconds": 3000
  }
]
```

Apply via AWS Console or:

```bash
aws s3api put-bucket-cors \
  --bucket $S3_BUCKET_NAME \
  --cors-configuration 'CORSRules=[{AllowedOrigins=["http://localhost:3002","https://classreflect.gdwd.co.uk","https://main.djiffqj77jjfx.amplifyapp.com"],AllowedMethods=["PUT","GET"],AllowedHeaders=["*"],ExposeHeaders=["ETag"],MaxAgeSeconds=3000}]'
```

### Force Production Mode
```bash
export NODE_ENV=production
export AWS_ACCESS_KEY_ID=your-key
export S3_BUCKET_NAME=your-bucket
npm run dev
```

## 📊 Environment Status

Check current environment configuration:
```bash
# The backend logs will show:
🌍 Environment: local
📁 Storage: local  
⚙️ Processing: local-docker

# OR for production:
🌍 Environment: production
📁 Storage: s3
⚙️ Processing: sqs-ec2
```

## 🧪 Testing Both Environments

### Local Testing
```bash
# Start local services
cd docker/whisper
docker-compose -f docker-compose.http.yml up -d

cd ../../backend
npm run dev

# Test upload
node test-role-permissions.js
```

### Production Testing  
```bash
# Deploy to production
./deploy.sh

# Test production endpoints
curl -X POST https://api.classreflect.gdwd.co.uk/api/upload/presigned-url \
  -H "Authorization: Bearer PROD_JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"fileName":"test.wav","fileType":"audio/wav","teacherId":3,"schoolId":1}'
```

## 🚨 Troubleshooting

### Local Environment Issues

1. **Whisper service not starting**:
   ```bash
   # Check Docker logs
   docker-compose -f docker/whisper/docker-compose.http.yml logs -f
   
   # Rebuild if needed
   docker-compose -f docker/whisper/docker-compose.http.yml build --no-cache
   ```

2. **File upload fails**:
   ```bash
   # Check if local directory exists
   ls -la /tmp/classreflect-audio/
   
   # Create if missing
   mkdir -p /tmp/classreflect-audio
   ```

3. **Database connection issues**:
   ```bash
   # Test MySQL connection
   mysql -u root -p classreflect -e "SELECT 1"
   ```

### Production Environment Issues

1. **EC2 not auto-starting**:
   - Check Lambda function logs in CloudWatch
   - Verify SQS queue has messages
   - Check EC2 instance IAM permissions

2. **S3 upload fails**:
   - Verify AWS credentials
   - Check S3 bucket permissions
   - Confirm CORS settings

3. **Processing stuck**:
   - Check EC2 instance logs via Session Manager
   - Monitor SQS queue message count
   - Verify database connectivity from EC2

## 📈 Performance Optimization

### Local Development
- Use smaller Whisper model: `WHISPER_MODEL=tiny`
- Limit Docker container memory
- Use SSD storage for audio files

### Production
- Use appropriate Whisper model: `WHISPER_MODEL=base` (default)
- Configure EC2 instance auto-stop timeout
- Implement S3 lifecycle policies for old files

## 🔒 Security Considerations

### Local Development
- Audio files stored in `/tmp/` (ephemeral)
- No external network access required
- Database on localhost only

### Production
- S3 bucket with restricted access
- EC2 in private subnet
- Encryption in transit and at rest
- IAM roles with least privilege
