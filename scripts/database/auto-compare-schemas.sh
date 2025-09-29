#!/bin/bash

# Automated Database Schema Comparison Tool
# Compares local and production MySQL database schemas using AWS Secrets Manager
# No password prompts required!
# Usage: ./auto-compare-schemas.sh

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color

echo -e "${CYAN}╔════════════════════════════════════════╗${NC}"
echo -e "${CYAN}║   Automated Schema Comparison Tool     ║${NC}"
echo -e "${CYAN}╚════════════════════════════════════════╝${NC}\n"

# Configuration
LOCAL_HOST="127.0.0.1"
LOCAL_USER="root"
LOCAL_PASS="root"
LOCAL_DB="classreflect"

# Production database configuration
PROD_HOST="gdwd.cluster-cjjl7f5jormj.eu-west-2.rds.amazonaws.com"
PROD_USER="gdwd"
PROD_DB="classreflect"
AWS_REGION="eu-west-2"
SECRET_NAME="classreflect/database/credentials"

# Get production password from AWS Secrets Manager
echo -e "${BLUE}Retrieving production credentials from AWS Secrets Manager...${NC}"
PROD_PASS=$(aws secretsmanager get-secret-value \
    --secret-id "$SECRET_NAME" \
    --region "$AWS_REGION" \
    --query 'SecretString' \
    --output text 2>/dev/null | jq -r '.password' 2>/dev/null) || {
    echo -e "${RED}Failed to retrieve password from AWS Secrets Manager${NC}"
    echo -e "${YELLOW}Make sure you have AWS credentials configured${NC}"
    exit 1
}
echo -e "${GREEN}✓ Production credentials retrieved${NC}\n"

# Output directory
OUTPUT_DIR="./schema-comparison-$(date +%Y%m%d-%H%M%S)"
mkdir -p "$OUTPUT_DIR"

echo -e "${YELLOW}📁 Output directory: $OUTPUT_DIR${NC}\n"

# Test connections first
echo -e "${BLUE}Testing database connections...${NC}"
mysql -h "$LOCAL_HOST" -u "$LOCAL_USER" -p"$LOCAL_PASS" -e "SELECT 1" >/dev/null 2>&1 || {
    echo -e "${RED}❌ Cannot connect to local database${NC}"
    exit 1
}
echo -e "${GREEN}✓ Local database connected${NC}"

mysql -h "$PROD_HOST" -u "$PROD_USER" -p"$PROD_PASS" -e "SELECT 1" >/dev/null 2>&1 || {
    echo -e "${RED}❌ Cannot connect to production database${NC}"
    echo -e "${YELLOW}Check if your IP is allowed in the RDS security group${NC}"
    exit 1
}
echo -e "${GREEN}✓ Production database connected${NC}\n"

# Function to dump and normalize schema
dump_normalized_schema() {
    local host=$1
    local user=$2
    local pass=$3
    local db=$4
    local output_file=$5
    local label=$6

    echo -e "${BLUE}📥 Dumping schema from $label...${NC}"

    # Dump schema
    mysqldump -h "$host" -u "$user" -p"$pass" "$db" \
        --no-data \
        --skip-comments \
        --skip-extended-insert \
        --skip-set-charset \
        --skip-add-drop-table \
        --skip-add-locks \
        --skip-disable-keys \
        --compact \
        --single-transaction \
        2>/dev/null > "$output_file.raw"

    # Normalize the dump for comparison
    cat "$output_file.raw" | \
        sed 's/AUTO_INCREMENT=[0-9]*/AUTO_INCREMENT=XXX/g' | \
        sed 's/DEFINER=`[^`]*`@`[^`]*`//g' | \
        sed 's/\/\*![0-9]*//g' | \
        sed 's/\*\///g' | \
        sed '/^$/d' | \
        sed 's/[[:space:]]*$//' | \
        sort > "$output_file"

    rm "$output_file.raw"
    echo -e "${GREEN}✓ Schema exported${NC}"
}

