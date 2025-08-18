import { AuthenticatedUser } from '../middleware/auth-cognito';

declare global {
  namespace Express {
    interface Request {
      user?: AuthenticatedUser;
    }
  }
}

export {};