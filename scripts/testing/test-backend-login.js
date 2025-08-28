// Test script to verify backend Cognito authentication

const testUsers = [
  {
    name: 'Super Admin',
    email: 'superadmin@test.local',
    password: 'AdminPass2024!@'
  },
  {
    name: 'School Manager',
    email: 'manager@test.local',
    password: 'ManagerPass2024!@'
  },
  {
    name: 'Teacher',
    email: 'teacher@test.local',
    password: 'TeacherPass2024!@'
  }
];

async function testLogin(user) {
  console.log(`\n🧪 Testing ${user.name} login...`);
  
  try {
    const response = await fetch('http://localhost:3001/api/auth/login', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        email: user.email,
        password: user.password
      })
    });

    const data = await response.json();
    
    if (response.ok) {
      console.log(`✅ Login successful!`);
      console.log(`   User: ${data.user.firstName} ${data.user.lastName}`);
      console.log(`   Role: ${data.user.role}`);
      console.log(`   School: ${data.user.schoolId}`);
      console.log(`   Has Access Token: ${!!data.accessToken}`);
      return true;
    } else {
      console.log(`❌ Login failed: ${data.error || 'Unknown error'}`);
      return false;
    }
  } catch (error) {
    console.log(`❌ Error: ${error.message}`);
    return false;
  }
}

async function runTests() {
  console.log('🚀 Testing ClassReflect Backend Authentication');
  console.log('============================================');
  
  const results = [];
  
  for (const user of testUsers) {
    const success = await testLogin(user);
    results.push({ user: user.name, success });
  }
  
  console.log('\n============================================');
  console.log('📊 Results Summary:');
  console.log('============================================');
  
  results.forEach(result => {
    const icon = result.success ? '✅' : '❌';
    console.log(`${icon} ${result.user}: ${result.success ? 'PASSED' : 'FAILED'}`);
  });
  
  const passedCount = results.filter(r => r.success).length;
  console.log(`\nTotal: ${passedCount}/${results.length} tests passed`);
  
  if (passedCount === results.length) {
    console.log('🎉 All backend authentication tests passed!');
    console.log('\n✨ You can now use these credentials in the frontend at http://localhost:3000/login');
  } else {
    console.log('\n⚠️  Some tests failed. Check the backend logs for details.');
    console.log('Make sure the backend is running and using Cognito authentication.');
  }
}

// Run tests
runTests().catch(console.error);