import { useQuery } from '@tanstack/react-query';
import { useAuth } from './useAuth';

export interface Subscription {
  id: number;
  userId: string;
  planId: number;
  planName?: string;
  startDate: string | Date;
  endDate: string | Date;
  isActive: boolean;
  createdAt?: string | Date;
}

export function useSubscription() {
  const { isAuthenticated } = useAuth();

  const { data: subscription, isLoading, error, refetch } = useQuery({
    queryKey: ['/api/subscription'],
    enabled: isAuthenticated,
    refetchOnWindowFocus: true,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });

  const { data: subscriptionPlans = [] } = useQuery({
    queryKey: ['/api/subscription-plans'],
    enabled: !!subscription,
  });

  // Enrich subscription with plan name if available
  const enrichedSubscription = subscription ? {
    ...subscription,
    planName: subscriptionPlans.find((plan: any) => plan.id === subscription.planId)?.name || 'Premium Plan'
  } : null;

  return {
    subscription: enrichedSubscription as Subscription | null,
    isLoading,
    error,
    refetch
  };
}