import 'express-session';

declare module 'express-session' {
  interface SessionData {
    // OTP verification properties
    otpCode?: string;
    otpUserId?: string;
    otpEmail?: string;
    otpExpires?: number;
  }
}