import { 
  CognitoIdentityProviderClient,
  AdminCreateUserCommand,
  AdminSetUserPasswordCommand,
  AdminGetUserCommand,
  AdminUpdateUserAttributesCommand,
  AdminDeleteUserCommand,
  ListUsersCommand,
  AdminAddUserToGroupCommand,
  AdminRemoveUserFromGroupCommand,
  CreateGroupCommand,
  DeleteGroupCommand,
  AdminInitiateAuthCommand,
  AdminRespondToAuthChallengeCommand,
  AdminConfirmSignUpCommand,
  AdminDisableUserCommand,
  AdminEnableUserCommand,
  MessageActionType,
  AttributeType
} from '@aws-sdk/client-cognito-identity-provider';

export interface CognitoUser {
  username: string;
  email: string;
  firstName: string;
  lastName: string;
  schoolId: string;
  role: 'teacher' | 'school_manager' | 'super_admin';
  subjects?: string[];
  grades?: string[];
  isActive?: boolean;
}

export interface AuthResult {
  accessToken: string;
  idToken: string;
  refreshToken: string;
  user: CognitoUser;
}

export class CognitoService {
  private client: CognitoIdentityProviderClient;
  private userPoolId: string;
  private clientId: string;
  private clientSecret: string;

  constructor() {
    this.client = new CognitoIdentityProviderClient({ 
      region: process.env.AWS_REGION || 'eu-west-2' 
    });
    
    this.userPoolId = process.env.COGNITO_USER_POOL_ID!;
    this.clientId = process.env.COGNITO_CLIENT_ID!;
    this.clientSecret = process.env.COGNITO_CLIENT_SECRET!;

    if (!this.userPoolId || !this.clientId || !this.clientSecret) {
      throw new Error('Missing required Cognito environment variables');
    }
  }

  /**
   * Create a new user (Admin only - no self-registration)
   */
  async createUser(userData: CognitoUser, temporaryPassword: string): Promise<{ username: string; temporaryPassword: string }> {
    try {
      // Generate unique username (not email format since User Pool uses email aliases)
      const uniqueUsername = this.generateUniqueUsername(userData.firstName, userData.lastName);
      
      const attributes: AttributeType[] = [
        { Name: 'email', Value: userData.email },
        { Name: 'email_verified', Value: 'true' },
        { Name: 'given_name', Value: userData.firstName },
        { Name: 'family_name', Value: userData.lastName },
        { Name: 'custom:school_id', Value: userData.schoolId },
        { Name: 'custom:role', Value: userData.role }
      ];

      // Add optional attributes
      if (userData.subjects && userData.subjects.length > 0) {
        attributes.push({ Name: 'custom:subjects', Value: JSON.stringify(userData.subjects) });
      }
      if (userData.grades && userData.grades.length > 0) {
        attributes.push({ Name: 'custom:grades', Value: JSON.stringify(userData.grades) });
      }

      const command = new AdminCreateUserCommand({
        UserPoolId: this.userPoolId,
        Username: uniqueUsername, // Use generated username, email will be alias
        UserAttributes: attributes,
        TemporaryPassword: temporaryPassword,
        MessageAction: 'SUPPRESS' as any, // Suppress welcome email for test users
        ForceAliasCreation: false
      });

      const result = await this.client.send(command);
      
      return {
        username: uniqueUsername,
        temporaryPassword: temporaryPassword
      };
    } catch (error) {
      console.error('Error creating user:', error);
      throw error;
    }
  }

