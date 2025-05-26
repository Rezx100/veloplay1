import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import { Request, Response, NextFunction } from 'express';
import { db } from './db';
import { users } from '@shared/schema';
import { eq } from 'drizzle-orm';

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key';

export interface AuthUser {
  id: string;
  email: string;
  fullName: string;
  isVerified: boolean;
  isAdmin: boolean;
}

// Generate JWT token
export function generateToken(user: AuthUser): string {
  return jwt.sign(
    { 
      id: user.id, 
      email: user.email, 
      isVerified: user.isVerified,
      isAdmin: user.isAdmin 
    },
    JWT_SECRET,
    { expiresIn: '7d' }
  );
}

// Verify JWT token
export function verifyToken(token: string): AuthUser | null {
  try {
    const decoded = jwt.verify(token, JWT_SECRET) as any;
    return {
      id: decoded.id,
      email: decoded.email,
      fullName: decoded.fullName,
      isVerified: decoded.isVerified,
      isAdmin: decoded.isAdmin
    };
  } catch {
    return null;
  }
}

// Hash password
export async function hashPassword(password: string): Promise<string> {
  return await bcrypt.hash(password, 12);
}

// Verify password
export async function verifyPassword(password: string, hashedPassword: string): Promise<boolean> {
  return await bcrypt.compare(password, hashedPassword);
}

// Auth middleware
export async function authMiddleware(req: Request & { user?: AuthUser }, res: Response, next: NextFunction) {
  try {
    const token = req.headers.authorization?.replace('Bearer ', '') || req.cookies?.auth_token;
    
    if (!token) {
      return res.status(401).json({ error: 'No token provided' });
    }

    const decoded = verifyToken(token);
    if (!decoded) {
      return res.status(401).json({ error: 'Invalid token' });
    }

    // Get fresh user data from database
    const [user] = await db.select().from(users).where(eq(users.id, decoded.id));
    if (!user) {
      return res.status(401).json({ error: 'User not found' });
    }

    req.user = {
      id: user.id,
      email: user.email || '',
      fullName: `${user.firstName || ''} ${user.lastName || ''}`.trim() || 'User',
      isVerified: user.isVerified || false,
      isAdmin: user.isAdmin || false
    } as AuthUser;

    next();
  } catch (error) {
    return res.status(401).json({ error: 'Authentication failed' });
  }
}

// Check if user is verified
export function requireVerified(req: Request & { user?: AuthUser }, res: Response, next: NextFunction) {
  if (!req.user?.isVerified) {
    return res.status(403).json({ error: 'Email verification required' });
  }
  next();
}

// Check if user is admin
export function requireAdmin(req: Request & { user?: AuthUser }, res: Response, next: NextFunction) {
  if (!req.user?.isAdmin) {
    return res.status(403).json({ error: 'Admin access required' });
  }
  next();
}