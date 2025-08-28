#!/usr/bin/env node

/**
 * Test Role-Based Access Control for ClassReflect API
 * This script tests that the RBAC is working correctly for different user types
 */

const BASE_URL = 'http://localhost:3001/api';

// Test users - these should match the users in the database
const USERS = {
  teacher: {
    email: 'teacher@test.local',
    password: 'TeacherPass2024!@',
    role: 'teacher',
    expectedSchoolId: '1',
    expectedTeacherId: 3
  },
  manager: {
    email: 'manager@test.local', 
    password: 'ManagerPass2024!@',
    role: 'school_manager',
    expectedSchoolId: '1',
    expectedUserId: 2
  },
  superadmin: {
    email: 'superadmin@test.local',
    password: 'AdminPass2024!@',
    role: 'super_admin',
    expectedSchoolId: '3',
    expectedUserId: 1
  }
};

class RolePermissionTester {
  constructor() {
    this.tokens = {};
    this.testResults = [];
  }

  async authenticateUser(userType) {
    try {
      const user = USERS[userType];
      console.log(`\n🔐 Authenticating ${userType}: ${user.email}`);
      
      const response = await fetch(`${BASE_URL}/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: user.email,
          password: user.password
        })
      });

      const data = await response.json();
      
      if (response.ok && data.accessToken) {
        this.tokens[userType] = data.accessToken;
        console.log(`✅ ${userType} authenticated successfully`);
        console.log(`   Role: ${data.user.role}, School: ${data.user.schoolId}`);
        return true;
      } else {
        console.log(`❌ ${userType} authentication failed:`, data.error || 'Unknown error');
        return false;
      }
    } catch (error) {
      console.log(`❌ ${userType} authentication error:`, error.message);
      return false;
    }
  }

  async testEndpoint(userType, method, endpoint, expectedStatus, description) {
    try {
      const token = this.tokens[userType];
      if (!token) {
        this.addResult(description, 'SKIP', `${userType} not authenticated`);
        return;
      }

      const response = await fetch(`${BASE_URL}${endpoint}`, {
        method: method,
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      const actualStatus = response.status;
      const success = actualStatus === expectedStatus;
      
      if (success) {
        this.addResult(description, 'PASS', `${userType} got expected ${expectedStatus}`);
        console.log(`    ✅ ${description}: ${actualStatus}`);
      } else {
        this.addResult(description, 'FAIL', `${userType} got ${actualStatus}, expected ${expectedStatus}`);
        console.log(`    ❌ ${description}: got ${actualStatus}, expected ${expectedStatus}`);
      }
    } catch (error) {
      this.addResult(description, 'ERROR', error.message);
      console.log(`    💥 ${description}: ${error.message}`);
    }
  }

  addResult(test, status, details) {
    this.testResults.push({ test, status, details });
  }

  async runAccessControlTests() {
    console.log('\n🧪 Testing Role-Based Access Control');
    console.log('====================================');

    // Test 1: Teachers accessing their own jobs (should work)
    console.log('\n📝 Test 1: Teacher accessing their own jobs');
    await this.testEndpoint('teacher', 'GET', '/jobs/teacher/3', 200, 'Teacher accessing own jobs');

    // Test 2: Teachers accessing other teacher's jobs (should fail)
    console.log('\n📝 Test 2: Teacher accessing other teacher jobs');
    await this.testEndpoint('teacher', 'GET', '/jobs/teacher/999', 403, 'Teacher accessing other teacher jobs');

    // Test 3: Manager accessing jobs in their school (should work)
    console.log('\n📝 Test 3: Manager accessing school jobs');
    await this.testEndpoint('manager', 'GET', '/jobs/teacher/3', 200, 'Manager accessing school teacher jobs');

    // Test 4: Manager accessing jobs outside their school (should fail)
    console.log('\n📝 Test 4: Manager accessing jobs outside school');
    await this.testEndpoint('manager', 'GET', '/jobs/teacher/999', 403, 'Manager accessing outside school jobs');

    // Test 5: Super admin accessing any jobs (should work)
    console.log('\n📝 Test 5: Super admin accessing any jobs');
    await this.testEndpoint('superadmin', 'GET', '/jobs/teacher/3', 200, 'Super admin accessing any jobs');

    // Test 6: Teacher uploading their own recording (should work)
    console.log('\n📝 Test 6: Teacher upload permissions');
    await this.testEndpoint('teacher', 'POST', '/upload/presigned-url', 400, 'Teacher upload (expected 400 for missing data)');

    // Test 7: Manager uploading for teacher in their school (should work)
    console.log('\n📝 Test 7: Manager upload permissions');
    await this.testEndpoint('manager', 'POST', '/upload/presigned-url', 400, 'Manager upload (expected 400 for missing data)');

    // Test 8: Creating teachers (managers and super admins only)
    console.log('\n📝 Test 8: Creating teachers');
    await this.testEndpoint('teacher', 'POST', '/users/teachers', 403, 'Teacher trying to create teacher (should fail)');
    await this.testEndpoint('manager', 'POST', '/users/teachers', 400, 'Manager creating teacher (expected 400 for missing data)');
    await this.testEndpoint('superadmin', 'POST', '/users/teachers', 400, 'Super admin creating teacher (expected 400 for missing data)');

    // Test 9: Creating schools (super admin only)
    console.log('\n📝 Test 9: Creating schools');
    await this.testEndpoint('teacher', 'POST', '/users/admin/schools', 403, 'Teacher trying to create school (should fail)');
    await this.testEndpoint('manager', 'POST', '/users/admin/schools', 403, 'Manager trying to create school (should fail)');
    await this.testEndpoint('superadmin', 'POST', '/users/admin/schools', 400, 'Super admin creating school (expected 400 for missing data)');

    // Test 10: Updating job status (super admin only)
    console.log('\n📝 Test 10: Updating job status');
    await this.testEndpoint('teacher', 'PATCH', '/jobs/test-123/status', 403, 'Teacher updating job status (should fail)');
    await this.testEndpoint('manager', 'PATCH', '/jobs/test-123/status', 403, 'Manager updating job status (should fail)');
    await this.testEndpoint('superadmin', 'PATCH', '/jobs/test-123/status', 404, 'Super admin updating job status (expected 404 for non-existent job)');
  }

  async runAllTests() {
    console.log('🚀 ClassReflect Role-Based Access Control Test Suite');
    console.log('===================================================');

    // Authenticate all users
    const authResults = await Promise.all([
      this.authenticateUser('teacher'),
      this.authenticateUser('manager'), 
      this.authenticateUser('superadmin')
    ]);

    const authenticatedUsers = authResults.filter(Boolean).length;
    console.log(`\n📊 Authentication Summary: ${authenticatedUsers}/3 users authenticated`);

    if (authenticatedUsers === 0) {
      console.log('❌ No users authenticated. Cannot run access control tests.');
      return;
    }

    // Run access control tests
    await this.runAccessControlTests();

    // Print summary
    this.printSummary();
  }

  printSummary() {
    console.log('\n📊 Test Results Summary');
    console.log('=======================');
    
    const passed = this.testResults.filter(r => r.status === 'PASS').length;
    const failed = this.testResults.filter(r => r.status === 'FAIL').length;
    const errors = this.testResults.filter(r => r.status === 'ERROR').length;
    const skipped = this.testResults.filter(r => r.status === 'SKIP').length;

    console.log(`✅ Passed: ${passed}`);
    console.log(`❌ Failed: ${failed}`);
    console.log(`💥 Errors: ${errors}`);
    console.log(`⏭️  Skipped: ${skipped}`);
    console.log(`📊 Total: ${this.testResults.length}`);

    if (failed > 0 || errors > 0) {
      console.log('\n⚠️  Failed/Error Details:');
      this.testResults
        .filter(r => r.status === 'FAIL' || r.status === 'ERROR')
        .forEach(r => console.log(`   ${r.status}: ${r.test} - ${r.details}`));
    }

    const successRate = (passed / (passed + failed + errors)) * 100;
    console.log(`\n🎯 Success Rate: ${successRate.toFixed(1)}%`);

    if (successRate >= 90) {
      console.log('🎉 Excellent! Role-based access control is working well.');
    } else if (successRate >= 70) {
      console.log('⚠️  Good, but some issues need to be addressed.');
    } else {
      console.log('🚨 Significant issues with access control. Review required.');
    }

    console.log('\n✨ Role-Based Access Control Test Complete!');
  }
}

// Run the tests
const tester = new RolePermissionTester();
tester.runAllTests().catch(console.error);