import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react";
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
  const [isEmailVerified, setIsEmailVerified] = useState(true);
  
  // Get JWT token from localStorage
  const getToken = () => localStorage.getItem('auth_token');
  const setToken = (token: string) => localStorage.setItem('auth_token', token);
  const removeToken = () => localStorage.removeItem('auth_token');

  // Try to get profile from database if authenticated
  const { data: userProfile, isLoading: isProfileLoading } = useQuery<User | null>({
    queryKey: ["/api/auth/user"],
    retry: false,
    enabled: isAuthenticated,
    refetchOnWindowFocus: false,
  });

  // Check authentication status on mount
  useEffect(() => {
    const token = getToken();
    if (token) {
      setIsAuthenticated(true);
    }
    setIsLoading(false);
  }, []);

  // Login function
  const login = async (email: string, password: string) => {
    try {
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });
      
      const data = await response.json();
      
      if (data.success && data.token) {
        setToken(data.token);
        setIsAuthenticated(true);
        setIsEmailVerified(data.user.isVerified);
        return { success: true, user: data.user };
      }
      
      return { success: false, error: data.error || 'Login failed' };
    } catch (error) {
      return { success: false, error: 'Network error' };
    }
  };

  // Signup function
  const signup = async (email: string, password: string, firstName: string, lastName: string) => {
    try {
      const response = await fetch('/api/auth/signup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password, firstName, lastName }),
      });
      
      const data = await response.json();
      
      if (data.success && data.token) {
        setToken(data.token);
        setIsAuthenticated(true);
        setIsEmailVerified(data.user.isVerified);
        return { success: true, user: data.user };
      }
      
      return { success: false, error: data.error || 'Signup failed' };
    } catch (error) {
      return { success: false, error: 'Network error' };
    }
  };

  // Logout function
  const logout = () => {
    removeToken();
    setIsAuthenticated(false);
    setIsEmailVerified(false);
    queryClient.clear();
  };

  // Combine user data from different sources
  const user: CombinedUserData | null = userProfile ? {
    id: userProfile.id,
    email: userProfile.email || '',
    firstName: userProfile.firstName,
    lastName: userProfile.lastName,
    profileImageUrl: userProfile.profileImageUrl,
    fullName: `${userProfile.firstName || ''} ${userProfile.lastName || ''}`.trim() || 'User',
    isAdmin: userProfile.isAdmin || false,
  } : null;

  return {
    user,
    login,
    signup,
    logout,
    isLoading: isLoading || isProfileLoading,
    isAuthenticated,
    isEmailVerified,
  };
}