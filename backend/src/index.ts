import express, { Application, Request, Response } from 'express';
import cors from 'cors';
import dotenv from 'dotenv';

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
    version: '1.0.0'
  });
});

app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});