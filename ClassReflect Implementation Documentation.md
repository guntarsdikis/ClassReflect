# ClassReflect Implementation Tasks

**Project**: Classroom Audio Analysis Platform  
**Target Domain**: classreflect.gdwd.co.uk  
**Infrastructure**: AWS eu-west-2  
**Frontend**: AWS Amplify (React/TypeScript)
**Backend**: ECS Fargate with Node.js API (smallest task size: 0.25 vCPU, 0.5 GB)
**Database**: Existing Aurora MySQL cluster
**Storage**: S3 for audio files
**Objective**: Modern serverless architecture for classroom audio analysis

---

## Phase 1: Infrastructure Preparation

### Task 1.1: Domain and SSL Configuration
- **Objective**: Set up new subdomain with secure access
- **Deliverables**:
  - DNS A record: classreflect.gdwd.co.uk → 3.9.156.34
  - SSL certificate generated and installed for new subdomain
  - Apache virtual host configured for classreflect.gdwd.co.uk
  - Certificate auto-renewal verified
- **Success Criteria**: HTTPS access working at classreflect.gdwd.co.uk

### Task 1.2: Disk Space Optimization ✅ COMPLETED
- **Objective**: Free up storage space on t3.small for new services
- **Previous State**: 5.1GB/8GB used (63% full)
- **Current State**: 3.3GB/8GB used (42% full)
- **Actions Completed**:
  - ✅ Cleaned old Apache and system logs
  - ✅ Set up automated weekly log cleanup (/etc/cron.weekly/cleanup-logs)
  - ✅ Configured journal size limits (100MB max)
  - ✅ Removed migration backups
- **Success Criteria**: ✅ 4.7GB free space available

### Task 1.3: Security Group Hardening 🔄 IN PROGRESS
- **Objective**: Improve security while maintaining functionality
- **Current Issue**: Wide open security group (0.0.0.0/0)
- **SSM Enabled**: ✅ AWS Session Manager configured (no SSH needed)
- **Required Changes**:
  - Remove SSH (port 22) - use SSM instead
  - Keep HTTP/HTTPS (80/443) open for web traffic
  - Remove port 3306 (MySQL) - no local database
  - Remove port 10000 (Webmin) - access via SSM port forwarding
  - API port 3001 will be proxied through Apache (no direct exposure)
- **Success Criteria**: Only ports 80/443 open to public

### Task 1.4: Database Schema Extension
- **Objective**: Extend existing Aurora MySQL for ClassReflect
- **Database**: gdwd.cluster-cjjl7f5jormj.eu-west-2.rds.amazonaws.com
- **Required Tables**:
  - schools (configuration and settings)
  - teachers (user management)
  - audio_jobs (processing queue tracking)
  - transcripts (results storage)
  - analysis_criteria (school-specific rules)
  - teacher_progress (historical metrics)
- **Success Criteria**: Tables created with proper indexes and relationships

---

## Phase 2: Backend API Development (ECS Fargate)

### Task 2.1: ECS Fargate Setup
- **Objective**: Deploy containerized Node.js API on ECS Fargate
- **Requirements**:
  - Create ECS cluster in eu-west-2
  - Use Fargate Spot for cost optimization (up to 70% savings)
  - Task definition: 0.25 vCPU, 0.5 GB memory (smallest/cheapest)
  - Node.js 22 with Express.js in Docker container
  - Application Load Balancer for HTTPS termination
- **Benefits**:
  - No server management required
  - Auto-scaling capabilities
  - Modern Node.js versions supported
  - Independent from EC2 server
- **Success Criteria**: API accessible via ALB endpoint

### Task 2.2: API Application Architecture
- **Objective**: Create REST API for ClassReflect functionality
- **Core Components**:
  - Express.js application framework
  - File upload handling (max 500MB, formats: mp3, wav, m4a)
  - Database connection pool to Aurora MySQL
  - JWT authentication integration with AWS Cognito
  - Request validation and security middleware
- **Success Criteria**: API responds to health checks and basic endpoints

### Task 2.3: AWS Services Integration
- **Objective**: Connect ECS API to AWS services for processing pipeline
- **Required Integrations**:
  - S3 service for temporary audio file storage
  - SQS queue for job management and processing triggers
  - ECS Task Role with permissions for S3, SQS, Aurora
  - Secrets Manager for database credentials
  - CloudWatch for logging and monitoring
- **Architecture Benefits**:
  - Fully managed container service
  - Automatic scaling based on load
  - No infrastructure management
- **Success Criteria**: API can upload files to S3 and trigger processing

### Task 2.4: API Gateway and Domain Configuration
- **Objective**: Expose ECS API through custom domain
- **Configuration Requirements**:
  - Application Load Balancer with SSL certificate
  - Route53 for api.classreflect.gdwd.co.uk subdomain
  - CORS configuration for Amplify frontend
  - Health check endpoint for ECS tasks
- **Endpoints**:
  - Production: https://api.classreflect.gdwd.co.uk
  - Alternative: Direct ALB endpoint as backup
- **Success Criteria**: API accessible via HTTPS with custom domain

---

## Phase 3: Processing Infrastructure

