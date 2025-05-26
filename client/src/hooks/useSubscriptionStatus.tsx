import { useState, useEffect, useCallback } from 'react';
import { useAuth } from './useAuth';

// Session storage key for caching subscription status
const SUBSCRIPTION_CACHE_KEY = 'veloplay_subscription_status';
const CACHE_EXPIRY_TIME = 5 * 60 * 1000; // 5 minutes in milliseconds

interface CachedSubscriptionStatus {
  hasActiveSubscription: boolean;
  subscriptionData: any;
  timestamp: number;
  userId: string;
}

// A custom hook to handle subscription status checking
export function useSubscriptionStatus() {
  const { isAuthenticated, user } = useAuth();
  const [isCheckingSubscription, setIsCheckingSubscription] = useState(true);
  const [hasActiveSubscription, setHasActiveSubscription] = useState(false);
  const [subscriptionData, setSubscriptionData] = useState<any>(null);
  const [error, setError] = useState<Error | null>(null);
  const [lastCheckTime, setLastCheckTime] = useState(0);
  const [initialLoadComplete, setInitialLoadComplete] = useState(false);
  
  // Check if cached data exists and is still valid
  const getSubscriptionFromCache = useCallback(() => {
    if (!user?.id) return null;
    
    try {
      const cachedDataString = sessionStorage.getItem(SUBSCRIPTION_CACHE_KEY);
      if (!cachedDataString) return null;
      
      const cachedData = JSON.parse(cachedDataString) as CachedSubscriptionStatus;
      
      // Validate cache: must belong to current user and be fresh
      const isValid = 
        cachedData.userId === user.id && 
        (Date.now() - cachedData.timestamp) < CACHE_EXPIRY_TIME;
      
      if (isValid) {
        console.log('🔄 Using cached subscription status, still valid');
        return cachedData;
      }
      
      // If invalid, clear the cache
      sessionStorage.removeItem(SUBSCRIPTION_CACHE_KEY);
      return null;
    } catch (err) {
      console.error('Error reading subscription cache:', err);
      return null;
    }
  }, [user?.id]);
  
  // Save subscription status to cache
  const cacheSubscriptionStatus = useCallback((data: { hasActiveSubscription: boolean, subscription: any }) => {
    if (!user?.id) return;
    
    try {
      const cacheData: CachedSubscriptionStatus = {
        hasActiveSubscription: data.hasActiveSubscription,
        subscriptionData: data.subscription,
        timestamp: Date.now(),
        userId: user.id
      };
      
      sessionStorage.setItem(SUBSCRIPTION_CACHE_KEY, JSON.stringify(cacheData));
      console.log('💾 Subscription status cached');
    } catch (err) {
      console.error('Error caching subscription status:', err);
    }
  }, [user?.id]);
  
  // Create a function to force a fresh check of subscription status
  const checkSubscriptionStatus = useCallback(async (skipCache = false) => {
    if (!isAuthenticated || !user?.id) {
      setIsCheckingSubscription(false);
      setHasActiveSubscription(false);
      setInitialLoadComplete(true);
      return;
    }
    
    // Try to use cached data first to prevent flashing
    if (!skipCache) {
      const cachedData = getSubscriptionFromCache();
      if (cachedData) {
        setHasActiveSubscription(cachedData.hasActiveSubscription);
        setSubscriptionData(cachedData.subscriptionData);
        setIsCheckingSubscription(false);
        setInitialLoadComplete(true);
        return;
      }
    }
    
    setIsCheckingSubscription(true);
    setError(null);
    
    // Add a cache-busting parameter to prevent browser caching
    const timestamp = Date.now();
    setLastCheckTime(timestamp);
    
    try {
      console.log('🔄 Fetching fresh subscription status...');
      
      // Import the auth token getter function
      const { getAuthToken } = await import("@/lib/supabaseClient");
      
      // Get the current authentication token
      const authToken = await getAuthToken();
      
      if (!authToken) {
        console.error('⛔ No authentication token available for subscription check');
        throw new Error('Authentication token not found');
      }
      
      // Use both token auth and credentials to ensure proper authentication
      const response = await fetch(`/api/subscription/status?_=${timestamp}`, {
        credentials: 'include',
        headers: {
          'Authorization': `Bearer ${authToken}`,
          'Cache-Control': 'no-cache, no-store, must-revalidate',
          'Pragma': 'no-cache',
          'Expires': '0'
        }
      });
      
      if (!response.ok) {
        // Special debug for auth issues
        if (response.status === 401) {
          console.error('⛔ Authentication required for subscription check. User appears logged out to the server.');
          throw new Error('Session expired or authentication issue. Try refreshing the page.');
        }
        throw new Error(`Failed to check subscription status: ${response.status} ${response.statusText}`);
      }
      
      const data = await response.json();
      console.log('✅ Fresh subscription status result:', data);
      
      // Update the state with the new data
      setHasActiveSubscription(data.hasActiveSubscription);
      setSubscriptionData(data.subscription);
      
      // Cache the new subscription status
      cacheSubscriptionStatus(data);
    } catch (err) {
      console.error('❌ Error checking subscription:', err);
      setError(err as Error);
      // Default to NOT having a subscription on error - safer to restrict than allow
      setHasActiveSubscription(false);
    } finally {
      setIsCheckingSubscription(false);
      setInitialLoadComplete(true);
    }
  }, [isAuthenticated, user?.id, getSubscriptionFromCache, cacheSubscriptionStatus]);
  
  // Initialize the subscription status on mount
  useEffect(() => {
    console.log(`⚠️ Initializing subscription check for user`);
    
    // Check for cached data first, then fetch fresh data
    checkSubscriptionStatus(false);
    
    // Clean up function
    return () => {
      // Any cleanup if needed
    };
  }, [isAuthenticated, user?.id, checkSubscriptionStatus]);
  
  return {
    isCheckingSubscription,
    hasActiveSubscription,
    subscriptionData,
    error,
    initialLoadComplete,
    checkSubscriptionStatus // Expose the function to force a fresh check
  };
}