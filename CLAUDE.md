# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Essential Commands

### Local Development
```bash
# Start both frontend and backend simultaneously
./start-local.sh
# Frontend runs on http://localhost:3000
# Backend API runs on http://localhost:3001

# Or start separately:
cd frontend && npm start    # Frontend on port 3000
cd backend && npm run dev    # Backend on port 3001 (with hot reload)
```

### Backend Commands
```bash
cd backend
npm run dev     # Start with nodemon hot reload (TypeScript)
npm run build   # Compile TypeScript to JavaScript
npm start       # Run compiled JavaScript (production)
```

### Frontend Commands
```bash
cd frontend
npm start       # Development server with hot reload
npm run build   # Production build
npm test        # Run tests (currently no tests implemented)
```

### Deployment
```bash
./deploy.sh     # Full deployment (Terraform + Docker + ECS)
# This script:
# 1. Runs Terraform to provision/update infrastructure
# 2. Builds and pushes Docker image to ECR
# 3. Updates ECS service with new image
# 4. Frontend deploys automatically via GitHub push to main branch
```

### Database Operations
```bash
# Setup database (requires AWS credentials)
cd database
./setup-database.sh

# Connect to database
mysql -h gdwd.cluster-cjjl7f5jormj.eu-west-2.rds.amazonaws.com -u gdwd -p classreflect
# Password stored in AWS Secrets Manager: classreflect/database/credentials
```

### Whisper Processing
```bash
# SSH to processing instance (when running)
aws ssm start-session --target i-0db7635f05d00de47

# Manual processing test
python3 /opt/whisper/processor.py
```

## Architecture Overview

### System Components

**Frontend (React/TypeScript)**
- Hosted on AWS Amplify (auto-deploys from GitHub)
- Routes: HomePage, UploadPage, ResultsPage
- API calls to backend via axios
- Production: https://classreflect.gdwd.co.uk

**Backend API (Node.js/Express/TypeScript)**
- Containerized with Docker, runs on ECS Fargate
- Database: Aurora MySQL (existing cluster)
- File storage: S3 bucket (classreflect-audio-files-573524060586)
- Job queue: SQS (classreflect-processing-queue)
- Production: https://api.classreflect.gdwd.co.uk

**Audio Processing Pipeline**
1. User uploads audio → Backend API
2. API stores file in S3, creates job in database, sends message to SQS
3. Lambda function (ClassReflectAutoScaler) checks queue every minute
4. Lambda starts EC2 instance (i-0db7635f05d00de47) if jobs exist
5. EC2 runs Whisper processor (Python script) to transcribe audio
6. Processor updates database with transcript, stops after 3 empty polls
7. Frontend polls job status and displays results

**Infrastructure**
- All resources in AWS region: eu-west-2 (London)
- VPC with public/private subnets
- Application Load Balancer for API
- AWS Secrets Manager for credentials
- CloudWatch for logging and monitoring

### Key Design Decisions

1. **Serverless Architecture**: No permanent EC2 servers for ClassReflect (separate from legacy sites)
2. **On-Demand Processing**: Whisper instance starts/stops automatically to minimize costs (~$0.02 per recording)
3. **Container Deployment**: Backend uses Docker on ECS Fargate for easy scaling
4. **Managed Services**: Aurora MySQL, S3, SQS reduce operational overhead
5. **GitOps**: Frontend auto-deploys via Amplify, backend via GitHub Actions

### Database Schema

Eight core tables in Aurora MySQL:
- `schools` - Multi-tenant school accounts
- `teachers` - User accounts with role-based access
- `audio_jobs` - Upload and processing job tracking
- `transcripts` - Whisper transcription results
- `analysis_criteria` - School-specific evaluation rules
- `analysis_results` - AI analysis outputs (not yet implemented)
- `teacher_progress` - Historical performance tracking
- `error_logs` - System error logging

### API Endpoints

Base URL: `https://api.classreflect.gdwd.co.uk`

