# ClassReflect User Access & Authentication Design

## Table of Contents
1. [Overview](#overview)
2. [User Roles & Permissions](#user-roles--permissions)
3. [User Management Flow](#user-management-flow)
4. [Authentication Architecture](#authentication-architecture)
5. [Analysis Templates System](#analysis-templates-system)
6. [Upload Workflows](#upload-workflows)
7. [Database Schema](#database-schema)
8. [API Endpoints](#api-endpoints)
9. [User Interface Specifications](#user-interface-specifications)
10. [Security Considerations](#security-considerations)
11. [Implementation Roadmap](#implementation-roadmap)

## Overview

ClassReflect implements a controlled, invitation-only multi-tenant architecture with hierarchical user management. There is no self-registration - all accounts are created through a top-down provisioning model starting from Super Admin → School → Teachers.

### Core Principles
- **Controlled Access**: No public registration - all accounts provisioned by administrators
- **Hierarchical Management**: Super Admin creates schools, schools manage their teachers
- **Data Isolation**: Complete separation between schools
- **Role-Based Permissions**: Teachers have view-only access, managers control uploads and criteria
- **Audit Trail**: All administrative actions tracked for compliance
- **Privacy First**: FERPA/GDPR compliant design with controlled data access

## User Roles & Permissions

### 1. Teacher Role
**Purpose**: View-only access to personal teaching feedback and recommendations

**Permissions**:
- ✅ View own analysis results and feedback
- ✅ View recommendations for improvement
- ✅ Track personal progress over time
- ✅ View own historical data and trends
- ✅ Download/export own reports
- ✅ View assigned learning resources
- ❌ Upload recordings
- ❌ View other teachers' data
- ❌ Modify analysis criteria
- ❌ Access school settings
- ❌ Create or invite users

**Database Scope**: `WHERE teacher_id = current_user_id AND school_id = current_school_id`

### 2. School Manager Role
**Purpose**: School-level administration, uploads, and criteria management

**Permissions**:
- ✅ Upload recordings for any teacher
- ✅ Set evaluation criteria per recording
- ✅ Configure analysis templates and parameters
- ✅ Create and manage teacher accounts
- ✅ View all teachers' data in school
- ✅ Generate school-wide reports
- ✅ Set default evaluation criteria
- ✅ Manage curriculum-based templates
- ✅ Assign recordings to teachers
- ✅ View school-wide analytics
- ✅ Export all school data
- ❌ Access other schools' data
- ❌ Create schools
- ❌ Modify platform settings

**Database Scope**: `WHERE school_id = current_school_id`

### 3. Super Admin Role
**Purpose**: Platform-level administration and school provisioning

**Permissions**:
- ✅ Create new schools
- ✅ Create initial school manager accounts
- ✅ Access all schools' data
- ✅ Configure global templates
- ✅ Platform-wide analytics
- ✅ Manage subscription and billing
- ✅ System configuration and settings
- ✅ Audit all platform activities
- ✅ Suspend/activate schools
- ✅ Technical support access

**Database Scope**: No restrictions

## User Management Flow

### Account Creation Hierarchy

```
Super Admin
    ↓ Creates
School Account + Initial School Manager
    ↓ Creates
Teacher Accounts
```

### 1. School Provisioning (Super Admin)

**Process**:
1. Super Admin logs into platform admin panel
2. Creates new school with:
   - School name and details
   - Subscription tier and limits
   - Initial school manager account
3. System generates:
   - School ID (UUID)
   - Temporary password for school manager
4. Email sent to school manager with:
   - Login credentials
   - Setup instructions
   - Password reset link

**No Self-Service**: Schools cannot sign up themselves - must be provisioned by ClassReflect team.

### 2. Teacher Account Creation (School Manager)

**Process**:
1. School Manager logs into school dashboard
2. Navigates to "Teacher Management"
3. Creates teacher account with:
   - Email address
   - Name and subjects
   - Grade levels
   - Initial permissions (view-only by default)
4. System generates:
   - Teacher ID (UUID)
   - Temporary password
5. Email sent to teacher with:
   - Welcome message
   - Login credentials
   - Password reset link
   - Basic usage guide

**Bulk Creation Option**:
- Upload CSV with teacher details
- System validates and creates accounts
- Batch email notifications sent

### 3. Account Activation Flow

```
New User Receives Email
    ↓
Clicks Activation Link
    ↓
Sets New Password
    ↓
Completes Profile (optional)
    ↓
Accesses Dashboard
```

### 4. No Public Registration

**Important**: The system has no public registration endpoints. All accounts must be created through the administrative hierarchy:

- ❌ No "Sign Up" button on login page
- ❌ No self-service school registration
- ❌ No teacher self-registration
- ✅ Only "Login" and "Forgot Password" options
- ✅ All accounts pre-provisioned by administrators

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

**Important**: Only School Managers can upload recordings. Teachers have view-only access to their results.

### School Manager Upload Flow (Primary)

```
1. School Manager Login
   └── Dashboard Display
       └── "Upload Recording" Button
           └── Upload Configuration Modal
               ├── Step 1: Teacher Selection (Required)
               │   └── Select target teacher for this recording
               ├── Step 2: Recording Details
               │   ├── File Selection (audio/video)
               │   ├── Class/Subject identification
               │   ├── Date and time of recording
               │   └── Session duration
               ├── Step 3: Evaluation Criteria (Required)
               │   ├── Select Base Template
               │   │   ├── Curriculum-aligned templates
               │   │   ├── Grade-specific templates
               │   │   └── Custom school templates
               │   ├── Customize Evaluation Parameters
               │   │   ├── Focus areas (engagement, clarity, etc.)
               │   │   ├── Weight adjustments
               │   │   ├── Special considerations
               │   │   └── Expected outcomes
               │   └── Additional Context
               │       ├── Class size and composition
               │       ├── Learning objectives
               │       ├── Lesson type (intro/review/assessment)
               │       └── Student demographics (ESL, special needs)
               └── Submit
                   ├── Validation of all fields
                   ├── File → S3 with metadata
                   ├── Job → SQS with full criteria
                   ├── Database entry with evaluation settings
                   ├── Audit log of upload and criteria
                   └── Email notification to teacher
```

### Evaluation Criteria Configuration

When uploading, School Managers must define:

1. **Base Analysis Template**
   - Curriculum standard (Common Core, State Standards, IB, etc.)
   - Subject and grade level
   - Pedagogical approach

2. **Custom Parameters per Recording**
   - Specific learning objectives for this lesson
   - Areas of focus for evaluation
   - Context-specific adjustments
   - Special student needs considerations

3. **Scoring Weights**
   - Adjust importance of different evaluation categories
   - Set minimum thresholds for recommendations
   - Define success criteria

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

// --- School Manager Endpoints ---

// GET /api/users/teachers (School Manager only)
// Headers: Authorization: Bearer <token>
// Returns: Teacher[] // Only teachers in their school

// POST /api/users/teachers (School Manager only)
// Creates new teacher account in their school
{
  email: string;
  firstName: string;
  lastName: string;
  subjects: string[];
  grades: string[];
  sendInviteEmail?: boolean; // Default: true
}
// Returns: { teacherId: string, temporaryPassword: string }

// PUT /api/users/teachers/:id (School Manager only)
{
  subjects?: string[];
  grades?: string[];
  isActive?: boolean;
}
// Returns: { success: boolean }

// POST /api/users/teachers/bulk (School Manager only)
// Bulk create teacher accounts
{
  teachers: Array<{
    email: string;
    firstName: string;
    lastName: string;
    subjects: string[];
    grades: string[];
  }>;
}
// Returns: { created: number, failed: number, results: BulkResult[] }

// --- Super Admin Endpoints ---

// POST /api/admin/schools (Super Admin only)
// Creates new school with initial manager
{
  schoolName: string;
  domain: string;
  subscriptionTier: 'basic' | 'professional' | 'enterprise';
  managerEmail: string;
  managerFirstName: string;
  managerLastName: string;
}
// Returns: { schoolId: string, managerId: string }

// GET /api/admin/schools (Super Admin only)
// Returns: School[] // All schools in platform

// PUT /api/admin/schools/:id (Super Admin only)
{
  subscriptionTier?: string;
  isActive?: boolean;
  maxTeachers?: number;
  maxMonthlyUploads?: number;
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

### Upload Endpoints (School Manager Only)

```typescript
// POST /api/upload/recording (School Manager only)
// Single recording upload with evaluation criteria
// Headers: Authorization: Bearer <token>
// Form Data:
//   - file: Audio/video file
//   - teacherId: string (required)
//   - evaluationCriteria: JSON string (required) containing:
//     {
//       templateId: string;
//       customWeights: {
//         engagement: number;
//         clarity: number;
//         management: number;
//         assessment: number;
//       };
//       focusAreas: string[];
//       learningObjectives: string;
//       lessonType: 'introduction' | 'practice' | 'review' | 'assessment';
//       contextualFactors: {
//         classSize: number;
//         eslStudents: number;
//         specialNeeds: number;
//         timeOfDay: string;
//       };
//       expectedOutcomes: string[];
//       specialConsiderations: string;
//     }
//   - metadata: JSON string with recording details
// Returns: { jobId: string, status: string }

// POST /api/upload/bulk (School Manager only)
// Bulk upload with individual criteria per recording
// Form Data:
//   - files: Multiple audio/video files
//   - criteriaMapping: JSON string mapping filenames to:
//     {
//       [filename]: {
//         teacherId: string;
//         evaluationCriteria: CriteriaObject;
//       }
//     }
// Returns: { batchId: string, jobs: JobStatus[] }

// GET /api/upload/templates (School Manager only)
// Get available evaluation templates for upload
// Query params: ?grade=3&subject=math&curriculum=common-core
// Returns: Template[]
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

### Teacher Dashboard (View-Only)

```
┌─────────────────────────────────────────────────────────┐
│  ClassReflect  │  Welcome, Sarah Johnson                │
│                │  Lincoln Elementary School               │
├─────────────────────────────────────────────────────────┤
│                                                          │
│  [📊 My Progress]  [📈 Analytics]  [📥 Export]  [⚙️ Profile] │
│                                                          │
│  ┌─────────────────────────────────────────────────┐   │
│  │  My Recent Evaluations                          │   │
│  ├─────────────────────────────────────────────────┤   │
│  │  📁 Math Class - Grade 3        Oct 25, 2024    │   │
│  │     Uploaded by: Admin M. Roberts               │   │
│  │     Status: ✅ Analyzed                         │   │
│  │     Score: 85/100  [View Feedback]             │   │
│  │                                                 │   │
│  │  📁 Science Lab - Grade 4       Oct 24, 2024    │   │
│  │     Uploaded by: Admin M. Roberts               │   │
│  │     Status: ⏳ Processing (45%)                 │   │
│  │     Estimated: 5 minutes remaining              │   │
│  │                                                 │   │
│  │  📁 Reading Circle - Grade 3    Oct 23, 2024    │   │
│  │     Uploaded by: Admin M. Roberts               │   │
│  │     Status: ✅ Analyzed                         │   │
│  │     Score: 92/100  [View Feedback]             │   │
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
│  ClassReflect  │  School Admin: Michael Roberts          │
│                │  Lincoln Elementary School               │
├─────────────────────────────────────────────────────────┤
│                                                          │
│  [📤 Upload Recording] [📋 Evaluation Criteria]         │
│  [👥 Manage Teachers] [📊 School Analytics]             │
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

### Upload Modal with Evaluation Criteria (School Manager)

```
┌──────────────────────────────────────────────────────┐
│  Upload Recording & Set Evaluation Criteria          │
├──────────────────────────────────────────────────────┤
│                                                       │
│  STEP 1: Recording Details                           │
│  ─────────────────────────                           │
│  Teacher: * [▼ Sarah Johnson - Grade 3         ]     │
│  Subject:   [▼ Mathematics    ]  Grade: [▼ 3   ]     │
│  Date/Time: [Oct 25, 2024 10:30 AM            ]      │
│                                                       │
│  Audio/Video File: *                                 │
│  ┌─────────────────────────────────────────────┐    │
│  │  📎 math-class-oct25.mp4 (45:32)            │    │
│  └─────────────────────────────────────────────┘    │
│                                                       │
│  STEP 2: Evaluation Criteria Configuration *         │
│  ─────────────────────────────────────────           │
│  Base Template:                                      │
│  ┌─────────────────────────────────────────────┐    │
│  │ ● Common Core Math Grade 3                  │    │
│  │ ○ State Standards Math Elementary           │    │
│  │ ○ Custom School Template                    │    │
│  └─────────────────────────────────────────────┘    │
│                                                       │
│  Evaluation Focus Areas: (Adjust weights)            │
│  Student Engagement:        [████████░░] 40%         │
│  Instruction Clarity:       [██████░░░░] 30%         │
│  Classroom Management:      [████░░░░░░] 20%         │
│  Learning Assessment:       [██░░░░░░░░] 10%         │
│                                                       │
│  Lesson Context:                                     │
│  Type: [●] Introduction [ ] Practice [ ] Review      │
│  Class Size: [25]  ESL: [5]  Special Needs: [2]     │
│                                                       │
│  Learning Objectives: *                              │
│  ┌─────────────────────────────────────────────┐    │
│  │ Students will understand fractions as       │    │
│  │ parts of a whole and apply to real-world    │    │
│  │ problems involving pizza and sharing        │    │
│  └─────────────────────────────────────────────┘    │
│                                                       │
│  Expected Outcomes: (What defines success?)          │
│  ┌─────────────────────────────────────────────┐    │
│  │ • 80% student participation                 │    │
│  │ • Clear understanding checks every 5 min    │    │
│  │ • Differentiated instruction for ESL        │    │
│  └─────────────────────────────────────────────┘    │
│                                                       │
│  Special Considerations:                             │
│  ┌─────────────────────────────────────────────┐    │
│  │ First lesson after fall break, may need     │    │
│  │ extra engagement strategies                  │    │
│  └─────────────────────────────────────────────┘    │
│                                                       │
│  [✓] Notify teacher when evaluation is complete      │
│  [✓] Save these criteria as template for future      │
│                                                       │
│      [Cancel]     [Save Draft]     [Submit]          │
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

### Super Admin Dashboard

```
┌──────────────────────────────────────────────────────┐
│  ClassReflect Platform Admin                         │
│  Logged in as: System Administrator                  │
├──────────────────────────────────────────────────────┤
│                                                       │
│  [🏫 Create School] [📊 Platform Analytics]          │
│  [🔧 System Settings] [📋 Global Templates]          │
│                                                       │
│  ┌─────────────────────────────────────────────┐    │
│  │  Platform Overview                           │    │
│  ├─────────────────────────────────────────────┤    │
│  │  Total Schools: 42                           │    │
│  │  Active Teachers: 1,247                      │    │
│  │  Recordings This Month: 8,456                │    │
│  │  Storage Used: 2.4 TB / 10 TB                │    │
│  └─────────────────────────────────────────────┘    │
│                                                       │
│  ┌─────────────────────────────────────────────┐    │
│  │  Schools Management                          │    │
│  ├─────────────────────────────────────────────┤    │
│  │  School Name        │ Plan    │ Status      │    │
│  │  ───────────────────┼─────────┼────────     │    │
│  │  Lincoln Elementary │ Pro     │ ✅ Active   │    │
│  │  Washington High    │ Basic   │ ✅ Active   │    │
│  │  Jefferson Middle   │ Pro     │ ⚠️ Trial    │    │
│  │  Roosevelt Academy  │ Enterprise│ ✅ Active │    │
│  │                                              │    │
│  │  [View All] [Add School] [Export]           │    │
│  └─────────────────────────────────────────────┘    │
│                                                       │
└──────────────────────────────────────────────────────┘
```

### Create School Modal (Super Admin)

```
┌──────────────────────────────────────────────────────┐
│  Create New School Account                           │
├──────────────────────────────────────────────────────┤
│                                                       │
│  School Information:                                 │
│  ─────────────────                                   │
│  School Name: * [Lincoln Elementary School     ]     │
│  Domain:        [lincoln.edu                   ]     │
│  Address:       [123 Main St, City, State      ]     │
│                                                       │
│  Subscription Plan:                                  │
│  [ ] Basic (10 teachers, 100 uploads/month)          │
│  [●] Professional (50 teachers, 500 uploads/month)   │
│  [ ] Enterprise (Unlimited)                          │
│                                                       │
│  Initial School Manager Account:                     │
│  ─────────────────────────────                       │
│  Email: *       [admin@lincoln.edu             ]     │
│  First Name: *  [Michael                       ]     │
│  Last Name: *   [Roberts                       ]     │
│  Phone:         [555-0123                      ]     │
│                                                       │
│  Configuration:                                      │
│  [✓] Send welcome email to manager                   │
│  [✓] Enable default evaluation templates             │
│  [✓] 30-day trial period                            │
│                                                       │
│      [Cancel]            [Create School]             │
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

### 📊 Overall Implementation Status
- **✅ Core Features Completed**: Authentication, User Management, Dashboards, Upload Wizard
- **⚠️ In Progress**: Template system backend, Report generation
- **🔄 Pending**: AWS Cognito integration, MFA, Audit logging implementation
- **Last Updated**: November 2024

### Phase 1: Foundation (Week 1) ✅ MOSTLY COMPLETED
- [ ] Set up AWS Cognito User Pool *(Pending - using JWT auth for now)*
- [ ] Configure custom attributes *(Pending - Cognito integration)*
- [x] Create authentication endpoints ✅ **COMPLETED**
- [x] Implement JWT middleware ✅ **COMPLETED**
- [x] Update database schema ✅ **COMPLETED**
- [x] Create user management tables ✅ **COMPLETED**

### Phase 2: Core Authentication (Week 2) ✅ MOSTLY COMPLETED
- [x] Build login/signup pages ✅ **COMPLETED** (Login only, no signup per design)
- [x] Implement password reset flow ✅ **COMPLETED** (Backend ready)
- [ ] Add MFA support *(Pending - requires Cognito)*
- [x] Create user profile management ✅ **COMPLETED**
- [x] Implement role-based routing ✅ **COMPLETED**
- [x] Add session management ✅ **COMPLETED** (JWT-based)

### Phase 3: Template System (Week 3) ⚠️ PARTIALLY COMPLETED
- [ ] Create template database tables *(Pending)*
- [ ] Build template CRUD APIs *(Pending)*
- [ ] Implement template inheritance *(Pending)*
- [x] Create default templates ✅ **COMPLETED** (Mock templates in frontend)
- [x] Build template UI components ✅ **COMPLETED** (Upload Wizard)
- [x] Add template preview ✅ **COMPLETED** (In Upload Wizard)

### Phase 4: Teacher Features (Week 4) ✅ MOSTLY COMPLETED
- [x] Build teacher dashboard ✅ **COMPLETED**
- [x] Implement recording upload ✅ **COMPLETED** (Manager uploads for teachers)
- [x] Create results viewing ✅ **COMPLETED** (Dashboard view)
- [x] Add progress tracking ✅ **COMPLETED** (Mock data ready)
- [ ] Build report generation *(Pending - backend integration)*
- [ ] Implement data export *(Pending - backend integration)*

### Phase 5: School Manager Features (Week 5) ✅ MOSTLY COMPLETED
- [x] Build admin dashboard ✅ **COMPLETED** (Manager Dashboard)
- [x] Implement teacher management ✅ **COMPLETED** (Backend API + UI)
- [x] Create bulk upload ✅ **COMPLETED** (Bulk teacher creation API)
- [x] Add school analytics ✅ **COMPLETED** (Dashboard analytics view)
- [x] Build template management UI ✅ **COMPLETED** (Upload Wizard)
- [ ] Implement audit logging *(Database table created, implementation pending)*

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

## Key Design Updates (v2.0)

### Controlled Access Model
This design implements a **controlled, invitation-only** system with no public registration:

1. **Hierarchical Account Creation**
   - Super Admin → Creates schools with initial manager
   - School Manager → Creates teacher accounts
   - Teachers → Cannot create accounts (view-only access)

2. **Upload & Evaluation Control**
   - **Only School Managers** can upload recordings
   - School Managers **must set evaluation criteria** for each upload
   - Criteria include: base template, custom weights, focus areas, context
   - Teachers receive notifications but cannot upload

3. **Role Responsibilities**
   - **Super Admin**: Platform management, school provisioning
   - **School Manager**: Uploads, criteria configuration, teacher management
   - **Teacher**: View results, track progress, export reports

4. **No Self-Service Features**
   - No public signup/registration
   - All accounts pre-provisioned by administrators
   - Email invitations with temporary passwords

This approach ensures:
- Complete control over platform access
- Consistent evaluation standards set by managers
- Protection of sensitive classroom data
- Clear accountability for uploads and evaluations

---

*Document Version: 2.1*  
*Last Updated: November 2024*  
*Status: Partially Implemented - Core Features Complete*  
*Implementation Progress: ~75% Complete*