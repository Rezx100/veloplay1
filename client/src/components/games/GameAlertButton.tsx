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
      if (!isAuthenticated || !user) {
        if (isMounted) {
          setIsChecking(false);
          setHasAlert(false);
        }
        return;
      }

      try {
        console.log('🔍 Checking for existing alert using backend API:', { userId: user.id, gameId });
        
        // Use the backend API to check for existing alerts
        const response = await fetch('/api/game-alerts', {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${localStorage.getItem('authToken')}`,
          },
        });

        console.log('📊 Backend API response status:', response.status);

        if (response.ok) {
          const alerts = await response.json();
          console.log('📊 All user alerts from backend:', alerts);
          
          // Check if there's an active alert for this game
          const gameAlert = alerts.find((alert: any) => 
            alert.gameId === gameId && !alert.isNotified
          );
          
          console.log('📊 Alert for this game:', gameAlert);

          if (isMounted) {
            if (gameAlert) {
              setHasAlert(true);
              console.log('🚨 Active alert found, showing "Alert Set"');
            } else {
              setHasAlert(false);
              console.log('🚨 No active alert found, showing "Set Alert"');
            }
          }
        } else {
          console.log('📊 Failed to fetch alerts from backend:', response.status);
          if (isMounted) {
            setHasAlert(false);
          }
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

  // Add debugging for useEffect
  useEffect(() => {
    console.log('🎯 GameAlertButton useEffect triggered:', { 
      hasUser: !!user, 
      userId: user?.id,
      gameId, 
      isAuthenticated 
    });
    if (user && gameId) {
      console.log('🎯 About to check for existing alert');
    }
  }, [user, gameId, isAuthenticated]);

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

      console.log('💾 Attempting to save alert to database:', alertData);

      // First check if there's an existing alert for this user and game
      const { data: existingAlert, error: checkError } = await supabase
        .from('game_alerts')
        .select('*')
        .eq('user_id', user?.id)
        .eq('game_id', gameId)
        .maybeSingle();

      console.log('💾 Existing alert check:', { existingAlert, checkError });

      let data, error;

      if (existingAlert) {
        // Update existing alert (reset is_notified to false and update timing)
        console.log('💾 Updating existing alert:', existingAlert.id);
        const updateResult = await supabase
          .from('game_alerts')
          .update({
            notify_minutes_before: alertData.notify_minutes_before,
            is_notified: false,
            created_at: alertData.created_at
          })
          .eq('id', existingAlert.id)
          .select()
          .single();
        
        data = updateResult.data;
        error = updateResult.error;
      } else {
        // Create new alert
        console.log('💾 Creating new alert');
        const insertResult = await supabase
          .from('game_alerts')
          .insert(alertData)
          .select()
          .single();
        
        data = insertResult.data;
        error = insertResult.error;
      }

      console.log('💾 Database save result:', { data, error });

      // Handle both success and "already exists" cases
      const success = !error || error.code === '23505' || error.code === 'PGRST409';
      
      if (error && !['23505', 'PGRST409'].includes(error.code)) {
        console.error('❌ Unexpected Supabase error:', error);
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
    if (!isAuthenticated) {
      return;
    }

    setIsLoading(true);
    try {
      // First get the alert to get its ID
      const checkResponse = await apiRequest('GET', `/api/game-alerts/${gameId}`);
      if (!checkResponse.ok) {
        throw new Error('Failed to find alert');
      }

      const alertData = await checkResponse.json();
      if (!alertData.exists) {
        throw new Error('Alert not found');
      }

      const alertId = alertData.alert.id;
      const deleteResponse = await apiRequest('DELETE', `/api/game-alerts/${alertId}`);

      if (deleteResponse.ok) {
        setHasAlert(false);
        toast({
          title: 'Game Alert Removed',
          description: `Alert for ${gameName} has been removed`,
          variant: 'default',
        });
      } else {
        throw new Error('Failed to delete alert');
      }
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