- `GET /health` - Health check
- `POST /api/upload/direct` - Direct file upload to S3
- `GET /api/jobs/teacher/:id` - Get teacher's jobs
- `GET /api/schools` - List schools
- `GET /api/teachers` - List teachers

Authentication not yet implemented (planned: AWS Cognito with JWT).

### File Organization

```
ClassReflect/
├── frontend/          # React TypeScript app
│   └── src/
│       ├── components/  # HomePage, UploadPage, ResultsPage
│       └── App.tsx      # Main router
├── backend/           # Node.js Express API
│   └── src/
│       ├── routes/      # API endpoints
│       ├── services/    # AWS service integrations
│       └── database.ts  # MySQL connection pool
├── infrastructure/    # Deployment configs
│   ├── terraform/     # Infrastructure as Code
│   └── lambda-autoscaler.py  # Queue monitoring
├── database/          # Schema and setup scripts
└── docs/              # Documentation
    ├── architecture/  # System design docs
    ├── deployment/    # Deployment guides
    └── development/   # Implementation roadmap
```

### Environment Variables

Backend requires (set in ECS task definition or .env):
- `DATABASE_HOST` - Aurora MySQL endpoint
- `DATABASE_NAME` - classreflect
- `DATABASE_USER` - From Secrets Manager
- `DATABASE_PASSWORD` - From Secrets Manager
- `S3_BUCKET` - classreflect-audio-files-573524060586
- `SQS_QUEUE_URL` - SQS queue URL
- `FRONTEND_URL` - https://classreflect.gdwd.co.uk

Frontend requires (.env.production):
- `REACT_APP_API_URL` - https://api.classreflect.gdwd.co.uk

### Current Implementation Status

**Completed:**
- Infrastructure provisioned and live
- File upload to S3 working
- Whisper transcription pipeline operational
- Basic frontend with upload/results pages
- Database schema and connection
- Auto-scaling for processing instances

**Not Implemented:**
- User authentication (AWS Cognito planned)
- AI teaching analysis (only transcription works)
- Teacher/Admin dashboards
- Analysis templates system
- Real-time WebSocket updates
- Comprehensive error handling
- Test suites

### Critical Files to Understand

1. **backend/src/routes/upload.ts** - File upload logic and S3/SQS integration
2. **processor.py** - Whisper transcription and database updates
3. **infrastructure/lambda-autoscaler.py** - Auto-start/stop EC2 logic
4. **backend/src/database.ts** - MySQL connection pool configuration
5. **frontend/src/components/UploadPage.tsx** - File upload UI and API calls
6. **docs/architecture/USER_ACCESS_DESIGN.md** - Complete authentication system design

### AWS Resources

- **Account ID**: 573524060586
- **Region**: eu-west-2
- **ECR Repository**: 573524060586.dkr.ecr.eu-west-2.amazonaws.com/classreflect-api
- **S3 Bucket**: classreflect-audio-files-573524060586
- **SQS Queue**: classreflect-processing-queue
- **ECS Cluster**: classreflect-cluster
- **ECS Service**: classreflect-api-service
- **Whisper Instance**: i-0db7635f05d00de47
- **Lambda Function**: ClassReflectAutoScaler

### Debugging Tips

1. **Check ECS logs**: CloudWatch Logs → /ecs/classreflect-api
2. **Monitor SQS queue**: AWS Console → SQS → classreflect-processing-queue
3. **View Lambda logs**: CloudWatch Logs → /aws/lambda/ClassReflectAutoScaler
4. **Database queries**: Connect directly to Aurora MySQL cluster
5. **Instance status**: Check EC2 console for i-0db7635f05d00de47 state

### Cost Optimization

- Whisper instance: Stops automatically after 3 minutes idle
- ECS Fargate: Minimal task size (0.25 vCPU, 0.5GB RAM)
- S3: Consider lifecycle policies for old audio files
- Database: Using existing Aurora cluster (shared cost)