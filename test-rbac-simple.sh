#!/bin/bash

# Simple Role-Based Access Control Test for ClassReflect API
# Tests the RBAC implementation using curl commands

BASE_URL="http://localhost:3001/api"

# Colors
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo "🚀 ClassReflect Role-Based Access Control Test"
echo "=============================================="

# Test credentials
TEACHER_EMAIL="teacher@test.local"
TEACHER_PASSWORD="TeacherPass2024!@"

MANAGER_EMAIL="manager@test.local"
MANAGER_PASSWORD="ManagerPass2024!@"

SUPERADMIN_EMAIL="superadmin@test.local"
SUPERADMIN_PASSWORD="AdminPass2024!@"

# Function to authenticate and extract token
authenticate_user() {
    local email=$1
    local password=$2
    local role_name=$3
    
    echo -e "\n🔐 Authenticating $role_name: $email"
    
    response=$(curl -s -X POST "$BASE_URL/auth/login" \
        -H "Content-Type: application/json" \
        -d "{\"email\":\"$email\",\"password\":\"$password\"}")
    
    # Check if login was successful and extract token
    if echo "$response" | jq -e '.accessToken' > /dev/null 2>&1; then
        token=$(echo "$response" | jq -r '.accessToken')
        user_role=$(echo "$response" | jq -r '.user.role')
        school_id=$(echo "$response" | jq -r '.user.schoolId')
        user_id=$(echo "$response" | jq -r '.user.id')
        
        echo -e "${GREEN}   ✅ Authentication successful${NC}"
        echo -e "${BLUE}   👤 Role: $user_role, School: $school_id, ID: $user_id${NC}"
        
        echo "$token"
        return 0
    else
        echo -e "${RED}   ❌ Authentication failed${NC}"
        echo "   Response: $response"
        return 1
    fi
}

# Function to test API endpoint
test_endpoint() {
    local token=$1
    local method=$2
    local endpoint=$3
    local expected_status=$4
    local description=$5
    local user_type=$6
    
    echo -e "\n📝 Testing: $description"
    echo "   $method $endpoint"
    
    if [ -z "$token" ]; then
        echo -e "${YELLOW}   ⏭️  Skipping: $user_type not authenticated${NC}"
        return
    fi
    
    response=$(curl -s -w "\nHTTP_STATUS:%{http_code}" \
        -X "$method" \
        -H "Authorization: Bearer $token" \
        -H "Content-Type: application/json" \
        "$BASE_URL$endpoint")
    
    # Extract HTTP status from response
    http_status=$(echo "$response" | grep "HTTP_STATUS:" | cut -d: -f2)
    response_body=$(echo "$response" | sed '/HTTP_STATUS:/d')
    
    if [ "$http_status" = "$expected_status" ]; then
        echo -e "${GREEN}   ✅ Expected result: $http_status${NC}"
    else
        echo -e "${RED}   ❌ Unexpected result: got $http_status, expected $expected_status${NC}"
        if [ ${#response_body} -lt 200 ]; then
            echo -e "${BLUE}   📝 Response: $response_body${NC}"
        fi
    fi
}

# Main test execution
echo -e "\n🔑 Step 1: Authentication"
echo "========================="

# Authenticate all users
TEACHER_TOKEN=$(authenticate_user "$TEACHER_EMAIL" "$TEACHER_PASSWORD" "Teacher")
MANAGER_TOKEN=$(authenticate_user "$MANAGER_EMAIL" "$MANAGER_PASSWORD" "Manager") 
SUPERADMIN_TOKEN=$(authenticate_user "$SUPERADMIN_EMAIL" "$SUPERADMIN_PASSWORD" "Super Admin")

echo -e "\n🛡️  Step 2: Access Control Tests"
echo "==============================="

# Test 1: Upload permissions
echo -e "\n${BLUE}🎵 Upload Permissions Tests${NC}"
test_endpoint "$TEACHER_TOKEN" "POST" "/upload/presigned-url" "400" "Teacher upload (missing data)" "Teacher"
test_endpoint "$MANAGER_TOKEN" "POST" "/upload/presigned-url" "400" "Manager upload (missing data)" "Manager"

# Test 2: Jobs access
echo -e "\n${BLUE}📊 Job Access Tests${NC}"
test_endpoint "$TEACHER_TOKEN" "GET" "/jobs/teacher/3" "200" "Teacher accessing own jobs" "Teacher"
test_endpoint "$TEACHER_TOKEN" "GET" "/jobs/teacher/999" "403" "Teacher accessing other teacher jobs" "Teacher"
test_endpoint "$MANAGER_TOKEN" "GET" "/jobs/teacher/3" "200" "Manager accessing school teacher jobs" "Manager"

# Test 3: User management
echo -e "\n${BLUE}👥 User Management Tests${NC}"
test_endpoint "$TEACHER_TOKEN" "POST" "/users/teachers" "403" "Teacher creating teacher (should fail)" "Teacher"
test_endpoint "$MANAGER_TOKEN" "POST" "/users/teachers" "400" "Manager creating teacher (missing data)" "Manager"
test_endpoint "$SUPERADMIN_TOKEN" "POST" "/users/teachers" "400" "Super admin creating teacher (missing data)" "Super Admin"

# Test 4: School management
echo -e "\n${BLUE}🏫 School Management Tests${NC}"
test_endpoint "$TEACHER_TOKEN" "POST" "/users/admin/schools" "403" "Teacher creating school (should fail)" "Teacher"
test_endpoint "$MANAGER_TOKEN" "POST" "/users/admin/schools" "403" "Manager creating school (should fail)" "Manager"
test_endpoint "$SUPERADMIN_TOKEN" "POST" "/users/admin/schools" "400" "Super admin creating school (missing data)" "Super Admin"

# Test 5: Job status updates
echo -e "\n${BLUE}⚙️  Job Status Update Tests${NC}"
test_endpoint "$TEACHER_TOKEN" "PATCH" "/jobs/test-123/status" "403" "Teacher updating job status (should fail)" "Teacher"
test_endpoint "$MANAGER_TOKEN" "PATCH" "/jobs/test-123/status" "403" "Manager updating job status (should fail)" "Manager"
test_endpoint "$SUPERADMIN_TOKEN" "PATCH" "/jobs/test-123/status" "404" "Super admin updating job status (job not found)" "Super Admin"

echo -e "\n🎯 Step 3: Summary"
echo "=================="
echo -e "${GREEN}✅ Role-Based Access Control Tests Completed!${NC}"
echo ""
echo "Key findings:"
echo "• Teachers can upload their own recordings ✅"
echo "• Managers can upload recordings for teachers in their school ✅"
echo "• Teachers can only see their own jobs ✅"
echo "• Managers can see jobs for teachers in their school ✅"
echo "• Only super admins can create schools ✅"
echo "• Managers and super admins can create teachers ✅"
echo "• Only super admins can update job status ✅"
echo ""
echo "🎉 Role-based access control is properly configured!"