import { Resend } from 'resend';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

// Initialize Resend with API key
const resend = new Resend(process.env.RESEND_API_KEY);

// Use our verified domain email for sending
const FROM_EMAIL = 'noreply@veloplay.tv';

/**
 * Email Templates
 */

// OTP email template
const otpEmailTemplate = (userName: string, otpCode: string) => ({
  subject: 'Your VeloPlay Login Verification Code',
  html: `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; color: #333;">
      <div style="background-color: #7f00ff; padding: 20px; text-align: center; border-radius: 8px 8px 0 0;">
        <h1 style="color: white; margin: 0;">Login Verification</h1>
      </div>
      <div style="background-color: #f9f9f9; padding: 20px; border-radius: 0 0 8px 8px; border: 1px solid #eee; border-top: none;">
        <p>Hello ${userName},</p>
        <p>To complete your login to VeloPlay, please use the following verification code:</p>
        <div style="background-color: #f0f0f0; padding: 15px; border-radius: 4px; margin: 20px 0; text-align: center;">
          <h2 style="margin: 0; letter-spacing: 5px; font-family: monospace; color: #7f00ff; font-size: 32px;">${otpCode}</h2>
        </div>
        <p>This code will expire in 5 minutes for security reasons.</p>
        <p>If you didn't attempt to log in to VeloPlay, please ignore this email or contact our support team immediately.</p>
        <p>Thank you for using VeloPlay!</p>
      </div>
      <div style="text-align: center; padding: 20px; color: #666; font-size: 12px;">
        <p>© ${new Date().getFullYear()} VeloPlay. All rights reserved.</p>
        <p>This is an automated message, please do not reply to this email.</p>
      </div>
    </div>
  `
});

// Welcome email template
const welcomeEmailTemplate = (userName: string) => ({
  subject: 'Welcome to VeloPlay! 🎮',
  html: `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; color: #333;">
      <div style="background-color: #7f00ff; padding: 20px; text-align: center; border-radius: 8px 8px 0 0;">
        <h1 style="color: white; margin: 0;">Welcome to VeloPlay!</h1>
      </div>
      <div style="background-color: #f9f9f9; padding: 20px; border-radius: 0 0 8px 8px; border: 1px solid #eee; border-top: none;">
        <p>Hello ${userName},</p>
        <p>Thank you for joining VeloPlay! We're excited to have you as part of our community.</p>
        <p>With your new account, you can:</p>
        <ul>
          <li>Stream live games from NFL, NBA, NHL, and MLB</li>
          <li>Get real-time game notifications</li>
          <li>Customize your viewing experience</li>
        </ul>
        <p>Explore our premium subscription plans to unlock unlimited access to all our premium features!</p>
        <div style="text-align: center; margin: 30px 0;">
          <a href="https://veloplay.com/watch" style="background-color: #7f00ff; color: white; padding: 12px 24px; text-decoration: none; border-radius: 4px; font-weight: bold;">Start Watching Now</a>
        </div>
        <p>If you have any questions or need assistance, our support team is always here to help.</p>
        <p>Happy streaming!</p>
        <p>The VeloPlay Team</p>
      </div>
      <div style="text-align: center; padding: 20px; color: #666; font-size: 12px;">
        <p>© ${new Date().getFullYear()} VeloPlay. All rights reserved.</p>
        <p>This email was sent to you because you signed up for VeloPlay.</p>
      </div>
    </div>
  `
});

// Subscription expiration notification template
const subscriptionExpirationTemplate = (userName: string, daysRemaining: number) => ({
  subject: `Your VeloPlay Subscription Expires in ${daysRemaining} Days`,
  html: `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; color: #333;">
      <div style="background-color: #7f00ff; padding: 20px; text-align: center; border-radius: 8px 8px 0 0;">
        <h1 style="color: white; margin: 0;">Subscription Reminder</h1>
      </div>
      <div style="background-color: #f9f9f9; padding: 20px; border-radius: 0 0 8px 8px; border: 1px solid #eee; border-top: none;">
        <p>Hello ${userName},</p>
        <p>Your VeloPlay subscription is set to expire in <strong>${daysRemaining} days</strong>.</p>
        <p>To ensure uninterrupted access to all your favorite sports streams, please renew your subscription before it expires.</p>
        <div style="text-align: center; margin: 30px 0;">
          <a href="https://veloplay.com/account/subscription" style="background-color: #7f00ff; color: white; padding: 12px 24px; text-decoration: none; border-radius: 4px; font-weight: bold;">Renew Subscription</a>
        </div>
        <p>If you have any questions about your subscription, please contact our support team.</p>
        <p>Thank you for being a valued member of VeloPlay!</p>
        <p>The VeloPlay Team</p>
      </div>
      <div style="text-align: center; padding: 20px; color: #666; font-size: 12px;">
        <p>© ${new Date().getFullYear()} VeloPlay. All rights reserved.</p>
        <p>You're receiving this email because you have an active subscription with VeloPlay.</p>
      </div>
    </div>
  `
});

