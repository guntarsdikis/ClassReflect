const { CognitoIdentityProviderClient, AdminCreateUserCommand, AdminSetUserPasswordCommand, AdminDeleteUserCommand } = require('@aws-sdk/client-cognito-identity-provider');

const USER_POOL_ID = 'eu-west-2_E3SFkCKPU';
const REGION = 'eu-west-2';

const client = new CognitoIdentityProviderClient({ region: REGION });

// Test users configuration
const testUsers = [
  {
    username: 'superadmin-test',
    email: 'superadmin@test.local',
    firstName: 'Super',
    lastName: 'Admin',
    role: 'super_admin',
    schoolId: 'platform',
    tempPassword: 'TempAdmin123!',
    permanentPassword: 'AdminPass2024!@'
  },
  {
    username: 'manager-test',
    email: 'manager@test.local',
    firstName: 'School',
    lastName: 'Manager',
    role: 'school_manager',
    schoolId: 'test-school-001',
    tempPassword: 'TempManager123!',
    permanentPassword: 'ManagerPass2024!@'
  },
  {
    username: 'teacher-test',
    email: 'teacher@test.local',
    firstName: 'Test',
    lastName: 'Teacher',
    role: 'teacher',
    schoolId: 'test-school-001',
    tempPassword: 'TempTeacher123!',
    permanentPassword: 'TeacherPass2024!@',
    subjects: JSON.stringify(['Math', 'Science']),
    grades: JSON.stringify(['3', '4', '5'])
  }
];

async function deleteExistingUser(username) {
  try {
    await client.send(new AdminDeleteUserCommand({
      UserPoolId: USER_POOL_ID,
      Username: username
    }));
    console.log(`✅ Deleted existing user: ${username}`);
  } catch (error) {
    // User doesn't exist, that's fine
  }
}

async function createUser(user) {
  try {
    // First delete if exists
    await deleteExistingUser(user.username);
    
    // Create user attributes
    const attributes = [
      { Name: 'email', Value: user.email },
      { Name: 'given_name', Value: user.firstName },
      { Name: 'family_name', Value: user.lastName },
      { Name: 'custom:school_id', Value: user.schoolId },
      { Name: 'custom:role', Value: user.role }
    ];
    
    if (user.subjects) {
      attributes.push({ Name: 'custom:subjects', Value: user.subjects });
    }
    if (user.grades) {
      attributes.push({ Name: 'custom:grades', Value: user.grades });
    }
    
    // Create user
    await client.send(new AdminCreateUserCommand({
      UserPoolId: USER_POOL_ID,
      Username: user.username,
      UserAttributes: attributes,
      TemporaryPassword: user.tempPassword,
      MessageAction: 'SUPPRESS'
    }));
    
    console.log(`✅ Created user: ${user.email} (${user.role})`);
    
    // Set permanent password
    await client.send(new AdminSetUserPasswordCommand({
      UserPoolId: USER_POOL_ID,
      Username: user.username,
      Password: user.permanentPassword,
      Permanent: true
    }));
    
    console.log(`✅ Set permanent password for: ${user.email}`);
    
    return true;
  } catch (error) {
    console.error(`❌ Error creating ${user.email}:`, error.message);
    return false;
  }
}

async function setupTestUsers() {
  console.log('🚀 Setting up test users for ClassReflect...\n');
  
  for (const user of testUsers) {
    await createUser(user);
    console.log('');
  }
  
  console.log('=' .repeat(50));
  console.log('\n📝 Test Credentials:\n');
  
  testUsers.forEach(user => {
    console.log(`${user.role.toUpperCase()}:`);
    console.log(`  Email: ${user.email}`);
    console.log(`  Password: ${user.permanentPassword}`);
    console.log('');
  });
  
  console.log('=' .repeat(50));
  console.log('\n✅ All test users ready!');
  console.log('\nTo test:');
  console.log('1. Go to http://localhost:3000/login');
  console.log('2. Use any of the credentials above');
  console.log('3. Each role will redirect to their specific dashboard\n');
}

// Run setup
setupTestUsers().catch(console.error);