import { signIn, signOut, getCurrentUser, fetchAuthSession, signUp, confirmSignUp } from 'aws-amplify/auth';
import type { User, LoginCredentials, AuthResponse } from '../types';

export class CognitoAuthService {
  /**
   * Sign in with email and password
   */
  async login(credentials: LoginCredentials): Promise<AuthResponse> {
    try {
      const signInResult = await signIn({
        username: credentials.email,
        password: credentials.password
      });

      if (signInResult.isSignedIn) {
        // Get user profile from backend
        const session = await fetchAuthSession();
        const userProfile = await this.getUserProfile(session.tokens?.accessToken?.toString());
        
        return {
          success: true,
          user: userProfile,
          requiresPasswordChange: false
        };
      } else if (signInResult.nextStep?.signInStep === 'CONFIRM_SIGN_IN_WITH_NEW_PASSWORD_REQUIRED') {
        return {
          success: false,
          requiresPasswordChange: true,
          temporaryPassword: credentials.password,
          message: 'Password change required'
        };
      } else {
        return {
          success: false,
          message: 'Authentication failed'
        };
      }
    } catch (error: any) {
      console.error('Login error:', error);
      
      let errorMessage = 'Login failed. Please try again.';
      
      switch (error.name) {
        case 'NotAuthorizedException':
          errorMessage = 'Invalid email or password.';
          break;
        case 'UserNotFoundException':
          errorMessage = 'No account found with this email.';
          break;
        case 'UserNotConfirmedException':
          errorMessage = 'Please verify your email before logging in.';
          break;
        case 'TooManyRequestsException':
          errorMessage = 'Too many failed attempts. Please try again later.';
          break;
        case 'PasswordResetRequiredException':
          errorMessage = 'Password reset required. Please contact your administrator.';
          break;
      }
      
      return {
        success: false,
        message: errorMessage
      };
    }
  }

  /**
   * Set permanent password after temporary password login
   */
  async setPermanentPassword(email: string, temporaryPassword: string, newPassword: string): Promise<AuthResponse> {
    try {
      const response = await fetch('/api/auth/set-permanent-password', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          email,
          temporaryPassword,
          newPassword
        })
      });

      if (response.ok) {
        const result = await response.json();
        
        return {
          success: true,
          user: result.user,
          tokens: {
            accessToken: result.accessToken,
            idToken: result.idToken,
            refreshToken: result.refreshToken
          }
        };
      } else {
        const error = await response.json();
        return {
          success: false,
          message: error.error || 'Failed to set password'
        };
      }
    } catch (error: any) {
      return {
        success: false,
        message: error.message || 'Failed to set password'
      };
    }
  }

  /**
   * Sign out current user
   */
  async logout(): Promise<void> {
    try {
      await signOut();
    } catch (error) {
      console.error('Logout error:', error);
      // Even if logout fails, clear local state
    }
  }

  /**
   * Get current authenticated user
   */
  async getCurrentUser(): Promise<User | null> {
    try {
      const cognitoUser = await getCurrentUser();
      const session = await fetchAuthSession();
      
      if (cognitoUser && session.tokens) {
        return await this.getUserProfile(session.tokens.accessToken?.toString());
      }
      
      return null;
    } catch (error) {
      console.error('Get current user error:', error);
      return null;
    }
  }

  /**
   * Get user profile from backend
   */
  private async getUserProfile(accessToken?: string): Promise<User> {
    const response = await fetch('/api/auth/profile', {
      headers: accessToken ? {
        'Authorization': `Bearer ${accessToken}`
      } : {}
    });

    if (!response.ok) {
      throw new Error('Failed to get user profile');
    }

    return await response.json();
  }

  /**
   * Check if user is authenticated
   */
  async isAuthenticated(): Promise<boolean> {
    try {
      const session = await fetchAuthSession();
      return !!session.tokens?.accessToken;
    } catch (error) {
      return false;
    }
  }

  /**
   * Get access token for API calls
   */
  async getAccessToken(): Promise<string | null> {
    try {
      const session = await fetchAuthSession();
      return session.tokens?.accessToken?.toString() || null;
    } catch (error) {
      console.error('Get access token error:', error);
      return null;
    }
  }

  /**
   * Change password for current user
   */
  async changePassword(currentPassword: string, newPassword: string): Promise<{ success: boolean; message?: string }> {
    try {
      const accessToken = await this.getAccessToken();
      
      if (!accessToken) {
        return { success: false, message: 'Not authenticated' };
      }

      const response = await fetch('/api/auth/change-password', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${accessToken}`
        },
        body: JSON.stringify({
          currentPassword,
          newPassword
        })
      });

      if (response.ok) {
        return { success: true, message: 'Password changed successfully' };
      } else {
        const error = await response.json();
        return { success: false, message: error.error || 'Failed to change password' };
      }
    } catch (error: any) {
      return { success: false, message: error.message || 'Failed to change password' };
    }
  }

  /**
   * Request password reset (forgot password)
   */
  async requestPasswordReset(email: string): Promise<{ success: boolean; message: string }> {
    try {
      const response = await fetch('/api/auth/forgot-password', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ email })
      });

      const result = await response.json();
      
      return {
        success: response.ok,
        message: result.message || (response.ok ? 'Reset instructions sent' : 'Failed to send reset instructions')
      };
    } catch (error: any) {
      return {
        success: false,
        message: error.message || 'Failed to request password reset'
      };
    }
  }

  /**
   * Refresh authentication tokens
   */
  async refreshTokens(): Promise<boolean> {
    try {
      const session = await fetchAuthSession({ forceRefresh: true });
      return !!session.tokens?.accessToken;
    } catch (error) {
      console.error('Token refresh error:', error);
      return false;
    }
  }
}

// Export singleton instance
export const cognitoAuthService = new CognitoAuthService();