### Task 3.1: Custom AMI Creation
- **Objective**: Create optimized AMI for audio processing
- **Requirements**:
  - Launch temporary t3.large instance for AMI preparation
  - Install OpenAI Whisper with all dependencies
  - Install Node.js and required processing libraries
  - Configure AWS CLI for database and S3 access
  - Implement auto-shutdown mechanism
- **Success Criteria**: AMI launches and processes test audio successfully

### Task 3.2: Processing Application Development
- **Objective**: Create automated audio analysis pipeline
- **Core Functions**:
  - Download audio files from S3
  - Convert audio to text using OpenAI Whisper
  - Analyze transcript using ChatGPT API with custom criteria
  - Save results to Aurora MySQL database
  - Clean up temporary files and auto-terminate instance
- **Success Criteria**: Complete workflow from audio to analysis results

### Task 3.3: IAM Security Configuration
- **Objective**: Set up least-privilege access controls
- **Required Roles**:
  - Main server role: EC2 launch, S3 read/write, SQS send/receive
  - Processing instance role: S3 read, database write, self-termination
  - Cognito roles: User authentication and authorization
- **Success Criteria**: All services can access required resources, nothing more

### Task 3.4: Job Queue Management
- **Objective**: Implement reliable job processing system
- **Components**:
  - SQS queue for processing jobs
  - Dead letter queue for failed jobs
  - Job status tracking in database
  - Automatic retry logic for failed processing
- **Success Criteria**: Jobs process reliably with proper error handling

---

## Phase 4: Frontend Development (AWS Amplify)

### Task 4.1: AWS Amplify Setup
- **Objective**: Create and deploy React frontend application
- **Architecture Decision**: Frontend hosted separately on AWS Amplify (not on EC2)
- **Requirements**:
  - Initialize React application with TypeScript
  - Configure AWS Amplify hosting with GitHub integration
  - Set up custom domain: classreflect.gdwd.co.uk
  - Configure SSL certificates in Amplify (automatic)
  - Set up CI/CD pipeline for automatic deployments
- **Benefits of Amplify**:
  - Automatic scaling and CDN distribution
  - Built-in CI/CD from GitHub
  - Separate from backend server (better performance)
  - Free tier covers most usage
- **Success Criteria**: Frontend accessible at https://classreflect.gdwd.co.uk

### Task 4.2: User Interface Development
- **Objective**: Create intuitive interfaces for teachers and admins
- **Teacher Interface**:
  - Audio upload with drag-and-drop functionality
  - Real-time processing status updates
  - Results viewing with analysis breakdown
  - Historical progress tracking
- **Admin Interface**:
  - School settings and criteria configuration
  - Teacher account management
  - Usage analytics and reporting
- **Success Criteria**: Complete workflows from upload to results viewing

### Task 4.3: Authentication Integration
- **Objective**: Implement secure user authentication system
- **Requirements**:
  - AWS Cognito user pools setup
  - JWT token handling in frontend
  - Role-based access control (teacher vs admin)
  - Secure login/logout flows
- **Success Criteria**: Users can authenticate and access role-appropriate features

### Task 4.4: API Integration and Real-time Updates
- **Objective**: Connect Amplify frontend to EC2 backend API
- **Configuration**:
  - API endpoint: https://classreflect.gdwd.co.uk/api/
  - CORS configuration for Amplify domain
  - Environment variables in Amplify for API URLs
- **Features**:
  - File upload with progress tracking
  - WebSocket or polling for job status updates
  - Error handling and user feedback
  - Responsive design for mobile and desktop
- **Success Criteria**: Seamless communication between Amplify frontend and EC2 backend

---

## Phase 5: Testing and Deployment

### Task 5.1: Comprehensive Testing
- **Objective**: Verify system functionality and reliability
- **Testing Types**:
  - Unit tests for all API endpoints
  - Integration tests for complete workflows
  - Load testing with multiple concurrent uploads
  - Security testing for authentication and file uploads
  - Cross-browser and mobile compatibility testing
- **Test Scenarios**:
  - Various audio formats and file sizes
  - Network interruption recovery
  - Concurrent user sessions
  - Error scenarios and edge cases
- **Success Criteria**: All tests pass with <1% failure rate

### Task 5.2: Performance Validation
- **Objective**: Ensure system meets performance requirements
- **Performance Targets**:
  - 500MB file uploads complete within 10 minutes
  - 45-minute audio processed within 8 minutes
  - API responses under 2 seconds (except uploads)
  - Existing websites maintain current response times
- **Success Criteria**: All performance targets met under normal load

### Task 5.3: Infrastructure Testing
- **Objective**: Validate auto-scaling and cost management
- **Test Areas**:
  - Processing instance auto-launch and termination
  - Cost monitoring and budget alerts
  - Backup and recovery procedures
  - Monitoring and alerting systems
- **Success Criteria**: Infrastructure scales efficiently with predictable costs

