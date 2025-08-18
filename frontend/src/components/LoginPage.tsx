import React, { useState, useEffect } from 'react';
import { signIn, signOut, getCurrentUser, fetchAuthSession } from 'aws-amplify/auth';
import { Hub } from 'aws-amplify/utils';
import { useNavigate } from 'react-router-dom';
import './LoginPage.css';

interface User {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  role: 'teacher' | 'school_manager' | 'super_admin';
  schoolId: string;
  schoolName?: string;
}

interface AuthState {
  isAuthenticated: boolean;
  user: User | null;
  isLoading: boolean;
  error: string | null;
}

const LoginPage: React.FC = () => {
  const navigate = useNavigate();
  const [authState, setAuthState] = useState<AuthState>({
    isAuthenticated: false,
    user: null,
    isLoading: true,
    error: null
  });

  const [loginForm, setLoginForm] = useState({
    email: '',
    password: '',
    isLoading: false
  });

  const [passwordResetForm, setPasswordResetForm] = useState({
    email: '',
    isLoading: false,
    message: ''
  });

  const [newPasswordForm, setNewPasswordForm] = useState({
    email: '',
    temporaryPassword: '',
    newPassword: '',
    confirmPassword: '',
    isLoading: false
  });

  const [showPasswordReset, setShowPasswordReset] = useState(false);
  const [showNewPasswordForm, setShowNewPasswordForm] = useState(false);

  // Check authentication status on mount
  useEffect(() => {
    checkAuthStatus();
    
    // Listen for auth state changes
    const unsubscribe = Hub.listen('auth', (data) => {
      const { event } = data.payload;
      
      if (event === 'signIn') {
        checkAuthStatus();
      } else if (event === 'signOut') {
        setAuthState({
          isAuthenticated: false,
          user: null,
          isLoading: false,
          error: null
        });
      }
    });

    return () => unsubscribe();
  }, []);

  const checkAuthStatus = async () => {
    try {
      setAuthState(prev => ({ ...prev, isLoading: true }));
      
      const user = await getCurrentUser();
      const session = await fetchAuthSession();
      
      if (user && session.tokens) {
        // Get user profile from backend
        const response = await fetch('/api/auth/profile', {
          headers: {
            'Authorization': `Bearer ${session.tokens.accessToken}`
          }
        });
        
        if (response.ok) {
          const userProfile = await response.json();
          
          setAuthState({
            isAuthenticated: true,
            user: userProfile,
            isLoading: false,
            error: null
          });

          // Redirect based on user role
          redirectAfterLogin(userProfile.role);
        } else {
          throw new Error('Failed to get user profile');
        }
      }
    } catch (error) {
      setAuthState({
        isAuthenticated: false,
        user: null,
        isLoading: false,
        error: null
      });
    }
  };

  const redirectAfterLogin = (role: string) => {
    switch (role) {
      case 'teacher':
        navigate('/dashboard/teacher');
        break;
      case 'school_manager':
        navigate('/dashboard/manager');
        break;
      case 'super_admin':
        navigate('/dashboard/admin');
        break;
      default:
        navigate('/dashboard');
    }
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoginForm(prev => ({ ...prev, isLoading: true }));
    setAuthState(prev => ({ ...prev, error: null }));

    try {
      const signInResult = await signIn({
        username: loginForm.email,
        password: loginForm.password
      });

      if (signInResult.isSignedIn) {
        await checkAuthStatus();
      } else if (signInResult.nextStep?.signInStep === 'CONFIRM_SIGN_IN_WITH_NEW_PASSWORD_REQUIRED') {
        // User needs to set a new password
        setNewPasswordForm(prev => ({ 
          ...prev, 
          email: loginForm.email,
          temporaryPassword: loginForm.password 
        }));
        setShowNewPasswordForm(true);
      }
    } catch (error: any) {
      console.error('Login error:', error);
      
      let errorMessage = 'Login failed. Please try again.';
      
      if (error.name === 'NotAuthorizedException') {
        errorMessage = 'Invalid email or password.';
      } else if (error.name === 'UserNotFoundException') {
        errorMessage = 'No account found with this email.';
      } else if (error.name === 'UserNotConfirmedException') {
        errorMessage = 'Please verify your email before logging in.';
      } else if (error.name === 'TooManyRequestsException') {
        errorMessage = 'Too many failed attempts. Please try again later.';
      }
      
      setAuthState(prev => ({ ...prev, error: errorMessage }));
    } finally {
      setLoginForm(prev => ({ ...prev, isLoading: false }));
    }
  };

  const handleSetNewPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (newPasswordForm.newPassword !== newPasswordForm.confirmPassword) {
      setAuthState(prev => ({ ...prev, error: 'Passwords do not match.' }));
      return;
    }

    setNewPasswordForm(prev => ({ ...prev, isLoading: true }));

    try {
      const response = await fetch('/api/auth/set-permanent-password', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          email: newPasswordForm.email,
          temporaryPassword: newPasswordForm.temporaryPassword,
          newPassword: newPasswordForm.newPassword
        })
      });

      if (response.ok) {
        const result = await response.json();
        
        setAuthState({
          isAuthenticated: true,
          user: result.user,
          isLoading: false,
          error: null
        });

        redirectAfterLogin(result.user.role);
      } else {
        const error = await response.json();
        throw new Error(error.error || 'Failed to set password');
      }
    } catch (error: any) {
      setAuthState(prev => ({ ...prev, error: error.message }));
    } finally {
      setNewPasswordForm(prev => ({ ...prev, isLoading: false }));
    }
  };

  const handleLogout = async () => {
    try {
      await signOut();
      setAuthState({
        isAuthenticated: false,
        user: null,
        isLoading: false,
        error: null
      });
      navigate('/login');
    } catch (error) {
      console.error('Logout error:', error);
    }
  };

  // Loading state
  if (authState.isLoading) {
    return (
      <div className="login-container">
        <div className="login-form">
          <div className="loading">Loading...</div>
        </div>
      </div>
    );
  }

  // Already authenticated - show user info
  if (authState.isAuthenticated && authState.user) {
    return (
      <div className="login-container">
        <div className="login-form">
          <h2>Welcome, {authState.user.firstName}!</h2>
          <p>You are logged in as a {authState.user.role.replace('_', ' ')}.</p>
          <p>School: {authState.user.schoolName || 'Platform Admin'}</p>
          <button onClick={handleLogout} className="logout-button">
            Logout
          </button>
        </div>
      </div>
    );
  }

  // Show new password form
  if (showNewPasswordForm) {
    return (
      <div className="login-container">
        <div className="login-form">
          <h2>Set New Password</h2>
          <p>Please set a new password to continue.</p>
          
          {authState.error && (
            <div className="error-message">{authState.error}</div>
          )}

          <form onSubmit={handleSetNewPassword}>
            <div className="form-group">
              <label htmlFor="newPassword">New Password:</label>
              <input
                type="password"
                id="newPassword"
                value={newPasswordForm.newPassword}
                onChange={(e) => setNewPasswordForm(prev => ({ 
                  ...prev, newPassword: e.target.value 
                }))}
                required
                minLength={12}
                placeholder="Minimum 12 characters"
              />
            </div>

            <div className="form-group">
              <label htmlFor="confirmPassword">Confirm Password:</label>
              <input
                type="password"
                id="confirmPassword"
                value={newPasswordForm.confirmPassword}
                onChange={(e) => setNewPasswordForm(prev => ({ 
                  ...prev, confirmPassword: e.target.value 
                }))}
                required
                minLength={12}
              />
            </div>

            <button 
              type="submit" 
              disabled={newPasswordForm.isLoading}
              className="submit-button"
            >
              {newPasswordForm.isLoading ? 'Setting Password...' : 'Set Password'}
            </button>
          </form>

          <button 
            onClick={() => setShowNewPasswordForm(false)}
            className="link-button"
          >
            Back to Login
          </button>
        </div>
      </div>
    );
  }

  // Show password reset form
  if (showPasswordReset) {
    return (
      <div className="login-container">
        <div className="login-form">
          <h2>Reset Password</h2>
          
          {passwordResetForm.message && (
            <div className="success-message">{passwordResetForm.message}</div>
          )}

          <form onSubmit={(e) => {
            e.preventDefault();
            // TODO: Implement password reset
            setPasswordResetForm(prev => ({ 
              ...prev, 
              message: 'Password reset functionality will be implemented soon.' 
            }));
          }}>
            <div className="form-group">
              <label htmlFor="resetEmail">Email:</label>
              <input
                type="email"
                id="resetEmail"
                value={passwordResetForm.email}
                onChange={(e) => setPasswordResetForm(prev => ({ 
                  ...prev, email: e.target.value 
                }))}
                required
              />
            </div>

            <button 
              type="submit" 
              disabled={passwordResetForm.isLoading}
              className="submit-button"
            >
              {passwordResetForm.isLoading ? 'Sending...' : 'Send Reset Link'}
            </button>
          </form>

          <button 
            onClick={() => setShowPasswordReset(false)}
            className="link-button"
          >
            Back to Login
          </button>
        </div>
      </div>
    );
  }

  // Login form
  return (
    <div className="login-container">
      <div className="login-form">
        <h1>ClassReflect</h1>
        <h2>Login</h2>
        
        {authState.error && (
          <div className="error-message">{authState.error}</div>
        )}

        <form onSubmit={handleLogin}>
          <div className="form-group">
            <label htmlFor="email">Email:</label>
            <input
              type="email"
              id="email"
              value={loginForm.email}
              onChange={(e) => setLoginForm(prev => ({ 
                ...prev, email: e.target.value 
              }))}
              required
              disabled={loginForm.isLoading}
            />
          </div>

          <div className="form-group">
            <label htmlFor="password">Password:</label>
            <input
              type="password"
              id="password"
              value={loginForm.password}
              onChange={(e) => setLoginForm(prev => ({ 
                ...prev, password: e.target.value 
              }))}
              required
              disabled={loginForm.isLoading}
            />
          </div>

          <button 
            type="submit" 
            disabled={loginForm.isLoading}
            className="submit-button"
          >
            {loginForm.isLoading ? 'Logging in...' : 'Login'}
          </button>
        </form>

        <button 
          onClick={() => setShowPasswordReset(true)}
          className="link-button"
        >
          Forgot Password?
        </button>

        <div className="login-help">
          <p>
            <strong>No account?</strong> Accounts are created by school administrators. 
            Contact your school's ClassReflect administrator for access.
          </p>
        </div>
      </div>
    </div>
  );
};

export default LoginPage;