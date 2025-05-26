import { sendTestAlert } from './alerts';
import { getGameById } from './espnApi';

interface ScheduledAlert {
  id: string;
  gameId: string;
  email: string;
  notifyMinutesBefore: number;
  gameTime: Date;
  alertTime: Date;
  timeout?: NodeJS.Timeout;
}

class AlertScheduler {
  private alerts: Map<string, ScheduledAlert> = new Map();

  scheduleAlert(gameId: string, email: string, notifyMinutesBefore: number, gameTime: Date): string {
    const alertTime = new Date(gameTime.getTime() - (notifyMinutesBefore * 60 * 1000));
    const now = new Date();
    
    // Check if alert time is in the future
    if (alertTime <= now) {
      throw new Error(`Cannot schedule alert for ${notifyMinutesBefore} minutes before when only ${Math.floor((gameTime.getTime() - now.getTime()) / (1000 * 60))} minutes remain`);
    }

    const alertId = `${gameId}-${email}-${notifyMinutesBefore}`;
    const delayMs = alertTime.getTime() - now.getTime();

    console.log(`📅 Scheduling alert: ${email} will be notified in ${Math.floor(delayMs / (1000 * 60))} minutes (${notifyMinutesBefore} minutes before game)`);

    // Schedule the alert
    const timeout = setTimeout(async () => {
      await this.sendScheduledAlert(alertId);
    }, delayMs);

    const alert: ScheduledAlert = {
      id: alertId,
      gameId,
      email,
      notifyMinutesBefore,
      gameTime,
      alertTime,
      timeout
    };

    this.alerts.set(alertId, alert);
    return alertId;
  }

  private async sendScheduledAlert(alertId: string) {
    const alert = this.alerts.get(alertId);
    if (!alert) return;

    try {
      // Get fresh game data
      const game = await getGameById(alert.gameId);
      if (!game) {
        console.warn(`⚠️ Game ${alert.gameId} not found for scheduled alert`);
        return;
      }

      console.log(`📧 Sending scheduled alert to ${alert.email} for ${game.shortName}`);

      const success = await sendTestAlert(alert.email);

      if (success) {
        console.log(`✅ Scheduled alert sent successfully to ${alert.email} for ${game.shortName}`);
      } else {
        console.error(`❌ Failed to send scheduled alert to ${alert.email} for ${game.shortName}`);
      }
    } catch (error) {
      console.error(`Error sending scheduled alert ${alertId}:`, error);
    } finally {
      // Clean up
      this.alerts.delete(alertId);
    }
  }

  cancelAlert(alertId: string): boolean {
    const alert = this.alerts.get(alertId);
    if (!alert) return false;

    if (alert.timeout) {
      clearTimeout(alert.timeout);
    }
    this.alerts.delete(alertId);
    console.log(`🚫 Cancelled scheduled alert ${alertId}`);
    return true;
  }

  getScheduledAlerts(): ScheduledAlert[] {
    return Array.from(this.alerts.values()).map(alert => ({
      ...alert,
      timeout: undefined // Don't expose timeout in the response
    }));
  }
}

export const alertScheduler = new AlertScheduler();