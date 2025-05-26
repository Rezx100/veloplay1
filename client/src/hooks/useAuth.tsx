import { useEffect, useState } from 'react';
import { useQuery } from '@tanstack/react-query';

export function useAuth() {
  const [isLoading, setIsLoading] = useState(true);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isEmailVerified, setIsEmailVerified] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);
  const [user, setUser] = useState<any>(null);

  // Fetch user data
  const { data } = useQuery({
    queryKey: ['/api/auth/user'],
    retry: false,
    refetchOnWindowFocus: false
  });

  useEffect(() => {
    if (data) {
      setIsAuthenticated(true);
      setIsEmailVerified(data.emailVerified || data.isVerified || false);
      setIsAdmin(data.isAdmin);
      setUser(data);
      setIsLoading(false);
    } else {
      setIsAuthenticated(false);
      setIsEmailVerified(false);
      setIsAdmin(false);
      setUser(null);
      setIsLoading(false);
    }
  }, [data]);

  return {
    isLoading,
    isAuthenticated,
    isEmailVerified,
    isAdmin,
    user
  };
}