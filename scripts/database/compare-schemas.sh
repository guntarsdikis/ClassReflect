#!/bin/bash

# Database Schema Comparison Tool
# Compares local and production MySQL database schemas to identify differences
# Usage: ./compare-schemas.sh

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${BLUE}================================${NC}"
echo -e "${BLUE}Database Schema Comparison Tool${NC}"
echo -e "${BLUE}================================${NC}\n"

# Configuration
LOCAL_HOST="localhost"
LOCAL_USER="root"
LOCAL_PASS="root"
LOCAL_DB="classreflect"

# Production database (you'll need AWS credentials configured)
PROD_HOST="gdwd.cluster-cjjl7f5jormj.eu-west-2.rds.amazonaws.com"
PROD_USER="gdwd"
PROD_DB="classreflect"

# Output directory
OUTPUT_DIR="./schema-comparison-$(date +%Y%m%d-%H%M%S)"
mkdir -p "$OUTPUT_DIR"

echo -e "${YELLOW}Output directory: $OUTPUT_DIR${NC}\n"

# Function to dump schema
dump_schema() {
    local host=$1
    local user=$2
    local pass=$3
    local db=$4
    local output_file=$5
    local label=$6

    echo -e "${BLUE}Dumping schema from $label...${NC}"

    if [ "$pass" == "prompt" ]; then
        echo "Enter password for $user@$host:"
        mysqldump -h "$host" -u "$user" -p "$db" \
            --no-data \
            --skip-comments \
            --skip-extended-insert \
            --skip-set-charset \
            --skip-add-drop-table \
            --skip-add-locks \
            --skip-disable-keys \
            --compact \
            2>/dev/null > "$output_file.raw" || {
            echo -e "${RED}Failed to connect to $label database${NC}"
            return 1
        }
    else
        mysqldump -h "$host" -u "$user" -p"$pass" "$db" \
            --no-data \
            --skip-comments \
            --skip-extended-insert \
            --skip-set-charset \
            --skip-add-drop-table \
            --skip-add-locks \
            --skip-disable-keys \
            --compact \
            2>/dev/null > "$output_file.raw" || {
            echo -e "${RED}Failed to connect to $label database${NC}"
            return 1
        }
    fi

    # Normalize the schema dump
    cat "$output_file.raw" | \
        sed 's/AUTO_INCREMENT=[0-9]*/AUTO_INCREMENT=XXX/g' | \
        sed 's/DEFINER=`[^`]*`@`[^`]*`//g' | \
        sed 's/\/\*[^*]*\*\///g' | \
        sed '/^$/d' | \
        sort > "$output_file"

    rm "$output_file.raw"
    echo -e "${GREEN}✓ Schema dumped to $output_file${NC}\n"
}

# Function to get detailed table information
get_table_info() {
    local host=$1
    local user=$2
    local pass=$3
    local db=$4
    local output_file=$5
    local label=$6

    echo -e "${BLUE}Getting detailed table info from $label...${NC}"

    local mysql_cmd
    if [ "$pass" == "prompt" ]; then
        echo "Enter password for $user@$host:"
        mysql_cmd="mysql -h $host -u $user -p $db"
    else
        mysql_cmd="mysql -h $host -u $user -p$pass $db"
    fi

    # Get all tables with their details
    $mysql_cmd -e "
    SELECT
        TABLE_NAME,
        TABLE_ROWS,
        DATA_LENGTH,
        INDEX_LENGTH,
        CREATE_TIME,
        UPDATE_TIME,
        TABLE_COMMENT
    FROM information_schema.TABLES
    WHERE TABLE_SCHEMA = '$db'
    ORDER BY TABLE_NAME;" 2>/dev/null > "$output_file" || {
        echo -e "${RED}Failed to get table info from $label${NC}"
        return 1
    }

    echo -e "${GREEN}✓ Table info saved to $output_file${NC}\n"
}

# Function to get column details
get_column_info() {
    local host=$1
    local user=$2
    local pass=$3
    local db=$4
    local output_file=$5
    local label=$6

    echo -e "${BLUE}Getting column details from $label...${NC}"

    local mysql_cmd
    if [ "$pass" == "prompt" ]; then
        mysql_cmd="mysql -h $host -u $user -p $db"
    else
        mysql_cmd="mysql -h $host -u $user -p$pass $db"
    fi

    $mysql_cmd -e "
    SELECT
        TABLE_NAME,
        COLUMN_NAME,
        COLUMN_TYPE,
        IS_NULLABLE,
        COLUMN_DEFAULT,
        COLUMN_KEY,
        EXTRA,
        COLUMN_COMMENT
    FROM information_schema.COLUMNS
    WHERE TABLE_SCHEMA = '$db'
    ORDER BY TABLE_NAME, ORDINAL_POSITION;" 2>/dev/null > "$output_file" || {
        echo -e "${RED}Failed to get column info from $label${NC}"
        return 1
    }

    echo -e "${GREEN}✓ Column info saved to $output_file${NC}\n"
}

