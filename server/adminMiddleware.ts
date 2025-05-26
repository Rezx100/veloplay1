import { Request, Response, NextFunction } from "express";
import { storage } from "./storage";

// Middleware to check if user has admin privileges
export const isAdmin = async (req: Request, res: Response, next: NextFunction) => {
  try {
    if (!req.user) {
      return res.status(401).json({ message: "Authentication required" });
    }
    
    const userId = req.user.id;
    const user = await storage.getUser(userId);
    
    // Check admin status from database only
    if (!user?.isAdmin) {
      return res.status(403).json({ message: "Admin access required" });
    }
    
    next();
  } catch (error) {
    console.error("Admin verification error:", error);
    return res.status(500).json({ message: "Server error during authorization check" });
  }
};