# Function to get detailed analysis
get_detailed_analysis() {
    local host=$1
    local user=$2
    local pass=$3
    local db=$4
    local prefix=$5
    local label=$6

    echo -e "${BLUE}📊 Analyzing $label database structure...${NC}"

    # Get table count and sizes
    mysql -h "$host" -u "$user" -p"$pass" "$db" -N -B -e "
    SELECT
        COUNT(*) as table_count,
        ROUND(SUM(data_length + index_length) / 1024 / 1024, 2) as total_size_mb
    FROM information_schema.tables
    WHERE table_schema = '$db';" > "$OUTPUT_DIR/${prefix}-summary.txt" 2>/dev/null

    # Get table details
    mysql -h "$host" -u "$user" -p"$pass" "$db" -e "
    SELECT
        table_name AS 'Table',
        engine AS 'Engine',
        table_rows AS 'Rows',
        ROUND((data_length + index_length) / 1024 / 1024, 2) AS 'Size_MB',
        create_time AS 'Created',
        update_time AS 'Updated'
    FROM information_schema.tables
    WHERE table_schema = '$db'
    ORDER BY table_name;" > "$OUTPUT_DIR/${prefix}-tables.txt" 2>/dev/null

    # Get column count per table
    mysql -h "$host" -u "$user" -p"$pass" "$db" -e "
    SELECT
        table_name,
        COUNT(*) as column_count
    FROM information_schema.columns
    WHERE table_schema = '$db'
    GROUP BY table_name
    ORDER BY table_name;" > "$OUTPUT_DIR/${prefix}-columns.txt" 2>/dev/null

    # Get index information
    mysql -h "$host" -u "$user" -p"$pass" "$db" -e "
    SELECT
        table_name,
        index_name,
        GROUP_CONCAT(column_name ORDER BY seq_in_index) as columns,
        index_type,
        non_unique
    FROM information_schema.statistics
    WHERE table_schema = '$db'
    GROUP BY table_name, index_name
    ORDER BY table_name, index_name;" > "$OUTPUT_DIR/${prefix}-indexes.txt" 2>/dev/null

    # Get foreign keys
    mysql -h "$host" -u "$user" -p"$pass" "$db" -e "
    SELECT
        constraint_name,
        table_name,
        column_name,
        referenced_table_name,
        referenced_column_name
    FROM information_schema.key_column_usage
    WHERE table_schema = '$db'
        AND referenced_table_name IS NOT NULL
    ORDER BY table_name;" > "$OUTPUT_DIR/${prefix}-foreign-keys.txt" 2>/dev/null

    echo -e "${GREEN}✓ Analysis complete${NC}"
}

# Step 1: Dump and analyze both databases
dump_normalized_schema "$LOCAL_HOST" "$LOCAL_USER" "$LOCAL_PASS" "$LOCAL_DB" "$OUTPUT_DIR/local-schema.sql" "LOCAL"
get_detailed_analysis "$LOCAL_HOST" "$LOCAL_USER" "$LOCAL_PASS" "$LOCAL_DB" "local" "LOCAL"

echo ""
dump_normalized_schema "$PROD_HOST" "$PROD_USER" "$PROD_PASS" "$PROD_DB" "$OUTPUT_DIR/prod-schema.sql" "PRODUCTION"
get_detailed_analysis "$PROD_HOST" "$PROD_USER" "$PROD_PASS" "$PROD_DB" "prod" "PRODUCTION"

# Step 2: Compare schemas
echo -e "\n${CYAN}═══════════════════════════════════${NC}"
echo -e "${CYAN}      Schema Comparison Results${NC}"
echo -e "${CYAN}═══════════════════════════════════${NC}\n"

# Create unified diff
diff -u "$OUTPUT_DIR/local-schema.sql" "$OUTPUT_DIR/prod-schema.sql" > "$OUTPUT_DIR/schema-diff.txt" 2>&1 || true

# Extract table names
grep "CREATE TABLE" "$OUTPUT_DIR/local-schema.sql" | sed 's/.*CREATE TABLE `\([^`]*\)`.*/\1/' | sort > "$OUTPUT_DIR/local-tables.list"
grep "CREATE TABLE" "$OUTPUT_DIR/prod-schema.sql" | sed 's/.*CREATE TABLE `\([^`]*\)`.*/\1/' | sort > "$OUTPUT_DIR/prod-tables.list"

