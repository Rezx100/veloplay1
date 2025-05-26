import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { supabase, getCurrentUser, getSession, isEmailVerified } from "@/lib/supabaseClient";
import { User } from "@shared/schema";

// Define the shape of the combined user data that we return from this hook
interface CombinedUserData {
  id: string;
  email: string;
  firstName: string | null;
  lastName: string | null;
  profileImageUrl: string | null;
  fullName: string;
  isAdmin: boolean;
}

export function useAuth() {
  const queryClient = useQueryClient();
  const [isLoading, setIsLoading] = useState(true);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isEmailVerified, setIsEmailVerified] = useState(true); // Default to true to prevent logout
  const [supabaseUser, setSupabaseUser] = useState<any>(null);
  
  // Try to get profile from database if authenticated
  const { data: userProfile, isLoading: isProfileLoading } = useQuery<User | null>({
    queryKey: ["/api/auth/user"],
    retry: false,
    enabled: isAuthenticated,
    refetchOnWindowFocus: false,
  });

  // SECURITY FIX: Server-only verification check
  async function checkEmailVerification(email: string | undefined): Promise<boolean> {
    if (!email) return false;
    
    try {
      // Get the current auth token to pass to the server
      const { data: { session } } = await supabase.auth.getSession();
      const token = session?.access_token;
      
      if (!token) {
        console.log("No auth token available for verification check");
        return false;
      }
      
      // Check with server API for real verification status
      const response = await fetch('/api/auth/check-verification-status', {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
      });
      
      if (response.ok) {
        const result = await response.json();
        const isVerified = result.verified === true;
        console.log(`Server verification check for ${email}: ${isVerified ? 'VERIFIED' : 'NOT VERIFIED'}`);
        return isVerified;
      } else {
        console.log("Server verification check failed");
        return false;
      }
    } catch (error) {
      console.error("Error checking verification with server:", error);
      return false;
    }
  }

  useEffect(() => {
    async function getUser() {
      try {
        const { data, error } = await supabase.auth.getUser();
        
        if (error || !data.user) {
          setIsAuthenticated(false);
          setSupabaseUser(null);
          setIsEmailVerified(false);
          setIsLoading(false);
          return;
        }

        const user = data.user;
        setIsAuthenticated(true);
        setSupabaseUser(user);

        // Check email verification status
        if (user.email) {
          // Check local cache first for faster loading
          const cachedVerification = localStorage.getItem('email_verified');
          if (cachedVerification === 'true') {
            setIsEmailVerified(true);
            console.log(`Using cached verification for: ${user.email}`);
          } else {
            // Do async verification check without blocking UI or forcing logout
            checkEmailVerification(user.email).then(verified => {
              setIsEmailVerified(verified);
              
              if (verified) {
                localStorage.setItem('email_verified', 'true');
                console.log(`Email verified: ${user.email}`);
              } else {
                console.log(`Email not verified for: ${user.email}`);
                // Don't force logout - let PrivateRoute handle this gracefully
              }
            }).catch(error => {
              console.error("Error in verification check:", error);
              // Don't change verification status on error - maintain current state
            });
          }
        }

        setIsLoading(false);
      } catch (error) {
        console.error('Error checking authentication:', error);
        setIsAuthenticated(false);
        setSupabaseUser(null);
        setIsEmailVerified(false);
        setIsLoading(false);
      }
    }

    getUser();
    
    // Set up auth state listener
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        if (event === 'SIGNED_OUT' || !session) {
          setIsAuthenticated(false);
          setSupabaseUser(null);
          queryClient.invalidateQueries({ queryKey: ["/api/auth/user"] });
        } else if (event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED') {
          setIsAuthenticated(true);
          setSupabaseUser(session.user);
          queryClient.invalidateQueries({ queryKey: ["/api/auth/user"] });
        }
      }
    );

    return () => subscription.unsubscribe();
  }, [queryClient]);

  // Combine user data from Supabase and our database
  const user: CombinedUserData | null = isAuthenticated && supabaseUser ? {
    ...userProfile,
    ...supabaseUser,
    fullName: userProfile?.firstName && supabaseUser ? 
      `${userProfile.firstName}${userProfile.lastName ? ` ${userProfile.lastName}` : ''}` :
      supabaseUser.user_metadata?.full_name || 
      `${supabaseUser.user_metadata?.first_name || ''} ${supabaseUser.user_metadata?.last_name || ''}`.trim() || 
      supabaseUser.email || 'User',
    isAdmin: userProfile?.isAdmin || false
  } : null;

  return {
    isLoading,
    isAuthenticated,
    isEmailVerified,
    user,
    supabaseUser,
    isAdmin: user?.isAdmin || false,
  };
}