### Task 5.4: Production Deployment
- **Objective**: Deploy ClassReflect to production environment
- **Deployment Steps**:
  - Deploy Docker container to Amazon ECR
  - Create ECS Fargate service with auto-scaling
  - Deploy React frontend to AWS Amplify
  - Configure Amplify environment variables (API_URL: api.classreflect.gdwd.co.uk)
  - Set up CloudWatch monitoring and alarms
  - Configure Route53 for both frontend and API domains
- **Architecture Benefits**:
  - Fully serverless backend (no EC2 management)
  - Independent scaling for frontend and backend
  - Cost-effective with Fargate Spot instances
  - Zero-downtime deployments with ECS blue/green
- **Rollback Plan**: 
  - Frontend: Amplify instant rollback
  - Backend: ECS automatic rollback on health check failure
- **Success Criteria**: Full system operational with monitoring active

---

## Quality Assurance Requirements

### Performance Standards
- **System Uptime**: 99.5% availability for all services
- **Processing Speed**: Audio analysis completed within 10 minutes
- **Concurrent Users**: Support 50+ teachers uploading simultaneously
- **File Support**: MP3, WAV, M4A files up to 500MB each

### Security Standards
- **Data Protection**: All data encrypted in transit and at rest
- **Access Control**: Role-based permissions with JWT authentication
- **Privacy Compliance**: GDPR/FERPA ready data handling
- **File Security**: Automatic deletion of audio files after 24 hours

### Cost Management
- **ECS Fargate Costs**: 
  - Fargate Spot: ~$0.003/hour (0.25 vCPU, 0.5GB)
  - Monthly estimate: ~$2-5 for light usage
  - Auto-scaling: Scale to zero when not in use
- **AWS Amplify**: Free tier covers most usage
- **Processing Cost**: Under $0.10 per audio analysis
- **Total Monthly**: Under $20 for moderate usage
- **Budget Monitoring**: CloudWatch billing alerts
- **Cost Optimization**: 
  - Fargate Spot instances (70% savings)
  - Scale to zero during idle times
  - S3 lifecycle policies for audio cleanup

### User Experience Standards
- **Ease of Use**: Upload to results in under 3 clicks
- **Mobile Support**: Full functionality on tablets and smartphones
- **Response Time**: Interface updates within 2 seconds
- **Error Handling**: Clear error messages with recovery instructions

---

## Success Metrics and Validation

### Technical Metrics
- **API Performance**: All endpoints respond within SLA
- **Processing Reliability**: <1% job failure rate
- **Resource Usage**: t3.small CPU/memory within safe limits
- **Cost Efficiency**: Linear scaling with usage patterns

### User Adoption Metrics
- **Teacher Engagement**: 80% of teachers use system monthly
- **Analysis Quality**: User satisfaction rating 4+ stars
- **System Reliability**: Zero data loss incidents
- **Support Requests**: <5% of users require assistance

### Operational Metrics
- **Deployment Success**: Zero downtime during deployment
- **Monitoring Coverage**: All critical components monitored
- **Backup Verification**: Recovery procedures tested monthly
- **Documentation Completeness**: All procedures documented

### Business Impact Metrics
- **Teaching Improvement**: Measurable progress in teacher metrics
- **School Adoption**: Positive feedback from pilot schools
- **Scalability Proof**: System handles growth without degradation
- **ROI Demonstration**: Clear value proposition for schools

---

## Infrastructure Status Update (August 17, 2025)

### Architecture Decision
- ❌ **EC2 Node.js**: Amazon Linux 2 incompatible with modern Node.js versions
- ✅ **ECS Fargate**: Selected for backend API hosting
- ✅ **AWS Amplify**: Frontend hosting solution
- ✅ **Aurora MySQL**: Existing database ready for ClassReflect schema

### Completed EC2 Preparations
- ✅ **Disk Space**: Cleaned from 63% to 42% usage
- ✅ **SSM Session Manager**: Configured for secure access
- ✅ **Automatic Maintenance**: Weekly log cleanup
- ✅ **Old Site Management**: eladoreruffles.gdwd.co.uk in maintenance mode

### Next Steps for ClassReflect
- **Backend**: Set up ECS Fargate cluster and service
- **Frontend**: Initialize AWS Amplify project
- **Database**: Create ClassReflect schema in Aurora
- **Domains**: Configure api.classreflect.gdwd.co.uk and classreflect.gdwd.co.uk

---

## Risk Mitigation Tasks

### Technical Risks
- **Resource Constraints**: Monitor t3.small performance continuously
- **Processing Failures**: Implement robust retry and error handling
- **Data Loss**: Automated backups and recovery procedures
- **Security Breaches**: Regular security audits and updates

### Operational Risks
- **Service Disruption**: Comprehensive rollback procedures
- **Cost Overruns**: Real-time cost monitoring and alerts
- **User Adoption**: User training and support documentation
- **Compliance Issues**: Privacy and security compliance verification

### Mitigation Strategies
- **Gradual Rollout**: Pilot with limited users before full deployment
- **Monitoring**: Comprehensive alerting for all critical metrics
- **Documentation**: Complete operational procedures and troubleshooting guides
- **Support**: Clear escalation procedures for technical issues

This task list provides a complete roadmap for implementing ClassReflect while maintaining focus on deliverables and success criteria rather than implementation details.