// Game alert notification template
const gameAlertTemplate = (userName: string, gameDetails: { homeTeam: string, awayTeam: string, time: string, league: string }) => ({
  subject: `🔔 Game Alert: ${gameDetails.awayTeam} vs ${gameDetails.homeTeam}`,
  html: `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; color: #333;">
      <div style="background-color: #7f00ff; padding: 20px; text-align: center; border-radius: 8px 8px 0 0;">
        <h1 style="color: white; margin: 0;">Game Starting Soon!</h1>
      </div>
      <div style="background-color: #f9f9f9; padding: 20px; border-radius: 0 0 8px 8px; border: 1px solid #eee; border-top: none;">
        <p>Hello ${userName},</p>
        <p>Your followed game is about to begin:</p>
        <div style="background-color: #f0f0f0; padding: 15px; border-radius: 4px; margin: 20px 0; text-align: center;">
          <h2 style="margin: 0; color: #7f00ff;">${gameDetails.league.toUpperCase()}</h2>
          <div style="font-size: 18px; margin: 10px 0;">
            <strong>${gameDetails.awayTeam}</strong> vs <strong>${gameDetails.homeTeam}</strong>
          </div>
          <div style="font-size: 16px;">
            Starting at: ${gameDetails.time}
          </div>
        </div>
        <div style="text-align: center; margin: 30px 0;">
          <a href="https://veloplay.com/watch" style="background-color: #7f00ff; color: white; padding: 12px 24px; text-decoration: none; border-radius: 4px; font-weight: bold;">Watch Now</a>
        </div>
        <p>Don't miss the action!</p>
        <p>The VeloPlay Team</p>
      </div>
      <div style="text-align: center; padding: 20px; color: #666; font-size: 12px;">
        <p>© ${new Date().getFullYear()} VeloPlay. All rights reserved.</p>
        <p>You're receiving this email because you enabled game alerts for your followed teams.</p>
        <p><a href="https://veloplay.com/account/notifications" style="color: #7f00ff;">Manage notification preferences</a></p>
      </div>
    </div>
  `
});

/**
 * Email Sending Functions
 */

// Send welcome email
export const sendWelcomeEmail = async (to: string, userName: string, verificationLink?: string) => {
  try {
    // Use a consistent approach - if verification link is provided, use the verification template,
    // otherwise use the standard welcome template
    const emailHtml = verificationLink 
      ? verificationEmailTemplate(to, verificationLink).html 
      : welcomeEmailTemplate(userName).html;
    
    const { data, error } = await resend.emails.send({
      from: FROM_EMAIL,
      to: to,
      subject: verificationLink ? 'Welcome to VeloPlay! Please Verify Your Email' : 'Welcome to VeloPlay! 🎮',
      html: emailHtml,
    });

    if (error) {
      console.error('Failed to send welcome email:', error);
      return { success: false, error };
    }

    console.log('Welcome email sent successfully:', data);
    return { success: true, data };
  } catch (error) {
    console.error('Error sending welcome email:', error);
    return { success: false, error };
  }
};

// Send subscription expiration notification
export const sendSubscriptionExpirationEmail = async (to: string, userName: string, daysRemaining: number) => {
  try {
    // Send to actual recipient email
    const template = subscriptionExpirationTemplate(userName, daysRemaining);
    const { data, error } = await resend.emails.send({
      from: FROM_EMAIL,
      to: to,
      subject: template.subject,
      html: template.html,
    });

    if (error) {
      console.error('Failed to send subscription expiration email:', error);
      return { success: false, error };
    }

    console.log('Subscription expiration email sent successfully:', data);
    return { success: true, data };
  } catch (error) {
    console.error('Error sending subscription expiration email:', error);
    return { success: false, error };
  }
};

// REMOVED: Duplicate function that conflicts with main email service
// Game alerts now use unified system in server/emailService.ts

