// API configuration for backend calls
export const apiConfig = {
  endpoint: import.meta.env.VITE_API_URL || 'http://localhost:3001/api',
  region: import.meta.env.VITE_AWS_REGION || 'eu-west-2'
};

console.log('Using JWT authentication - Cognito removed');

export default apiConfig;