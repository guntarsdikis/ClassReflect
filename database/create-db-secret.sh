#!/bin/bash

# Create database credentials in AWS Secrets Manager
# This script creates a secret with placeholder values that you'll need to update

set -e

echo "Creating database credentials in AWS Secrets Manager..."

REGION="eu-west-2"
SECRET_NAME="classreflect/database/credentials"

# Create secret with placeholder values
SECRET_JSON=$(cat <<EOF
{
  "username": "classreflect_app",
  "password": "CHANGE_THIS_PASSWORD",
  "engine": "mysql",
  "host": "gdwd.cluster-cjjl7f5jormj.eu-west-2.rds.amazonaws.com",
  "port": 3306,
  "dbname": "classreflect"
}
EOF
)

# Create the secret
aws secretsmanager create-secret \
    --name $SECRET_NAME \
    --description "ClassReflect database credentials" \
    --secret-string "$SECRET_JSON" \
    --region $REGION 2>/dev/null || \
aws secretsmanager update-secret \
    --secret-id $SECRET_NAME \
    --secret-string "$SECRET_JSON" \
    --region $REGION

# Get secret ARN
SECRET_ARN=$(aws secretsmanager describe-secret --secret-id $SECRET_NAME --region $REGION --query 'ARN' --output text)

echo "Secret created/updated: $SECRET_ARN"
echo ""
echo "IMPORTANT: You need to:"
echo "1. Connect to Aurora MySQL as admin"
echo "2. Create the database and user:"
echo ""
echo "   CREATE DATABASE classreflect;"
echo "   CREATE USER 'classreflect_app'@'%' IDENTIFIED BY 'your-secure-password';"
echo "   GRANT ALL PRIVILEGES ON classreflect.* TO 'classreflect_app'@'%';"
echo "   FLUSH PRIVILEGES;"
echo ""
echo "3. Update the secret with the actual password:"
echo "   aws secretsmanager update-secret --secret-id $SECRET_NAME --secret-string '{...}'"
echo ""
echo "4. Apply the schema:"
echo "   mysql -h gdwd.cluster-cjjl7f5jormj.eu-west-2.rds.amazonaws.com -u classreflect_app -p classreflect < schema.sql"