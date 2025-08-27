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

**Local Development Database:**
```bash
# Connect to local MySQL (used for development)
mysql -h localhost -u root -proot classreflect

# Show current tables and check structure
mysql -h localhost -u root -proot classreflect -e "SHOW TABLES;"
mysql -h localhost -u root -proot classreflect -e "DESCRIBE users;"

# Apply schema updates
mysql -h localhost -u root -proot classreflect < database/schema-cognito.sql
```

**Production Database:**
```bash
# Setup database (requires AWS credentials)
cd database
./setup-database.sh

# Connect to production database
mysql -h gdwd.cluster-cjjl7f5jormj.eu-west-2.rds.amazonaws.com -u gdwd -p classreflect
# Password stored in AWS Secrets Manager: classreflect/database/credentials
```

### Whisper Processing

**Local Development (Docker):**
```bash
# Start local Whisper processing container
cd docker/whisper
docker-compose up -d

# Process local audio files for testing
docker-compose exec whisper python local-processor.py

# View logs
docker-compose logs -f whisper

# Test with sample audio files
./test-local-processing.sh
```

**Production (EC2):**
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
- Database: Aurora MySQL (production) / Local MySQL (development)
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
6. **Hybrid Development**: Local MySQL + Docker Whisper for development, AWS services for production

## ⚠️ CRITICAL ISSUES - MUST FIX

### Database Structure Problems
The current database has serious structural issues that need immediate attention:

**1. Dual User Tables Problem**
- Both `users` and `teachers` tables exist, causing confusion
- API code uses `users` table but some references expect `teachers`
- Different ID types: `users.school_id` is `varchar(36)`, should be `int`

**2. Foreign Key Constraints Missing**
- No foreign key constraints between tables, risking data integrity
- Can lead to orphaned records and inconsistent data

**3. ID Type Mismatches**
```
schools.id: int
users.school_id: varchar(36)  -- SHOULD BE: int
audio_jobs.school_id: int
audio_jobs.teacher_id: int
```

**4. Immediate Fix Required**
```bash
# Run this to see the problem:
mysql -h localhost -u root -proot classreflect -e "DESCRIBE users; DESCRIBE schools;"

# See DATABASE_IMPROVEMENTS.md for full migration plan
```

### Development Environment Issues
- Backend .env configured for local MySQL (localhost) not Aurora
- Mixed authentication: Cognito + legacy password hashing
- Some API endpoints expect `teachers` table structure

### Database Schema

**Current Tables (with issues):**
- `schools` - Multi-tenant school accounts (`id` as `int`)
- `users` - Primary user table (`school_id` as `varchar(36)` - WRONG TYPE!)
- `teachers` - Legacy user table (`school_id` as `int` - DUPLICATE!)
- `audio_jobs` - Upload and processing job tracking
- `transcripts` - Whisper transcription results
- `analysis_criteria` - School-specific evaluation rules
- `analysis_results` - AI analysis outputs (not yet implemented)
- `teacher_progress` - Historical performance tracking
- `api_keys` - Service authentication keys

**Schema Problems:**
- Dual user tables with different structures
- ID type mismatches preventing proper foreign keys
- Missing foreign key constraints
- Some unused legacy columns

