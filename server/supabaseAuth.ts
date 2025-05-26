import { Request, Response, NextFunction } from "express";
import { createClient } from "@supabase/supabase-js";
import { storage } from "./storage";
import { User } from "@shared/schema";

// Extend Express.Request to include the user
declare module "express" {
    interface Request {
      user?: User;
    }
}

// Create Supabase client with server-side credentials
const SUPABASE_URL = 'https://cozhbakfzyykdcmccxnb.supabase.co';
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNvemhiYWtmenl5a2RjbWNjeG5iIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDY4Mzg4OTYsImV4cCI6MjA2MjQxNDg5Nn0.K9KyGR1p4qMek3-MdqZLyu0tMd24fuolcGdJNuWVY1w';

console.log("Supabase URL:", SUPABASE_URL);
console.log("Supabase Anon Key (first 5 chars):", SUPABASE_SERVICE_KEY.substring(0, 5) + '...');

export const supabaseClient = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

// Middleware to check if user is authenticated
export const isAuthenticated = async (req: Request, res: Response, next: NextFunction) => {
  try {
    // Get the JWT token from Authorization header
    const authHeader = req.headers.authorization;
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ message: "Authentication required" });
    }
    
    const token = authHeader.split(' ')[1];
    
    // Verify the token with Supabase
    const { data: { user }, error } = await supabaseClient.auth.getUser(token);
    
    if (error || !user) {
      return res.status(401).json({ message: "Invalid or expired token" });
    }
    
    // Get user from our database to check is_verified status
    let dbUser = await storage.getUserById(user.id);
    
    if (!dbUser) {
      // User doesn't exist in our database yet, create them (only verified users reach this point)
      dbUser = await storage.upsertUser({
        id: user.id,
        email: user.email || '',
        firstName: user.user_metadata.first_name,
        lastName: user.user_metadata.last_name,
        profileImageUrl: user.user_metadata.avatar_url,
        isAdmin: false,
        isVerified: true, // Only verified users reach this point
      });
    }
    
    // SECURITY FIX: Strict verification enforcement - block ALL unverified users
    if (!dbUser.isVerified) {
      console.log(`🚫 SECURITY BLOCK: User ${dbUser.email} has is_verified=FALSE, denying access`);
      return res.status(403).json({ 
        message: "Email verification required. Please verify your email address before accessing this content.",
        requiresVerification: true
      });
    }
    
    // Attach user to request
    req.user = dbUser;
    next();
  } catch (error) {
    console.error("Authentication error:", error);
    return res.status(401).json({ message: "Authentication failed" });
  }
};