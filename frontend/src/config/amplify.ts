// AWS Amplify configuration for Cognito integration
import { Amplify } from 'aws-amplify';

// Use Vite's import.meta.env instead of process.env
const amplifyConfig = {
  Auth: {
    Cognito: {
      // These values will be set via environment variables
      userPoolId: import.meta.env.VITE_COGNITO_USER_POOL_ID || '',
      userPoolClientId: import.meta.env.VITE_COGNITO_CLIENT_ID || '',
      region: import.meta.env.VITE_AWS_REGION || 'eu-west-2',
      
      // Optional: Hosted UI configuration (only if using hosted UI)
      // loginWith: {
      //   oauth: {
      //     domain: import.meta.env.VITE_COGNITO_DOMAIN || 'classreflect-auth',
      //     scopes: ['email', 'openid', 'profile'],
      //     redirectSignIn: [
      //       import.meta.env.VITE_APP_URL || 'http://localhost:3000',
      //       `${import.meta.env.VITE_APP_URL || 'http://localhost:3000'}/auth/callback`
      //     ],
      //     redirectSignOut: [
      //       import.meta.env.VITE_APP_URL || 'http://localhost:3000',
      //       `${import.meta.env.VITE_APP_URL || 'http://localhost:3000'}/auth/logout`
      //     ],
      //     responseType: 'code' as const
      //   }
      // }
    }
  },
  
  // API configuration for backend calls
  API: {
    REST: {
      classreflect: {
        endpoint: import.meta.env.VITE_API_URL || 'http://localhost:3001/api',
        region: import.meta.env.VITE_AWS_REGION || 'eu-west-2'
      }
    }
  }
};

// Only configure Amplify if we have the required config
// This prevents errors when Cognito is not yet set up
if (import.meta.env.VITE_COGNITO_USER_POOL_ID && import.meta.env.VITE_COGNITO_CLIENT_ID) {
  console.log('Configuring AWS Amplify with Cognito');
  Amplify.configure(amplifyConfig);
} else {
  console.log('Cognito configuration not found - using fallback authentication');
}

export default amplifyConfig;