  /**
   * Authenticate user with username/password
   */
  async authenticateUser(email: string, password: string): Promise<AuthResult> {
    try {
      // For test users, map email to username
      // In production, you'd typically use email as username or have a mapping table
      let username = email;
      
      // Map test emails to test usernames
      const testUserMap: { [key: string]: string } = {
        'superadmin@test.local': 'superadmin-test',
        'manager@test.local': 'manager-test',
        'teacher@test.local': 'teacher-test',
        'testadmin@classreflect.local': 'testadmin'
      };
      
      if (testUserMap[email]) {
        username = testUserMap[email];
      }
      
      // Create secret hash for client authentication
      const secretHash = this.generateSecretHash(username);

      console.log('Attempting auth with username:', username);
      
      const command = new AdminInitiateAuthCommand({
        UserPoolId: this.userPoolId,
        ClientId: this.clientId,
        AuthFlow: 'ADMIN_NO_SRP_AUTH',
        AuthParameters: {
          USERNAME: username,
          PASSWORD: password,
          SECRET_HASH: secretHash
        }
      });

      const result = await this.client.send(command);
      console.log('Auth successful, got tokens');

      // Handle challenges (like password reset required)
      if (result.ChallengeName) {
        throw new Error(`Authentication challenge required: ${result.ChallengeName}`);
      }

      if (!result.AuthenticationResult) {
        throw new Error('Authentication failed - no result');
      }

      // Get user details using the username
      console.log('Getting user details for:', username);
      const user = await this.getUser(username);
      console.log('Got user details:', user);

      return {
        accessToken: result.AuthenticationResult.AccessToken!,
        idToken: result.AuthenticationResult.IdToken!,
        refreshToken: result.AuthenticationResult.RefreshToken!,
        user: user
      };
    } catch (error) {
      console.error('Authentication error:', error);
      throw error;
    }
  }

  /**
   * Get user details by email/username
   */
  async getUser(email: string): Promise<CognitoUser> {
    try {
      const command = new AdminGetUserCommand({
        UserPoolId: this.userPoolId,
        Username: email
      });

      const result = await this.client.send(command);

      if (!result.UserAttributes) {
        throw new Error('User attributes not found');
      }

      // Parse attributes
      const attributes: { [key: string]: string } = {};
      result.UserAttributes.forEach(attr => {
        if (attr.Name && attr.Value) {
          attributes[attr.Name] = attr.Value;
        }
      });

      return {
        username: result.Username!,
        email: attributes['email'],
        firstName: attributes['given_name'],
        lastName: attributes['family_name'],
        schoolId: attributes['custom:school_id'],
        role: attributes['custom:role'] as 'teacher' | 'school_manager' | 'super_admin',
        subjects: attributes['custom:subjects'] ? JSON.parse(attributes['custom:subjects']) : undefined,
        grades: attributes['custom:grades'] ? JSON.parse(attributes['custom:grades']) : undefined,
        isActive: result.Enabled
      };
    } catch (error) {
      console.error('Error getting user:', error);
      throw error;
    }
  }

  /**
   * Update user attributes
   */
  async updateUser(email: string, updates: Partial<CognitoUser>): Promise<void> {
    try {
      const attributes: AttributeType[] = [];

      if (updates.firstName) {
        attributes.push({ Name: 'given_name', Value: updates.firstName });
      }
      if (updates.lastName) {
        attributes.push({ Name: 'family_name', Value: updates.lastName });
      }
      if (updates.role) {
        attributes.push({ Name: 'custom:role', Value: updates.role });
      }
      if (updates.subjects !== undefined) {
        attributes.push({ Name: 'custom:subjects', Value: JSON.stringify(updates.subjects) });
      }
      if (updates.grades !== undefined) {
        attributes.push({ Name: 'custom:grades', Value: JSON.stringify(updates.grades) });
      }

      if (attributes.length === 0) {
        return; // Nothing to update
      }

      const command = new AdminUpdateUserAttributesCommand({
        UserPoolId: this.userPoolId,
        Username: email,
        UserAttributes: attributes
      });

      await this.client.send(command);
    } catch (error) {
      console.error('Error updating user:', error);
      throw error;
    }
  }

  /**
   * Set permanent password (after user signs in with temporary password)
   */
  async setPermanentPassword(email: string, password: string): Promise<void> {
    try {
      const command = new AdminSetUserPasswordCommand({
        UserPoolId: this.userPoolId,
        Username: email,
        Password: password,
        Permanent: true
      });

      await this.client.send(command);
    } catch (error) {
      console.error('Error setting permanent password:', error);
      throw error;
    }
  }

  /**
   * Delete user
   */
  async deleteUser(email: string): Promise<void> {
    try {
      const command = new AdminDeleteUserCommand({
        UserPoolId: this.userPoolId,
        Username: email
      });

      await this.client.send(command);
    } catch (error) {
      console.error('Error deleting user:', error);
      throw error;
    }
  }

