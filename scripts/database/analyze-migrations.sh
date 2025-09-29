#!/bin/bash

# Migration Analysis Tool
# Analyzes existing migration files against database schema
# Usage: ./analyze-migrations.sh

set -e

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

echo -e "${BLUE}================================${NC}"
echo -e "${BLUE}Migration Analysis Tool${NC}"
echo -e "${BLUE}================================${NC}\n"

# Configuration
LOCAL_HOST="localhost"
LOCAL_USER="root"
LOCAL_PASS="root"
LOCAL_DB="classreflect"
MIGRATION_DIR="../../database"

# Create analysis directory
ANALYSIS_DIR="./migration-analysis-$(date +%Y%m%d-%H%M%S)"
mkdir -p "$ANALYSIS_DIR"

echo -e "${YELLOW}Analysis directory: $ANALYSIS_DIR${NC}\n"

# Step 1: List all migration files
echo -e "${BLUE}Finding migration files...${NC}"
find "$MIGRATION_DIR" -name "*.sql" -type f | sort > "$ANALYSIS_DIR/migration-files.txt"

echo -e "${GREEN}Found $(wc -l < "$ANALYSIS_DIR/migration-files.txt") SQL files${NC}"
echo ""

# Step 2: Categorize migration files
echo -e "${BLUE}Categorizing migration files...${NC}"

# Schema files
grep -E "(schema|structure)" "$ANALYSIS_DIR/migration-files.txt" > "$ANALYSIS_DIR/schema-files.txt" 2>/dev/null || true

# Add/Create migrations
grep -E "(add-|create-)" "$ANALYSIS_DIR/migration-files.txt" > "$ANALYSIS_DIR/add-create-files.txt" 2>/dev/null || true

# Fix/Update migrations
grep -E "(fix-|update-|cleanup)" "$ANALYSIS_DIR/migration-files.txt" > "$ANALYSIS_DIR/fix-update-files.txt" 2>/dev/null || true

# Backup files
grep -E "(backup|dump)" "$ANALYSIS_DIR/migration-files.txt" > "$ANALYSIS_DIR/backup-files.txt" 2>/dev/null || true

echo "Schema files: $(wc -l < "$ANALYSIS_DIR/schema-files.txt")"
echo "Add/Create files: $(wc -l < "$ANALYSIS_DIR/add-create-files.txt")"
echo "Fix/Update files: $(wc -l < "$ANALYSIS_DIR/fix-update-files.txt")"
echo "Backup files: $(wc -l < "$ANALYSIS_DIR/backup-files.txt")"
echo ""

# Step 3: Extract table operations from migration files
echo -e "${BLUE}Analyzing table operations in migration files...${NC}"

> "$ANALYSIS_DIR/table-operations.txt"

while IFS= read -r file; do
    filename=$(basename "$file")

    # Skip backup files
    if [[ "$filename" =~ backup ]]; then
        continue
    fi

    echo "File: $filename" >> "$ANALYSIS_DIR/table-operations.txt"

    # Extract CREATE TABLE statements
    grep -i "CREATE TABLE" "$file" 2>/dev/null | sed 's/.*CREATE TABLE.*`\([^`]*\)`.*/  CREATE: \1/' >> "$ANALYSIS_DIR/table-operations.txt" || true

    # Extract ALTER TABLE statements
    grep -i "ALTER TABLE" "$file" 2>/dev/null | sed 's/.*ALTER TABLE.*`\([^`]*\)`.*/  ALTER: \1/' >> "$ANALYSIS_DIR/table-operations.txt" || true

    # Extract DROP TABLE statements
    grep -i "DROP TABLE" "$file" 2>/dev/null | sed 's/.*DROP TABLE.*`\([^`]*\)`.*/  DROP: \1/' >> "$ANALYSIS_DIR/table-operations.txt" || true

    echo "" >> "$ANALYSIS_DIR/table-operations.txt"
done < "$ANALYSIS_DIR/migration-files.txt"

echo -e "${GREEN}✓ Table operations analyzed${NC}\n"

# Step 4: Get current database tables
echo -e "${BLUE}Getting current database tables...${NC}"

mysql -h "$LOCAL_HOST" -u "$LOCAL_USER" -p"$LOCAL_PASS" "$LOCAL_DB" \
    -e "SHOW TABLES" 2>/dev/null | tail -n +2 | sort > "$ANALYSIS_DIR/current-tables.txt"

echo -e "${GREEN}✓ Found $(wc -l < "$ANALYSIS_DIR/current-tables.txt") tables in database${NC}\n"

# Step 5: Check which migrations might be missing
echo -e "${BLUE}Checking for potentially unapplied migrations...${NC}"

> "$ANALYSIS_DIR/migration-check.txt"