# Find differences
comm -23 "$OUTPUT_DIR/local-tables.list" "$OUTPUT_DIR/prod-tables.list" > "$OUTPUT_DIR/tables-only-local.list"
comm -13 "$OUTPUT_DIR/local-tables.list" "$OUTPUT_DIR/prod-tables.list" > "$OUTPUT_DIR/tables-only-prod.list"
comm -12 "$OUTPUT_DIR/local-tables.list" "$OUTPUT_DIR/prod-tables.list" > "$OUTPUT_DIR/tables-common.list"

# Display results
echo -e "${BLUE}📊 Database Summary:${NC}"
echo -e "  Local tables:      $(wc -l < "$OUTPUT_DIR/local-tables.list")"
echo -e "  Production tables: $(wc -l < "$OUTPUT_DIR/prod-tables.list")"
echo -e "  Common tables:     $(wc -l < "$OUTPUT_DIR/tables-common.list")"
echo ""

if [ -s "$OUTPUT_DIR/tables-only-local.list" ]; then
    echo -e "${YELLOW}⚠ Tables only in LOCAL (missing in production):${NC}"
    while IFS= read -r table; do
        echo -e "  ${RED}✗${NC} $table"
    done < "$OUTPUT_DIR/tables-only-local.list"
    echo ""
fi

if [ -s "$OUTPUT_DIR/tables-only-prod.list" ]; then
    echo -e "${YELLOW}⚠ Tables only in PRODUCTION (not in local):${NC}"
    while IFS= read -r table; do
        echo -e "  ${CYAN}+${NC} $table"
    done < "$OUTPUT_DIR/tables-only-prod.list"
    echo ""
fi

# Check for structural differences in common tables
echo -e "${BLUE}🔍 Checking structural differences in common tables...${NC}"

> "$OUTPUT_DIR/table-differences.txt"
while IFS= read -r table; do
    # Extract table definition from both schemas
    sed -n "/CREATE TABLE \`$table\`/,/;/p" "$OUTPUT_DIR/local-schema.sql" > "$OUTPUT_DIR/tmp-local-$table.sql"
    sed -n "/CREATE TABLE \`$table\`/,/;/p" "$OUTPUT_DIR/prod-schema.sql" > "$OUTPUT_DIR/tmp-prod-$table.sql"

    if ! diff -q "$OUTPUT_DIR/tmp-local-$table.sql" "$OUTPUT_DIR/tmp-prod-$table.sql" >/dev/null 2>&1; then
        echo "  ${YELLOW}≠${NC} $table has structural differences"
        echo "Table: $table" >> "$OUTPUT_DIR/table-differences.txt"
        diff -u "$OUTPUT_DIR/tmp-local-$table.sql" "$OUTPUT_DIR/tmp-prod-$table.sql" >> "$OUTPUT_DIR/table-differences.txt" 2>&1 || true
        echo "" >> "$OUTPUT_DIR/table-differences.txt"
    fi

    rm -f "$OUTPUT_DIR/tmp-local-$table.sql" "$OUTPUT_DIR/tmp-prod-$table.sql"
done < "$OUTPUT_DIR/tables-common.list"

if [ ! -s "$OUTPUT_DIR/table-differences.txt" ]; then
    echo -e "${GREEN}✓ All common tables have identical structure${NC}"
fi
echo ""

# Step 3: Generate migration SQL
echo -e "${BLUE}🔧 Generating migration SQL...${NC}"

> "$OUTPUT_DIR/migrate-to-production.sql"
echo "-- Migration script to sync production with local" >> "$OUTPUT_DIR/migrate-to-production.sql"
echo "-- Generated: $(date)" >> "$OUTPUT_DIR/migrate-to-production.sql"
echo "-- ⚠️  REVIEW CAREFULLY BEFORE APPLYING!" >> "$OUTPUT_DIR/migrate-to-production.sql"
echo "" >> "$OUTPUT_DIR/migrate-to-production.sql"

if [ -s "$OUTPUT_DIR/tables-only-local.list" ]; then
    echo "-- ════════════════════════════════════════" >> "$OUTPUT_DIR/migrate-to-production.sql"
    echo "-- Tables to CREATE in production" >> "$OUTPUT_DIR/migrate-to-production.sql"
    echo "-- ════════════════════════════════════════" >> "$OUTPUT_DIR/migrate-to-production.sql"
    echo "" >> "$OUTPUT_DIR/migrate-to-production.sql"

    while IFS= read -r table; do
        echo "-- Creating table: $table" >> "$OUTPUT_DIR/migrate-to-production.sql"
        mysqldump -h "$LOCAL_HOST" -u "$LOCAL_USER" -p"$LOCAL_PASS" "$LOCAL_DB" \
            --no-data --skip-comments --compact "$table" 2>/dev/null >> "$OUTPUT_DIR/migrate-to-production.sql"
        echo "" >> "$OUTPUT_DIR/migrate-to-production.sql"
    done < "$OUTPUT_DIR/tables-only-local.list"