  /**
   * Disable user account
   */
  async disableUser(email: string): Promise<void> {
    try {
      const command = new AdminDisableUserCommand({
        UserPoolId: this.userPoolId,
        Username: email
      });

      await this.client.send(command);
    } catch (error) {
      console.error('Error disabling user:', error);
      throw error;
    }
  }

  /**
   * Enable user account
   */
  async enableUser(email: string): Promise<void> {
    try {
      const command = new AdminEnableUserCommand({
        UserPoolId: this.userPoolId,
        Username: email
      });

      await this.client.send(command);
    } catch (error) {
      console.error('Error enabling user:', error);
      throw error;
    }
  }

  /**
   * List all users (with pagination)
   */
  async listUsers(limit?: number, paginationToken?: string): Promise<{ users: CognitoUser[]; paginationToken?: string }> {
    try {
      const command = new ListUsersCommand({
        UserPoolId: this.userPoolId,
        Limit: limit || 60,
        PaginationToken: paginationToken
      });

      const result = await this.client.send(command);

      const users: CognitoUser[] = [];
      
      if (result.Users) {
        for (const user of result.Users) {
          if (!user.Attributes) continue;

          const attributes: { [key: string]: string } = {};
          user.Attributes.forEach(attr => {
            if (attr.Name && attr.Value) {
              attributes[attr.Name] = attr.Value;
            }
          });

          users.push({
            username: user.Username!,
            email: attributes['email'],
            firstName: attributes['given_name'],
            lastName: attributes['family_name'],
            schoolId: attributes['custom:school_id'],
            role: attributes['custom:role'] as 'teacher' | 'school_manager' | 'super_admin',
            subjects: attributes['custom:subjects'] ? JSON.parse(attributes['custom:subjects']) : undefined,
            grades: attributes['custom:grades'] ? JSON.parse(attributes['custom:grades']) : undefined,
            isActive: user.Enabled
          });
        }
      }

      return {
        users,
        paginationToken: result.PaginationToken
      };
    } catch (error) {
      console.error('Error listing users:', error);
      throw error;
    }
  }

  /**
   * Generate unique username (not email format) for Cognito User Pool with email aliases
   */
  private generateUniqueUsername(firstName: string, lastName: string): string {
    // Remove spaces and special characters, convert to lowercase
    const cleanFirst = firstName.toLowerCase().replace(/[^a-z0-9]/g, '');
    const cleanLast = lastName.toLowerCase().replace(/[^a-z0-9]/g, '');
    
    // Generate timestamp-based unique suffix
    const timestamp = Date.now().toString().slice(-8); // Last 8 digits of timestamp
    const randomSuffix = Math.random().toString(36).substring(2, 6); // 4 random chars
    
    return `${cleanFirst}${cleanLast}${timestamp}${randomSuffix}`;
  }

  /**
   * Generate secret hash for client authentication
   */
  private generateSecretHash(username: string): string {
    const crypto = require('crypto');
    return crypto
      .createHmac('SHA256', this.clientSecret)
      .update(username + this.clientId)
      .digest('base64');
  }

  /**
   * Generate a secure temporary password
   */
  generateTemporaryPassword(): string {
    const chars = 'ABCDEFGHJKMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789@#$%';
    let password = '';
    
    // Ensure password meets policy requirements
    password += 'ABCDEFGHJKMNPQRSTUVWXYZ'[Math.floor(Math.random() * 24)]; // Uppercase
    password += 'abcdefghjkmnpqrstuvwxyz'[Math.floor(Math.random() * 24)]; // Lowercase  
    password += '23456789'[Math.floor(Math.random() * 8)]; // Number
    password += '@#$%'[Math.floor(Math.random() * 4)]; // Symbol
    
    // Fill rest with random characters
    for (let i = 4; i < 12; i++) {
      password += chars[Math.floor(Math.random() * chars.length)];
    }
    
    // Shuffle the password
    return password.split('').sort(() => Math.random() - 0.5).join('');
  }
}

// Export singleton instance
export const cognitoService = new CognitoService();