# Step 1: Dump local schema
dump_schema "$LOCAL_HOST" "$LOCAL_USER" "$LOCAL_PASS" "$LOCAL_DB" "$OUTPUT_DIR/local-schema.sql" "LOCAL"
get_table_info "$LOCAL_HOST" "$LOCAL_USER" "$LOCAL_PASS" "$LOCAL_DB" "$OUTPUT_DIR/local-tables.txt" "LOCAL"
get_column_info "$LOCAL_HOST" "$LOCAL_USER" "$LOCAL_PASS" "$LOCAL_DB" "$OUTPUT_DIR/local-columns.txt" "LOCAL"

# Step 2: Dump production schema (will prompt for password)
echo -e "${YELLOW}Connecting to production database...${NC}"
echo -e "${YELLOW}You'll be prompted for the production database password${NC}"
dump_schema "$PROD_HOST" "$PROD_USER" "prompt" "$PROD_DB" "$OUTPUT_DIR/prod-schema.sql" "PRODUCTION"
get_table_info "$PROD_HOST" "$PROD_USER" "prompt" "$PROD_DB" "$OUTPUT_DIR/prod-tables.txt" "PRODUCTION"
get_column_info "$PROD_HOST" "$PROD_USER" "prompt" "$PROD_DB" "$OUTPUT_DIR/prod-columns.txt" "PRODUCTION"

# Step 3: Compare schemas
echo -e "${BLUE}================================${NC}"
echo -e "${BLUE}Comparing Schemas...${NC}"
echo -e "${BLUE}================================${NC}\n"

# Create diff file
diff -u "$OUTPUT_DIR/local-schema.sql" "$OUTPUT_DIR/prod-schema.sql" > "$OUTPUT_DIR/schema-diff.txt" 2>&1 || true

# Analyze differences
if [ -s "$OUTPUT_DIR/schema-diff.txt" ]; then
    echo -e "${YELLOW}⚠ Schema differences found!${NC}"
    echo -e "${YELLOW}See $OUTPUT_DIR/schema-diff.txt for details${NC}\n"

    # Show summary of differences
    echo -e "${BLUE}Summary of differences:${NC}"

    # Count added/removed lines
    added=$(grep "^+" "$OUTPUT_DIR/schema-diff.txt" | grep -v "^+++" | wc -l)
    removed=$(grep "^-" "$OUTPUT_DIR/schema-diff.txt" | grep -v "^---" | wc -l)

    echo -e "  ${GREEN}+ Added in production: $added lines${NC}"
    echo -e "  ${RED}- Missing in production: $removed lines${NC}\n"

    # Show first few differences
    echo -e "${BLUE}First 20 differences:${NC}"
    grep "^[+-]" "$OUTPUT_DIR/schema-diff.txt" | grep -v "^[+-][+-][+-]" | head -20
else
    echo -e "${GREEN}✓ Schemas are identical!${NC}"
fi

# Step 4: Compare table lists
echo -e "\n${BLUE}================================${NC}"
echo -e "${BLUE}Comparing Tables...${NC}"
echo -e "${BLUE}================================${NC}\n"

# Extract table names
awk 'NR>1 {print $1}' "$OUTPUT_DIR/local-tables.txt" | sort | uniq > "$OUTPUT_DIR/local-table-names.txt"
awk 'NR>1 {print $1}' "$OUTPUT_DIR/prod-tables.txt" | sort | uniq > "$OUTPUT_DIR/prod-table-names.txt"

# Find differences
comm -23 "$OUTPUT_DIR/local-table-names.txt" "$OUTPUT_DIR/prod-table-names.txt" > "$OUTPUT_DIR/tables-only-in-local.txt"
comm -13 "$OUTPUT_DIR/local-table-names.txt" "$OUTPUT_DIR/prod-table-names.txt" > "$OUTPUT_DIR/tables-only-in-prod.txt"

