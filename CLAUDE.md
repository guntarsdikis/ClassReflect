# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Essential Commands

### Local Development
```bash
# Start both frontend and backend simultaneously
./start-local.sh
# Frontend runs on http://localhost:3000 (Vite dev server)
# Backend API runs on http://localhost:3001

# Or start separately:
cd frontend && npm run dev    # Frontend on port 3000 (Vite)
cd backend && npm run dev     # Backend on port 3001 (with hot reload)
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
npm run dev     # Development server with hot reload (Vite)
npm run build   # Production build (TypeScript check + Vite build)
npm run test    # Run tests with Vitest
npm run lint    # ESLint code checking
npm run type-check  # TypeScript type checking only
npm run format  # Prettier code formatting
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

**Frontend (React/TypeScript with Vite)**
- Built with modern Vite tooling and Mantine UI components
- AWS Cognito authentication with role-based access control
- Features: Dashboard (Teacher/Manager), Upload Wizard, Analytics
- Testing: Vitest with React Testing Library
- Hosted on AWS Amplify (auto-deploys from GitHub)
- Production: https://classreflect.gdwd.co.uk

**Backend API (Node.js/Express/TypeScript)**
- AWS Cognito integration for authentication and authorization
- JWT token validation with JWKS
- Role-based API access control (Teacher, School Manager, Super Admin)
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

**Public Endpoints:**
- `GET /health` - Health check

**Authentication Endpoints:**
- `POST /api/auth/login` - Cognito user login
- `POST /api/auth/forgot-password` - Initiate password reset
- `POST /api/auth/confirm-forgot-password` - Complete password reset

**Protected Endpoints (requires JWT):**
- `POST /api/upload/direct` - Direct file upload to S3
- `GET /api/jobs/teacher/:id` - Get teacher's jobs
- `GET /api/schools` - List schools (role-based access)
- `GET /api/teachers` - List teachers (role-based access)
- `GET /api/users/profile` - Get current user profile
- `POST /api/users` - Create new user (admin only)

Authentication: AWS Cognito JWT tokens with role-based access control.

### File Organization

```
ClassReflect/
├── frontend/          # React TypeScript Vite app
│   └── src/
│       ├── app/         # Main app components (App.tsx, AppRouter.tsx)
│       ├── features/    # Feature modules (auth, dashboard, uploads, etc.)
│       ├── shared/      # Shared components, services, utils
│       └── store/       # Zustand stores
├── backend/           # Node.js Express API
│   └── src/
│       ├── routes/      # API endpoints
│       ├── services/    # AWS service integrations (Cognito, S3, SQS)
│       ├── middleware/  # Auth middleware
│       ├── config/      # Configuration files
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
- `VITE_API_URL` - https://api.classreflect.gdwd.co.uk
- `VITE_APP_URL` - https://classreflect.gdwd.co.uk
- `VITE_AWS_REGION` - eu-west-2
- `VITE_COGNITO_USER_POOL_ID` - eu-west-2_E3SFkCKPU
- `VITE_COGNITO_CLIENT_ID` - Cognito app client ID

### Current Implementation Status

**Completed:**
- Infrastructure provisioned and live
- File upload to S3 working
- Whisper transcription pipeline operational
- AWS Cognito authentication system with JWT
- Role-based access control (Teacher, School Manager, Super Admin)
- Modern Vite-based frontend with Mantine UI
- Teacher and Manager dashboard components
- Database schema with user management
- Auto-scaling for processing instances

**Not Implemented:**
- AI teaching analysis (only transcription works)
- Analysis templates system
- Analytics and reporting features
- Real-time WebSocket updates
- Comprehensive test coverage
- Advanced admin dashboard features

### Critical Files to Understand

1. **backend/src/routes/upload.ts** - File upload logic and S3/SQS integration
2. **backend/src/middleware/auth-cognito.ts** - JWT authentication middleware
3. **backend/src/services/cognito.ts** - AWS Cognito service integration
4. **frontend/src/features/auth/services/cognito.service.ts** - Frontend Cognito integration
5. **frontend/src/app/AppRouter.tsx** - Role-based routing configuration
6. **processor.py** - Whisper transcription and database updates
7. **infrastructure/lambda-autoscaler.py** - Auto-start/stop EC2 logic
8. **backend/src/database.ts** - MySQL connection pool configuration
9. **docs/architecture/USER_ACCESS_DESIGN.md** - Complete authentication system design

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
- **Cognito User Pool**: eu-west-2_E3SFkCKPU

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

## Testing

### Frontend Testing
```bash
cd frontend
npm run test        # Run Vitest tests
npm run test:ui     # Run tests with UI
npm run test:coverage  # Run tests with coverage
```

### Backend Testing
Currently no formal tests implemented. Manual testing scripts available:
- `test-backend-login.js` - Test authentication endpoints
- `test-all-roles.js` - Test role-based access control

## Code Quality

### Frontend
```bash
cd frontend
npm run lint        # ESLint checking
npm run type-check  # TypeScript validation
npm run format      # Prettier formatting
```

### Key Technologies
- **Frontend**: React 18, TypeScript, Vite, Mantine UI, Zustand, React Query, React Hook Form
- **Backend**: Node.js, Express, TypeScript, AWS SDK, JWT validation
- **Authentication**: AWS Cognito with custom attributes and role management
- **Database**: MySQL2 with connection pooling
- **Testing**: Vitest, React Testing Library, MSW for mocking