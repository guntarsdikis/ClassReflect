# ClassReflect Database Structure Improvements

## Current Issues Identified

### 1. Dual User Table Problem
The database currently has both `users` and `teachers` tables, creating confusion and inconsistency:

**Current State:**
- `teachers` table: `school_id` as `int` (references `schools.id`)
- `users` table: `school_id` as `varchar(36)` (designed for UUID references)
- API code uses `users` table but some joins expect `teachers` table

**Impact:** 
- Type mismatches causing application errors
- Data inconsistency between tables
- Confusion about which table to use for user management

### 2. ID Type Inconsistencies
Mixed use of `int` and `varchar(36)` for primary keys:

**Current Schema:**
```sql
schools.id: int
users.id: int
users.school_id: varchar(36)  -- MISMATCH!
audio_jobs.id: varchar(36)
audio_jobs.school_id: int
audio_jobs.teacher_id: int
```

### 3. Missing Foreign Key Constraints
Some tables reference others without proper foreign key constraints, which can lead to orphaned records.

### 4. Incomplete Migration to Cognito Schema
The system has partially migrated to AWS Cognito but still maintains legacy structures.

## Recommended Improvements

### Phase 1: Unify User Management (Immediate)

#### 1.1 Consolidate to Single Users Table
```sql
-- Drop the redundant teachers table after data migration
-- Keep only the users table with proper structure

-- Fix school_id type in users table
ALTER TABLE users MODIFY COLUMN school_id INT NOT NULL;

-- Add foreign key constraint
ALTER TABLE users ADD CONSTRAINT fk_users_school_id 
  FOREIGN KEY (school_id) REFERENCES schools(id) ON DELETE CASCADE;

-- Migrate any remaining data from teachers table to users table
INSERT INTO users (email, first_name, last_name, role, school_id, password_hash, is_active, last_login, created_at, updated_at)
SELECT email, first_name, last_name, 
       CASE 
         WHEN role = 'admin' THEN 'school_manager'
         WHEN role = 'super_admin' THEN 'super_admin'
         ELSE 'teacher'
       END as role,
       school_id, password_hash, 
       CASE WHEN status = 'active' THEN 1 ELSE 0 END as is_active,
       last_login, created_at, updated_at
FROM teachers 
WHERE email NOT IN (SELECT email FROM users);

-- Drop teachers table after successful migration
-- DROP TABLE teachers;
```

#### 1.2 Update All Foreign Key References
```sql
-- Update references in other tables to use users.id instead of teachers.id
-- This assumes teachers.id maps to users.id correctly

-- Add missing foreign key constraints
ALTER TABLE audio_jobs ADD CONSTRAINT fk_audio_jobs_teacher_id 
  FOREIGN KEY (teacher_id) REFERENCES users(id) ON DELETE CASCADE;

ALTER TABLE audio_jobs ADD CONSTRAINT fk_audio_jobs_school_id 
  FOREIGN KEY (school_id) REFERENCES schools(id) ON DELETE CASCADE;

ALTER TABLE transcripts ADD CONSTRAINT fk_transcripts_teacher_id 
  FOREIGN KEY (teacher_id) REFERENCES users(id) ON DELETE CASCADE;

ALTER TABLE transcripts ADD CONSTRAINT fk_transcripts_school_id 
  FOREIGN KEY (school_id) REFERENCES schools(id) ON DELETE CASCADE;
```

### Phase 2: Enhanced Schema Design (Short Term)

#### 2.1 Add Missing School Features
```sql
-- Enhance schools table with missing columns from Cognito schema
ALTER TABLE schools 
  ADD COLUMN subscription_tier ENUM('basic', 'professional', 'enterprise') DEFAULT 'basic' AFTER subscription_status,
  ADD COLUMN is_active BOOLEAN DEFAULT TRUE AFTER max_monthly_uploads;
```

