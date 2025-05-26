import { SubscriptionPlan } from '@shared/schema';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/hooks/useAuth';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { apiRequest } from '@/lib/queryClient';
import { useState } from 'react';
import { useToast } from '@/hooks/use-toast';
import { useSubscriptionStatus } from '@/hooks/useSubscriptionStatus';
import { useLocation } from 'wouter';

interface PricingPlansProps {
  plans: SubscriptionPlan[];
  userSubscription?: any;
  isLoading?: boolean;
}

export default function PricingPlans({ plans, userSubscription, isLoading = false }: PricingPlansProps) {
  const { isAuthenticated } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [, setLocation] = useLocation();
  const { checkSubscriptionStatus } = useSubscriptionStatus();
  const [selectedPlan, setSelectedPlan] = useState<number | null>(null);
  const [processingSubscription, setProcessingSubscription] = useState(false);

  const subscribeMutation = useMutation({
    mutationFn: async (planId: number) => {
      return await apiRequest('POST', '/api/subscription', { planId });
    },
    onSuccess: async () => {
      // Mark as processing to prevent UI issues during redirect
      setProcessingSubscription(true);
      
      toast({
        title: 'Subscription Activated',
        description: 'Your subscription has been successfully activated',
        variant: 'default',
      });
      
      // Invalidate both subscription-related queries
      queryClient.invalidateQueries({ queryKey: ['/api/subscription'] });
      queryClient.invalidateQueries({ queryKey: ['/api/subscription/status'] });
      
      // Force a fresh check of subscription status
      try {
        await checkSubscriptionStatus();
        console.log('✅ Subscription status refreshed after activation');
        
        // After successful subscription and status refresh, redirect to dashboard
        setTimeout(() => {
          setLocation('/');
        }, 1000);
      } catch (err) {
        console.error('Error refreshing subscription status:', err);
      } finally {
        setProcessingSubscription(false);
      }
    },
    onError: (error) => {
      toast({
        title: 'Subscription Failed',
        description: error.message,
        variant: 'destructive',
      });
      setProcessingSubscription(false);
    },
  });

  const handleSubscribe = (planId: number) => {
    if (!isAuthenticated) {
      // Redirect new users to signup page instead of login
      window.location.href = '/signup';
      return;
    }

    // For Stripe integration, redirect to checkout page with plan ID
    const selectedPlanObj = plans.find(p => p.id === planId);
    
    if (selectedPlanObj) {
      setSelectedPlan(planId);
      setProcessingSubscription(true);
      
      // Redirect to checkout page with plan ID and amount
      setLocation(`/checkout?planId=${planId}&amount=${selectedPlanObj.price}`);
    } else {
      toast({
        title: 'Error',
        description: 'Selected plan not found',
        variant: 'destructive',
      });
    }
  };

  // Format price from cents to dollars
  const formatPrice = (price: number) => {
    return `$${(price / 100).toFixed(2)}`;
  };

  // Return null when data is loading or unavailable
  // This creates a clean loading experience without flashing empty containers
  if (isLoading || !plans || plans.length === 0) {
    return null;
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
      {plans.map((plan) => {
        const isPopular = plan.isPopular;
        const isCurrentPlan = userSubscription?.planId === plan.id;
        const isPending = selectedPlan === plan.id && subscribeMutation.isPending;
        
        return (
          <div 
            key={plan.id} 
            className={`bg-[#0d021f] rounded-lg p-6 border ${
              isPopular ? 'border-[#7f00ff]' : 'border-[#2f1a48] hover:border-[#7f00ff]'
            } transition-all relative overflow-hidden`}
          >
            {isPopular && (
              <div className="absolute top-0 right-0 bg-[#7f00ff] text-white px-3 py-1 text-xs font-bold">
                POPULAR
              </div>
            )}
            
            <div className="mb-4 text-xl font-bold text-[#f2f2f2]">{plan.name}</div>
            <div className="flex items-end mb-4">
              <span className="text-3xl font-bold text-[#a68dff]">{formatPrice(plan.price)}</span>
              <span className="text-[#a68dff]/70 ml-1">/ {plan.durationDays} days</span>
            </div>
            
            <ul className="mb-6 space-y-2">
              {plan.features?.map((feature, index) => (
                <li key={index} className="flex items-start">
                  <i className="fas fa-check text-[#7f00ff] mt-1 mr-2"></i>
                  <span className="text-[#e0e0e0]">{feature}</span>
                </li>
              ))}
            </ul>
            
            <Button
              className={`w-full ${
                isPopular 
                  ? 'bg-[#7f00ff] hover:bg-[#6a00d9]' 
                  : 'bg-[#1a0533] hover:bg-[#7f00ff] border border-[#2f1a48]'
              } text-white`}
              onClick={() => handleSubscribe(plan.id)}
              disabled={isPending || isCurrentPlan || processingSubscription}
            >
              {isPending ? (
                <span className="flex items-center">
                  <span className="animate-spin mr-2">
                    <i className="fas fa-spinner"></i>
                  </span>
                  Processing...
                </span>
              ) : isCurrentPlan ? (
                'Current Plan'
              ) : (
                'Choose Plan'
              )}
            </Button>
          </div>
        );
      })}
    </div>
  );
}