while IFS= read -r file; do
    filename=$(basename "$file")

    # Skip backups and certain files
    if [[ "$filename" =~ (backup|dump|test|example) ]]; then
        continue
    fi

    # For each CREATE TABLE in migration files
    while IFS= read -r table; do
        table=$(echo "$table" | sed 's/.*`\([^`]*\)`.*/\1/')
        if [ ! -z "$table" ]; then
            # Check if table exists in current database
            if ! grep -q "^${table}$" "$ANALYSIS_DIR/current-tables.txt"; then
                echo "❌ Table '$table' from $filename not found in database" >> "$ANALYSIS_DIR/migration-check.txt"
            fi
        fi
    done < <(grep -i "CREATE TABLE" "$file" 2>/dev/null || true)

done < "$ANALYSIS_DIR/migration-files.txt"

if [ -s "$ANALYSIS_DIR/migration-check.txt" ]; then
    echo -e "${YELLOW}⚠ Potential missing migrations detected:${NC}"
    cat "$ANALYSIS_DIR/migration-check.txt"
else
    echo -e "${GREEN}✓ All CREATE TABLE migrations appear to be applied${NC}"
fi
echo ""

# Step 6: Create migration order suggestion
echo -e "${BLUE}Suggested migration order...${NC}"

> "$ANALYSIS_DIR/suggested-order.txt"

# First: main schema files
echo "# 1. Main Schema Files" >> "$ANALYSIS_DIR/suggested-order.txt"
cat "$ANALYSIS_DIR/schema-files.txt" >> "$ANALYSIS_DIR/suggested-order.txt" 2>/dev/null || true
echo "" >> "$ANALYSIS_DIR/suggested-order.txt"

# Second: create/add files (in date order if dates in filename)
echo "# 2. Create/Add Operations" >> "$ANALYSIS_DIR/suggested-order.txt"
cat "$ANALYSIS_DIR/add-create-files.txt" | sort >> "$ANALYSIS_DIR/suggested-order.txt" 2>/dev/null || true
echo "" >> "$ANALYSIS_DIR/suggested-order.txt"

# Third: fix/update files
echo "# 3. Fix/Update Operations" >> "$ANALYSIS_DIR/suggested-order.txt"
cat "$ANALYSIS_DIR/fix-update-files.txt" | sort >> "$ANALYSIS_DIR/suggested-order.txt" 2>/dev/null || true

echo -e "${GREEN}✓ Suggested order saved to $ANALYSIS_DIR/suggested-order.txt${NC}\n"

# Step 7: Create consolidated migration script
echo -e "${BLUE}Creating consolidated migration script...${NC}"

> "$ANALYSIS_DIR/consolidated-migrations.sql"

echo "-- Consolidated Migration Script" >> "$ANALYSIS_DIR/consolidated-migrations.sql"
echo "-- Generated: $(date)" >> "$ANALYSIS_DIR/consolidated-migrations.sql"
echo "-- REVIEW BEFORE RUNNING!" >> "$ANALYSIS_DIR/consolidated-migrations.sql"
echo "" >> "$ANALYSIS_DIR/consolidated-migrations.sql"

# Add migration tracking table if it doesn't exist
echo "-- Create migration tracking table if needed" >> "$ANALYSIS_DIR/consolidated-migrations.sql"
echo "CREATE TABLE IF NOT EXISTS migration_history (" >> "$ANALYSIS_DIR/consolidated-migrations.sql"
echo "  id INT AUTO_INCREMENT PRIMARY KEY," >> "$ANALYSIS_DIR/consolidated-migrations.sql"
echo "  filename VARCHAR(255) NOT NULL," >> "$ANALYSIS_DIR/consolidated-migrations.sql"
echo "  applied_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP," >> "$ANALYSIS_DIR/consolidated-migrations.sql"
echo "  checksum VARCHAR(32)," >> "$ANALYSIS_DIR/consolidated-migrations.sql"
echo "  UNIQUE KEY unique_migration (filename)" >> "$ANALYSIS_DIR/consolidated-migrations.sql"
echo ");" >> "$ANALYSIS_DIR/consolidated-migrations.sql"
echo "" >> "$ANALYSIS_DIR/consolidated-migrations.sql"

echo -e "${GREEN}✓ Consolidated script created${NC}\n"

# Final Report
echo -e "${BLUE}================================${NC}"
echo -e "${BLUE}Analysis Summary${NC}"
echo -e "${BLUE}================================${NC}\n"

echo "📁 Migration Files: $(wc -l < "$ANALYSIS_DIR/migration-files.txt")"
echo "📊 Current Tables: $(wc -l < "$ANALYSIS_DIR/current-tables.txt")"
echo ""
echo -e "${GREEN}Reports generated in: $ANALYSIS_DIR/${NC}"
echo "  - migration-files.txt: All SQL files found"
echo "  - table-operations.txt: Table operations per file"
echo "  - current-tables.txt: Tables in current database"
echo "  - migration-check.txt: Potential missing migrations"
echo "  - suggested-order.txt: Recommended migration order"
echo "  - consolidated-migrations.sql: Combined migration script"
echo ""
echo -e "${YELLOW}⚠ Next steps:${NC}"
echo "  1. Review migration-check.txt for missing migrations"
echo "  2. Check suggested-order.txt for proper sequence"
echo "  3. Test migrations on a copy of the database first"