#### 2.2 Add Analysis Templates System
```sql
-- Create analysis templates table for customizable evaluation criteria
CREATE TABLE analysis_templates (
    id VARCHAR(36) PRIMARY KEY DEFAULT (UUID()),
    template_name VARCHAR(255) NOT NULL,
    category VARCHAR(100) NOT NULL,
    grade_levels JSON,
    subject_areas JSON,
    criteria_json JSON NOT NULL,
    is_global BOOLEAN DEFAULT FALSE,
    school_id INT NULL,
    created_by INT NULL,
    is_active BOOLEAN DEFAULT TRUE,
    version INTEGER DEFAULT 1,
    parent_template_id VARCHAR(36) NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (school_id) REFERENCES schools(id) ON DELETE CASCADE,
    FOREIGN KEY (created_by) REFERENCES users(id),
    FOREIGN KEY (parent_template_id) REFERENCES analysis_templates(id),
    INDEX idx_category (category),
    INDEX idx_is_global (is_global),
    INDEX idx_school_id (school_id),
    CONSTRAINT template_school_check CHECK (
        (is_global = TRUE AND school_id IS NULL) OR
        (is_global = FALSE AND school_id IS NOT NULL)
    )
);
```

#### 2.3 Add Recording Context Metadata
```sql
-- Create recording metadata table for enhanced context
CREATE TABLE recording_metadata (
    id VARCHAR(36) PRIMARY KEY DEFAULT (UUID()),
    audio_job_id VARCHAR(36) NOT NULL,
    template_id VARCHAR(36),
    uploaded_by_user_id INT NOT NULL,
    teacher_id INT NOT NULL,
    class_size INTEGER,
    subject VARCHAR(100),
    grade VARCHAR(20),
    session_type VARCHAR(100),
    learning_objectives TEXT,
    special_considerations TEXT,
    custom_variables JSON,
    curriculum_standards JSON,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (audio_job_id) REFERENCES audio_jobs(id) ON DELETE CASCADE,
    FOREIGN KEY (template_id) REFERENCES analysis_templates(id),
    FOREIGN KEY (uploaded_by_user_id) REFERENCES users(id),
    FOREIGN KEY (teacher_id) REFERENCES users(id)
);
```

### Phase 3: Performance and Security Enhancements (Medium Term)

#### 3.1 Add Audit Logging
```sql
-- Create comprehensive audit log for compliance
CREATE TABLE audit_log (
    id VARCHAR(36) PRIMARY KEY DEFAULT (UUID()),
    user_id INT NOT NULL,
    action VARCHAR(100) NOT NULL,
    resource_type VARCHAR(100) NOT NULL,
    resource_id VARCHAR(36),
    changes JSON,
    ip_address VARCHAR(45),
    user_agent TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id),
    INDEX idx_user_action (user_id, action),
    INDEX idx_resource_type (resource_type),
    INDEX idx_created_at (created_at)
);
```

#### 3.2 Optimize Indexes for Common Queries
```sql
-- Performance indexes based on expected query patterns
CREATE INDEX idx_users_school_role ON users(school_id, role);
CREATE INDEX idx_audio_jobs_teacher_status ON audio_jobs(teacher_id, status);
CREATE INDEX idx_audio_jobs_created_desc ON audio_jobs(created_at DESC);
CREATE INDEX idx_transcripts_job_created ON transcripts(job_id, created_at);
```

#### 3.3 Add School Settings
```sql
-- School-specific configuration table
CREATE TABLE school_settings (
    id VARCHAR(36) PRIMARY KEY DEFAULT (UUID()),
    school_id INT NOT NULL UNIQUE,
    default_template_id VARCHAR(36),
    auto_analysis BOOLEAN DEFAULT TRUE,
    retention_days INTEGER DEFAULT 365,
    features_enabled JSON DEFAULT ('{"bulk_upload": true, "api_access": false}'),
    notification_settings JSON,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (school_id) REFERENCES schools(id) ON DELETE CASCADE,
    FOREIGN KEY (default_template_id) REFERENCES analysis_templates(id)
);
```

### Phase 4: Advanced Features (Long Term)

#### 4.1 Enhanced Analysis Results
```sql
-- Update analysis_results table to support template-based analysis
ALTER TABLE analysis_results 
  ADD COLUMN template_id VARCHAR(36),
  ADD COLUMN category_scores JSON AFTER overall_score,
  ADD FOREIGN KEY (template_id) REFERENCES analysis_templates(id);
```

