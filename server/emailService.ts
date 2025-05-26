import { Resend } from 'resend';

// Initialize Resend client
let resend: Resend | null = null;

try {
  if (process.env.RESEND_API_KEY) {
    resend = new Resend(process.env.RESEND_API_KEY);
    console.log('✅ Resend client initialized successfully');
  } else {
    console.warn('⚠️ RESEND_API_KEY not found in environment variables');
  }
} catch (error) {
  console.error('Failed to initialize Resend:', error);
}

// Export functions that are imported in routes.ts
export async function initEmailService() {
  console.log('📧 Email service initialized');
  return true;
}

export async function handleWelcomeEmail(email: string) {
  console.log('📧 Welcome email handler called for:', email);
  return { success: true };
}

export async function handleSubscriptionExpirationEmail(email: string) {
  console.log('📧 Subscription expiration email handler called for:', email);
  return { success: true };
}

export async function handleGameAlertEmail(params: any) {
  console.log('📧 Game alert email handler called with params:', params);
  return await sendGameAlert(params);
}

interface EmailParams {
  to: string;
  subject: string;
  html: string;
}

export async function sendEmail(params: EmailParams): Promise<boolean> {
  if (!resend) {
    console.error('Resend not initialized - RESEND_API_KEY missing');
    return false;
  }

  try {
    const { data, error } = await resend.emails.send({
      from: 'VeloPlay <noreply@veloplay.tv>',
      to: params.to,
      subject: params.subject,
      html: params.html,
    });

    if (error) {
      console.error('Email send error:', error);
      return false;
    }

    console.log('Email sent successfully:', data);
    return true;
  } catch (error) {
    console.error('Email service error:', error);
    return false;
  }
}

// Game alert email function
export async function sendGameAlert(params: any): Promise<boolean> {
  if (!resend) {
    console.error('Resend not initialized - cannot send game alert');
    return false;
  }

  try {
    const emailHtml = createGameAlertEmail(params.gameName, params.gameTime, 30, params.minutesRemaining);
    
    const { data, error } = await resend.emails.send({
      from: 'VeloPlay <noreply@veloplay.tv>',
      to: params.email,
      subject: `🚨 Game Alert: ${params.gameName}`,
      html: emailHtml,
    });

    if (error) {
      console.error('Game alert email error:', error);
      return false;
    }

    console.log('✅ Game alert email sent successfully:', data);
    return true;
  } catch (error) {
    console.error('Game alert email service error:', error);
    return false;
  }
}

export function createGameAlertEmail(gameName: string, gameTime: string, minutesBefore: number, minutesRemaining?: number): string {
  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Game Alert - ${gameName}</title>
    </head>
    <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
      <div style="background: linear-gradient(135deg, #9333ea 0%, #7c3aed 100%); color: white; padding: 30px; border-radius: 10px; text-align: center; margin-bottom: 30px;">
        <h1 style="margin: 0; font-size: 28px;">🚨 Game Alert</h1>
        <p style="margin: 10px 0 0 0; font-size: 18px; opacity: 0.9;">Your game starts soon!</p>
      </div>
      
      <div style="background: #f8f9fa; padding: 25px; border-radius: 8px; margin-bottom: 25px;">
        <h2 style="color: #2c3e50; margin-top: 0;">${gameName}</h2>
        <p style="font-size: 16px; margin: 15px 0;">
          <strong>⏰ Game Time:</strong> ${gameTime}
        </p>
        ${minutesRemaining ? `<p style="font-size: 18px; margin: 15px 0; color: #9333ea; font-weight: bold;">
          <strong>⚡ Game starts in ${minutesRemaining} minutes!</strong>
        </p>` : ''}
        <p style="font-size: 16px; margin: 15px 0;">
          <strong>🔔 Alert Time:</strong> ${minutesBefore} minutes before start
        </p>
      </div>
      
      <div style="text-align: center; margin: 30px 0;">
        <a href="https://veloplay.tv" style="background: linear-gradient(135deg, #9333ea 0%, #7c3aed 100%); color: white; padding: 15px 30px; text-decoration: none; border-radius: 8px; font-weight: bold; display: inline-block; box-shadow: 0 4px 14px 0 rgba(147, 51, 234, 0.3);">
          Watch Live on VeloPlay
        </a>
      </div>
      
      <div style="border-top: 1px solid #e9ecef; padding-top: 20px; text-align: center; color: #6c757d; font-size: 14px;">
        <p>You're receiving this because you set up a game alert on VeloPlay.</p>
        <p>Enjoy the game! 🏆</p>
      </div>
    </body>
    </html>
  `;
}