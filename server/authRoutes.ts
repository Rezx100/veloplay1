import { Router } from 'express';
import { storage } from './neonStorage';
import { generateToken, hashPassword, verifyPassword, authMiddleware } from './auth';
import { z } from 'zod';

const router = Router();

// Validation schemas
const signupSchema = z.object({
  email: z.string().email(),
  password: z.string().min(6),
  firstName: z.string().min(1),
  lastName: z.string().min(1),
});

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

// Sign up endpoint
router.post('/signup', async (req, res) => {
  try {
    const { email, password, firstName, lastName } = signupSchema.parse(req.body);
    
    // Check if user already exists
    const existingUser = await storage.getUserByEmail(email);
    if (existingUser) {
      return res.status(400).json({ error: 'User already exists' });
    }
    
    // Hash password and create user
    const hashedPassword = await hashPassword(password);
    const user = await storage.upsertUser({
      email,
      passwordHash: hashedPassword,
      firstName,
      lastName,
      isVerified: false,
      isAdmin: false,
    });
    
    // Generate JWT token
    const token = generateToken({
      id: user.id,
      email: user.email || '',
      fullName: `${user.firstName} ${user.lastName}`,
      isVerified: user.isVerified || false,
      isAdmin: user.isAdmin || false,
    });
    
    res.json({
      success: true,
      token,
      user: {
        id: user.id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        isVerified: user.isVerified,
        isAdmin: user.isAdmin,
      }
    });
  } catch (error) {
    console.error('Signup error:', error);
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: 'Invalid input data' });
    }
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Login endpoint
router.post('/login', async (req, res) => {
  try {
    const { email, password } = loginSchema.parse(req.body);
    console.log('🔍 Login attempt for:', email);
    
    // Find user by email
    const user = await storage.getUserByEmail(email);
    console.log('🔍 Found user:', user ? { id: user.id, email: user.email, hasPassword: !!user.passwordHash } : 'No user found');
    
    if (!user || !user.passwordHash) {
      console.log('❌ User not found or no password hash');
      return res.status(401).json({ error: 'Invalid credentials' });
    }
    
    // Verify password
    console.log('🔍 Verifying password...');
    const isValidPassword = await verifyPassword(password, user.passwordHash);
    console.log('🔍 Password valid:', isValidPassword);
    
    if (!isValidPassword) {
      console.log('❌ Invalid password');
      return res.status(401).json({ error: 'Invalid credentials' });
    }
    
    // Generate JWT token
    const token = generateToken({
      id: user.id,
      email: user.email || '',
      fullName: `${user.firstName} ${user.lastName}`,
      isVerified: user.isVerified || false,
      isAdmin: user.isAdmin || false,
    });
    
    res.json({
      success: true,
      token,
      user: {
        id: user.id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        isVerified: user.isVerified,
        isAdmin: user.isAdmin,
      }
    });
  } catch (error) {
    console.error('Login error:', error);
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: 'Invalid input data' });
    }
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get current user endpoint
router.get('/user', authMiddleware, async (req: any, res) => {
  try {
    const user = req.user;
    res.json({
      success: true,
      user: {
        id: user.id,
        email: user.email,
        fullName: user.fullName,
        isVerified: user.isVerified,
        isAdmin: user.isAdmin,
      }
    });
  } catch (error) {
    console.error('Get user error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Verify email endpoint
router.post('/verify-email', authMiddleware, async (req: any, res) => {
  try {
    const userId = req.user.id;
    
    // Update user verification status
    await storage.updateUserVerificationStatus(userId, true);
    
    res.json({
      success: true,
      message: 'Email verified successfully'
    });
  } catch (error) {
    console.error('Email verification error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export { router as authRoutes };