import { authenticator } from 'otplib';
import { storage } from '../storage';
import { sendOtpEmail } from './emailService';
import { InsertOtp } from '@shared/schema';

// Configure OTP settings
authenticator.options = {
  digits: 6,
  step: 1800, // 30 minutes - increasing from 5 minutes to give users more time to enter the code
};

// Generate a random secret for the user
const generateSecret = (userId: string) => {
  return authenticator.generateSecret() + userId.substring(0, 8);
};

// Generate an OTP code
const generateOtpCode = (secret: string) => {
  return authenticator.generate(secret);
};

// Create and send OTP to user
export const createAndSendOtp = async (userId: string, email: string, userName: string) => {
  try {
    // Generate a secret for this user
    const secret = generateSecret(userId);
    
    // Generate an OTP code
    const code = generateOtpCode(secret);
    
    // Calculate expiration (30 minutes from now to match authenticator setting)
    const expiresAt = new Date();
    expiresAt.setMinutes(expiresAt.getMinutes() + 30);
    
    // Store the OTP in database
    const otpData: InsertOtp = {
      userId: userId,
      code: code,
      expiresAt: expiresAt,
      isUsed: false
    };
    
    const otp = await storage.createOtp(otpData);
    
    // Send OTP email to the user
    await sendOtpEmail(email, userName, code);
    
    return { success: true, otp };
  } catch (error) {
    console.error('Error creating and sending OTP:', error);
    return { success: false, error };
  }
};

// Verify an OTP code for a user
export const verifyOtp = async (userId: string, code: string) => {
  try {
    // Get the OTP for this user and code
    const otp = await storage.getOtpByUserIdAndCode(userId, code);
    
    if (!otp) {
      return { success: false, message: 'Invalid OTP code' };
    }
    
    // Check if OTP is expired
    const now = new Date();
    const expiresAt = new Date(otp.expiresAt);
    
    if (now > expiresAt) {
      return { success: false, message: 'OTP has expired' };
    }
    
    // Mark OTP as used
    await storage.markOtpAsUsed(otp.id);
    
    return { success: true };
  } catch (error) {
    console.error('Error verifying OTP:', error);
    return { success: false, error, message: 'Failed to verify OTP' };
  }
};

// Check if a user has any active OTPs
export const hasActiveOtps = async (userId: string) => {
  try {
    const activeOtps = await storage.getActiveOtpsByUserId(userId);
    return { hasActive: activeOtps.length > 0, count: activeOtps.length };
  } catch (error) {
    console.error('Error checking active OTPs:', error);
    return { hasActive: false, error, count: 0 };
  }
};