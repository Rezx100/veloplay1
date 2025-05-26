import { createClient } from '@supabase/supabase-js';

// Get the Supabase URL and anon key from the environment variables
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Missing required Supabase environment variables for client');
}

console.log('Client Supabase URL:', supabaseUrl);
console.log('Client Supabase Anon Key:', `${supabaseAnonKey.substring(0, 5)}...`);

// Create a Supabase client instance
export const supabaseClient = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: true, // Enables detection of OAuth redirects
  }
});

// Set up a listener for auth state changes to enforce email verification
supabaseClient.auth.onAuthStateChange(async (event, session) => {
  console.log('Auth state change:', event);
  
  // If the user just signed in, check if their email is verified
  if ((event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED' || event === 'INITIAL_SESSION') && session?.user) {
    if (!session.user.email_confirmed_at) {
      console.warn('⚠️ User with unverified email detected - letting backend handle verification check');
      // Don't force sign out here - let the backend middleware handle verification
      localStorage.setItem('email_verified', 'false');
    } else {
      // Store verification status in localStorage for additional security check
      localStorage.setItem('email_verified', 'true');
      console.log('User signed in with verified email');
    }
  }
});

// Enhanced authentication functions for email verification enforcement
export const signInWithEmailPassword = async (email: string, password: string) => {
  try {
    // First attempt the sign in
    const { data, error } = await supabaseClient.auth.signInWithPassword({
      email,
      password
    });
    
    if (error) {
      return { user: null, error };
    }
    
    // If login succeeded, explicitly check if the email is verified
    if (data?.user) {
      if (!data.user.email_confirmed_at) {
        // If email is not verified, immediately sign out and return an error
        await supabaseClient.auth.signOut();
        return { 
          user: null, 
          error: { 
            message: 'Email verification required. Please check your inbox for the verification link.', 
            status: 400 
          } 
        };
      }
      return { user: data.user, error: null };
    }
    
    return { user: null, error: { message: 'Login failed', status: 400 } };
  } catch (error) {
    console.error('Sign in error:', error);
    return { 
      user: null, 
      error: { 
        message: 'An unexpected error occurred', 
        status: 500 
      } 
    };
  }
};

// Simple utility to get the current user
export const getCurrentUser = async () => {
  const { data, error } = await supabaseClient.auth.getUser();
  if (error) {
    console.error('Error getting current user:', error);
    return null;
  }
  return data?.user || null;
};

// Check if the user's email is verified
export const isEmailVerified = async () => {
  const { data, error } = await supabaseClient.auth.getUser();
  if (error || !data.user) {
    return false;
  }
  
  return data.user.email_confirmed_at !== null;
};

// Handle email verification callbacks
export const handleEmailVerification = async (code: string) => {
  try {
    const { data, error } = await supabaseClient.auth.exchangeCodeForSession(code);
    if (error) throw error;
    return { success: true, session: data.session };
  } catch (error) {
    console.error('Error handling email verification:', error);
    return { success: false, error };
  }
};