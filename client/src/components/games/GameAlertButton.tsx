import { useState, useEffect } from 'react';
import { Bell, BellOff, Check } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { apiRequest } from '@/lib/queryClient';
import { useAuth } from '@/hooks/useAuth';
import { getAuthToken } from '@/lib/supabaseClient';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Label } from '@/components/ui/label';

interface GameAlertButtonProps {
  gameId: string;
  gameName: string;
  gameDate: Date;
}

export default function GameAlertButton({ gameId, gameName, gameDate }: GameAlertButtonProps) {
  const { toast } = useToast();
  const { user, isAuthenticated } = useAuth();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [notifyMinutesBefore, setNotifyMinutesBefore] = useState('30');
  const [hasAlert, setHasAlert] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isChecking, setIsChecking] = useState(true);

  // Calculate time remaining until game starts
  const getMinutesUntilGame = () => {
    const now = new Date();
    const gameTime = new Date(gameDate);
    const timeDifference = gameTime.getTime() - now.getTime();
    return Math.floor(timeDifference / (1000 * 60));
  };

  // Get available alert options based on time remaining
  const getAvailableAlertOptions = () => {
    const minutesUntilGame = getMinutesUntilGame();
    const options = [
      { value: '5', label: '5 minutes before' },
      { value: '15', label: '15 minutes before' },
      { value: '30', label: '30 minutes before' },
      { value: '60', label: '1 hour before' },
      { value: '120', label: '2 hours before' },
      { value: '1440', label: '1 day before' },
    ];

    // Only show options where there's enough time remaining
    return options.filter(option => parseInt(option.value) < minutesUntilGame);
  };

  // Debug: Force check alert status when component mounts
  console.log('🎯 GameAlertButton mounted for game:', { gameId, gameName, userId: user?.id, isAuthenticated });

  // Update default selection based on available options
  useEffect(() => {
    const availableOptions = getAvailableAlertOptions();
    if (availableOptions.length > 0) {
      // Set default to the longest available time, but fallback to shortest if current selection isn't available
      const currentSelectionAvailable = availableOptions.some(option => option.value === notifyMinutesBefore);
      if (!currentSelectionAvailable) {
        setNotifyMinutesBefore(availableOptions[0].value); // Use the shortest available time
      }
    }
  }, [gameDate]);

  // Check if user already has an alert for this game with proper cache invalidation
  useEffect(() => {
    let isMounted = true;
    
    const checkAlertStatus = async () => {
      if (!isAuthenticated || !user?.id) {
        if (isMounted) {
          setIsChecking(false);
          setHasAlert(false);
        }
        return;
      }

      try {
        console.log('🔍 Checking for existing alert:', { userId: user.id, gameId });
        
        // Direct Supabase call for faster, simpler checking
        const { createClient } = await import('@supabase/supabase-js');
        const supabase = createClient(
          import.meta.env.VITE_SUPABASE_URL!,
          import.meta.env.VITE_SUPABASE_ANON_KEY!
        );

        const { data, error } = await supabase
          .from('game_alerts')
          .select('id, notify_minutes_before')
          .eq('user_id', user.id)
          .eq('game_id', gameId)
          .maybeSingle();

        if (isMounted) {
          const alertExists = !!data;
          setHasAlert(alertExists);
          
          if (alertExists && data.notify_minutes_before) {
            setNotifyMinutesBefore(data.notify_minutes_before.toString());
          }
          
          console.log('🎯 Alert status loaded:', { 
            hasAlert: alertExists, 
            alertId: data?.id,
            notifyMinutes: data?.notify_minutes_before 
          });
        }
      } catch (error) {
        console.error('❌ Error checking game alert:', error);
        if (isMounted) {
          setHasAlert(false);
        }
      } finally {
        if (isMounted) {
          setIsChecking(false);
        }
      }
    };
    
    // Small delay to ensure auth is ready
    const timeoutId = setTimeout(checkAlertStatus, 100);
    
    return () => {
      isMounted = false;
      clearTimeout(timeoutId);
    };
  }, [gameId, isAuthenticated, user?.id]);

  const handleCreateAlert = async () => {
    if (!isAuthenticated) {
      toast({
        title: 'Authentication Required',
        description: 'Please sign in to set game alerts',
        variant: 'destructive',
      });
      return;
    }

    setIsLoading(true);
    try {
      // Simplify the alert creation process
      // Set the alert in the UI immediately for a better user experience
      setHasAlert(true);
      
      // Make the API call in the background
      const minutesBefore = parseInt(notifyMinutesBefore, 10);
      
      // Direct Supabase save to bypass routing issues
      const alertData = {
        user_id: user?.id,
        game_id: gameId,
        email: user?.email,
        notify_minutes_before: minutesBefore,
        is_notified: false,
        created_at: new Date().toISOString()
      };

      // Save to Supabase directly
      const { createClient } = await import('@supabase/supabase-js');
      const supabase = createClient(
        import.meta.env.VITE_SUPABASE_URL!,
        import.meta.env.VITE_SUPABASE_ANON_KEY!
      );

      // Generate ID in the same format as your existing records (timestamp-based)
      const alertId = Date.now().toString();
      const alertDataWithId = {
        ...alertData,
        id: alertId
      };

      const { data, error } = await supabase
        .from('game_alerts')
        .insert(alertDataWithId)
        .select()
        .single();

      // Handle both success and "already exists" cases
      const success = !error || error.code === '23505' || error.code === 'PGRST409';
      
      if (error && !['23505', 'PGRST409'].includes(error.code)) {
        console.error('Unexpected Supabase error:', error);
        throw error;
      }
        
      if (success) {
        // Alert created or already exists - keep UI state as "alert set"
        console.log('Alert successfully saved to database');
        toast({
          title: 'Game Alert Set',
          description: `You'll receive an email alert ${notifyMinutesBefore} minutes before the ${gameName} game starts`,
          variant: 'default',
        });
        setIsDialogOpen(false);
      } else {
        // Handle error
        console.error('Supabase error setting alert:', error);
        
        // Only show error if there's a real problem, and revert the UI
        setHasAlert(false);
        toast({
          title: 'Error Setting Alert',
          description: 'Database error when setting game alert. Please try again.',
          variant: 'destructive',
        });
      }
      
    } catch (error) {
      console.error('Error in alert creation process:', error);
      setHasAlert(false);
      toast({
        title: 'Error',
        description: 'An unexpected error occurred. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleRemoveAlert = async () => {
    if (!isAuthenticated || !user?.id) {
      return;
    }

    setIsLoading(true);
    try {
      // Direct Supabase call to remove alert
      const { createClient } = await import('@supabase/supabase-js');
      const supabase = createClient(
        import.meta.env.VITE_SUPABASE_URL!,
        import.meta.env.VITE_SUPABASE_ANON_KEY!
      );

      const { error } = await supabase
        .from('game_alerts')
        .delete()
        .eq('user_id', user.id)
        .eq('game_id', gameId);

      if (error) {
        console.error('Supabase error removing alert:', error);
        throw error;
      }

      setHasAlert(false);
      toast({
        title: 'Game Alert Removed',
        description: `Alert for ${gameName} has been removed`,
        variant: 'default',
      });
    } catch (error) {
      console.error('Error removing game alert:', error);
      toast({
        title: 'Error',
        description: 'Failed to remove game alert. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  if (isChecking) {
    return (
      <Button variant="outline" size="sm" disabled className="w-full">
        <Bell className="mr-2 h-4 w-4" />
        Checking...
      </Button>
    );
  }

  if (hasAlert) {
    return (
      <Button 
        variant="outline" 
        size="sm" 
        className="w-full bg-gradient-to-r from-yellow-400 to-yellow-500 border-yellow-400 text-yellow-900 hover:from-yellow-500 hover:to-yellow-600 hover:text-yellow-900 font-semibold shadow-lg"
        onClick={handleRemoveAlert}
        disabled={isLoading}
      >
        {isLoading ? (
          <div className="flex items-center">
            <div className="animate-spin w-4 h-4 border-2 border-yellow-900 border-t-transparent rounded-full mr-2" />
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

  return (
    <>
      <Button
        variant="outline"
        size="sm"
        className={`w-full transition-all duration-200 backdrop-blur-sm border ${
          hasAlert 
            ? 'bg-yellow-500/20 border-yellow-500/60 text-yellow-300 hover:bg-yellow-500/30' 
            : 'bg-purple-600/20 border-purple-400/50 text-purple-200 hover:bg-purple-600/30'
        }`}
        onClick={() => setIsDialogOpen(true)}
      >
        <Bell className="mr-2 h-4 w-4" />
        {hasAlert ? 'Alert Set' : 'Set Alert'}
      </Button>

      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Set Game Alert</DialogTitle>
            <DialogDescription>
              We'll send you an email before the game starts.
            </DialogDescription>
          </DialogHeader>

          <div className="grid gap-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="game">Game</Label>
              <div id="game" className="font-medium">
                {gameName}
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="notify-time">Notify me</Label>
              {getAvailableAlertOptions().length > 0 ? (
                <Select
                  value={notifyMinutesBefore}
                  onValueChange={setNotifyMinutesBefore}
                >
                  <SelectTrigger id="notify-time">
                    <SelectValue placeholder="Select time before game" />
                  </SelectTrigger>
                  <SelectContent>
                    {getAvailableAlertOptions().map(option => (
                      <SelectItem key={option.value} value={option.value}>
                        {option.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              ) : (
                <div className="text-sm text-muted-foreground p-3 border rounded-md bg-muted/50">
                  Game starts too soon to set an alert
                </div>
              )}
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setIsDialogOpen(false)}>
              Cancel
            </Button>
            <Button 
              onClick={handleCreateAlert} 
              disabled={isLoading || getAvailableAlertOptions().length === 0}
            >
              {isLoading ? (
                <div className="flex items-center">
                  <div className="animate-spin w-4 h-4 border-2 border-white border-t-transparent rounded-full mr-2" />
                  Setting...
                </div>
              ) : (
                'Set Alert'
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}