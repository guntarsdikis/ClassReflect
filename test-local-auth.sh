#!/bin/bash

# ClassReflect Local Authentication Testing Script

echo "🧪 ClassReflect Local Authentication Test Setup"
echo "=============================================="

# Colors for output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

USER_POOL_ID="eu-west-2_E3SFkCKPU"
REGION="eu-west-2"

echo ""
echo "Creating test users in Cognito..."
echo ""

# Create Super Admin
echo -e "${YELLOW}Creating Super Admin user...${NC}"
aws cognito-idp admin-create-user \
  --user-pool-id $USER_POOL_ID \
  --username admin@test.local \
  --user-attributes \
    Name=email,Value=admin@test.local \
    Name=given_name,Value=Super \
    Name=family_name,Value=Admin \
    Name="custom:school_id",Value=platform \
    Name="custom:role",Value=super_admin \
  --temporary-password "TempAdmin123!" \
  --message-action SUPPRESS \
  --region $REGION 2>/dev/null

if [ $? -eq 0 ]; then
    echo -e "${GREEN}✅ Super Admin created${NC}"
    echo "   Email: admin@test.local"
    echo "   Temp Password: TempAdmin123!"
else
    echo "   ⚠️  Super Admin may already exist"
fi

echo ""

# Create School Manager
echo -e "${YELLOW}Creating School Manager user...${NC}"
aws cognito-idp admin-create-user \
  --user-pool-id $USER_POOL_ID \
  --username manager@test.local \
  --user-attributes \
    Name=email,Value=manager@test.local \
    Name=given_name,Value=School \
    Name=family_name,Value=Manager \
    Name="custom:school_id",Value=test-school-001 \
    Name="custom:role",Value=school_manager \
  --temporary-password "TempManager123!" \
  --message-action SUPPRESS \
  --region $REGION 2>/dev/null

if [ $? -eq 0 ]; then
    echo -e "${GREEN}✅ School Manager created${NC}"
    echo "   Email: manager@test.local"
    echo "   Temp Password: TempManager123!"
else
    echo "   ⚠️  School Manager may already exist"
fi

echo ""

# Create Teacher
echo -e "${YELLOW}Creating Teacher user...${NC}"
aws cognito-idp admin-create-user \
  --user-pool-id $USER_POOL_ID \
  --username teacher@test.local \
  --user-attributes \
    Name=email,Value=teacher@test.local \
    Name=given_name,Value=Test \
    Name=family_name,Value=Teacher \
    Name="custom:school_id",Value=test-school-001 \
    Name="custom:role",Value=teacher \
    Name="custom:subjects",Value='["Math","Science"]' \
    Name="custom:grades",Value='["3","4","5"]' \
  --temporary-password "TempTeacher123!" \
  --message-action SUPPRESS \
  --region $REGION 2>/dev/null

if [ $? -eq 0 ]; then
    echo -e "${GREEN}✅ Teacher created${NC}"
    echo "   Email: teacher@test.local"
    echo "   Temp Password: TempTeacher123!"
else
    echo "   ⚠️  Teacher may already exist"
fi

echo ""
echo "=============================================="
echo -e "${GREEN}Test users ready!${NC}"
echo ""
echo "To test locally:"
echo "1. Start backend: cd backend && npm run dev"
echo "2. Start frontend: cd frontend && npm run dev"
echo "3. Open browser: http://localhost:3000/login"
echo "4. Login with one of the test accounts above"
echo "5. Set a permanent password when prompted (12+ chars)"
echo ""
echo "Suggested permanent passwords:"
echo "  - MySecurePass2024!"
echo "  - TestPassword123!@#"
echo "  - LocalDev2024Pass!"
echo ""
echo "To delete test users later:"
echo "  aws cognito-idp admin-delete-user --user-pool-id $USER_POOL_ID --username <email> --region $REGION"
echo ""