**See `DATABASE_IMPROVEMENTS.md` for detailed migration plan**

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
├── docker/            # Local development containers
│   └── whisper/       # Local Whisper processing setup
├── infrastructure/    # Deployment configs
│   ├── terraform/     # Infrastructure as Code
│   └── lambda-autoscaler.py  # Queue monitoring
├── database/          # Schema and setup scripts
├── docs/              # Documentation
│   ├── architecture/  # System design docs
│   ├── deployment/    # Deployment guides
│   └── development/   # Implementation roadmap
├── SYSTEM_OVERVIEW.md     # Complete system documentation
├── DATABASE_IMPROVEMENTS.md  # Database migration plan
├── SYSTEM_PLAN.md         # 20-week development roadmap
├── test-rbac-simple.sh    # RBAC testing script (bash)
├── test-role-permissions.js  # RBAC testing script (Node.js)
└── CLAUDE.md          # This file - development guidance
```

### Environment Variables

**Backend Local Development (.env):**
```bash
DB_HOST=localhost
DB_PORT=3306
DB_NAME=classreflect
DB_USER=root
DB_PASSWORD=root
S3_BUCKET=classreflect-audio-files-573524060586
SQS_QUEUE_URL=https://sqs.eu-west-2.amazonaws.com/573524060586/classreflect-processing-queue
FRONTEND_URL=http://localhost:3000
```

**Backend Production (ECS task definition):**
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

**✅ Completed & Working:**
- Infrastructure provisioned and live
- File upload to S3 working (hybrid: local dev, cloud production)
- Whisper transcription pipeline operational
- AWS Cognito authentication system with JWT
- Role-based access control (Teacher, School Manager, Super Admin)
- Modern Vite-based frontend with Mantine UI
- Teacher and Manager dashboard components
- Local development environment with Docker Whisper
- Auto-scaling for processing instances
- TypeScript compilation (fixed upload route errors)

**🚨 Critical Issues (Must Fix First):**
- Database structure problems (dual user tables, ID mismatches)
- Missing foreign key constraints
- Mixed authentication approaches (Cognito + legacy)

**🔄 Partially Implemented:**
- Database schema (exists but has structural problems)
- User management (works but uses problematic schema)
- RBAC testing (scripts exist: test-rbac-simple.sh, test-role-permissions.js)

**❌ Not Yet Implemented:**
- AI teaching analysis (only transcription works)
- Analysis templates system
- Analytics and reporting features
- Real-time WebSocket updates
- Comprehensive automated test coverage
- Advanced admin dashboard features
- Database migration to fix structural issues

### Critical Files to Understand

**📖 Start Here - System Documentation:**
1. **SYSTEM_OVERVIEW.md** - Complete system purpose, architecture, and current status
2. **DATABASE_IMPROVEMENTS.md** - Critical database issues and migration plan
3. **SYSTEM_PLAN.md** - 20-week development roadmap and implementation strategy
4. **CLAUDE.md** - This file - development guidance and commands

**🔧 Core Application Files:**
5. **backend/src/routes/upload.ts** - File upload logic and S3/SQS integration (recently fixed)
6. **backend/src/middleware/auth-cognito.ts** - JWT authentication middleware
7. **backend/src/services/cognito.ts** - AWS Cognito service integration
8. **backend/src/database.ts** - MySQL connection pool configuration
9. **frontend/src/features/auth/services/cognito.service.ts** - Frontend Cognito integration
10. **frontend/src/app/AppRouter.tsx** - Role-based routing configuration

**🐳 Development Environment:**
11. **docker/whisper/local-processor.py** - Local Whisper processing container
12. **docker/whisper/docker-compose.yml** - Local development setup
13. **backend/.env** - Local database configuration

**🧪 Testing & Infrastructure:**
14. **test-rbac-simple.sh** - Bash RBAC testing script
15. **test-role-permissions.js** - Node.js RBAC testing script
16. **processor.py** - Production Whisper transcription and database updates
17. **infrastructure/lambda-autoscaler.py** - Auto-start/stop EC2 logic

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

**🔍 Local Development Issues:**
1. **Database problems**: `mysql -h localhost -u root -proot classreflect -e "SHOW TABLES; DESCRIBE users;"`
2. **TypeScript errors**: `cd backend && npx tsc --noEmit` 
3. **Check local services**: Ensure MySQL and Docker are running locally
4. **Test RBAC**: Run `./test-rbac-simple.sh` or `node test-role-permissions.js`

**☁️ Production Issues:**
5. **Check ECS logs**: CloudWatch Logs → /ecs/classreflect-api
6. **Monitor SQS queue**: AWS Console → SQS → classreflect-processing-queue
7. **View Lambda logs**: CloudWatch Logs → /aws/lambda/ClassReflectAutoScaler
8. **Database queries**: Connect directly to Aurora MySQL cluster
9. **Instance status**: Check EC2 console for i-0db7635f05d00de47 state

**🚨 Database Structure Issues:**
10. **Check dual tables**: `SELECT COUNT(*) FROM users; SELECT COUNT(*) FROM teachers;`
11. **Verify foreign keys**: `SHOW CREATE TABLE audio_jobs;` (should show FK constraints)
12. **Check ID types**: Compare `DESCRIBE users` vs `DESCRIBE schools` for type mismatches

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

**Manual Testing Scripts:**
```bash
# Test RBAC with bash script (uses curl)
./test-rbac-simple.sh

# Test RBAC with Node.js script (uses fetch)
node test-role-permissions.js

# Test authentication endpoints
node test-backend-login.js

# Test all role permissions (if exists)
node test-all-roles.js
```

**Database Testing:**
```bash
# Check database integrity
mysql -h localhost -u root -proot classreflect -e "
  SELECT 'Users:' as tbl, COUNT(*) as count FROM users
  UNION ALL
  SELECT 'Schools:', COUNT(*) FROM schools
  UNION ALL  
  SELECT 'Audio Jobs:', COUNT(*) FROM audio_jobs;"

# Validate user-school relationships
mysql -h localhost -u root -proot classreflect -e "
  SELECT u.id, u.email, u.school_id, s.name as school_name
  FROM users u 
  LEFT JOIN schools s ON u.school_id = s.id 
  WHERE s.id IS NULL;"  # Should return no rows
```

**No formal unit tests implemented yet** - see SYSTEM_PLAN.md for testing roadmap.

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
- **Processing**: OpenAI Whisper for transcription, Docker containers
- **Infrastructure**: AWS ECS Fargate, S3, SQS, Lambda, Application Load Balancer
- **Testing**: Vitest, React Testing Library, MSW for mocking

## 🚀 IMMEDIATE NEXT STEPS

### Priority 1: Database Structure Fix (Critical)
```bash
# 1. Backup current database
mysqldump -h localhost -u root -proot classreflect > backup_$(date +%Y%m%d).sql

# 2. Review the migration plan
cat DATABASE_IMPROVEMENTS.md

# 3. Test migration on copy first
mysql -h localhost -u root -proot -e "CREATE DATABASE classreflect_test;"
mysql -h localhost -u root -proot classreflect_test < backup_*.sql
```

### Priority 2: Complete AI Analysis Implementation
```bash
# 1. Review system plan
cat SYSTEM_PLAN.md

# 2. Implement GPT-4 analysis integration
# See Phase 1 Week 3-4 in SYSTEM_PLAN.md

# 3. Create analysis templates system
# See DATABASE_IMPROVEMENTS.md Phase 2
```

### Priority 3: Production Deployment Preparation
```bash
# 1. Fix database schema in production
# 2. Deploy updated backend with schema fixes
# 3. Test end-to-end workflow: upload → transcribe → analyze → display
```

**Read SYSTEM_OVERVIEW.md first to understand what ClassReflect does, then DATABASE_IMPROVEMENTS.md for urgent fixes needed.**