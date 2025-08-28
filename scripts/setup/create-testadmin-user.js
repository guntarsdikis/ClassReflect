const { CognitoIdentityProviderClient, AdminCreateUserCommand, AdminSetUserPasswordCommand, AdminDeleteUserCommand } = require('@aws-sdk/client-cognito-identity-provider');

const USER_POOL_ID = 'eu-west-2_E3SFkCKPU';
const REGION = 'eu-west-2';

const client = new CognitoIdentityProviderClient({ region: REGION });

async function createTestAdminUser() {
  const username = 'testadmin';
  const email = 'testadmin@classreflect.local';
  const password = 'Welcome2024!';
  
  try {
    // Try to delete existing user first
    try {
      await client.send(new AdminDeleteUserCommand({
        UserPoolId: USER_POOL_ID,
        Username: username
      }));
      console.log('✅ Deleted existing user:', username);
    } catch (err) {
      // User doesn't exist, that's fine
    }
    
    // Create the user
    const createCommand = new AdminCreateUserCommand({
      UserPoolId: USER_POOL_ID,
      Username: username,
      UserAttributes: [
        { Name: 'email', Value: email },
        { Name: 'email_verified', Value: 'true' },
        { Name: 'given_name', Value: 'Test' },
        { Name: 'family_name', Value: 'Admin' },
        { Name: 'custom:role', Value: 'super_admin' },
        { Name: 'custom:school_id', Value: 'test-school-001' }
      ],
      TemporaryPassword: 'TempPass123!@#',
      MessageAction: 'SUPPRESS'
    });
    
    await client.send(createCommand);
    console.log('✅ Created user:', email);
    
    // Set permanent password
    const passwordCommand = new AdminSetUserPasswordCommand({
      UserPoolId: USER_POOL_ID,
      Username: username,
      Password: password,
      Permanent: true
    });
    
    await client.send(passwordCommand);
    console.log('✅ Set permanent password for:', email);
    
    console.log('\n==================================================');
    console.log('📝 Test Admin Credentials:');
    console.log('==================================================');
    console.log(`Email: ${email}`);
    console.log(`Password: ${password}`);
    console.log('==================================================\n');
    
    console.log('✅ User ready! You can now login at http://localhost:3000/login');
    
  } catch (error) {
    console.error('Error creating user:', error);
  }
}

createTestAdminUser();