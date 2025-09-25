import dotenv from 'dotenv';
// Load environment variables first
dotenv.config();

import express, { Application, Request, Response } from 'express';
import cors from 'cors';
import { initializeDatabase } from './database';
import pool from './database';
// Import environment configuration
import { config } from './config/environment';

// Import routes and auth configuration
import { initializeAuth, authConfig } from './config/auth.config';
import uploadRoutes from './routes/upload-new';
import jobsRoutes from './routes/jobs';
import schoolsRoutes from './routes/schools';
import teachersRoutes from './routes/teachers';
import templatesRoutes from './routes/templates';
import analysisRoutes, { initializeAnalysisRoutes } from './routes/analysis';
import settingsRoutes, { initializeSettingsRoutes } from './routes/settings';

const app: Application = express();
const PORT = process.env.PORT || 3000;

app.use(cors({
  origin: [
    process.env.FRONTEND_URL || 'https://classreflect.gdwd.co.uk',
    'https://main.djiffqj77jjfx.amplifyapp.com'
  ],
  credentials: true
}));

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Debug middleware to log all requests
app.use((req, res, next) => {
  console.log(`📨 ${req.method} ${req.path} - ${new Date().toISOString()}`);
  if (req.path.includes('/analysis')) {
    console.log('   🎯 Analysis request detected!');
    console.log('   Headers:', Object.keys(req.headers));
  }
  next();
});

app.get('/health', (req: Request, res: Response) => {
  res.status(200).json({ 
    status: 'healthy',
    timestamp: new Date().toISOString(),
    service: 'ClassReflect API'
  });
});

app.get('/', (req: Request, res: Response) => {
  res.json({ 
    message: 'ClassReflect API',
    version: '1.0.0',
    endpoints: {
      auth: '/api/auth',
      users: '/api/users',
      upload: '/api/upload',
      jobs: '/api/jobs',
      schools: '/api/schools',
      teachers: '/api/teachers',
      templates: '/api/templates',
      analysis: '/api/analysis'
    }
  });
});

// Initialize authentication system (Cognito or JWT based on config)
const { authRoutes, usersRoutes } = initializeAuth(pool);

// Initialize analysis routes
initializeAnalysisRoutes(pool);
initializeSettingsRoutes(pool);

// API Routes
app.use('/api/auth', authRoutes);
app.use('/api/users', usersRoutes);
app.use('/api/upload', uploadRoutes);
app.use('/api/jobs', jobsRoutes);
app.use('/api/schools', schoolsRoutes);
app.use('/api/teachers', teachersRoutes);
app.use('/api/templates', templatesRoutes);
console.log('🔧 Mounting analysis routes at /api/analysis');
app.use('/api/analysis', analysisRoutes);
app.use('/api/settings', settingsRoutes);

// Error handling middleware
app.use((err: any, req: Request, res: Response, next: any) => {
  console.error('🚨 Express Error Handler:', err);
  console.error('🚨 Request:', req.method, req.path);
  res.status(err.status || 500).json({
    error: err.message || 'Internal server error'
  });
});

// Initialize database connection
initializeDatabase().then(() => {
  app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
  });
}).catch(error => {
  console.error('Failed to initialize:', error);
  // Start server anyway for health checks
  app.listen(PORT, () => {
    console.log(`Server running on port ${PORT} (without database)`);
  });
});
