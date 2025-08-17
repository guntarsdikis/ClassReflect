#!/bin/bash

# ClassReflect Database Setup Script
# Sets up Aurora MySQL database and stores credentials in AWS Secrets Manager

set -e

echo "Setting up ClassReflect database..."

# Configuration
REGION="eu-west-2"
DB_ENDPOINT="gdwd.cluster-cjjl7f5jormj.eu-west-2.rds.amazonaws.com"
DB_NAME="classreflect"
DB_USERNAME="classreflect_app"
SECRET_NAME="classreflect/database/credentials"

# Colors for output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

# Check if mysql client is installed
if ! command -v mysql &> /dev/null; then
    echo -e "${YELLOW}MySQL client not found. Installing...${NC}"
    if [[ "$OSTYPE" == "darwin"* ]]; then
        brew install mysql-client
        echo 'export PATH="/usr/local/opt/mysql-client/bin:$PATH"' >> ~/.zshrc
        export PATH="/usr/local/opt/mysql-client/bin:$PATH"
    else
        sudo apt-get update && sudo apt-get install -y mysql-client
    fi
fi

# Generate secure password
DB_PASSWORD=$(openssl rand -base64 32)
echo -e "${GREEN}Generated secure password for database user${NC}"

# Get master password (you'll need to input this)
echo -e "${YELLOW}Please enter the Aurora MySQL master password:${NC}"
read -s MASTER_PASSWORD

# Create database and user
echo -e "${GREEN}Creating database and user...${NC}"
mysql -h $DB_ENDPOINT -u admin -p$MASTER_PASSWORD << EOF
-- Create database
CREATE DATABASE IF NOT EXISTS $DB_NAME;

-- Create application user
CREATE USER IF NOT EXISTS '$DB_USERNAME'@'%' IDENTIFIED BY '$DB_PASSWORD';

-- Grant privileges
GRANT ALL PRIVILEGES ON $DB_NAME.* TO '$DB_USERNAME'@'%';
GRANT SELECT ON mysql.* TO '$DB_USERNAME'@'%';
FLUSH PRIVILEGES;

-- Show confirmation
SELECT User, Host FROM mysql.user WHERE User = '$DB_USERNAME';
SHOW DATABASES LIKE '$DB_NAME';
EOF

# Apply schema
echo -e "${GREEN}Applying database schema...${NC}"
mysql -h $DB_ENDPOINT -u $DB_USERNAME -p$DB_PASSWORD $DB_NAME < schema.sql

# Store credentials in AWS Secrets Manager
echo -e "${GREEN}Storing credentials in AWS Secrets Manager...${NC}"
SECRET_JSON=$(cat <<EOF
{
  "username": "$DB_USERNAME",
  "password": "$DB_PASSWORD",
  "engine": "mysql",
  "host": "$DB_ENDPOINT",
  "port": 3306,
  "dbname": "$DB_NAME"
}
EOF
)

# Create or update secret
if aws secretsmanager describe-secret --secret-id $SECRET_NAME --region $REGION 2>/dev/null; then
    echo "Updating existing secret..."
    aws secretsmanager update-secret \
        --secret-id $SECRET_NAME \
        --secret-string "$SECRET_JSON" \
        --region $REGION
else
    echo "Creating new secret..."
    aws secretsmanager create-secret \
        --name $SECRET_NAME \
        --description "ClassReflect database credentials" \
        --secret-string "$SECRET_JSON" \
        --region $REGION
fi

# Get secret ARN
SECRET_ARN=$(aws secretsmanager describe-secret --secret-id $SECRET_NAME --region $REGION --query 'ARN' --output text)

# Update IAM role to allow ECS tasks to read the secret
echo -e "${GREEN}Updating IAM permissions...${NC}"
aws iam put-role-policy \
    --role-name classreflect-ecs-execution-role \
    --policy-name classreflect-secrets-policy \
    --policy-document '{
        "Version": "2012-10-17",
        "Statement": [
            {
                "Effect": "Allow",
                "Action": [
                    "secretsmanager:GetSecretValue"
                ],
                "Resource": "'$SECRET_ARN'"
            }
        ]
    }'

# Output connection string for local testing
echo ""
echo -e "${GREEN}=========================================${NC}"
echo -e "${GREEN}Database setup completed successfully!${NC}"
echo -e "${GREEN}=========================================${NC}"
echo ""
echo "Database: $DB_NAME"
echo "Username: $DB_USERNAME"
echo "Host: $DB_ENDPOINT"
echo "Secret ARN: $SECRET_ARN"
echo ""
echo "Connection string for local testing:"
echo "mysql://$DB_USERNAME:***@$DB_ENDPOINT:3306/$DB_NAME"
echo ""
echo "To connect manually:"
echo "mysql -h $DB_ENDPOINT -u $DB_USERNAME -p$DB_PASSWORD $DB_NAME"
echo ""
echo -e "${YELLOW}Note: The password has been stored securely in AWS Secrets Manager${NC}"
echo -e "${YELLOW}Secret name: $SECRET_NAME${NC}"