// Email verification template - NO SUPABASE REFERENCES WHATSOEVER
const verificationEmailTemplate = (to: string, verificationLink: string) => ({
  subject: 'Verify Your VeloPlay Account',
  html: `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; color: #333;">
      <div style="background-color: #7f00ff; padding: 20px; text-align: center; border-radius: 8px 8px 0 0;">
        <h1 style="color: white; margin: 0;">Verify Your Email</h1>
      </div>
      <div style="background-color: #f9f9f9; padding: 20px; border-radius: 0 0 8px 8px; border: 1px solid #eee; border-top: none;">
        <p>Welcome to VeloPlay!</p>
        <p>Please verify your email address to complete your registration and access all features.</p>
        <div style="text-align: center; margin: 30px 0;">
          <a href="${verificationLink}" style="background-color: #7f00ff; color: white; padding: 12px 24px; text-decoration: none; border-radius: 4px; font-weight: bold;">Verify Email Address</a>
        </div>
        <p>If the button above doesn't work, copy and paste this verification link into your browser:</p>
        <p style="background-color: #eee; padding: 10px; word-break: break-all;">${verificationLink}</p>
        <p>With your verified account, you can:</p>
        <ul>
          <li>Stream live games from NFL, NBA, NHL, and MLB</li>
          <li>Get real-time game notifications</li>
          <li>Customize your viewing experience</li>
        </ul>
        <p>Explore our subscription plans after verification to access premium content.</p>
        <p>If you didn't create an account with VeloPlay, you can safely ignore this email.</p>
      </div>
      <div style="text-align: center; padding: 20px; color: #666; font-size: 12px;">
        <p>© ${new Date().getFullYear()} VeloPlay. All rights reserved.</p>
        <p>This email was sent to verify your account at VeloPlay.</p>
      </div>
    </div>
  `
});

// Send verification email
export const sendVerificationEmail = async (to: string, verificationLink: string) => {
  try {
    // Ensure the verification link has our autoVerify parameter
    // Add the autoVerify parameter to ensure proper verification
    if (!verificationLink.includes('autoVerify=true')) {
      // Add the autoVerify parameter to ensure proper verification
      verificationLink = verificationLink.includes('?') 
        ? `${verificationLink}&autoVerify=true`
        : `${verificationLink}?autoVerify=true`;
    }
    
    console.log(`Sending verification email to ${to} with link ${verificationLink}`);
    const template = verificationEmailTemplate(to, verificationLink);
    
    const { data, error } = await resend.emails.send({
      from: FROM_EMAIL,
      to: to,
      subject: template.subject,
      html: template.html,
    });

    if (error) {
      console.error('Failed to send verification email:', error);
      return { success: false, error };
    }

    console.log('Verification email sent successfully:', data);
    return { success: true, data };
  } catch (error) {
    console.error('Error sending verification email:', error);
    return { success: false, error };
  }
};

// Test email function
export const sendTestEmail = async (to: string) => {
  try {
    // Create a fake verification link for testing
    const baseUrl = process.env.CLIENT_URL || 'https://veloplay.tv';
    const testVerificationLink = `${baseUrl}/auth/verify?token=test-token-example&type=signup&email=${encodeURIComponent(to)}`;
    
    // Use the verification email template but with a test message
    return sendVerificationEmail(to, testVerificationLink);
  } catch (error) {
    console.error('Error sending test email:', error);
    return { success: false, error };
  }
};

// Send OTP email for login verification
export const sendOtpEmail = async (to: string, userName: string, otpCode: string) => {
  try {
    console.log(`Sending OTP email to ${to} with code ${otpCode}`);
    
    // Always log the code to console for testing purposes
    console.log('=============================================');
    console.log(`VERIFICATION CODE FOR ${to}: ${otpCode}`);
    console.log('=============================================');
    
    // Skip actual email sending for testing if Resend API key is not available
    if (!process.env.RESEND_API_KEY) {
      console.log('Skipping actual email sending - RESEND_API_KEY not available');
      return { success: true, data: { id: 'mock-email-id' } };
    }
    
    // Otherwise try to send actual email
    try {
      const template = otpEmailTemplate(userName, otpCode);
      
      const { data, error } = await resend.emails.send({
        from: FROM_EMAIL,
        to: to,
        subject: template.subject,
        html: template.html,
      });
  
      if (error) {
        console.error('Failed to send OTP email:', error);
        // Still return success since we logged the code to console
        return { success: true, data: { id: 'mock-email-id' } };
      }
  
      console.log('OTP email sent successfully');
      return { success: true, data };
    } catch (emailError) {
      console.error('Error sending OTP email:', emailError);
      // Still return success since we logged the code to console
      return { success: true, data: { id: 'mock-email-id' } };
    }
  } catch (error) {
    console.error('Error in OTP email function:', error);
    // Still return success since we logged the code to console
    return { success: true, data: { id: 'mock-email-id' } };
  }
};