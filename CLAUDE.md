# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Essential Commands (Updated August 2025)

### Local Development
```bash
# Start both frontend and backend simultaneously
scripts/setup/start-local.sh
# Frontend runs on http://localhost:3002 (Vite dev server)
# Backend API runs on http://localhost:3001

# Or start separately:
cd frontend && npm run dev    # Frontend on port 3002 (Vite)
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
scripts/deployment/deploy.sh     # Full deployment (Terraform + Docker + ECS)
# This script:
# 1. Runs Terraform to provision/update infrastructure
# 2. Builds and pushes Docker image to ECR
# 3. Updates ECS service with new image
# 4. Frontend deploys automatically via GitHub push to main branch
```
./scripts/deployment/deploy-backend.sh

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

### Audio Processing (AssemblyAI)

**Local Development:**
```bash
# Test audio transcription locally
cd scripts/testing
./test-assemblyai-integration.sh

# The upload wizard now processes audio directly with AssemblyAI
# No need for local Docker containers or queue processing
```

**Production:**
```bash
# Audio files are processed immediately upon upload
# Check processing status in the upload wizard or teacher dashboard
# AssemblyAI handles transcription automatically
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
- Audio processing: AssemblyAI for immediate transcription
- Production: https://api.classreflect.gdwd.co.uk

**Audio Processing Pipeline (Simplified)**
1. User uploads audio → Backend API
2. API stores file in S3, creates job in database
3. Backend immediately sends audio to AssemblyAI for transcription
4. AssemblyAI processes audio and returns transcript
5. Backend stores transcript in database and updates job status
6. Frontend displays results immediately

**No more:** SQS queues, Lambda functions, EC2 instances, or Whisper containers!

**Infrastructure**
- All resources in AWS region: eu-west-2 (London)
- VPC with public/private subnets
- Application Load Balancer for API
- AWS Secrets Manager for credentials
- CloudWatch for logging and monitoring

### Key Design Decisions

1. **Serverless Architecture**: No permanent EC2 servers for ClassReflect (separate from legacy sites)
2. **Immediate Processing**: AssemblyAI transcribes audio in real-time (~$0.37 per audio hour)
3. **Container Deployment**: Backend uses Docker on ECS Fargate for easy scaling
4. **Managed Services**: Aurora MySQL, S3, AssemblyAI reduce operational overhead
5. **GitOps**: Frontend auto-deploys via Amplify, backend via GitHub Actions
6. **Simplified Development**: Local MySQL for development, AWS + AssemblyAI for production

## ✅ RECENT IMPROVEMENTS - COMPLETED

### System Cleanup (August 2025)
Major cleanup completed to simplify architecture and reduce costs:

**1. Removed Legacy Infrastructure**
- Removed SQS queue processing system
- Removed EC2 Whisper instances and auto-scaling Lambda
- Simplified to AssemblyAI-only processing
- Cost reduction: ~60-80% savings (~$25/month → ~$5-10/month)

**2. Database Cleanup**
- Removed unused tables: `analysis_criteria`, `template_assignments`, `teacher_progress`, `school_settings`
- Cleanup script available: `database/cleanup_unused_tables.sql`
- Preserved important tables with proper backup procedures

**3. File Organization**
- Moved shell scripts to `scripts/` directory (deployment, setup, testing)
- Organized documentation to `docs/` directory
- Archived old files to `archive/` directory
- Configuration files moved to `config/` directory

**4. Mock Data Removal**
- All dashboard components now show "coming soon" states when no data exists
- Removed mock data from Teacher, Manager, and Super Admin dashboards
- Real API integration ready for when data becomes available

### Remaining Database Issues (Lower Priority)
Some structural issues still exist but are manageable:
- Dual user tables (`users` and `teachers`) - needs consolidation
- Missing foreign key constraints - should be added for data integrity
- ID type mismatches between some tables

### Database Schema (After Cleanup)

**Active Tables:**
- `schools` - Multi-tenant school accounts
- `users` - Primary user table (Cognito integration)
- `audio_jobs` - Upload and processing job tracking
- `transcripts` - AssemblyAI transcription results
- `analysis_templates` - Template-based evaluation criteria
- `analysis_results` - AI analysis outputs (not yet implemented)
- `api_keys` - Service authentication keys

**Removed Tables (August 2025):**
- `analysis_criteria` - Replaced by template system
- `template_assignments` - Not used in current architecture
- `teacher_progress` - Feature not implemented
- `school_settings` - Feature not implemented

**Remaining Issues:**
- Some legacy dual table references still exist
- Foreign key constraints should be added for better data integrity
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

### File Organization (Updated August 2025)

**New Directory Structure:**
```
ClassReflect/
├── 📁 archive/           # Archived old files
├── 📁 backend/           # Node.js API
├── 📁 config/            # Configuration files (.json, .yml)
├── 📁 database/          # SQL schemas and cleanup scripts
├── 📁 docs/              # All documentation
│   ├── architecture/     # System design docs
│   ├── development/      # Dev guides & roadmap
│   └── setup/           # Setup instructions
├── 📁 docker/            # Docker configs (MySQL only)
├── 📁 frontend/          # React/Vite app
├── 📁 infrastructure/    # Terraform configs
├── 📁 LLM/              # AI analysis service (future use)
├── 📁 scripts/           # All shell scripts
│   ├── deployment/      # Deploy scripts
│   ├── setup/          # Setup scripts
│   └── testing/        # Test scripts & sample data
├── 📝 CLAUDE.md          # This file - dev documentation
├── 📝 NEXT_STEPS.md      # Cleanup completion summary
├── 📝 README.md          # Project readme
└── 📝 randomnotes.md     # Temporary notes
```

**Benefits:**
- All shell scripts organized by purpose
- Documentation centralized in docs/
- Configuration files separated
- Archive keeps old code for reference
- Clear separation of concerns

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
FRONTEND_URL=http://localhost:3002
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

### Current Implementation Status (August 2025)

**✅ Recently Completed & Working:**
- Infrastructure provisioned and live
- File upload to S3 working (hybrid: local dev, cloud production)
- **AssemblyAI transcription pipeline** (replaced Whisper/SQS system)
- AWS Cognito authentication system with JWT
- Role-based access control (Teacher, School Manager, Super Admin)
- Modern Vite-based frontend with Mantine UI
- **Clean dashboard components** (mock data removed, "coming soon" states)
- **Simplified processing service** (AssemblyAI-only, no queue system)
- **Major file organization** (scripts/, docs/, config/, archive/ directories)
- **Database cleanup** (removed unused tables)
- TypeScript compilation and upload wizard fixes
- **Template selection integrated** in upload wizard
- **Real teacher dropdown** (pulls from school's teacher list)

**🔧 Reduced Priority Issues:**
- Database structure improvements (dual user tables, FK constraints)
- These are manageable with current architecture

**🔄 Working Systems:**
- Database schema (cleaned up, functional for current needs)
- User management (works with current schema)
- RBAC testing (scripts moved to scripts/testing/)
- Upload → AssemblyAI → transcription flow

**❌ Future Implementation:**
- AI teaching analysis (only transcription currently works)
- Analysis templates system (framework exists)
- Analytics and reporting features
- Real-time WebSocket updates
- Comprehensive automated test coverage
- Advanced admin dashboard features

### Critical Files to Understand

**📖 Start Here - System Documentation:**
1. **SYSTEM_OVERVIEW.md** - Complete system purpose, architecture, and current status
2. **DATABASE_IMPROVEMENTS.md** - Critical database issues and migration plan
3. **SYSTEM_PLAN.md** - 20-week development roadmap and implementation strategy
4. **CLAUDE.md** - This file - development guidance and commands

**🔧 Core Application Files:**
5. **backend/src/routes/upload.ts** - File upload logic and S3/AssemblyAI integration
6. **backend/src/services/processing.ts** - Simplified AssemblyAI processing service
7. **backend/src/middleware/auth-cognito.ts** - JWT authentication middleware
8. **backend/src/services/cognito.ts** - AWS Cognito service integration
9. **backend/src/database.ts** - MySQL connection pool configuration
10. **frontend/src/features/auth/services/cognito.service.ts** - Frontend Cognito integration
11. **frontend/src/app/AppRouter.tsx** - Role-based routing configuration
12. **frontend/src/features/uploads/components/UploadWizard.tsx** - Template selection and upload flow

**📁 Organized File Structure:**
13. **scripts/setup/** - Development setup scripts
14. **scripts/deployment/** - Production deployment scripts
15. **scripts/testing/** - Testing scripts and sample data
16. **docs/architecture/** - System architecture documentation
17. **docs/development/** - Development guides and roadmaps
18. **config/** - Configuration files
19. **archive/** - Old files and deprecated code

**🧪 Testing:**
20. **scripts/testing/test-rbac-simple.sh** - Bash RBAC testing script
21. **scripts/testing/test-role-permissions.js** - Node.js RBAC testing script

### AWS Resources

- **Account ID**: 573524060586
- **Region**: eu-west-2
- **ECR Repository**: 573524060586.dkr.ecr.eu-west-2.amazonaws.com/classreflect-api
- **S3 Bucket**: classreflect-audio-files-573524060586
- **ECS Cluster**: classreflect-cluster
- **ECS Service**: classreflect-api-service
- **Cognito User Pool**: eu-west-2_E3SFkCKPU
- **AssemblyAI**: Integrated for audio transcription

**🗑️ Removed Infrastructure (Cost Savings):**
- ~~SQS Queue: classreflect-processing-queue~~ (removed)
- ~~Whisper Instance: i-0db7635f05d00de47~~ (can be terminated)
- ~~Lambda Function: ClassReflectAutoScaler~~ (can be deleted)

### Debugging Tips

**🔍 Local Development Issues:**
1. **Database problems**: `mysql -h localhost -u root -proot classreflect -e "SHOW TABLES; DESCRIBE users;"`
2. **TypeScript errors**: `cd backend && npx tsc --noEmit` 
3. **Check local services**: Ensure MySQL and Docker are running locally
4. **Test RBAC**: Run `./test-rbac-simple.sh` or `node test-role-permissions.js`

**☁️ Production Issues:**
5. **Check ECS logs**: CloudWatch Logs → /ecs/classreflect-api
6. **Check AssemblyAI processing**: Monitor audio job status in database
7. **Database queries**: Connect directly to Aurora MySQL cluster
8. **S3 file storage**: Check classreflect-audio-files-573524060586 bucket

**🔍 Database Monitoring:**
9. **Check table usage**: `SELECT COUNT(*) FROM users; SELECT COUNT(*) FROM audio_jobs;`
10. **Monitor transcripts**: `SELECT status, COUNT(*) FROM audio_jobs GROUP BY status;`
11. **Check recent activity**: `SELECT * FROM audio_jobs ORDER BY created_at DESC LIMIT 10;`

### Cost Optimization (Major Savings Achieved)

**✅ Completed Savings:**
- **Removed EC2 Whisper instances**: ~$20/month savings
- **Removed SQS queue**: ~$3/month savings  
- **Removed Lambda autoscaler**: ~$2/month savings
- **Total monthly savings**: ~$25/month → ~$5-10/month (60-80% reduction)

**Current Costs:**
- ECS Fargate: Minimal task size (0.25 vCPU, 0.5GB RAM)
- AssemblyAI: ~$0.37 per audio hour (usage-based)
- S3: Storage costs for audio files
- Database: Using existing Aurora cluster (shared cost)

**Future Optimizations:**
- S3: Lifecycle policies for old audio files
- AssemblyAI: Monitor usage patterns

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
scripts/testing/test-rbac-simple.sh

# Test RBAC with Node.js script (uses fetch)
node scripts/testing/test-role-permissions.js

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

**🚀 Quick Start:**
1. **Read NEXT_STEPS.md** - Recent cleanup summary and manual steps
2. **Read SYSTEM_OVERVIEW.md** - What ClassReflect does
3. **Run database cleanup** - Manual backup and cleanup commands provided
4. **Test simplified workflow** - Upload → AssemblyAI → transcription

**System is now production-ready with simplified, cost-effective architecture!**