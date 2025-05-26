import { sendGameAlert } from './emailService';
import { storage } from './storage';
import { getGameById } from './espnApi';

// Track processed alerts to avoid duplicates
const processedAlerts = new Set<number>();

export function startGameAlertScheduler() {
  console.log('🚨 Starting game alert scheduler...');
  
  // Check for alerts every minute
  const interval = setInterval(async () => {
    try {
      await checkAndSendGameAlerts();
    } catch (error) {
      console.error('Error in game alert scheduler:', error);
    }
  }, 60000); // Check every minute

  console.log('✅ Game alert scheduler started - checking every minute');
  
  // Return cleanup function
  return () => {
    clearInterval(interval);
    console.log('Game alert scheduler stopped');
  };
}

async function checkAndSendGameAlerts() {
  try {
    // Get all unnotified alerts directly from Supabase
    const { createClient } = await import('@supabase/supabase-js');
    const supabaseClient = createClient(
      process.env.SUPABASE_URL!,
      process.env.SUPABASE_ANON_KEY!
    );
    
    const { data: alerts, error } = await supabaseClient
      .from('game_alerts')
      .select('*')
      .eq('is_notified', false);
    
    if (error) {
      console.error('Error fetching game alerts:', error);
      return;
    }
    
    if (!alerts || alerts.length === 0) {
      return; // No alerts to process
    }

    console.log(`📋 Checking ${alerts.length} pending game alerts...`);

    for (const alert of alerts) {
      // Skip if already processed
      if (processedAlerts.has(alert.id)) {
        continue;
      }

      try {
        // Get game details
        const game = await getGameById(alert.game_id);
        if (!game) {
          console.warn(`⚠️ Game ${alert.game_id} not found for alert ${alert.id}`);
          continue;
        }

        // Calculate time until game starts
        const gameTime = new Date(game.date);
        const now = new Date();
        const minutesUntilGame = Math.floor((gameTime.getTime() - now.getTime()) / (1000 * 60));

        console.log(`🎮 Alert ${alert.id}: Game ${game.shortName} starts in ${minutesUntilGame} minutes (alert set for ${alert.notify_minutes_before} minutes before)`);

        // Check if it's time to send the alert
        if (minutesUntilGame <= alert.notify_minutes_before && minutesUntilGame > 0) {
          // Get user's email from users table
          const { data: userProfile, error: userError } = await supabaseClient
            .from('users')
            .select('email')
            .eq('id', alert.user_id)
            .single();

          if (userError || !userProfile?.email) {
            console.error(`❌ Could not find email for user ${alert.user_id}:`, userError);
            
            // Clean up orphaned alert - user no longer exists
            console.log(`🧹 Removing orphaned alert ${alert.id} for non-existent user ${alert.user_id}`);
            await supabaseClient
              .from('game_alerts')
              .delete()
              .eq('id', alert.id);
            
            processedAlerts.add(alert.id);
            continue;
          }

          const userEmail = userProfile.email;
          console.log(`📧 Sending game alert to ${userEmail} for ${game.shortName}`);

          // Send the alert email
          const success = await sendGameAlert({
            email: userEmail,
            gameId: alert.game_id,
            gameName: `${game.awayTeam.name} vs ${game.homeTeam.name}`,
            gameTime: gameTime.toLocaleString('en-US', {
              weekday: 'long',
              year: 'numeric',
              month: 'long',
              day: 'numeric',
              hour: 'numeric',
              minute: '2-digit',
              timeZoneName: 'short'
            }),
            minutesRemaining: minutesUntilGame,
            teams: {
              home: game.homeTeam.name,
              away: game.awayTeam.name
            }
          });

          if (success) {
            // Mark alert as sent in database
            await supabaseClient
              .from('game_alerts')
              .update({ is_notified: true })
              .eq('id', alert.id);
            
            processedAlerts.add(alert.id);
            console.log(`✅ Game alert sent successfully for ${game.shortName} to ${userEmail}`);
          } else {
            console.error(`❌ Failed to send game alert for ${game.shortName} to ${userEmail}`);
          }
        }
        // If game has already started or notification window passed, mark as sent to avoid future processing
        else if (minutesUntilGame <= 0) {
          console.log(`⏰ Game ${game.shortName} has already started, marking alert ${alert.id} as expired`);
          await supabaseClient
            .from('game_alerts')
            .update({ is_notified: true })
            .eq('id', alert.id);
          processedAlerts.add(alert.id);
        }
      } catch (error) {
        console.error(`Error processing alert ${alert.id}:`, error);
      }
    }
  } catch (error) {
    console.error('Error checking game alerts:', error);
  }
}

// Function to manually trigger alert check (for testing)
export async function triggerAlertCheck() {
  console.log('🔄 Manually triggering alert check...');
  await checkAndSendGameAlerts();
}