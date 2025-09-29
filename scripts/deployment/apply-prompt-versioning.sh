#!/bin/bash

# Apply prompt versioning schema to ClassReflect database
# Usage: ./apply-prompt-versioning.sh [local|production]

set -e

ENV=${1:-local}

echo "🚀 Applying prompt versioning schema to $ENV database..."

if [ "$ENV" == "local" ]; then
  DB_HOST="localhost"
  DB_USER="root"
  DB_PASS="root"
  DB_NAME="classreflect"
else
  # Production credentials from environment or AWS Secrets Manager
  DB_HOST="gdwd.cluster-cjjl7f5jormj.eu-west-2.rds.amazonaws.com"
  DB_USER="gdwd"
  echo "Enter production database password:"
  read -s DB_PASS
  DB_NAME="classreflect"
fi

# Create backup first
echo "📦 Creating database backup..."
BACKUP_FILE="backup-before-prompts-$(date +%Y%m%d-%H%M%S).sql"
mysqldump -h "$DB_HOST" -u "$DB_USER" -p"$DB_PASS" "$DB_NAME" > "$BACKUP_FILE"
echo "✅ Backup saved to $BACKUP_FILE"

# Apply prompt versioning schema
echo "🔧 Creating prompts tables..."
mysql -h "$DB_HOST" -u "$DB_USER" -p"$DB_PASS" "$DB_NAME" < ../../database/schema-prompt-versioning.sql

# Apply template-specific prompt assignments
echo "🔧 Adding template prompt assignments..."
mysql -h "$DB_HOST" -u "$DB_USER" -p"$DB_PASS" "$DB_NAME" < ../../database/schema-template-prompts.sql

echo "✅ Prompt versioning schema applied successfully!"

# Verify the changes
echo "📊 Verifying schema changes..."
mysql -h "$DB_HOST" -u "$DB_USER" -p"$DB_PASS" "$DB_NAME" -e "
  SELECT 'Prompts table:' as status;
  DESCRIBE prompts;
  SELECT '';
  SELECT 'Prompt history table:' as status;
  DESCRIBE prompt_history;
  SELECT '';
  SELECT 'Template columns:' as status;
  SHOW COLUMNS FROM analysis_templates LIKE '%prompt_id';
  SELECT '';
  SELECT 'Active prompts:' as status;
  SELECT provider, name, version, is_active FROM prompts WHERE is_active = TRUE;
"

echo "
✅ Schema migration complete!

Next steps:
1. Test the prompt management API: curl http://localhost:3001/api/prompts/stats
2. Access the prompt management UI in the super admin panel
3. Create new prompt versions via the API or UI
4. Assign specific prompts to templates as needed
"