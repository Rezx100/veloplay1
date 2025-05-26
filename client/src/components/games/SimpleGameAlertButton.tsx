import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Bell, Check } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';

interface SimpleGameAlertButtonProps {
  gameId: string;
  gameName: string;
  className?: string;
}

export default function SimpleGameAlertButton({ gameId, gameName, className = "" }: SimpleGameAlertButtonProps) {
  const [hasAlert, setHasAlert] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const { user, isAuthenticated } = useAuth();
  const { toast } = useToast();

  // Check for existing alert
  const checkForAlert = async () => {
    if (!isAuthenticated || !user) {
      setHasAlert(false);
      return;
    }

    try {
      console.log('🔍 SimpleGameAlertButton: Checking alert for game', gameId);
      
      const { createClient } = await import('@supabase/supabase-js');
      const supabase = createClient(
        import.meta.env.VITE_SUPABASE_URL!,
        import.meta.env.VITE_SUPABASE_ANON_KEY!
      );

      const { data, error } = await supabase
        .from('game_alerts')
        .select('*')
        .eq('user_id', user.id)
        .eq('game_id', gameId)
        .eq('is_notified', false)
        .maybeSingle();

      console.log('🔍 SimpleGameAlertButton: Query result:', { data, error });

      if (error) {
        console.error('Error checking alert:', error);
        setHasAlert(false);
        return;
      }

      setHasAlert(!!data);
      console.log('🔍 SimpleGameAlertButton: Has alert?', !!data);
    } catch (error) {
      console.error('Error in checkForAlert:', error);
      setHasAlert(false);
    }
  };

  // Check for alert when component mounts
  useEffect(() => {
    console.log('🔍 SimpleGameAlertButton: useEffect triggered for game', gameId);
    checkForAlert();
  }, [gameId, isAuthenticated, user?.id]);

  const handleToggleAlert = async () => {
    if (!isAuthenticated || !user) {
      toast({
        title: 'Authentication Required',
        description: 'Please sign in to set game alerts',
        variant: 'destructive',
      });
      return;
    }

    setIsLoading(true);

    try {
      const { createClient } = await import('@supabase/supabase-js');
      const supabase = createClient(
        import.meta.env.VITE_SUPABASE_URL!,
        import.meta.env.VITE_SUPABASE_ANON_KEY!
      );

      if (hasAlert) {
        // Remove the alert
        console.log('🗑️ SimpleGameAlertButton: Removing alert for game', gameId);
        
        const { error } = await supabase
          .from('game_alerts')
          .delete()
          .eq('user_id', user.id)
          .eq('game_id', gameId);

        if (error) {
          throw error;
        }

        setHasAlert(false);
        toast({
          title: 'Alert Removed',
          description: `Alert for ${gameName} has been removed`,
          variant: 'default',
        });
      } else {
        // Create new alert
        console.log('➕ SimpleGameAlertButton: Creating alert for game', gameId);
        
        const alertData = {
          user_id: user.id,
          game_id: gameId,
          email: user.email,
          notify_minutes_before: 30, // Default to 30 minutes
          is_notified: false,
          created_at: new Date().toISOString()
        };

        const { error } = await supabase
          .from('game_alerts')
          .insert(alertData);

        if (error) {
          throw error;
        }

        setHasAlert(true);
        toast({
          title: 'Alert Set',
          description: `You'll be notified 30 minutes before ${gameName} starts`,
          variant: 'default',
        });
      }
    } catch (error) {
      console.error('Error toggling alert:', error);
      toast({
        title: 'Error',
        description: 'Failed to update alert. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  if (!isAuthenticated) {
    return null;
  }

  return (
    <Button
      onClick={handleToggleAlert}
      disabled={isLoading}
      className={`${className} ${
        hasAlert 
          ? 'bg-gradient-to-r from-yellow-400 to-yellow-500 border-yellow-400 text-yellow-900 hover:from-yellow-500 hover:to-yellow-600 hover:text-yellow-900 font-semibold shadow-lg' 
          : 'bg-purple-600/20 border-purple-400/50 text-purple-200 hover:bg-purple-600/30'
      }`}
      variant="outline"
      size="sm"
    >
      {isLoading ? (
        <div className="flex items-center">
          <div className="animate-spin w-4 h-4 border-2 border-current border-t-transparent rounded-full mr-2" />
          {hasAlert ? 'Removing...' : 'Setting...'}
        </div>
      ) : (
        <>
          {hasAlert ? <Check className="mr-2 h-4 w-4" /> : <Bell className="mr-2 h-4 w-4" />}
          {hasAlert ? 'Alert Set' : 'Set Alert'}
        </>
      )}
    </Button>
  );
}