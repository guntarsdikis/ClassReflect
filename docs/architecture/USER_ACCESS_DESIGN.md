# ClassReflect User Access & Authentication Design

## Table of Contents
1. [Overview](#overview)
2. [User Roles & Permissions](#user-roles--permissions)
3. [Authentication Architecture](#authentication-architecture)
4. [Analysis Templates System](#analysis-templates-system)
5. [Upload Workflows](#upload-workflows)
6. [Database Schema](#database-schema)
7. [API Endpoints](#api-endpoints)
8. [User Interface Specifications](#user-interface-specifications)
9. [Security Considerations](#security-considerations)
10. [Implementation Roadmap](#implementation-roadmap)

## Overview

ClassReflect implements a multi-tenant architecture where schools are completely isolated from each other, with role-based access control within each school. The system supports hierarchical user management with customizable analysis templates for different educational contexts.

### Core Principles
- **Data Isolation**: Complete separation between schools
- **Role-Based Access**: Granular permissions based on user role
- **Template Flexibility**: Customizable analysis criteria per curriculum
- **Audit Trail**: All actions tracked for compliance
- **Privacy First**: FERPA/GDPR compliant design

## User Roles & Permissions

### 1. Teacher Role
**Purpose**: Classroom-level access for individual educators

**Permissions**:
- ✅ Upload own recordings
- ✅ View own analysis results
- ✅ Track personal progress over time
- ✅ Select from available templates
- ✅ View own historical data
- ✅ Export own reports
- ❌ View other teachers' data
- ❌ Modify templates
- ❌ Access school settings

**Database Scope**: `WHERE teacher_id = current_user_id AND school_id = current_school_id`

### 2. School Manager Role
**Purpose**: School-level administration and oversight

**Permissions**:
- ✅ All Teacher permissions
- ✅ Upload recordings for any teacher
- ✅ View all teachers' data in school
- ✅ Create/modify school templates
- ✅ Set analysis parameters per recording
- ✅ Manage teacher accounts
- ✅ View school-wide analytics
- ✅ Export school reports
- ✅ Configure default settings
- ❌ Access other schools' data
- ❌ Modify global templates

**Database Scope**: `WHERE school_id = current_school_id`

### 3. Super Admin Role (Future)
**Purpose**: Platform-level administration

**Permissions**:
- ✅ All School Manager permissions
- ✅ Access all schools
- ✅ Create global templates
- ✅ Platform analytics
- ✅ User management across schools
- ✅ System configuration

**Database Scope**: No restrictions

## Authentication Architecture

### AWS Cognito Configuration

```javascript
// Cognito User Pool Configuration
{
  UserPoolName: 'ClassReflect-Users',
  
  // Custom attributes
  Schema: [
    {
      Name: 'school_id',
      AttributeDataType: 'String',
      Required: true,
      Mutable: false
    },
    {
      Name: 'role',
      AttributeDataType: 'String',
      Required: true,
      Mutable: true,
      ValidValues: ['teacher', 'school_manager', 'super_admin']
    },
    {
      Name: 'subjects',
      AttributeDataType: 'String[]',
      Required: false,
      Mutable: true
    },
    {
      Name: 'grades',
      AttributeDataType: 'String[]',
      Required: false,
      Mutable: true
    }
  ],
  
  // Password policy
  Policies: {
    PasswordPolicy: {
      MinimumLength: 12,
      RequireUppercase: true,
      RequireLowercase: true,
      RequireNumbers: true,
      RequireSymbols: true
    }
  },
  
  // MFA configuration
  MfaConfiguration: 'OPTIONAL',
  EnabledMfas: ['SMS_MFA', 'SOFTWARE_TOKEN_MFA']
}
```

### JWT Token Structure

```json
{
  "sub": "user-uuid",
  "email": "teacher@school.edu",
  "email_verified": true,
  "custom:school_id": "school-uuid",
  "custom:role": "teacher",
  "custom:subjects": ["math", "science"],
  "custom:grades": ["3", "4"],
  "iat": 1634567890,
  "exp": 1634571490
}
```

### Authentication Flow

```mermaid
sequenceDiagram
    participant User
    participant Frontend
    participant Cognito
    participant API
    participant Database
    
    User->>Frontend: Enter credentials
    Frontend->>Cognito: Authenticate
    Cognito->>Frontend: JWT Token
    Frontend->>API: Request with JWT
    API->>API: Validate JWT
    API->>API: Extract school_id, role
    API->>Database: Query with filters
    Database->>API: Filtered results
    API->>Frontend: Response
    Frontend->>User: Display data
```

## Analysis Templates System

### Template Hierarchy

```
Global Templates (Platform)
├── Elementary Education
│   ├── Math Instruction
│   ├── Reading Circle
│   └── Science Discovery
├── Middle School
│   ├── STEM Classes
│   ├── Language Arts
│   └── Social Studies
└── High School
    ├── AP Courses
    ├── Laboratory Sessions
    └── Discussion Seminars

School Templates (Customized)
├── School Default
├── Department Specific
│   ├── Math Department Standard
│   ├── English Department Standard
│   └── Science Department Standard
└── Special Programs
    ├── ESL Instruction
    ├── Special Education
    └── Gifted Program
```

### Template Data Structure

```json
{
  "template_id": "uuid",
  "template_name": "Elementary Math Instruction",
  "category": "elementary",
  "grade_levels": ["1", "2", "3", "4", "5"],
  "subject_areas": ["mathematics"],
  "is_global": false,
  "school_id": "school-uuid",
  "created_by": "user-uuid",
  "is_active": true,
  "criteria": {
    "evaluation_categories": [
      {
        "name": "Student Engagement",
        "weight": 0.30,
        "metrics": [
          "participation_rate",
          "question_frequency",
          "student_talk_time"
        ]
      },
      {
        "name": "Instruction Clarity",
        "weight": 0.25,
        "metrics": [
          "clear_directions",
          "concept_explanation",
          "vocabulary_usage"
        ]
      },
      {
        "name": "Classroom Management",
        "weight": 0.20,
        "metrics": [
          "transition_efficiency",
          "behavior_redirects",
          "positive_reinforcement"
        ]
      },
      {
        "name": "Learning Assessment",
        "weight": 0.25,
        "metrics": [
          "check_understanding",
          "formative_assessment",
          "feedback_quality"
        ]
      }
    ],
    "keywords_to_track": [
      "excellent", "good job", "well done",
      "let's think about", "can you explain",
      "who can tell me", "what do you think"
    ],
    "interaction_patterns": {
      "ideal_teacher_talk_ratio": 0.4,
      "minimum_wait_time": 3,
      "questions_per_10min": 5
    }
  },
  "custom_prompts": {
    "analysis_focus": "Focus on mathematical reasoning and problem-solving strategies",
    "special_considerations": "Consider differentiated instruction techniques"
  }
}
```

## Upload Workflows

### Teacher Upload Flow

```
1. Teacher Login
   └── Dashboard Display
       └── "Upload Recording" Button
           └── Upload Modal
               ├── File Selection
               ├── Auto-filled Class Info
               ├── Optional Template Override
               └── Submit
                   ├── File → S3
                   ├── Job → SQS
                   ├── Status → "Processing"
                   └── Dashboard Update
```

### School Manager Upload Flow

```
1. School Manager Login
   └── Dashboard Display
       └── "Upload for Teacher" Button
           └── Enhanced Upload Modal
               ├── Teacher Selection (Required)
               ├── File Selection
               ├── Template Selection (Required)
               ├── Custom Variables
               │   ├── Class Size
               │   ├── Learning Objectives
               │   ├── Special Considerations
               │   └── Session Type
               └── Submit
                   ├── Validation
                   ├── File → S3
                   ├── Job → SQS with metadata
                   ├── Audit Log Entry
                   └── Notification to Teacher
```

### Bulk Upload Flow (School Manager)

```
1. Select "Bulk Upload"
2. Upload CSV with:
   - teacher_email
   - audio_file_path
   - template_id
   - class_metadata
3. System validates all entries
4. Batch processing with progress bar
5. Email report on completion
```

## Database Schema

### Core Tables

```sql
-- User management
CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email VARCHAR(255) UNIQUE NOT NULL,
    cognito_id VARCHAR(255) UNIQUE NOT NULL,
    school_id UUID NOT NULL REFERENCES schools(id),
    role VARCHAR(50) NOT NULL CHECK (role IN ('teacher', 'school_manager', 'super_admin')),
    first_name VARCHAR(100) NOT NULL,
    last_name VARCHAR(100) NOT NULL,
    subjects TEXT[], -- Array of subjects
    grades TEXT[], -- Array of grades
    is_active BOOLEAN DEFAULT true,
    last_login TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (school_id) REFERENCES schools(id) ON DELETE CASCADE
);

-- Analysis templates
CREATE TABLE analysis_templates (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    template_name VARCHAR(255) NOT NULL,
    category VARCHAR(100) NOT NULL,
    grade_levels TEXT[],
    subject_areas TEXT[],
    criteria_json JSONB NOT NULL,
    is_global BOOLEAN DEFAULT false,
    school_id UUID REFERENCES schools(id),
    created_by UUID REFERENCES users(id),
    is_active BOOLEAN DEFAULT true,
    version INTEGER DEFAULT 1,
    parent_template_id UUID REFERENCES analysis_templates(id),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT school_template_check CHECK (
        (is_global = true AND school_id IS NULL) OR
        (is_global = false AND school_id IS NOT NULL)
    )
);

-- Recording metadata
CREATE TABLE recording_metadata (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    audio_job_id UUID NOT NULL REFERENCES audio_jobs(id),
    template_id UUID NOT NULL REFERENCES analysis_templates(id),
    uploaded_by_user_id UUID NOT NULL REFERENCES users(id),
    teacher_id UUID NOT NULL REFERENCES users(id),
    class_size INTEGER,
    subject VARCHAR(100),
    grade VARCHAR(20),
    session_type VARCHAR(100), -- 'instruction', 'discussion', 'lab', 'assessment'
    learning_objectives TEXT,
    special_considerations TEXT,
    custom_variables JSONB,
    curriculum_standards TEXT[],
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Template assignments (default templates per teacher/subject)
CREATE TABLE template_assignments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    teacher_id UUID NOT NULL REFERENCES users(id),
    template_id UUID NOT NULL REFERENCES analysis_templates(id),
    subject_area VARCHAR(100),
    grade_level VARCHAR(20),
    is_default BOOLEAN DEFAULT false,
    assigned_by UUID REFERENCES users(id),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(teacher_id, subject_area, grade_level)
);

-- Audit log for compliance
CREATE TABLE audit_log (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id),
    action VARCHAR(100) NOT NULL,
    resource_type VARCHAR(100) NOT NULL,
    resource_id UUID,
    changes JSONB,
    ip_address INET,
    user_agent TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- School settings
CREATE TABLE school_settings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    school_id UUID NOT NULL REFERENCES schools(id) UNIQUE,
    default_template_id UUID REFERENCES analysis_templates(id),
    auto_analysis BOOLEAN DEFAULT true,
    retention_days INTEGER DEFAULT 365,
    features_enabled JSONB DEFAULT '{"bulk_upload": true, "api_access": false}',
    notification_settings JSONB,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

### Indexes for Performance

```sql
-- User queries
CREATE INDEX idx_users_school_id ON users(school_id);
CREATE INDEX idx_users_role ON users(role);
CREATE INDEX idx_users_cognito_id ON users(cognito_id);

-- Template queries
CREATE INDEX idx_templates_school_id ON analysis_templates(school_id);
CREATE INDEX idx_templates_category ON analysis_templates(category);
CREATE INDEX idx_templates_global ON analysis_templates(is_global);

-- Recording queries
CREATE INDEX idx_recording_meta_teacher ON recording_metadata(teacher_id);
CREATE INDEX idx_recording_meta_uploaded_by ON recording_metadata(uploaded_by_user_id);
CREATE INDEX idx_recording_meta_template ON recording_metadata(template_id);

-- Audit queries
CREATE INDEX idx_audit_user_id ON audit_log(user_id);
CREATE INDEX idx_audit_created_at ON audit_log(created_at);
CREATE INDEX idx_audit_resource ON audit_log(resource_type, resource_id);
```

## API Endpoints

### Authentication Endpoints

```typescript
// POST /api/auth/login
{
  email: string;
  password: string;
}
// Returns: { token: string, user: UserProfile }

// POST /api/auth/refresh
{
  refreshToken: string;
}
// Returns: { token: string, refreshToken: string }

// POST /api/auth/logout
// Headers: Authorization: Bearer <token>
// Returns: { success: boolean }

// POST /api/auth/forgot-password
{
  email: string;
}
// Returns: { message: string }
```

### User Management Endpoints

```typescript
// GET /api/users/profile
// Headers: Authorization: Bearer <token>
// Returns: UserProfile

// GET /api/users/teachers (School Manager only)
// Headers: Authorization: Bearer <token>
// Returns: Teacher[]

// POST /api/users/invite (School Manager only)
{
  email: string;
  role: 'teacher' | 'school_manager';
  firstName: string;
  lastName: string;
  subjects?: string[];
  grades?: string[];
}
// Returns: { invitationId: string }

// PUT /api/users/:id (School Manager only)
{
  subjects?: string[];
  grades?: string[];
  isActive?: boolean;
}
// Returns: { success: boolean }
```

### Template Management Endpoints

```typescript
// GET /api/templates
// Query params: ?category=elementary&subject=math&grade=3
// Returns: Template[]

// GET /api/templates/:id
// Returns: Template

// POST /api/templates (School Manager only)
{
  templateName: string;
  category: string;
  gradeLevels: string[];
  subjectAreas: string[];
  criteria: CriteriaObject;
  baseTemplateId?: string; // For copying/extending
}
// Returns: { templateId: string }

// PUT /api/templates/:id (School Manager only)
{
  criteria?: CriteriaObject;
  isActive?: boolean;
}
// Returns: { success: boolean }

// POST /api/templates/:id/assign (School Manager only)
{
  teacherId: string;
  subjectArea?: string;
  gradeLevel?: string;
  isDefault: boolean;
}
// Returns: { assignmentId: string }
```

### Upload Endpoints

```typescript
// POST /api/upload/recording
// Headers: Authorization: Bearer <token>
// Form Data:
//   - file: Audio file
//   - templateId?: string
//   - metadata?: JSON string
// Returns: { jobId: string, status: string }

// POST /api/upload/for-teacher (School Manager only)
// Form Data:
//   - file: Audio file
//   - teacherId: string (required)
//   - templateId: string (required)
//   - classSize?: number
//   - subject?: string
//   - grade?: string
//   - learningObjectives?: string
//   - specialConsiderations?: string
//   - customVariables?: JSON string
// Returns: { jobId: string, status: string }

// POST /api/upload/bulk (School Manager only)
// Form Data:
//   - csv: CSV file with bulk upload data
// Returns: { batchId: string, totalJobs: number }
```

### Analytics Endpoints

```typescript
// GET /api/analytics/teacher/:id
// Query params: ?startDate=2024-01-01&endDate=2024-12-31
// Returns: TeacherAnalytics

// GET /api/analytics/school (School Manager only)
// Query params: ?startDate=2024-01-01&endDate=2024-12-31
// Returns: SchoolAnalytics

// GET /api/analytics/comparison (School Manager only)
// Query params: ?teacherIds=id1,id2,id3&metric=engagement
// Returns: ComparisonData
```

## User Interface Specifications

### Login Page

```
┌─────────────────────────────────────────┐
│             ClassReflect                │
│     Classroom Audio Analysis Platform    │
├─────────────────────────────────────────┤
│                                         │
│  Email: ________________               │
│                                         │
│  Password: ________________            │
│                                         │
│  [ ] Remember me                        │
│                                         │
│  [Login] [Forgot Password?]            │
│                                         │
│  ─────────── OR ───────────            │
│                                         │
│  [Login with SSO]                      │
│                                         │
└─────────────────────────────────────────┘
```

### Teacher Dashboard

```
┌─────────────────────────────────────────────────────────┐
│  ClassReflect  │  Welcome, Sarah Johnson                │
│                │  Lincoln Elementary School               │
├─────────────────────────────────────────────────────────┤
│                                                          │
│  [📤 Upload Recording]  [📊 View Progress]  [⚙️ Settings] │
│                                                          │
│  ┌─────────────────────────────────────────────────┐   │
│  │  Recent Recordings                               │   │
│  ├─────────────────────────────────────────────────┤   │
│  │  📁 Math Class - Grade 3        Oct 25, 2024    │   │
│  │     Status: ✅ Analyzed                         │   │
│  │     Score: 85/100  [View Details]              │   │
│  │                                                 │   │
│  │  📁 Science Lab - Grade 4       Oct 24, 2024    │   │
│  │     Status: ⏳ Processing (45%)                 │   │
│  │     Estimated: 5 minutes remaining              │   │
│  │                                                 │   │
│  │  📁 Reading Circle - Grade 3    Oct 23, 2024    │   │
│  │     Status: ✅ Analyzed                         │   │
│  │     Score: 92/100  [View Details]              │   │
│  └─────────────────────────────────────────────────┘   │
│                                                          │
│  ┌─────────────────────────────────────────────────┐   │
│  │  Your Progress This Month                       │   │
│  ├─────────────────────────────────────────────────┤   │
│  │  📈 Engagement:        ▓▓▓▓▓▓▓▓░░ 78% (+5%)    │   │
│  │  📈 Clarity:          ▓▓▓▓▓▓▓▓▓░ 85% (+2%)    │   │
│  │  📈 Management:       ▓▓▓▓▓▓▓▓▓▓ 90% (+8%)    │   │
│  │  📈 Assessment:       ▓▓▓▓▓▓▓░░░ 72% (-3%)    │   │
│  └─────────────────────────────────────────────────┘   │
│                                                          │
└──────────────────────────────────────────────────────────┘
```

### School Manager Dashboard

```
┌─────────────────────────────────────────────────────────┐
│  ClassReflect  │  Admin: Michael Roberts                │
│                │  Lincoln Elementary School               │
├─────────────────────────────────────────────────────────┤
│                                                          │
│  [📤 Upload for Teacher] [👥 Manage Teachers]           │
│  [📋 Manage Templates] [📊 School Analytics]            │
│                                                          │
│  ┌─────────────────────────────────────────────────┐   │
│  │  School Overview                                 │   │
│  ├─────────────────────────────────────────────────┤   │
│  │  Active Teachers: 24                            │   │
│  │  Recordings This Month: 156                     │   │
│  │  Average Score: 82/100                          │   │
│  │  Processing Queue: 3 recordings                 │   │
│  └─────────────────────────────────────────────────┘   │
│                                                          │
│  ┌─────────────────────────────────────────────────┐   │
│  │  Teacher Performance                            │   │
│  ├─────────────────────────────────────────────────┤   │
│  │  Teacher Name     │ Recordings │ Avg Score     │   │
│  │  ─────────────────┼────────────┼──────────     │   │
│  │  Sarah Johnson    │     12     │   85/100      │   │
│  │  Mark Thompson    │     10     │   78/100      │   │
│  │  Emily Chen       │     15     │   91/100      │   │
│  │  David Miller     │      8     │   76/100      │   │
│  │                                                 │   │
│  │  [View All Teachers]                           │   │
│  └─────────────────────────────────────────────────┘   │
│                                                          │
│  ┌─────────────────────────────────────────────────┐   │
│  │  Quick Actions                                  │   │
│  ├─────────────────────────────────────────────────┤   │
│  │  • Bulk upload recordings                      │   │
│  │  • Create new analysis template                │   │
│  │  • Export monthly report                       │   │
│  │  • Configure school settings                   │   │
│  └─────────────────────────────────────────────────┘   │
│                                                          │
└──────────────────────────────────────────────────────────┘
```

### Upload Modal (School Manager)

```
┌──────────────────────────────────────────────────────┐
│  Upload Recording for Teacher                        │
├──────────────────────────────────────────────────────┤
│                                                       │
│  Select Teacher: *                                   │
│  ┌─────────────────────────────────────────────┐    │
│  │ ▼ Sarah Johnson - Grade 3                   │    │
│  └─────────────────────────────────────────────┘    │
│                                                       │
│  Class Information:                                  │
│  Subject: [Mathematics    ▼]  Grade: [3      ▼]    │
│  Class Size: [25        ]                           │
│                                                       │
│  Analysis Template: *                                │
│  ┌─────────────────────────────────────────────┐    │
│  │ ○ School Default                             │    │
│  │ ● Elementary Math Standard                   │    │
│  │ ○ Custom Math with Focus on Problem Solving  │    │
│  │ ○ [+ Create New Template]                    │    │
│  └─────────────────────────────────────────────┘    │
│                                                       │
│  Session Type:                                       │
│  [●] New Concept  [ ] Review  [ ] Assessment        │
│                                                       │
│  Learning Objectives:                                │
│  ┌─────────────────────────────────────────────┐    │
│  │ Introduction to fractions and their         │    │
│  │ real-world applications                      │    │
│  └─────────────────────────────────────────────┘    │
│                                                       │
│  Special Considerations:                             │
│  ┌─────────────────────────────────────────────┐    │
│  │ 5 ESL students, 2 IEP students              │    │
│  └─────────────────────────────────────────────┘    │
│                                                       │
│  Audio File:                                         │
│  ┌─────────────────────────────────────────────┐    │
│  │  📎 Drag file here or click to browse       │    │
│  └─────────────────────────────────────────────┘    │
│                                                       │
│  [ ] Notify teacher when analysis is complete        │
│                                                       │
│         [Cancel]            [Upload Recording]       │
│                                                       │
└──────────────────────────────────────────────────────┘
```

### Template Management Interface

```
┌──────────────────────────────────────────────────────┐
│  Analysis Template Editor                            │
├──────────────────────────────────────────────────────┤
│                                                       │
│  Template Name: [Elementary Math Standard        ]   │
│                                                       │
│  Category: [Elementary ▼]  Subjects: [Math ▼]       │
│  Grades: [✓] 1  [✓] 2  [✓] 3  [✓] 4  [✓] 5         │
│                                                       │
│  Evaluation Criteria:                                │
│  ┌─────────────────────────────────────────────┐    │
│  │ Category          │ Weight │ Focus Areas    │    │
│  │ ─────────────────┼────────┼───────────     │    │
│  │ Student Engagement│  30%   │ [Edit]         │    │
│  │ Instruction Clarity│  25%  │ [Edit]         │    │
│  │ Classroom Mgmt    │  20%   │ [Edit]         │    │
│  │ Assessment        │  25%   │ [Edit]         │    │
│  │                   │ =100%  │                │    │
│  └─────────────────────────────────────────────┘    │
│                                                       │
│  Keywords to Track:                                  │
│  ┌─────────────────────────────────────────────┐    │
│  │ excellent, good job, well done, think about │    │
│  │ can you explain, who can tell me            │    │
│  └─────────────────────────────────────────────┘    │
│                                                       │
│  Ideal Metrics:                                      │
│  Teacher Talk Ratio: [40]%  Wait Time: [3]sec       │
│  Questions/10min: [5]                               │
│                                                       │
│  [Preview Template]  [Save as Draft]  [Activate]    │
│                                                       │
└──────────────────────────────────────────────────────┘
```

## Security Considerations

### Data Protection
1. **Encryption**
   - All data encrypted at rest (AES-256)
   - All data encrypted in transit (TLS 1.3)
   - Audio files encrypted in S3 buckets

2. **Access Control**
   - JWT tokens expire after 1 hour
   - Refresh tokens expire after 30 days
   - API rate limiting per user/IP
   - Failed login attempt lockout

3. **Compliance**
   - FERPA compliant for educational records
   - GDPR ready with data export/deletion
   - COPPA compliant for under-13 data
   - Full audit trail for all actions

### API Security

```typescript
// Middleware stack for API endpoints
app.use(helmet()); // Security headers
app.use(rateLimiter); // Rate limiting
app.use(authenticateJWT); // JWT validation
app.use(authorizeRole); // Role-based access
app.use(validateSchool); // School isolation
app.use(auditLogger); // Audit trail
```

### Database Security

```sql
-- Row Level Security (RLS) example
CREATE POLICY teacher_isolation ON audio_jobs
    FOR ALL
    TO application_role
    USING (
        teacher_id = current_setting('app.current_user_id')::UUID
        AND school_id = current_setting('app.current_school_id')::UUID
    );

CREATE POLICY school_manager_access ON audio_jobs
    FOR ALL
    TO application_role
    USING (
        school_id = current_setting('app.current_school_id')::UUID
        AND current_setting('app.current_role') = 'school_manager'
    );
```

## Implementation Roadmap

### Phase 1: Foundation (Week 1)
- [ ] Set up AWS Cognito User Pool
- [ ] Configure custom attributes
- [ ] Create authentication endpoints
- [ ] Implement JWT middleware
- [ ] Update database schema
- [ ] Create user management tables

### Phase 2: Core Authentication (Week 2)
- [ ] Build login/signup pages
- [ ] Implement password reset flow
- [ ] Add MFA support
- [ ] Create user profile management
- [ ] Implement role-based routing
- [ ] Add session management

### Phase 3: Template System (Week 3)
- [ ] Create template database tables
- [ ] Build template CRUD APIs
- [ ] Implement template inheritance
- [ ] Create default templates
- [ ] Build template UI components
- [ ] Add template preview

### Phase 4: Teacher Features (Week 4)
- [ ] Build teacher dashboard
- [ ] Implement recording upload
- [ ] Create results viewing
- [ ] Add progress tracking
- [ ] Build report generation
- [ ] Implement data export

### Phase 5: School Manager Features (Week 5)
- [ ] Build admin dashboard
- [ ] Implement teacher management
- [ ] Create bulk upload
- [ ] Add school analytics
- [ ] Build template management UI
- [ ] Implement audit logging

### Phase 6: Integration & Testing (Week 6)
- [ ] Integrate with existing pipeline
- [ ] Add comprehensive logging
- [ ] Implement monitoring
- [ ] Perform security audit
- [ ] Load testing
- [ ] User acceptance testing

### Phase 7: Deployment (Week 7)
- [ ] Deploy to staging
- [ ] Conduct pilot testing
- [ ] Train initial users
- [ ] Deploy to production
- [ ] Monitor performance
- [ ] Gather feedback

## Monitoring & Metrics

### Key Performance Indicators
- User login success rate
- Average session duration
- Template usage statistics
- Upload success rate
- Analysis completion time
- User satisfaction scores

### Technical Metrics
- API response times
- Authentication latency
- Database query performance
- S3 upload speeds
- Queue processing times
- Error rates by endpoint

### Business Metrics
- Active users per school
- Recordings per teacher
- Template adoption rate
- Feature usage statistics
- School engagement levels
- Platform growth rate

## Support & Maintenance

### User Support
- In-app help documentation
- Video tutorials for key features
- Email support system
- FAQ section
- User community forum

### Technical Maintenance
- Weekly security updates
- Monthly feature releases
- Quarterly security audits
- Annual penetration testing
- Continuous monitoring
- Automated backups

## Appendix

### A. API Error Codes

```json
{
  "AUTH001": "Invalid credentials",
  "AUTH002": "Token expired",
  "AUTH003": "Insufficient permissions",
  "AUTH004": "Account locked",
  "SCHOOL001": "School not found",
  "SCHOOL002": "School access denied",
  "TEMPLATE001": "Template not found",
  "TEMPLATE002": "Invalid template format",
  "UPLOAD001": "File too large",
  "UPLOAD002": "Invalid file format",
  "UPLOAD003": "Upload quota exceeded"
}
```

### B. Environment Variables

```bash
# AWS Cognito
COGNITO_USER_POOL_ID=us-east-1_xxxxx
COGNITO_CLIENT_ID=xxxxxxxxxxxxx
COGNITO_REGION=us-east-1

# Database
DATABASE_URL=postgresql://user:pass@host:5432/classreflect
DATABASE_POOL_SIZE=20

# AWS Services
AWS_REGION=us-east-1
S3_BUCKET=classreflect-audio
SQS_QUEUE_URL=https://sqs.region.amazonaws.com/account/queue

# Security
JWT_SECRET=<random-256-bit-key>
ENCRYPTION_KEY=<random-256-bit-key>
SESSION_SECRET=<random-256-bit-key>

# Features
ENABLE_MFA=true
ENABLE_BULK_UPLOAD=true
MAX_FILE_SIZE=500MB
```

### C. Sample API Requests

```bash
# Login
curl -X POST https://api.classreflect.gdwd.co.uk/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"teacher@school.edu","password":"SecurePass123!"}'

# Upload for teacher (School Manager)
curl -X POST https://api.classreflect.gdwd.co.uk/upload/for-teacher \
  -H "Authorization: Bearer <token>" \
  -F "file=@recording.mp3" \
  -F "teacherId=uuid" \
  -F "templateId=uuid" \
  -F "classSize=25" \
  -F "subject=mathematics" \
  -F "grade=3"

# Get school analytics
curl -X GET https://api.classreflect.gdwd.co.uk/analytics/school?startDate=2024-01-01 \
  -H "Authorization: Bearer <token>"
```

---

*Document Version: 1.0*  
*Last Updated: October 2024*  
*Status: Design Phase*