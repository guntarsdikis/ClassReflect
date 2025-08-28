# ClassReflect Simple Development Plan

## What We're Building

A simple audio transcription and feedback system where managers upload classroom recordings, Whisper transcribes them, and teachers get template-based feedback. No complex analytics or enterprise features - just a working prototype.

## Current Status

### ✅ Working
- Audio upload and Whisper transcription  
- AWS Cognito authentication
- Basic role-based access (Teacher/Manager/SuperAdmin)
- React frontend and Node.js API

### 🚨 Critical Issues (Must Fix First)
- **Database structure problems**: Dual user tables, ID type mismatches
- **Missing foreign keys**: Risk of data corruption
- **No template system**: Can't provide feedback yet
- **No user management UI**: Can't create schools/users via web interface

### 🔄 Missing Core Features  
- Feedback templates (customizable analysis criteria)
- Template-based AI analysis using GPT
- User management interfaces 
- Recording assignment to teachers
- Basic dashboard for viewing results

## 8-Week Prototype Development Plan

### Week 1-2: Fix Database Foundation 🚨
**Goal: Stable database with proper structure**

**Week 1:**
- Backup current database and create migration scripts
- Consolidate `users` and `teachers` tables into single `users` table  
- Fix ID type mismatches (`school_id: varchar(36) → int`)
- Add proper foreign key constraints between all tables

**Week 2:**  
- Update all API code to use unified schema
- Test RBAC with fixed database structure
- Ensure data integrity across all relationships
- Document database changes and migration process

### Week 3-4: Template System & AI Analysis 🎯
**Goal: Complete feedback generation workflow**

**Week 3:**
- Create `feedback_templates` table and API endpoints
- Build template management UI (create, edit, assign templates)
- Implement basic template system (name + criteria points)
- Allow SuperAdmins and Managers to create templates for their scope

**Week 4:**
- Integrate GPT-4 API for transcript analysis
- Build analysis engine using templates as prompts
- Create `feedback_results` table to store AI-generated feedback
- Test end-to-end: upload → transcribe → analyze → store feedback

### Week 5-6: User Management & Core UI 🔧
**Goal: Complete role-based user management**

**Week 5:**
- Build SuperAdmin interface to create/manage schools
- Build Manager interface to create/manage teachers in their school  
- Implement user invitation system with email notifications
- Add school selection and assignment workflows

**Week 6:**
- Create recording upload interface with teacher assignment
- Build teacher dashboard to view transcripts and feedback
- Add manager dashboard to see school-wide activity
- Implement basic search and filtering for recordings

### Week 7-8: Polish & Testing ✨
**Goal: Production-ready prototype**

**Week 7:**
- Add comprehensive error handling and validation
- Implement proper loading states and progress indicators
- Add basic analytics (recording counts, feedback scores)
- Create automated test suite for core workflows

**Week 8:**
- Performance optimization and bug fixes
- Security audit and penetration testing
- Documentation update and deployment guide
- Final testing with real users and feedback collection

## Success Milestones

### Week 2 Milestone: Database Fixed ✅
- Single `users` table with proper foreign keys
- All ID types consistent and relationships working
- RBAC tests passing with new schema
- Zero data integrity issues

### Week 4 Milestone: AI Analysis Working 🎯  
- Templates can be created and managed by SuperAdmins/Managers
- GPT-4 analyzes transcripts using template criteria
- Feedback results stored and displayed to teachers
- Complete workflow: upload → transcribe → analyze → view feedback

### Week 6 Milestone: User Management Complete 🔧
- SuperAdmins can create schools and manage all users
- Managers can create/manage teachers in their school
- Recording upload assigns audio to specific teachers
- Role-based dashboards show appropriate data

### Week 8 Milestone: Production Ready ✨
- Error handling and validation throughout
- Automated tests cover core user workflows  
- Performance optimized for expected load
- Documentation complete for deployment and usage

## Simple Requirements Checklist

### Core User Stories
- [ ] **As SuperAdmin**: I can create schools and assign managers
- [ ] **As SuperAdmin**: I can upload recordings for any teacher in any school
- [ ] **As SuperAdmin**: I can create global feedback templates
- [ ] **As Manager**: I can create teachers in my school
- [ ] **As Manager**: I can upload recordings for teachers in my school  
- [ ] **As Manager**: I can create feedback templates for my school
- [ ] **As Teacher**: I can view transcripts and feedback for my recordings
- [ ] **As Teacher**: I cannot access other teachers' data

### Technical Requirements  
- [ ] **Database**: Proper structure with foreign keys and data integrity
- [ ] **Templates**: Flexible criteria system (name + list of analysis points)
- [ ] **AI Analysis**: GPT-4 analyzes transcripts against template criteria
- [ ] **Security**: Role-based access with proper data isolation
- [ ] **UI**: Simple, functional interfaces for each user type

## Template System Design

### Template Structure
```json
{
  "id": "uuid",
  "name": "Elementary Math Lesson",
  "school_id": 1,
  "created_by": "manager_user_id",
  "criteria": [
    "Clear instructions and step-by-step explanations",
    "Student engagement and participation levels", 
    "Effective use of questioning techniques",
    "Positive classroom management and encouragement",
    "Mathematical vocabulary usage and accuracy"
  ],
  "is_active": true
}
```

### Analysis Process
1. **Template Selection**: Manager assigns template when uploading recording
2. **GPT-4 Analysis**: Send transcript + template criteria to GPT-4
3. **Structured Feedback**: GPT returns feedback for each criteria point
4. **Storage**: Save results in `feedback_results` table linked to recording
5. **Display**: Teacher views transcript with template-based feedback

### Simple Prompt Engineering
```
Analyze this classroom transcript against these criteria:
- Clear instructions and step-by-step explanations
- Student engagement and participation levels
- Effective use of questioning techniques

Transcript: [WHISPER_TRANSCRIPT]

For each criteria, provide:
1. Score (1-5)
2. Specific examples from transcript
3. Suggestions for improvement
```

## Development Resources

### Current Setup
- **Developer**: Full-stack (React/Node.js/MySQL/AWS)
- **Time**: 8 weeks focused development
- **Infrastructure**: Existing AWS setup (~$100/month)
- **AI Costs**: GPT-4 API (~$50/month for prototype testing)

### Simple Success Metrics
- **Week 2**: Database migration completed, tests passing
- **Week 4**: End-to-end workflow working (upload → feedback)
- **Week 6**: All three user roles can complete their core tasks
- **Week 8**: System ready for pilot testing with real schools

## Risk Mitigation

### Technical Risks
- **Database Migration**: Backup first, test on copy, rollback plan ready
- **GPT-4 Quality**: Start with simple prompts, iterate based on feedback
- **User Adoption**: Focus on simple, intuitive interfaces

### Business Risks  
- **Scope Creep**: Stick to core requirements, no advanced features
- **Over-Engineering**: Build for current needs, not future scale
- **Timeline**: Weekly milestones with clear deliverables

## Next Immediate Steps

1. **This Week**: Start database migration planning and backup
2. **Review Requirements**: Confirm template system requirements with stakeholders  
3. **Set Up Development**: Ensure local environment working properly
4. **Begin Week 1**: Database consolidation and foreign key fixes

**Focus**: Complete working prototype in 8 weeks. No enterprise features, no scaling, no advanced analytics. Just a solid, simple system that works.