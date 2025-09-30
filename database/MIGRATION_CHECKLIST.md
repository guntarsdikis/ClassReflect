# Database Migration Checklist

## Analysis Status Tracking Migration

### What Changed
The system now tracks AI analysis progress in the `audio_jobs` table with the following new columns:
- `template_id` - Which template is being used for analysis
- `analysis_status` - Current status ('pending', 'queued', 'processing', 'completed', 'failed', 'skipped')
- `analysis_started_at` - When analysis began
- `analysis_completed_at` - When analysis finished

### Local Database Status
✅ **Local database is up to date** - All columns exist in local MySQL instance

### Production Database Status
⚠️ **Needs verification** - Run the migration to ensure production has these columns

### How to Apply Migration

#### Option 1: Using the Safe Migration Script (Recommended)
```bash
# The script checks if columns exist before adding them
# Safe to run multiple times

# For local testing:
mysql -h localhost -u root -proot classreflect < database/add-analysis-status-tracking.sql

# For production (get password from AWS Secrets Manager):
PROD_PASS=$(aws secretsmanager get-secret-value \
  --secret-id classreflect/database/credentials \
  --region eu-west-2 \
  --query 'SecretString' \
  --output text | jq -r '.password')

mysql -h gdwd.cluster-cjjl7f5jormj.eu-west-2.rds.amazonaws.com \
  -u gdwd -p"$PROD_PASS" classreflect \
  < database/add-analysis-status-tracking.sql
```

#### Option 2: Using the Automated Comparison Tool
```bash
cd scripts/database
./auto-compare-schemas.sh

# This will:
# 1. Compare local and production schemas
# 2. Generate a detailed report
# 3. Create suggested migration SQL
# 4. Show you exactly what's different
```

### Verification
After applying the migration, verify it worked:

```bash
# Check production database has the new columns
PROD_PASS=$(aws secretsmanager get-secret-value \
  --secret-id classreflect/database/credentials \
  --region eu-west-2 \
  --query 'SecretString' \
  --output text | jq -r '.password')

mysql -h gdwd.cluster-cjjl7f5jormj.eu-west-2.rds.amazonaws.com \
  -u gdwd -p"$PROD_PASS" classreflect \
  -e "DESCRIBE audio_jobs" | grep -E "template_id|analysis_"
```

Expected output:
```
template_id             int                 YES         NULL
analysis_status         enum(...)           YES         pending
analysis_started_at     timestamp           YES         NULL
analysis_completed_at   timestamp           YES         NULL
```

### What This Enables
Once this migration is applied, the frontend will show:
- 📊 Real-time progress when AI analysis is running
- 🟣 Purple banner: "Template Analysis in Progress"
- 📈 ANALYZING stats card with live counter
- ⏱️ Status updates every 2 seconds

### Related Backend Changes
The backend code in `backend/src/routes/analysis.ts` was updated to:
- Set `analysis_status = 'processing'` when analysis starts (line 36-41)
- Set `analysis_status = 'completed'` when analysis succeeds (line 321-327)
- Set `analysis_status = 'failed'` when analysis fails (line 369-375)

### Files Modified
- ✅ `backend/src/routes/analysis.ts` - Updates audio_jobs.analysis_status
- ✅ `frontend/src/features/recordings/components/RecordingsList.tsx` - Shows progress banner
- ✅ `database/add-analysis-status-tracking.sql` - Safe migration script
- ✅ `.gitignore` - Added backend/storage/prompts/ directory

### Next Steps
1. ✅ Local database is ready (no action needed)
2. ⚠️ Apply migration to production database
3. ✅ Backend code deployed (restart service after deployment)
4. ✅ Frontend shows progress indicators

### Testing
After migration:
1. Apply a template to a recording
2. Watch for the purple "Template Analysis in Progress" banner
3. See the ANALYZING counter increment
4. Banner disappears when analysis completes