fi

echo -e "${GREEN}✓ Migration script generated${NC}\n"

# Step 4: Check for recent migrations
echo -e "${BLUE}📅 Checking recent database activity...${NC}"

# Check if migration_history table exists
if mysql -h "$PROD_HOST" -u "$PROD_USER" -p"$PROD_PASS" "$PROD_DB" \
    -e "SHOW TABLES LIKE 'migration_history'" 2>/dev/null | grep -q "migration_history"; then
    echo -e "${GREEN}✓ Found migration_history table${NC}"

    mysql -h "$PROD_HOST" -u "$PROD_USER" -p"$PROD_PASS" "$PROD_DB" \
        -e "SELECT * FROM migration_history ORDER BY applied_at DESC LIMIT 5" > "$OUTPUT_DIR/recent-migrations.txt" 2>/dev/null
    echo "  Recent migrations saved to recent-migrations.txt"
else
    echo -e "${YELLOW}⚠ No migration_history table found${NC}"
    echo "  Consider implementing migration tracking"
fi
echo ""

# Final Report
echo -e "${CYAN}═══════════════════════════════════${NC}"
echo -e "${CYAN}         Analysis Complete${NC}"
echo -e "${CYAN}═══════════════════════════════════${NC}\n"

# Create summary report
{
    echo "DATABASE COMPARISON REPORT"
    echo "=========================="
    echo "Generated: $(date)"
    echo ""
    echo "SUMMARY"
    echo "-------"
    echo "Local Database: $LOCAL_DB@$LOCAL_HOST"
    echo "Production Database: $PROD_DB@$PROD_HOST"
    echo ""
    echo "Tables in Local: $(wc -l < "$OUTPUT_DIR/local-tables.list")"
    echo "Tables in Production: $(wc -l < "$OUTPUT_DIR/prod-tables.list")"
    echo ""

    if [ -s "$OUTPUT_DIR/tables-only-local.list" ]; then
        echo "TABLES MISSING IN PRODUCTION"
        echo "----------------------------"
        cat "$OUTPUT_DIR/tables-only-local.list"
        echo ""
    fi

    if [ -s "$OUTPUT_DIR/tables-only-prod.list" ]; then
        echo "TABLES ONLY IN PRODUCTION"
        echo "------------------------"
        cat "$OUTPUT_DIR/tables-only-prod.list"
        echo ""
    fi

    if [ -s "$OUTPUT_DIR/table-differences.txt" ]; then
        echo "STRUCTURAL DIFFERENCES"
        echo "---------------------"
        grep "^Table:" "$OUTPUT_DIR/table-differences.txt" | sed 's/Table: /  - /'
        echo ""
    fi

    echo "FILES GENERATED"
    echo "--------------"
    echo "  schema-diff.txt         - Full unified diff"
    echo "  migrate-to-production.sql - Migration script"
    echo "  local-*.txt            - Local database analysis"
    echo "  prod-*.txt             - Production database analysis"

} > "$OUTPUT_DIR/REPORT.txt"

echo -e "${GREEN}✅ Analysis complete!${NC}"
echo ""
echo -e "📁 All files saved to: ${YELLOW}$OUTPUT_DIR/${NC}"
echo ""
echo -e "Key files:"
echo -e "  • ${CYAN}REPORT.txt${NC} - Summary report"
echo -e "  • ${CYAN}migrate-to-production.sql${NC} - Migration script"
echo -e "  • ${CYAN}schema-diff.txt${NC} - Detailed differences"
echo ""

if [ -s "$OUTPUT_DIR/tables-only-local.list" ]; then
    echo -e "${YELLOW}⚠️  Action required: Review and apply migrate-to-production.sql to sync databases${NC}"
fi

echo -e "${BLUE}Run 'cat $OUTPUT_DIR/REPORT.txt' to see the summary${NC}"