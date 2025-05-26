import { useState, useEffect } from 'react';
import { useLocation } from 'wouter';
import { Button } from '@/components/ui/button';
import { CheckCircle } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useSubscriptionStatus } from '@/hooks/useSubscriptionStatus';

export default function PaymentSuccessPage() {
  const [, setLocation] = useLocation();
  const { isAuthenticated, user } = useAuth();
  const [redirectUrl, setRedirectUrl] = useState<string>('/dashboard');
  const [refreshAttempts, setRefreshAttempts] = useState(0);
  const queryClient = useQueryClient();
  const { checkSubscriptionStatus } = useSubscriptionStatus();
  
  // Fetch subscription data directly with more frequent refetching
  const { data: subscription, isLoading: subscriptionLoading, refetch } = useQuery({
    queryKey: ['/api/subscription'],
    enabled: isAuthenticated,
    refetchInterval: 3000, // Poll every 3 seconds to detect subscription changes
    refetchOnWindowFocus: true,
    staleTime: 0 // Consider data stale immediately to force refetch
  });

  // Force refresh subscription status on page load
  useEffect(() => {
    if (isAuthenticated) {
      // Force multiple refreshes to ensure we get the latest data
      const refreshData = async () => {
        console.log('Forcing subscription refresh on payment success page');
        
        // Clear any cached subscription data
        sessionStorage.removeItem('veloplay_subscription_status');
        
        // Invalidate all subscription-related queries
        queryClient.invalidateQueries({ queryKey: ['/api/subscription'] });
        queryClient.invalidateQueries({ queryKey: ['/api/subscription/status'] });
        
        // Force a fresh check with our custom hook
        await checkSubscriptionStatus(true);
        
        // Also refetch the subscription data directly
        await refetch();
        
        // Increment attempts counter to trigger additional refreshes
        setRefreshAttempts(prev => prev + 1);
      };
      
      refreshData();
    }
  }, [isAuthenticated, checkSubscriptionStatus, queryClient, refetch, refreshAttempts]);
  
  // Additional refreshes for reliability (up to 3 attempts)
  useEffect(() => {
    if (isAuthenticated && refreshAttempts < 3) {
      const timer = setTimeout(() => {
        console.log(`Additional subscription refresh attempt ${refreshAttempts + 1}`);
        // Force another refresh after a delay
        refetch();
        checkSubscriptionStatus(true);
      }, 2000 * (refreshAttempts + 1)); // Increasing delays
      
      return () => clearTimeout(timer);
    }
  }, [isAuthenticated, refreshAttempts, refetch, checkSubscriptionStatus]);

  useEffect(() => {
    // Get the saved redirect URL if available
    const savedUrl = localStorage.getItem('contentUrlBeforeSubscription');
    if (savedUrl) {
      setRedirectUrl(savedUrl);
      // Clear it from storage
      localStorage.removeItem('contentUrlBeforeSubscription');
    }
  }, []);

  const handleContinue = () => {
    setLocation(redirectUrl);
  };

  const handleGoToDashboard = () => {
    setLocation('/dashboard');
  };

  if (!isAuthenticated) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[70vh] p-4">
        <h1 className="text-2xl font-bold mb-4">Please Sign In</h1>
        <p className="mb-6 text-center max-w-md">
          You need to be signed in to view your subscription details.
        </p>
        <Button onClick={() => setLocation('/login')}>Sign In</Button>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center justify-center min-h-[70vh] p-4">
      <div className="max-w-md w-full bg-card rounded-lg shadow-lg p-8">
        <div className="flex flex-col items-center text-center">
          <div className="w-16 h-16 bg-green-100 dark:bg-green-900 rounded-full flex items-center justify-center mb-4">
            <CheckCircle className="w-10 h-10 text-green-600 dark:text-green-400" />
          </div>
          
          <h1 className="text-2xl font-bold mb-2">Payment Successful!</h1>
          
          <p className="mb-6 text-muted-foreground">
            Thank you for your subscription to VeloPlay. Your payment has been processed successfully.
          </p>

          {!subscriptionLoading && subscription && (
            <div className="bg-muted p-4 rounded-md w-full mb-6">
              <h2 className="font-semibold mb-2">Subscription Details</h2>
              <p className="text-sm mb-1">
                <span className="font-medium">Plan:</span> {subscription.planName || 'Premium Plan'}
              </p>
              <p className="text-sm mb-1">
                <span className="font-medium">Status:</span> {subscription.isActive ? 'Active' : 'Pending'}
              </p>
              <p className="text-sm">
                <span className="font-medium">Valid until:</span> {new Date(subscription.endDate).toLocaleDateString()}
              </p>
            </div>
          )}
          
          <div className="flex flex-col sm:flex-row gap-3 w-full">
            <Button 
              variant="default" 
              className="flex-1" 
              onClick={handleContinue}
            >
              Continue Watching
            </Button>
            <Button 
              variant="outline" 
              className="flex-1" 
              onClick={handleGoToDashboard}
            >
              Go to Dashboard
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}