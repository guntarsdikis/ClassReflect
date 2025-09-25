# ClassReflect - Classroom Audio Analysis Platform

A serverless platform for analyzing classroom audio recordings using AI to provide teaching feedback.

## Architecture Overview

- **Frontend**: React/TypeScript with Vite, hosted on AWS Amplify
- **Backend API**: Node.js/Express containerized on ECS Fargate
- **Authentication**: AWS Cognito User Pools with custom attributes
- **Processing**: On-demand t3.xlarge instances with OpenAI Whisper
- **Database**: Aurora MySQL (existing cluster)
- **Storage**: S3 for audio files
- **Queue**: SQS for job management

## Project Structure

```
ClassReflect/
├── frontend/                 # React frontend application
│   ├── src/                 # Source code
│   ├── public/              # Static assets
│   └── amplify.yml          # Amplify build configuration
├── backend/                  # Node.js backend API
│   ├── src/                 # Source code
│   ├── Dockerfile           # Container configuration
│   └── package.json         # Dependencies
├── infrastructure/          # Infrastructure as Code
│   └── terraform/          # Terraform configurations
├── .github/                 # GitHub Actions workflows
│   └── workflows/
│       └── deploy.yml      # CI/CD pipeline
└── deploy.sh               # Deployment script
```

## Prerequisites

- AWS Account with appropriate permissions
- AWS CLI configured
- Docker installed
- Terraform installed
- Node.js 22+ and npm
- GitHub account (for Amplify deployment)

## Environment Setup

1. Clone the repository:
```bash
git clone https://github.com/YOUR_USERNAME/ClassReflect.git
cd ClassReflect
```

2. Install frontend dependencies:
```bash
cd frontend
npm install
```

3. Install backend dependencies:
```bash
cd ../backend
npm install
```

4. Copy environment variables:
```bash
cp .env.example .env
# Edit .env with your configuration
```

## AWS Infrastructure Setup

1. Configure AWS credentials:
```bash
aws configure
```

2. Create S3 bucket for Terraform state:
```bash
aws s3api create-bucket \
  --bucket classreflect-terraform-state \
  --region eu-west-2 \
  --create-bucket-configuration LocationConstraint=eu-west-2
```

3. Deploy infrastructure:
```bash
./deploy.sh
```

## Local Development

### Frontend
```bash
cd frontend
npm run dev
# Runs on http://localhost:3002
```

### Backend
```bash
cd backend
npm run dev
# Runs on http://localhost:3001
```

### Start Both Services
```bash
# From project root
scripts/setup/start-local.sh
# Frontend: http://localhost:3002
# Backend API: http://localhost:3001
```

## Deployment

### Automatic Deployment (GitHub Actions)
Push to the `main` branch triggers automatic deployment:
- Backend: Builds Docker image and deploys to ECS Fargate
- Frontend: Amplify automatically builds and deploys

### Manual Deployment
```bash
./deploy.sh
./scripts/deployment/deploy-backend.sh
```

## Configuration

### Domain Setup (Route53)
The following DNS records will be created automatically:
- `classreflect.gdwd.co.uk` → AWS Amplify
- `api.classreflect.gdwd.co.uk` → Application Load Balancer

### SSL Certificates
SSL certificates are automatically managed by:
- AWS Amplify for frontend
- AWS Certificate Manager for API

### Email (AWS SES)
- SES region: `eu-west-1`
- Default sender: `info@gdwd.co.uk`
- Configure backend with `AWS_SES_REGION` and `SES_FROM_EMAIL` environment variables (see `backend/.env.example`).
- Provide SES credentials via `AWS_ACCESS_KEY_ID` / `AWS_SECRET_ACCESS_KEY` (or an IAM role when running in AWS).
- Password reset and invitation emails are sent through SES; the reset link uses `FRONTEND_URL` as the base.
- The ECS task role (`classreflect-ecs-task-role`) must allow `ses:SendEmail`/`ses:SendRawEmail` on the verified identity.

## Cost Optimization

Estimated monthly costs:
- **Base Infrastructure**: ~$10/month
  - ECS Fargate (Spot): ~$5
  - AWS Amplify: ~$1
  - NAT Gateway: ~$4
- **Per Recording**: ~$0.03
  - t3.xlarge processing: ~$0.02
  - ChatGPT API: ~$0.01
- **Total**: $10-25/month for typical usage

## Authentication & Security

### AWS Cognito Integration
- **User Pool ID**: `eu-west-2_E3SFkCKPU`
- **Client ID**: Available in `.env` files
- **Features**:
  - Invitation-only user creation (no self-registration)
  - Role-based access control (Teacher, School Manager, Super Admin)
  - Custom attributes for school isolation
  - Advanced security mode enabled
  - Password policy: 12+ characters with mixed case, numbers, and symbols

### Security Features
- All data encrypted in transit (HTTPS) and at rest
- VPC with private subnets for ECS tasks
- IAM roles with least privilege access
- Secrets managed via AWS Secrets Manager
- JWT token validation via AWS Cognito
- School-level data isolation
- Audit logging for compliance

## Monitoring

- CloudWatch Logs for application logs
- CloudWatch Metrics for performance monitoring
- Cost Explorer for budget tracking

## API Endpoints

Base URL: `https://api.classreflect.gdwd.co.uk`

- `GET /health` - Health check
- `POST /upload` - Upload audio file
- `GET /jobs/:id` - Get job status
- `GET /results/:id` - Get analysis results

## Documentation

Comprehensive documentation is available in the `/docs` directory:

- 📚 [Documentation Index](docs/README.md) - Complete documentation overview
- 🏗️ [Architecture](docs/architecture/) - System design and technical architecture
- 🚀 [Deployment](docs/deployment/) - Deployment guides and status
- 💻 [Development](docs/development/) - Development roadmap and implementation
- ⚙️ [Setup](docs/setup/) - Configuration and setup guides

### Key Documents
- [User Access & Authentication Design](docs/architecture/USER_ACCESS_DESIGN.md)
- [AWS Cognito Configuration](COGNITO_CONFIG.md)
- [Implementation Roadmap](docs/development/IMPLEMENTATION_ROADMAP.md)
- [Current Deployment Status](docs/deployment/DEPLOYMENT_STATUS.md)
- [Cognito Implementation Summary](COGNITO_IMPLEMENTATION_SUMMARY.md)

## Support

For issues or questions, please check the [documentation](docs/README.md) or create an issue on GitHub.

## Analysis Provider (LeMUR vs OpenAI)

The platform supports two AI providers for criteria-based analysis:

- LeMUR (AssemblyAI) using Claude (default)
- OpenAI Chat Completions (e.g., gpt-4o, gpt-4o)

Configure via `backend/.env`:

- `ANALYSIS_PROVIDER=lemur` | `openai`
- `ASSEMBLYAI_API_KEY=...` (required for `lemur`)
- `OPENAI_API_KEY=...` (required for `openai`)
- `OPENAI_MODEL=gpt-4o-mini` (or `gpt-4o`, etc.)

Switching provider doesn’t change the rubric or weighting — only which model generates the per‑criterion scores. The backend calculates the weighted overall score consistently across providers.

Super admins can change the active provider at runtime on `/settings` in the web app. Model keys remain in the backend `.env` for security.

does assemblyai provides for analisys also pause and quiet time information? if provides does it include them for analysis prompt? can you check it?


Detailed Analysis by Category explanation the text is quite short, maybe a little more could be added?