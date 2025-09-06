#!/usr/bin/env node
/**
 * Test script for TLC Template Import API
 * 
 * Usage:
 * 1. Start backend: cd backend && npm run dev
 * 2. Run script: node test-tlc-import.js
 */

const API_BASE = 'http://localhost:3001/api';

// Test credentials for super admin
const TEST_CREDENTIALS = {
  email: 'superadmin@test.com', // Update with actual super admin email
  password: 'password123'       // Update with actual password
};

async function login() {
  console.log('🔐 Logging in as super admin...');
  
  const response = await fetch(`${API_BASE}/auth/login`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(TEST_CREDENTIALS)
  });

  if (!response.ok) {
    throw new Error(`Login failed: ${response.status} ${await response.text()}`);
  }

  const data = await response.json();
  console.log('✅ Login successful:', data.user.email, data.user.role);
  return data.token;
}

async function importTLCTemplates(token, schoolId) {
  console.log(`📚 Importing TLC templates to school ${schoolId}...`);
  
  const response = await fetch(`${API_BASE}/schools/${schoolId}/import-tlc-templates`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    }
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Import failed: ${response.status} ${error}`);
  }

  const data = await response.json();
  console.log('✅ TLC Templates imported successfully:');
  console.log('   Message:', data.message);
  console.log('   School:', data.school.name);
  console.log('   Imported templates:', data.imported.length);
  
  data.imported.forEach((template, index) => {
    console.log(`   ${index + 1}. ${template.name} (${template.criteriaCount} criteria)`);
  });

  if (data.categoryCreated) {
    console.log('   ✨ Teaching Methods category was created');
  }

  return data;
}

async function testImport() {
  try {
    // Step 1: Login
    const token = await login();
    
    // Step 2: Import TLC templates to test school (ID: 1)
    const result = await importTLCTemplates(token, 1);
    
    console.log('\n🎉 Test completed successfully!');
    console.log('📋 Summary:');
    console.log(`   - ${result.imported.length} templates imported`);
    console.log(`   - Templates are now available for school "${result.school.name}"`);
    console.log(`   - Templates can be used in upload wizard and analysis`);
    
  } catch (error) {
    console.error('❌ Test failed:', error.message);
    console.log('\n💡 Troubleshooting:');
    console.log('   - Make sure backend server is running (npm run dev)');
    console.log('   - Update TEST_CREDENTIALS with valid super admin login');
    console.log('   - Check that test school (ID: 1) exists');
    process.exit(1);
  }
}

// Run the test
if (require.main === module) {
  testImport();
}

module.exports = { testImport, importTLCTemplates };