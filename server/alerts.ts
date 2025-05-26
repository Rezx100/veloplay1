import { Resend } from 'resend';

if (!process.env.RESEND_API_KEY) {
  throw new Error("RESEND_API_KEY environment variable must be set");
}

const resend = new Resend(process.env.RESEND_API_KEY);

interface GameAlertParams {
  email: string;
  gameId: string;
  gameName: string;
  gameTime: string;
  teams: {
    home: string;
    away: string;
  };
}

// DEPRECATED: This function has been removed to prevent conflicts
// All game alerts now use the unified system in server/emailService.ts

export async function sendTestAlert(email: string): Promise<boolean> {
  const testParams: GameAlertParams = {
    email,
    gameId: '401695652',
    gameName: 'Cleveland Guardians at Detroit Tigers',
    gameTime: new Date().toLocaleString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
      timeZoneName: 'short'
    }),
    teams: {
      home: 'Detroit Tigers',
      away: 'Cleveland Guardians'
    }
  };

  // Function removed - using unified email system
  return false;
}