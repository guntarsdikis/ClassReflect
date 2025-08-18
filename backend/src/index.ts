import express, { Application, Request, Response } from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { initializeDatabase } from './database';
import pool from './database';

// Import routes
import authRoutes, { initializeAuthRoutes } from './routes/auth';
import usersRoutes, { initializeUsersRoutes } from './routes/users';
import uploadRoutes from './routes/upload';
import jobsRoutes from './routes/jobs';
import schoolsRoutes from './routes/schools';
import teachersRoutes from './routes/teachers';

dotenv.config();

const app: Application = express();
const PORT = process.env.PORT || 3000;

app.use(cors({
  origin: process.env.FRONTEND_URL || 'https://classreflect.gdwd.co.uk',
  credentials: true
}));

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

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
      teachers: '/api/teachers'
    }
  });
});

// Initialize routes with database pool
initializeAuthRoutes(pool);
initializeUsersRoutes(pool);

// API Routes
app.use('/api/auth', authRoutes);
app.use('/api/users', usersRoutes);
app.use('/api/upload', uploadRoutes);
app.use('/api/jobs', jobsRoutes);
app.use('/api/schools', schoolsRoutes);
app.use('/api/teachers', teachersRoutes);

// Error handling middleware
app.use((err: any, req: Request, res: Response, next: any) => {
  console.error('Error:', err);
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