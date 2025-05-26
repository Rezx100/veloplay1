import { createClient } from '@supabase/supabase-js';

// Get environment variables from the backend through window global variables
declare global {
  interface Window {
    SUPABASE_URL?: string;
    SUPABASE_ANON_KEY?: string;
  }
}

// We need to hard-code the values for development
// These will be overridden by environment variables in production
const SUPABASE_URL = 'https://cozhbakfzyykdcmccxnb.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNvemhiYWtmenl5a2RjbWNjeG5iIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDY4Mzg4OTYsImV4cCI6MjA2MjQxNDg5Nn0.K9KyGR1p4qMek3-MdqZLyu0tMd24fuolcGdJNuWVY1w';

console.log('Client Supabase URL:', SUPABASE_URL);
console.log('Client Supabase Anon Key:', SUPABASE_ANON_KEY ? SUPABASE_ANON_KEY.substring(0, 5) + '...' : 'missing');

// Create the Supabase client with additional options for better error handling
export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: {
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: true,
    flowType: 'pkce' // Use PKCE flow for better security and more reliable email verification
  }
});

// Auth methods
export async function signUp(email: string, password: string, firstName?: string, lastName?: string) {
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: {
        first_name: firstName,
        last_name: lastName
      }
    }
  });
  
  return { data, error };
}

export async function signIn(email: string, password: string) {
  try {
    // Log attempt (don't log password)
    console.log(`Attempting to sign in user: ${email}`);
    
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password
    });
    
    if (error) {
      console.error("Supabase auth error:", error.message);
    } else {
      console.log("Sign in successful, session established");
    }
    
    return { data, error };
  } catch (error) {
    console.error("Unexpected error during signIn:", error);
    return { 
      data: null, 
      error: { 
        message: error instanceof Error ? error.message : "An unexpected error occurred during login" 
      } 
    };
  }
}

export async function signOut() {
  const { error } = await supabase.auth.signOut();
  return { error };
}

export async function getCurrentUser() {
  const { data, error } = await supabase.auth.getUser();
  return { user: data?.user, error };
}

export async function getSession() {
  const { data, error } = await supabase.auth.getSession();
  return { session: data?.session, error };
}

// Function to get the current token for API calls
export async function getAuthToken() {
  const { data } = await supabase.auth.getSession();
  return data?.session?.access_token;
}

// Check if the user's email is verified (returns Promise<boolean>)
export async function isEmailVerified(): Promise<boolean> {
  try {
    // Check URL for verification success flag (set by the auth callback)
    const urlParams = new URLSearchParams(window.location.search);
    const verificationParam = urlParams.get('verification');
    
    // If verification=success is in the URL, immediately consider as verified
    if (verificationParam === 'success') {
      console.log("Verification success detected in URL parameters!");
      
      // Save verification status to localStorage to maintain across pages
      localStorage.setItem('email_verified', 'true');
      return true;
    }
    
    // Check if we have previously stored verification state
    if (localStorage.getItem('email_verified') === 'true') {
      console.log("User verified status found in localStorage");
      return true;
    }
    
    // Get current user from Supabase
    const { data, error } = await supabase.auth.getUser();
    
    if (error) {
      console.error("Error checking email verification with Supabase:", error);
      return false;
    }
    
    if (!data.user) {
      return false;
    }
    
    // Check primary method - email_confirmed_at property
    if (data.user.email_confirmed_at !== null) {
      console.log("User email verified at:", data.user.email_confirmed_at);
      // Store verification status for future checks
      localStorage.setItem('email_verified', 'true');
      return true;
    }
    
    // Get the current auth token to pass to the server
    const token = await getAuthToken();
    
    // Check with server API as a backup
    if (token) {
      try {
        const response = await fetch('/api/auth/check-verification-status', {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
          },
        });
        
        if (response.ok) {
          const result = await response.json();
          if (result.verified === true) {
            console.log("Server confirms email is verified");
            localStorage.setItem('email_verified', 'true');
            return true;
          }
        }
      } catch (serverError) {
        console.error("Error checking verification with server:", serverError);
      }
    }
    
    // Check if user has a valid session as final fallback
    const { data: sessionData } = await supabase.auth.getSession();
    if (sessionData?.session?.user?.aud === 'authenticated') {
      const isActive = !!sessionData.session?.expires_at && 
                      new Date(sessionData.session.expires_at * 1000) > new Date();
      if (isActive) {
        // Having an active, authenticated session may indicate verification
        console.log("User has active authenticated session - treating as verified");
        
        // Try one extra check - if the session is new (created in the last 5 minutes)
        // and we have a returnUrl in localStorage, assume this is a post-verification session
        const sessionCreatedAt = sessionData.session?.created_at;
        const fiveMinutesAgo = Math.floor(Date.now() / 1000) - 300; // 5 minutes in seconds
        
        if (sessionCreatedAt && sessionCreatedAt > fiveMinutesAgo) {
          console.log("Recent session detected - assuming verified after auth callback");
          localStorage.setItem('email_verified', 'true');
          return true;
        }
      }
    }
    
    console.log("Email is not verified after all checks");
    return false;
  } catch (error) {
    console.error("Unexpected error in email verification check:", error);
    return false;
  }
}