import express from 'express';
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config();

const router = express.Router();

// Get the Supabase URL and service role key from environment variables
const supabaseUrl = 'https://cozhbakfzyykdcmccxnb.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNvemhiYWtmenl5a2RjbWNjeG5iIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDY4Mzg4OTYsImV4cCI6MjA2MjQxNDg5Nn0.K9KyGR1p4qMek3-MdqZLyu0tMd24fuolcGdJNuWVY1w';

console.log('Server Supabase URL:', supabaseUrl);
console.log('Server Supabase Anon Key:', `${supabaseAnonKey.substring(0, 5)}...`);

// Create the Supabase client
const supabase = createClient(supabaseUrl, supabaseAnonKey);

// Route to handle callback from email verification
router.get('/callback', async (req, res) => {
  try {
    const { code } = req.query;
    
    // If no code is provided, redirect to login with error
    if (!code) {
      return res.redirect('/login?error=missing_code');
    }
    
    // Log the callback code (first 5 chars for security)
    console.log(`Auth callback received with code: ${String(code).substring(0, 5)}...`);
    
    // For security, we don't process the code on the server-side
    // Instead, we redirect to the client-side auth callback page that will handle the code
    res.redirect(`/auth-callback?code=${code}`);
  } catch (error: any) {
    console.error('Auth callback error:', error.message);
    res.redirect('/login?error=verification_failed');
  }
});

// Route to handle user verification status
router.get('/verify-status', async (req, res) => {
  try {
    const { email } = req.query;
    
    if (!email) {
      return res.status(400).json({ error: 'Email is required' });
    }
    
    // Use the Supabase API to check user status
    // Since we can't directly check if an email is verified without admin privileges,
    // we'll use a workaround by attempting to sign in with OTP
    const { data, error } = await supabase.auth.signInWithOtp({
      email: String(email),
      options: {
        shouldCreateUser: false // Don't create a new user if they don't exist
      }
    });
    
    if (error && !error.message.includes('Email not confirmed')) {
      return res.status(400).json({ error: error.message });
    }
    
    // If the error message contains "Email not confirmed", user exists but isn't verified
    const isEmailNotConfirmed = error?.message.includes('Email not confirmed');
    
    // Return verification status
    res.json({
      verified: !isEmailNotConfirmed,
      message: isEmailNotConfirmed ? 'Email not confirmed' : 'Email confirmed or user not found'
    });
  } catch (error: any) {
    console.error('Verify status error:', error.message);
    res.status(500).json({ error: 'Failed to check verification status' });
  }
});

export default router;