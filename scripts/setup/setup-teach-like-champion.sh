#!/bin/bash

# Setup "Teach Like a Champion" Templates for ClassReflect
# This script adds the global templates to the analysis_templates table

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_DIR="$SCRIPT_DIR/../.."

echo "🏆 Setting up Teach Like a Champion templates..."

# Check if we're in development or production environment  
if [ -f "$PROJECT_DIR/backend/.env" ]; then
    echo "📍 Detected local development environment"
    
    # Load environment variables from backend/.env
    source "$PROJECT_DIR/backend/.env" 2>/dev/null || true
    
    # Use local MySQL connection
    DB_HOST=${DB_HOST:-localhost}
    DB_PORT=${DB_PORT:-3306}
    DB_NAME=${DB_NAME:-classreflect}
    DB_USER=${DB_USER:-root}
    DB_PASSWORD=${DB_PASSWORD:-root}
    
    mysql_cmd="mysql -h $DB_HOST --port=$DB_PORT -u $DB_USER -p$DB_PASSWORD $DB_NAME"
    
elif [ -n "$DATABASE_HOST" ]; then
    echo "📍 Detected production environment (AWS)"
    
    # Use production database (requires AWS credentials)
    mysql_cmd="mysql -h $DATABASE_HOST -u $DATABASE_USER -p$DATABASE_PASSWORD $DATABASE_NAME"
    
else
    echo "❌ No database configuration found"
    echo "   For local: Create backend/.env file with DB_* variables"
    echo "   For production: Set DATABASE_* environment variables"
    echo "   Current search paths: $PROJECT_DIR/backend/.env"
    exit 1
fi

# Test database connection
echo "🔌 Testing database connection..."
if ! echo "SELECT 1;" | eval "$mysql_cmd" > /dev/null 2>&1; then
    echo "❌ Failed to connect to database"
    echo "   Check your database credentials and ensure the database is running"
    exit 1
fi

echo "✅ Database connection successful"

# Check if analysis_templates table exists
echo "📋 Checking database schema..."
table_count=$(echo "SELECT COUNT(*) FROM information_schema.tables WHERE table_schema='$DB_NAME' AND table_name='analysis_templates';" | eval "$mysql_cmd -N" 2>/dev/null || echo "0")

if [ "$table_count" = "0" ]; then
    echo "❌ analysis_templates table not found"
    echo "   Run the database schema setup first:"
    echo "   mysql -h $DB_HOST --port=$DB_PORT -u $DB_USER -p$DB_PASSWORD $DB_NAME < database/schema-cognito.sql"
    exit 1
fi

echo "✅ Required tables found"

# Install the templates
echo "📝 Installing Teach Like a Champion templates..."

template_file="$PROJECT_DIR/database/teach_like_champion_template.sql"
if [ ! -f "$template_file" ]; then
    echo "❌ Template file not found: $template_file"
    exit 1
fi

# Execute the template installation
if eval "$mysql_cmd" < "$template_file"; then
    echo "✅ Templates installed successfully"
else
    echo "❌ Failed to install templates"
    exit 1
fi

# Verify installation
echo "🔍 Verifying template installation..."
template_count=$(echo "SELECT COUNT(*) FROM analysis_templates WHERE template_name LIKE '%Teach Like a Champion%';" | eval "$mysql_cmd -N")

if [ "$template_count" -gt "0" ]; then
    echo "✅ Found $template_count 'Teach Like a Champion' template(s)"
    
    # Show installed templates
    echo ""
    echo "📋 Installed templates:"
    echo "SELECT template_name, category, is_global FROM analysis_templates WHERE template_name LIKE '%Teach Like a Champion%';" | eval "$mysql_cmd"
else
    echo "❌ No templates found after installation"
    exit 1
fi

echo ""
echo "🎉 Setup completed successfully!"
echo ""
echo "📝 Next steps:"
echo "   1. Set your OpenAI API key: export OPENAI_API_KEY='your-key'"
echo "   2. Start the backend: cd backend && npm run dev"  
echo "   3. Test template selection in the upload wizard"
echo ""
echo "🎯 Templates available:"
echo "   - Teach Like a Champion - Complete Framework (all techniques)"
echo "   - Teach Like a Champion - Foundation (Tier 1 techniques only)"
echo ""
echo "📚 See docs/TeachLikeaChampion.md for complete framework documentation"