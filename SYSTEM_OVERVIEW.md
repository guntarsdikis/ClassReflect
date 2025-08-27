# ClassReflect System Overview

## What is ClassReflect?

ClassReflect is a simple audio transcription and feedback system for classroom recordings. Teachers record their lessons, the system transcribes them using Whisper AI, and provides feedback based on customizable templates created by school managers.

## Core Purpose & Simple Workflow

1. **Upload**: Teachers/Managers upload classroom audio recordings
2. **Transcribe**: System automatically transcribes audio using Whisper
3. **Analyze**: System analyzes transcript against feedback templates
4. **Review**: Teachers view transcript and template-based feedback

## User Roles & Permissions

### Super Admin
- Create and manage schools
- Create managers and teachers for any school  
- Upload recordings for any teacher (assign to specific teacher)
- Create and manage feedback templates globally
- View all transcripts and feedback

### School Manager  
- Create and manage teachers within their school
- Upload recordings for teachers in their school
- Create and manage feedback templates for their school
- View transcripts and feedback for their school's teachers

### Teacher
- View their own transcripts and feedback
- Cannot upload recordings or manage users

## System Features

### ✅ Currently Working
- **Audio Upload**: Upload classroom recordings (managers/super admins only)
- **Whisper Transcription**: Automatic speech-to-text conversion
- **Role-Based Access**: Super Admin → Manager → Teacher hierarchy
- **Multi-School Support**: Separate schools with isolated data
- **AWS Cognito Authentication**: Secure login with JWT tokens
- **Job Status Tracking**: Monitor upload and processing progress

### 🚨 Critical Issues (Must Fix First)
- **Database Structure Problems**: Dual user tables, ID type mismatches
- **Missing Foreign Key Constraints**: Risk of data corruption
- **Incomplete Template System**: No feedback analysis yet

### 🔄 Needs Implementation
- **Feedback Templates**: Customizable analysis criteria per school
- **Template-Based Analysis**: Simple AI feedback using templates  
- **User Management UI**: Create schools, managers, teachers via web interface
- **Recording Assignment**: Assign uploaded recordings to specific teachers
- **Basic Dashboard**: View transcripts and feedback  

## Simple Architecture

### Current Setup
```
Manager/SuperAdmin uploads audio → API stores in S3 → Whisper transcribes → Database stores result → Teacher views transcript
```

### Components
- **Frontend**: React web app for uploading/viewing
- **Backend API**: Node.js handles uploads, user management, data  
- **Database**: MySQL with schools, users, recordings, transcripts
- **Storage**: AWS S3 for audio files
- **Processing**: Whisper AI for speech-to-text
- **Auth**: AWS Cognito for secure login

### Key Technologies
- **Frontend**: React + TypeScript, Mantine UI components
- **Backend**: Node.js + Express, TypeScript
- **Database**: MySQL (local dev), Aurora MySQL (production)  
- **Authentication**: AWS Cognito with JWT tokens
- **File Storage**: AWS S3 buckets
- **AI Processing**: OpenAI Whisper for transcription
- **Deployment**: Docker containers, AWS infrastructure

## Simple Workflow

### Upload & Transcription Process
1. **Manager/SuperAdmin uploads** classroom audio file
2. **System assigns recording** to specific teacher
3. **File stored** in S3, job queued for processing  
4. **Whisper transcribes** audio to text
5. **System analyzes** transcript using feedback templates
6. **Teacher views** transcript and feedback in dashboard

### User Access
- **Authentication**: AWS Cognito login with role-based permissions
- **SuperAdmin**: Access all schools, create schools/users, manage global templates
- **Manager**: Access their school only, create teachers, manage school templates
- **Teacher**: View only their own transcripts and feedback

## Database & Security

### Current Database Issues ⚠️
- **Dual User Tables**: Both `users` and `teachers` tables exist (confusing)
- **ID Type Mismatches**: `users.school_id` is `varchar(36)`, should be `int`
- **Missing Foreign Keys**: No constraints between tables (data integrity risk)
- **Must fix before continuing development**

### Simple Access Control  
| Role | Create Schools | Create Teachers | Upload Audio | View Transcripts | Manage Templates |
|------|---------------|----------------|--------------|------------------|------------------|
| Teacher | ❌ | ❌ | ❌ | ✅ (Own only) | ❌ |
| Manager | ❌ | ✅ (School only) | ✅ (School only) | ✅ (School only) | ✅ (School only) |
| SuperAdmin | ✅ | ✅ (Any school) | ✅ (Any teacher) | ✅ (All) | ✅ (Global) |

### Security
- **Authentication**: AWS Cognito with JWT tokens
- **Data Isolation**: School-based separation of all data
- **File Security**: S3 with server-side encryption

## Database Schema

### Essential Tables
- **schools**: School information (`id`, `name`, `contact_email`)
- **users**: All users (`id`, `email`, `role`, `school_id`) - NEEDS FIXING
- **feedback_templates**: Analysis criteria per school (`id`, `school_id`, `name`, `criteria`)
- **audio_jobs**: Upload tracking (`id`, `teacher_id`, `school_id`, `file_name`, `status`)
- **transcripts**: Whisper results (`job_id`, `transcript_text`, `word_count`)
- **feedback_results**: Template-based analysis (`job_id`, `template_id`, `feedback_text`)

### Template System
Templates define what to analyze in transcripts:
- **Template Name**: "Elementary Math Lesson"  
- **Criteria Points**: 
  - "Clear instructions and explanations"
  - "Student engagement and participation"  
  - "Effective questioning techniques"
  - "Positive classroom management"

## Development Setup

### Local Environment  
- **Database**: Local MySQL in Docker (`localhost:3306`)
- **Processing**: Local Whisper Docker container
- **Storage**: AWS S3 (hybrid approach)
- **Frontend**: React dev server (`localhost:3000`)
- **Backend**: Node.js API (`localhost:3001`)

### Production
- **Database**: Aurora MySQL cluster
- **Processing**: Auto-scaling EC2 Whisper instances  
- **Frontend**: AWS Amplify hosting
- **Backend**: ECS Fargate containers

## Immediate Priorities

### 🚨 Priority 1: Fix Database Structure
- Consolidate `users` and `teachers` tables
- Fix ID type mismatches (`school_id` should be `int`)
- Add proper foreign key constraints
- **Must complete before other development**

### 🎯 Priority 2: Complete Core Features
- Implement feedback template system
- Build template-based AI analysis
- Create user management interfaces
- Add recording assignment workflow

### 🔧 Priority 3: Polish & Testing  
- Complete teacher/manager dashboards
- Add comprehensive error handling
- Implement proper testing suite
- Performance optimization

## Success Definition

A working prototype where:
1. **SuperAdmin** creates schools and manages users globally
2. **Manager** creates teachers and uploads recordings for their school  
3. **Teacher** views transcripts and template-based feedback
4. **Templates** provide structured, customizable analysis criteria
5. **System** reliably processes audio → transcript → feedback workflow

**Focus**: Complete prototype functionality, not enterprise features or scale.**