#### 4.2 Add Template Assignment System
```sql
-- Teacher-specific template assignments
CREATE TABLE template_assignments (
    id VARCHAR(36) PRIMARY KEY DEFAULT (UUID()),
    teacher_id INT NOT NULL,
    template_id VARCHAR(36) NOT NULL,
    subject_area VARCHAR(100),
    grade_level VARCHAR(20),
    is_default BOOLEAN DEFAULT FALSE,
    assigned_by INT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (teacher_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (template_id) REFERENCES analysis_templates(id),
    FOREIGN KEY (assigned_by) REFERENCES users(id),
    UNIQUE KEY unique_teacher_subject_grade (teacher_id, subject_area, grade_level)
);
```

## Migration Strategy

### Safe Migration Process

1. **Backup Everything First**
```bash
mysqldump -h localhost -u root -proot classreflect > classreflect_backup_$(date +%Y%m%d_%H%M%S).sql
```

2. **Test Migration on Copy**
```bash
# Create test database
mysql -h localhost -u root -proot -e "CREATE DATABASE classreflect_test;"
mysql -h localhost -u root -proot classreflect_test < classreflect_backup_*.sql

# Run migration scripts on test database first
# Verify all data integrity
```

3. **Phase-by-Phase Implementation**
   - Implement Phase 1 first (critical fixes)
   - Test thoroughly in development
   - Deploy to production with minimal downtime
   - Implement subsequent phases iteratively

### Data Validation Queries

```sql
-- Validate user-school relationships
SELECT u.id, u.email, u.school_id, s.id as actual_school_id, s.name 
FROM users u 
LEFT JOIN schools s ON u.school_id = s.id 
WHERE s.id IS NULL;

-- Check for orphaned audio jobs
SELECT aj.id, aj.teacher_id, aj.school_id 
FROM audio_jobs aj 
LEFT JOIN users u ON aj.teacher_id = u.id 
LEFT JOIN schools s ON aj.school_id = s.id 
WHERE u.id IS NULL OR s.id IS NULL;

-- Verify foreign key consistency
SELECT 
  COUNT(*) as total_users,
  COUNT(DISTINCT school_id) as unique_schools,
  SUM(CASE WHEN role = 'teacher' THEN 1 ELSE 0 END) as teachers,
  SUM(CASE WHEN role = 'school_manager' THEN 1 ELSE 0 END) as managers,
  SUM(CASE WHEN role = 'super_admin' THEN 1 ELSE 0 END) as admins
FROM users;
```

## Benefits of Proposed Changes

### Immediate Benefits (Phase 1)
- ✅ Fixes type mismatch errors in application
- ✅ Eliminates confusion between users and teachers tables
- ✅ Ensures data consistency and referential integrity
- ✅ Simplifies API code by using single user table

### Short-term Benefits (Phase 2)
- 🎯 Enables flexible, school-specific evaluation criteria
- 🎯 Supports detailed recording context for better AI analysis
- 🎯 Provides foundation for advanced features

### Long-term Benefits (Phases 3-4)
- 📊 Comprehensive audit trails for compliance (FERPA, GDPR)
- ⚡ Optimized performance for large-scale deployments
- 🔧 Flexible template system for diverse educational contexts
- 🎨 Rich analytics and reporting capabilities

## Risk Mitigation

### Database Migration Risks
- **Data Loss**: Always backup before migration, test on copy first
- **Downtime**: Use blue-green deployment strategy
- **Application Compatibility**: Update all queries simultaneously

### Performance Risks
- **Index Overhead**: Add indexes gradually, monitor query performance
- **Large JSON Columns**: Consider normalization if data grows large
- **Foreign Key Constraints**: May slow down bulk operations

## Implementation Priority

**🔴 Critical (Implement Immediately)**
- Phase 1: Fix ID type mismatches and consolidate user tables

**🟡 Important (Next Sprint)**
- Phase 2: Add analysis templates and recording metadata

**🟢 Enhancement (Future Releases)**
- Phase 3: Add audit logging and performance optimizations
- Phase 4: Advanced template assignment system

This database improvement plan addresses the current structural issues while building a foundation for the advanced features outlined in the system roadmap.