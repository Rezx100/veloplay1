import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Bell, Check, ChevronDown } from 'lucide-react';
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
      console.log('🔍 SimpleGameAlertButton: User ID:', user.id);
      console.log('🔍 SimpleGameAlertButton: Game ID:', gameId);
      
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

  const handleRemoveAlert = async () => {
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

      console.log('🗑️ SimpleGameAlertButton: Removing alert for game', gameId, 'user:', user.id);
      
      const { error } = await supabase
        .from('game_alerts')
        .delete()
        .eq('user_id', user.id)
        .eq('game_id', gameId);

      if (error) {
        console.error('🗑️ SimpleGameAlertButton: Delete error:', error);
        throw error;
      }

      setHasAlert(false);
      toast({
        title: 'Alert Removed',
        description: `Alert for ${gameName} has been removed`,
        variant: 'default',
      });
    } catch (error) {
      console.error('Error removing alert:', error);
      toast({
        title: 'Error',
        description: 'Failed to remove alert. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleSetAlert = async (minutesBefore: number) => {
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

      console.log('➕ SimpleGameAlertButton: Creating alert for game', gameId, 'user:', user.id, 'minutes:', minutesBefore);
      
      const alertData = {
        user_id: user.id,
        game_id: gameId,
        email: user.email,
        notify_minutes_before: minutesBefore,
        is_notified: false
      };

      console.log('➕ SimpleGameAlertButton: Alert data:', alertData);

      const { error, data } = await supabase
        .from('game_alerts')
        .insert(alertData)
        .select();

      if (error) {
        console.error('➕ SimpleGameAlertButton: Insert error:', error);
        throw error;
      }

      console.log('➕ SimpleGameAlertButton: Insert success:', data);

      setHasAlert(true);
      toast({
        title: 'Alert Set',
        description: `You'll be notified ${minutesBefore} minutes before ${gameName} starts`,
        variant: 'default',
      });
    } catch (error) {
      console.error('Error setting alert:', error);
      toast({
        title: 'Error',
        description: 'Failed to set alert. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  if (!isAuthenticated) {
    return null;
  }

  // If alert is already set, show "Alert Set" button with option to remove
  if (hasAlert) {
    return (
      <Button
        onClick={handleRemoveAlert}
        disabled={isLoading}
        className={`${className} bg-gradient-to-r from-yellow-400 to-yellow-500 border-yellow-400 text-yellow-900 hover:from-yellow-500 hover:to-yellow-600 hover:text-yellow-900 font-semibold shadow-lg`}
        variant="outline"
        size="sm"
      >
        {isLoading ? (
          <div className="flex items-center">
            <div className="animate-spin w-4 h-4 border-2 border-current border-t-transparent rounded-full mr-2" />
            Removing...
          </div>
        ) : (
          <>
            <Check className="mr-2 h-4 w-4" />
            Alert Set
          </>
        )}
      </Button>
    );
  }

  // If no alert set, show dropdown with time options
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          disabled={isLoading}
          className={`${className} bg-purple-600/20 border-purple-400/50 text-purple-200 hover:bg-purple-600/30`}
          variant="outline"
          size="sm"
        >
          {isLoading ? (
            <div className="flex items-center">
              <div className="animate-spin w-4 h-4 border-2 border-current border-t-transparent rounded-full mr-2" />
              Setting...
            </div>
          ) : (
            <>
              <Bell className="mr-1 sm:mr-2 h-3 w-3 sm:h-4 sm:w-4" />
              <span className="hidden sm:inline">Set Alert</span>
              <span className="sm:hidden">Alert</span>
              <ChevronDown className="ml-1 sm:ml-2 h-3 w-3 sm:h-4 sm:w-4" />
            </>
          )}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-40 sm:w-48">
        <DropdownMenuItem onClick={() => handleSetAlert(5)}>
          5 minutes before
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => handleSetAlert(10)}>
          10 minutes before
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => handleSetAlert(15)}>
          15 minutes before
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => handleSetAlert(30)}>
          30 minutes before
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => handleSetAlert(60)}>
          1 hour before
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => handleSetAlert(120)}>
          2 hours before
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}