if [ -s "$OUTPUT_DIR/tables-only-in-local.txt" ]; then
    echo -e "${YELLOW}Tables only in LOCAL:${NC}"
    cat "$OUTPUT_DIR/tables-only-in-local.txt" | sed 's/^/  - /'
    echo ""
fi

if [ -s "$OUTPUT_DIR/tables-only-in-prod.txt" ]; then
    echo -e "${YELLOW}Tables only in PRODUCTION:${NC}"
    cat "$OUTPUT_DIR/tables-only-in-prod.txt" | sed 's/^/  - /'
    echo ""
fi

if [ ! -s "$OUTPUT_DIR/tables-only-in-local.txt" ] && [ ! -s "$OUTPUT_DIR/tables-only-in-prod.txt" ]; then
    echo -e "${GREEN}✓ Same tables in both databases${NC}"
fi

# Step 5: Generate migration suggestions
echo -e "\n${BLUE}================================${NC}"
echo -e "${BLUE}Migration Suggestions${NC}"
echo -e "${BLUE}================================${NC}\n"

echo "-- Migration script to sync production with local" > "$OUTPUT_DIR/suggested-migrations.sql"
echo "-- Generated on $(date)" >> "$OUTPUT_DIR/suggested-migrations.sql"
echo "-- REVIEW CAREFULLY BEFORE APPLYING!" >> "$OUTPUT_DIR/suggested-migrations.sql"
echo "" >> "$OUTPUT_DIR/suggested-migrations.sql"

if [ -s "$OUTPUT_DIR/tables-only-in-local.txt" ]; then
    echo "-- Tables to add to production:" >> "$OUTPUT_DIR/suggested-migrations.sql"
    while IFS= read -r table; do
        echo -e "${YELLOW}  → Generating CREATE TABLE for: $table${NC}"
        mysql -h "$LOCAL_HOST" -u "$LOCAL_USER" -p"$LOCAL_PASS" "$LOCAL_DB" \
            -e "SHOW CREATE TABLE $table\G" 2>/dev/null | \
            grep -v "^\*\*\*" | \
            sed 's/Create Table://' >> "$OUTPUT_DIR/suggested-migrations.sql"
        echo ";" >> "$OUTPUT_DIR/suggested-migrations.sql"
        echo "" >> "$OUTPUT_DIR/suggested-migrations.sql"
    done < "$OUTPUT_DIR/tables-only-in-local.txt"
fi

echo -e "${GREEN}✓ Migration suggestions saved to $OUTPUT_DIR/suggested-migrations.sql${NC}"

# Step 6: Check for migration tracking
echo -e "\n${BLUE}================================${NC}"
echo -e "${BLUE}Migration Tracking Check${NC}"
echo -e "${BLUE}================================${NC}\n"

# Check if there's a migrations table
for table_name in "migrations" "schema_migrations" "migration_history"; do
    if mysql -h "$LOCAL_HOST" -u "$LOCAL_USER" -p"$LOCAL_PASS" "$LOCAL_DB" \
        -e "SHOW TABLES LIKE '$table_name'" 2>/dev/null | grep -q "$table_name"; then
        echo -e "${GREEN}✓ Found migration tracking table: $table_name${NC}"

        # Get migration history
        mysql -h "$LOCAL_HOST" -u "$LOCAL_USER" -p"$LOCAL_PASS" "$LOCAL_DB" \
            -e "SELECT * FROM $table_name ORDER BY 1 DESC LIMIT 10" 2>/dev/null > "$OUTPUT_DIR/migration-history.txt"
        echo -e "  Recent migrations saved to $OUTPUT_DIR/migration-history.txt"
        break
    fi
done

# Final summary
echo -e "\n${BLUE}================================${NC}"
echo -e "${BLUE}Summary Report${NC}"
echo -e "${BLUE}================================${NC}\n"

echo -e "${GREEN}Analysis complete!${NC}"
echo -e "\nFiles generated in ${YELLOW}$OUTPUT_DIR/${NC}:"
echo "  - local-schema.sql: Local database schema"
echo "  - prod-schema.sql: Production database schema"
echo "  - schema-diff.txt: Detailed differences"
echo "  - suggested-migrations.sql: Migration script suggestions"
echo "  - local-tables.txt: Local table details"
echo "  - prod-tables.txt: Production table details"
echo ""
echo -e "${YELLOW}⚠ Important: Review suggested-migrations.sql carefully before applying!${NC}"
echo -e "${YELLOW}⚠ Always backup production database before applying migrations!${NC}"