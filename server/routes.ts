import express, { type Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { isAuthenticated, supabaseClient } from "./supabaseAuth"; // Use Supabase for auth
import { isAdmin } from "./adminMiddleware"; // Admin middleware
import { trackUserActivity, getActiveUsers, startCleanupInterval } from "./activeUsers";
import { 
  getLeagueGames, 
  getAllGames, 
  getGameById,
  getRawESPNData
} from "./espnApi";
import { 
  initEmailService, 
  handleWelcomeEmail, 
  handleSubscriptionExpirationEmail,
  handleGameAlertEmail
} from "./emailService";
import { createAndSendOtp, verifyOtp, hasActiveOtps } from "./services/otpService";
import { z } from "zod";
import jwt from "jsonwebtoken";
import { insertStreamSchema, insertSubscriptionSchema, Game } from "@shared/schema";
import { getStreamUrlsForGame, STREAM_BASE_URL } from "./streamMapping";
import axios from "axios";
import fetch from "node-fetch";
import streamSourcesRoutes from './routes/streamSources';
import streamUrlEditorRoutes from './routes/streamUrlEditor';
import directStreamUrlRoutes from './routes/directStreamUrl';
import { handleInitStreamSources } from './routes/initStreamSources';
import redisAdminRoutes from './routes/redisAdmin';
import redisTestRoutes from './routes/redisTest';
import { 
  parseM3U8ToStreamMap, 
  getDynamicStreamUrl, 
  updateDynamicStreamMapping,
  DYNAMIC_STREAM_MAP,
  initializeDynamicMapping 
} from './routes/dynamicStreamMapping';
import { sendGameAlert, sendTestAlert } from './alerts';

// Using streamSourcesLatestFixed as the primary stream source endpoint
import streamSourcesLatestFixedRoutes from './routes/streamSourcesLatestFixed';

// Function to initialize subscription plans
async function initializeSubscriptionPlans() {
  try {
    const existingPlans = await storage.getAllSubscriptionPlans();
    
    // Only create default plans if none exist
    if (existingPlans.length === 0) {
      console.log("Creating default subscription plans...");
      
      // Free plan (browse only)
      await storage.createSubscriptionPlan({
        name: "Free",
        price: 0, // Free
        description: "Browse games and schedules",
        durationDays: 365,
        features: [
          "Browse game schedules", 
          "View team information", 
          "Game alerts and notifications",
          "No streaming access"
        ],
        isPopular: false
      });
      
      // Monthly plan 
      await storage.createSubscriptionPlan({
        name: "Monthly",
        price: 1999, // $19.99 as specified
        description: "Full streaming access with HD quality",
        durationDays: 30,
        features: [
          "Live game streaming", 
          "High definition (HD) quality", 
          "Access to game replays",
          "Multiple device support",
          "Ad-free experience",
          "Home and away feeds"
        ],
        isPopular: true
      });
      
      // Annual plan (best value)
      await storage.createSubscriptionPlan({
        name: "Annual",
        price: 14999, // $149.99 as specified
        description: "Our best value plan with all premium features at a discounted annual rate",
        durationDays: 365,
        features: [
          "Live game streaming", 
          "High definition (HD) quality", 
          "Access to game replays",
          "Detailed game statistics",
          "Multiple device support",
          "Ad-free experience",
          "Early access to new features",
          "Save over 15% compared to monthly"
        ],
        isPopular: false
      });
      
      console.log("Default subscription plans created successfully");
    }
  } catch (error) {
    console.error("Error initializing subscription plans:", error);
  }
}

export async function registerRoutes(app: Express): Promise<Server> {
  // Initialize services
  await storage.initializeLeagues();
  await initEmailService();
  
  // Initialize dynamic stream mapping from M3U8 source
  await initializeDynamicMapping();
  
  // Import route modules
  const streamSourcesRoutes = await import('./routes/streamSources').then(m => m.default);
  const initStreamSourcesRoutes = await import('./routes/initStreamSources').then(m => m.default);
  const streamsRoutes = await import('./routes/streams').then(m => m.default);
  
  // Register the streamSourcesLatestFixed routes FIRST - this endpoint is public, no auth required
  app.use('/api/stream-sources/latest', streamSourcesLatestFixedRoutes);
  
  // Register imported routes AFTER the public latest endpoint
  app.use('/api/init-stream-sources', initStreamSourcesRoutes);
  app.use('/api/streams', streamsRoutes);
  
  // Register the direct stream URL editing endpoints
  app.use('/api/direct-stream-url', directStreamUrlRoutes);
  
  // Also add the POST version for handling body-style requests
  app.post('/api/update-stream-url', async (req, res) => {
    try {
      const { id, url } = req.body;
      
      if (!id || !url) {
        return res.status(400).json({
          success: false,
          message: 'Missing required fields: id and url'
        });
      }
      
      console.log(`Processing stream URL update request for ID ${id} to ${url}`);
      
      // Make the update using Supabase directly
      const supabase = await import('./db').then(m => m.supabase);
      
      // First check if the row exists
      const { data: existingData, error: checkError } = await supabase
        .from('stream_sources')
        .select('*')
        .eq('id', parseInt(id, 10))
        .maybeSingle();
        
      if (checkError) {
        console.error('Error checking if stream source exists:', checkError);
      }
      
      // If row doesn't exist, create it
      if (!existingData) {
        console.log(`Creating new stream source record for ID ${id}`);
        
        // Properly match the DB schema - camelCase in code, snake_case in DB
        const { data: insertData, error: insertError } = await supabase
          .from('stream_sources')
          .insert([{
            // Required fields according to the schema
            id: parseInt(id, 10),
            name: `Stream ${id}`,
            team_name: `Team ${id}`,  // Matches schema's teamName
            url: url.trim(),
            league_id: 'other',       // Matches schema's leagueId
            // Optional fields with defaults
            is_active: true,          // Matches schema's isActive
            priority: 1,              // Default from schema is 1
            description: `Auto-created stream ${id}`
          }])
          .select();
          
        if (insertError) {
          console.error('Error creating stream source:', insertError);
          return res.status(500).json({
            success: false,
            message: 'Failed to create stream source',
            error: insertError.message
          });
        }
        
        console.log('Successfully created stream source:', insertData);
        return res.json({
          success: true,
          message: 'Stream source created successfully',
          data: insertData[0]
        });
      }
      
      // Update existing record
      const { data, error } = await supabase
        .from('stream_sources')
        .update({ url: url.trim() })
        .eq('id', parseInt(id, 10))
        .select();
        
      if (error) {
        console.error('Error updating stream URL:', error);
        return res.status(500).json({
          success: false,
          message: 'Failed to update stream URL',
          error: error.message
        });
      }
      
      console.log('Stream URL updated successfully:', data);
      return res.json({
        success: true,
        message: 'Stream URL updated successfully',
        data: data[0]
      });
    } catch (error: any) {
      console.error('Unexpected error in update-stream-url endpoint:', error);
      return res.status(500).json({
        success: false,
        message: 'An unexpected error occurred',
        error: error?.message || 'Unknown error'
      });
    }
  });

  // Game Alert API endpoint (now with proper scheduling)
  app.post('/api/game/alert', async (req, res) => {
    try {
      console.log('📅 SCHEDULER: Alert endpoint hit with data:', req.body);
      const { gameId, email, notifyMinutesBefore } = req.body;
      
      if (!gameId || !email || !notifyMinutesBefore) {
        return res.status(400).json({ message: "Game ID, email, and notification timing are required" });
      }

      // Get game data
      const game = await getGameById(gameId);
      if (!game) {
        return res.status(404).json({ message: "Game not found" });
      }

      // Use the proper scheduler
      const { alertScheduler } = await import('./alertScheduler');
      const gameTime = new Date(game.date);
      
      try {
        console.log('📅 SCHEDULER: About to schedule alert for:', { gameId, email, notifyMinutesBefore, gameTime });
        const alertId = alertScheduler.scheduleAlert(gameId, email, notifyMinutesBefore, gameTime);
        console.log('📅 SCHEDULER: Alert scheduled successfully with ID:', alertId);
        res.json({ 
          success: true, 
          message: `Alert scheduled! You'll be notified ${notifyMinutesBefore} minutes before the game starts.`,
          alertId 
        });
      } catch (schedulingError: any) {
        console.log('📅 SCHEDULER ERROR:', schedulingError.message);
        // Handle timing validation errors
        res.status(400).json({ 
          success: false, 
          message: schedulingError.message || 'Failed to schedule alert'
        });
      }
    } catch (error) {
      console.error("Error scheduling game alert:", error);
      res.status(500).json({ success: false, message: "Failed to schedule game alert" });
    }
  });

  // Simple scheduled game alert endpoint (no authentication required)
  app.post('/api/game-alerts/simple', async (req, res) => {
    try {
      const { gameId, email, notifyMinutesBefore } = req.body;
      
      if (!gameId || !email || !notifyMinutesBefore) {
        return res.status(400).json({ message: "Game ID, email, and notification time are required" });
      }

      // Get game data to validate the alert timing
      const game = await getGameById(gameId);
      if (!game) {
        return res.status(404).json({ message: "Game not found" });
      }

      // Validate timing - ensure there's enough time remaining
      const gameTime = new Date(game.date);
      const now = new Date();
      const minutesUntilGame = Math.floor((gameTime.getTime() - now.getTime()) / (1000 * 60));
      
      if (notifyMinutesBefore > minutesUntilGame) {
        return res.status(400).json({ 
          message: `Cannot set ${notifyMinutesBefore}-minute alert when only ${minutesUntilGame} minutes remain until game time.`
        });
      }

      // Store the alert in the database for the scheduler to process
      try {
        const { data, error } = await supabaseClient.from('game_alerts').insert({
          game_id: gameId,
          email: email,
          notify_minutes_before: notifyMinutesBefore,
          is_notified: false,
          created_at: new Date().toISOString()
        }).select();
        
        if (error) {
          console.error('Database error creating alert:', error);
          return res.status(500).json({ message: "Failed to create game alert" });
        }

        console.log(`✅ Scheduled alert created: ${email} will be notified ${notifyMinutesBefore} minutes before ${game.shortName}`);
        
        res.json({ 
          success: true, 
          message: `Game alert scheduled! You'll receive an email ${notifyMinutesBefore} minutes before the game starts.`,
          alert: data[0]
        });
      } catch (error) {
        console.error('Error creating scheduled alert:', error);
        res.status(500).json({ success: false, message: "Failed to schedule game alert" });
      }
    } catch (error) {
      console.error("Error in scheduled game alert:", error);
      res.status(500).json({ success: false, message: "Failed to set scheduled game alert" });
    }
  });

  // Test alert endpoint
  app.post('/api/test-alert', async (req, res) => {
    try {
      const { email } = req.body;
      
      if (!email) {
        return res.status(400).json({ message: "Email is required" });
      }

      const success = await sendTestAlert(email);

      if (success) {
        res.json({ success: true, message: "Test alert sent successfully!" });
      } else {
        res.status(500).json({ success: false, message: "Failed to send test alert" });
      }
    } catch (error) {
      console.error("Error sending test alert:", error);
      res.status(500).json({ success: false, message: "Failed to send test alert" });
    }
  });
  
  // OTP verification routes
  app.post('/api/auth/request-otp', async (req, res) => {
    try {
      const { email, userId } = req.body;
      
      if (!email) {
        return res.status(400).json({ message: 'Email is required' });
      }
      
      // Generate a 6-digit OTP code
      const otpCode = Math.floor(100000 + Math.random() * 900000).toString();
      
      // Store OTP code in session
      req.session.otpCode = otpCode;
      req.session.otpUserId = userId;
      req.session.otpEmail = email;
      req.session.otpExpires = Date.now() + (10 * 60 * 1000); // 10 minutes as specified
      
      console.log(`Generated OTP code for ${email}: ${otpCode}`);
      
      // Get user's name or use email prefix as fallback
      const userName = email.split('@')[0] || 'User';
      
      // Send OTP email using Resend
      try {
        const emailService = await import('./services/emailService');
        const result = await emailService.sendOtpEmail(email, userName, otpCode);
        
        if (!result.success) {
          console.error('Failed to send OTP email:', result.error);
          return res.status(500).json({ message: 'Failed to send verification code' });
        }
      } catch (emailError) {
        console.error('Error sending email with Resend:', emailError);
        
        // For now, just log the code to console for testing
        console.log(`IMPORTANT: Verification code for ${email} is: ${otpCode}`);
        
        // Continue with success response to client even if email fails
        // This allows us to test the flow even if email service has issues
      }
      
      return res.json({ 
        success: true, 
        message: 'Verification code sent to your email' 
      });
    } catch (error) {
      console.error('Error generating OTP:', error);
      res.status(500).json({ message: 'Failed to generate verification code' });
    }
  });
  
  app.post('/api/auth/verify-otp', async (req, res) => {
    try {
      const { code, userId } = req.body;
      
      if (!code) {
        return res.status(400).json({ message: 'Verification code is required' });
      }
      
      // Verify OTP code from session
      const storedCode = req.session.otpCode;
      const storedUserId = req.session.otpUserId;
      const expiryTime = req.session.otpExpires || 0;
      
      // Check if OTP has expired
      if (Date.now() > expiryTime) {
        return res.status(400).json({ message: 'Verification code has expired' });
      }
      
      // Check if OTP is valid
      if (!storedCode || storedCode !== code || (userId && storedUserId !== userId)) {
        return res.status(400).json({ message: 'Invalid verification code' });
      }
      
      // Mark user as verified if we can access the database
      try {
        if (userId) {
          await storage.updateUser({
            id: userId,
            verificationComplete: true,
            emailVerified: true
          });
        }
      } catch (dbError) {
        console.error('Warning: Could not update user verification status:', dbError);
        // Continue verification process regardless
      }
      
      // Clear OTP from session
      req.session.otpCode = undefined;
      req.session.otpUserId = undefined;
      req.session.otpExpires = undefined;
      
      return res.json({ 
        success: true,
        message: 'Email verified successfully' 
      });
    } catch (error) {
      console.error('Error verifying OTP:', error);
      res.status(500).json({ message: 'Failed to verify code' });
    }
  });
  
  // Initialize subscription plans if they don't exist
  await initializeSubscriptionPlans();
  
  // Setup stream sources table
  app.get('/api/setup-stream-sources', isAuthenticated, isAdmin, async (req, res) => {
    try {
      const { setupStreamSourcesTable } = require('./routes/db-setup');
      const result = await setupStreamSourcesTable();
      res.json(result);
    } catch (error) {
      console.error('Error setting up stream sources table:', error);
      res.status(500).json({ error: 'Failed to set up stream sources table' });
    }
  });
  
  // Handle email verification redirects from Supabase
  app.get('/auth/callback', async (req, res) => {
    try {
      const { token_hash, type, error_description, returnTo, email, code } = req.query;
      const currentUrl = `${req.protocol}://${req.get('host')}`;
      
      // Get the return URL if provided or use default
      const returnUrl = returnTo ? decodeURIComponent(returnTo as string) : '/';
      
      console.log(`[AUTH] Callback received with type: ${type}, email: ${email}, returnTo: ${returnUrl}`);
      
      // If there's an error in the URL, redirect with the error
      if (error_description) {
        console.error("Verification error:", error_description);
        return res.redirect(`/login?verification=error&message=${encodeURIComponent(error_description as string)}`);
      }
      
      // Handle Supabase auth code exchange (for auto-login after verification)
      if (code) {
        try {
          console.log("[AUTH] Auth code found, exchanging for session");
          
          // Create HTML form for auto-login
          // This uses JavaScript to automatically exchange the code for a session
          // and then redirect to the original page
          // Handle code exchange server-side and create a redirect response with an auto-refresh
          try {
            // Exchange the code for a session directly on the server
            const { data, error } = await supabaseClient.auth.exchangeCodeForSession(code as string);
            
            if (error) {
              console.error('[AUTH] Error exchanging code for session:', error);
              return res.redirect('/login?error=verification_failed');
            }
            
            // Get the user's session
            const session = data?.session;
            
            if (!session) {
              console.error('[AUTH] No session returned from code exchange');
              return res.redirect('/login?error=no_session');
            }
            
            // Set a cookie with the session token so the client-side app can pick it up
            const expiresDate = new Date((session.expires_at || (Date.now()/1000 + 3600)) * 1000);
            res.cookie('sb-session', session.access_token || '', { 
              httpOnly: false, 
              expires: expiresDate,
              path: '/' 
            });
            
            // Redirect with special verification success parameter
            const redirectPath = returnUrl.includes('?') 
              ? `${returnUrl}&verification=success&t=${Date.now()}` 
              : `${returnUrl}?verification=success&t=${Date.now()}`;
            
            console.log('[AUTH] Verification successful, redirecting to:', redirectPath);
            
            // Send a special HTML response that will:
            // 1. Set the session in localStorage
            // 2. Redirect to the original page with verification=success
            return res.send(`
              <!DOCTYPE html>
              <html>
              <head>
                <title>Verification Complete</title>
                <style>
                  body {
                    font-family: Arial, sans-serif;
                    background-color: #0d021f;
                    color: white;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    height: 100vh;
                    margin: 0;
                  }
                  .container {
                    text-align: center;
                    max-width: 500px;
                    padding: 2rem;
                  }
                  .spinner {
                    width: 40px;
                    height: 40px;
                    margin: 0 auto 1rem;
                    border: 4px solid rgba(127, 0, 255, 0.3);
                    border-radius: 50%;
                    border-top-color: #7f00ff;
                    animation: spin 1s ease infinite;
                  }
                  @keyframes spin {
                    to { transform: rotate(360deg); }
                  }
                </style>
              </head>
              <body>
                <div class="container">
                  <div class="spinner"></div>
                  <h2>Verification Complete!</h2>
                  <p>Your email has been verified successfully. Redirecting you back to the app...</p>
                </div>
                <script>
                  // Only set email_verified flag but don't store session tokens
                  // This ensures user has to log in again after verification
                  localStorage.setItem('email_verified', 'true');
                  
                  // Clear any saved game URL
                  localStorage.removeItem('gameUrlBeforeVerification');
                  
                  // Redirect to dashboard after successful verification
                  setTimeout(() => {
                    window.location.href = '/dashboard?verified=true';
                  }, 1500);
                </script>
              </body>
              </html>
            `);
          } catch (serverError) {
            console.error('[AUTH] Server error during verification code exchange:', serverError);
            return res.redirect('/login?error=server_error');
          }
        } catch (codeError) {
          console.error("[AUTH] Error exchanging code for session:", codeError);
          return res.redirect('/login?error=session_exchange_failed');
        }
      }
      
      // If this is email confirmation, auto-login the user
      if (type === 'email_confirmation' || type === 'signup') {
        console.log("[AUTH] Email verification callback received! Auto-logging in user...");
        
        try {
          // Exchange the code for a session to auto-login the user
          const { data: sessionData, error: sessionError } = await supabase.auth.exchangeCodeForSession(code);
          
          if (sessionError) {
            console.error("[AUTH] Error creating session after verification:", sessionError);
            return res.redirect('/login?verification=success&auto_login=failed');
          }
          
          if (sessionData?.session?.access_token) {
            console.log("[AUTH] Successfully created session for verified user");
            
            // Update user verification status in our database
            const user = sessionData.session.user;
            if (user?.email) {
              try {
                const dbUser = await storage.getUserByEmail(user.email);
                if (dbUser) {
                  await storage.updateUserVerificationStatus(dbUser.id, true);
                  console.log("[AUTH] Updated database verification status for:", user.email);
                }
              } catch (dbError) {
                console.error("[AUTH] Error updating database verification:", dbError);
              }
            }
            
            // Create an HTML response that sets the session and redirects
            return res.send(`
              <!DOCTYPE html>
              <html>
              <head>
                <title>Email Verified - VeloPlay</title>
                <style>
                  body { font-family: Arial, sans-serif; background: #1a1a1a; color: white; margin: 0; padding: 40px; text-align: center; }
                  .container { max-width: 500px; margin: 0 auto; }
                  .success { color: #4ade80; font-size: 24px; margin-bottom: 20px; }
                </style>
              </head>
              <body>
                <div class="container">
                  <div class="success">✅ Email Verified Successfully!</div>
                  <p>You're now logged in and being redirected to your dashboard...</p>
                </div>
                <script>
                  // Set the session token for auto-login
                  localStorage.setItem('supabase.auth.token', JSON.stringify({
                    access_token: '${sessionData.session.access_token}',
                    refresh_token: '${sessionData.session.refresh_token}',
                    expires_at: ${sessionData.session.expires_at}
                  }));
                  
                  // Mark email as verified
                  localStorage.setItem('email_verified', 'true');
                  
                  // Clear any saved verification URLs
                  localStorage.removeItem('gameUrlBeforeVerification');
                  
                  // Redirect to dashboard
                  setTimeout(() => {
                    window.location.href = '/dashboard?verified=true&auto_login=true';
                  }, 2000);
                </script>
              </body>
              </html>
            `);
          }
        } catch (autoLoginError) {
          console.error("[AUTH] Auto-login after verification failed:", autoLoginError);
        }
        
        // Fallback: redirect to login page with success message
        return res.redirect('/login?verification=success');
      }
      
      // For password recovery or other types
      if (type === 'recovery') {
        return res.redirect('/reset-password');
      }
      
      // Default fallback redirect
      return res.redirect(returnUrl);
    } catch (error) {
      console.error("Error in auth callback:", error);
      return res.redirect('/login?error=callback_error');
    }
  });
  
  // Direct email verification endpoint (for our custom verification flow)
  app.post('/api/verify-email', async (req, res) => {
    try {
      const { email, autoLogin } = req.body;
      
      if (!email) {
        return res.status(400).json({ 
          message: "Email is required", 
          success: false 
        });
      }
      
      console.log(`[AUTO-VERIFY] Processing auto-verification for email: ${email}, autoLogin: ${autoLogin}`);
      
      // Mark the email as verified in our system
      try {
        console.log(`[AUTO-VERIFY] Email verified for: ${email}`);
        
        // If auto-login is requested, get user data for automatic sign-in
        if (autoLogin) {
          try {
            // Get the user from our database to retrieve their information
            const user = await storage.getUserByEmail(email);
            
            if (user) {
              console.log(`[AUTO-VERIFY] Found user for auto-login: ${email}`);
              
              // For auto-login to work, we need to provide the password to the frontend
              // Since we can't retrieve the actual password (it's hashed), we'll use a different approach
              // We'll create a temporary session token or use Supabase's admin auth
              
              return res.status(200).json({
                message: "Email successfully verified. Logging you in automatically...",
                success: true,
                autoLogin: true,
                redirectToPricing: !user.isVerified, // Redirect to pricing if this is their first verification
                userId: user.id
              });
            } else {
              console.log(`[AUTO-VERIFY] User not found for auto-login: ${email}`);
              // Fall back to manual login
              return res.status(200).json({
                message: "Email successfully verified. Please log in to continue.",
                success: true,
                redirectToPricing: true
              });
            }
          } catch (userError) {
            console.error('[AUTO-VERIFY] Error getting user for auto-login:', userError);
            // Fall back to manual login
            return res.status(200).json({
              message: "Email successfully verified. Please log in to continue.",
              success: true,
              redirectToPricing: true
            });
          }
        } else {
          // Standard verification without auto-login
          return res.status(200).json({
            message: "Email successfully verified. Please visit the pricing page to choose a subscription plan.",
            success: true,
            redirectToPricing: true
          });
        }
      } catch (error) {
        console.error('[AUTO-VERIFY] Error marking email as verified:', error);
        return res.status(500).json({
          message: "Failed to verify email",
          success: false
        });
      }
    } catch (error) {
      console.error('[AUTO-VERIFY] Error in auto-verification process:', error);
      return res.status(500).json({
        message: "Server error during verification",
        success: false
      });
    }
  });
  
  // Email verification endpoint - handles both signup and backup verification
  app.post('/api/auth/send-verification', async (req, res) => {
    try {
      const { email, firstName, useDirectMethod, returnUrl } = req.body;
      
      if (!email) {
        return res.status(400).json({ message: "Email is required" });
      }
      
      console.log(`[VERIFICATION] Sending verification email to: ${email}`);
      
      // Initialize email service right away to ensure it's loaded
      const emailService = await import('./services/emailService');
      
      // Check if Resend API key is configured
      if (!process.env.RESEND_API_KEY) {
        console.error("[VERIFICATION] RESEND_API_KEY not configured!");
        return res.status(500).json({ 
          message: "Email service not properly configured. Please contact support.", 
          success: false
        });
      }
      
      // Get hostname from request or use default production domain
      const host = req.get('host') || 'veloplay.tv';
      const isLocalhost = host.includes('localhost') || host.includes('127.0.0.1') || host.includes('replit');
      const protocol = isLocalhost ? 'http' : 'https';
      const baseUrl = `${protocol}://${host}`;
      
      console.log(`[VERIFICATION] Using base URL: ${baseUrl}`);
      
      // Get the return URL from request or use default
      const userReturnUrl = returnUrl || '/';
      
      // Build the redirect URL with return path encoded
      const redirectTo = `${baseUrl}/auth/callback?returnTo=${encodeURIComponent(userReturnUrl)}`;
      console.log(`[VERIFICATION] Redirect URL: ${redirectTo} (will return to: ${userReturnUrl})`);
      
      // First get a proper verification URL from Supabase, but we'll send our own email
      try {
        console.log("[VERIFICATION] Getting verification code from Supabase...");
        
        // Get proper verification token from Supabase
        const { data: resendData, error: resendError } = await supabaseClient.auth.resend({
          type: 'signup',
          email: email,
          options: {
            emailRedirectTo: redirectTo
          }
        });
        
        if (resendError) {
          console.error("[VERIFICATION] Supabase verification prep error:", resendError);
          return res.status(500).json({ 
            message: "Failed to prepare verification. Please try again later.", 
            success: false
          });
        }
        
        // Extract verification URL from the Supabase response
        // This is a critical step to get the proper verification token
        let verificationUrl = '';
        try {
          // For debugging purposes only, intercept emails to get the verification URL
          // In a production environment, you'd use Supabase's email templates with intercepting webhooks
          await new Promise(resolve => setTimeout(resolve, 500)); 
          
          // The proper way to get the verification code/URL would be through Supabase webhooks
          // For now, let's just append a dummy token placeholder that our frontend can handle
          verificationUrl = `${baseUrl}/auth/callback?returnTo=${encodeURIComponent(userReturnUrl)}&email=${encodeURIComponent(email)}&autoVerify=true`;
          
          console.log("[VERIFICATION] Using backup verification URL:", verificationUrl);
        } catch (error) {
          console.error("[VERIFICATION] Error extracting verification URL:", error);
          return res.status(500).json({ 
            message: "Failed to generate verification link. Please try again.", 
            success: false 
          });
        }
        
        // Now send our own custom branded email with the verification URL
        console.log("[VERIFICATION] Sending custom verification email via Resend...");
        const result = await emailService.sendVerificationEmail(email, verificationUrl);
        
        if (result.success) {
          console.log("[VERIFICATION] Successfully sent verification email via Resend");
          
          return res.status(200).json({ 
            message: "Verification email sent. Please check your inbox and spam folder for an email from noreply@veloplay.tv", 
            success: true 
          });
        } else {
          console.error("[VERIFICATION] Direct email sending failed:", result.error);
          // Continue to fallback methods
        }
      } catch (directError) {
        console.error("[VERIFICATION] Error with direct email method:", directError);
        // Continue to fallback methods using Supabase
      }
      
      // FALLBACK: Create a simple plain email as a last resort
      try {
        console.log("[VERIFICATION] Attempting fallback plain verification email...");
        
        // Create a very simple plain email as last resort
        const plainEmailHtml = `
          <div style="max-width: 600px; font-family: Arial, sans-serif;">
            <h2>VeloPlay Email Verification</h2>
            <p>Hello,</p>
            <p>Please verify your email by clicking this link:</p>
            <p><a href="${verificationLink}">${verificationLink}</a></p>
            <p>Thank you,<br>The VeloPlay Team</p>
          </div>
        `;
        
        // Send plain email directly
        const { data: plainData, error: plainError } = await resend.emails.send({
          from: 'noreply@veloplay.tv',
          to: email,
          subject: 'VeloPlay Account Verification',
          html: plainEmailHtml,
        });
        
        if (!plainError) {
          console.log("[VERIFICATION] Successfully sent plain verification email");
          
          // Also try to trigger Supabase verification silently (without relying on their email)
          try {
            await supabaseClient.auth.resend({
              type: 'signup',
              email: email,
              options: {
                emailRedirectTo: redirectTo
              }
            });
          } catch (e) {
            // Ignore errors, we don't depend on this working
          }
          
          return res.status(200).json({ 
            message: "Verification email sent. Please check your inbox and spam folder for an email from noreply@veloplay.tv",
            success: true
          });
        } else {
          console.error("[VERIFICATION] Plain email send failed:", plainError);
          // All methods have failed, return error
          return res.status(500).json({ 
            message: "Failed to send verification email. Please try again later or contact support.",
            success: false
          });
        }
      } catch (fallbackError) {
        console.error("[VERIFICATION] Fallback method failed:", fallbackError);
        return res.status(500).json({ 
          message: "Failed to send verification email. Please try again later or contact support.",
          success: false
        });
      }
      
      // If we get here, all methods failed
      return res.status(500).json({ 
        message: "Failed to send verification email through all available methods. Please try again later or contact support.", 
        success: false
      });
    } catch (error) {
      console.error("[VERIFICATION] Error in verification email endpoint:", error);
      return res.status(500).json({ message: "Failed to send verification email" });
    }
  });

  // Auth routes
  app.get('/api/auth/user', isAuthenticated, async (req, res) => {
    try {
      // User is already attached to req by the isAuthenticated middleware
      const user = req.user;
      res.json({
        ...user,
        emailVerified: user?.isVerified || false
      });
    } catch (error) {
      console.error("Error fetching user:", error);
      res.status(500).json({ message: "Failed to fetch user" });
    }
  });

  // User profile with trial status calculation
  app.get('/api/user/profile', isAuthenticated, async (req, res) => {
    try {
      const user = req.user;
      if (!user) {
        return res.status(401).json({ message: "Unauthorized" });
      }

      // Calculate trial status
      const createdAt = new Date(user.createdAt);
      const trialDurationDays = 15;
      const trialExpiresAt = new Date(createdAt);
      trialExpiresAt.setDate(trialExpiresAt.getDate() + trialDurationDays);
      
      const now = new Date();
      const isTrialActive = now <= trialExpiresAt || user.isAdmin;
      
      // Calculate days remaining
      const msPerDay = 24 * 60 * 60 * 1000;
      const daysRemaining = Math.max(0, Math.ceil((trialExpiresAt.getTime() - now.getTime()) / msPerDay));

      const profile = {
        id: user.id,
        email: user.email,
        isAdmin: user.isAdmin || false,
        createdAt: user.createdAt,
        trialExpiresAt: trialExpiresAt.toISOString(),
        isTrialActive,
        daysRemaining: user.isAdmin ? 999 : daysRemaining
      };

      res.json(profile);
    } catch (error) {
      console.error("Error fetching user profile:", error);
      res.status(500).json({ message: "Failed to fetch user profile" });
    }
  });
  
  // Endpoint to check if user's email is verified
  app.get('/api/auth/check-verification-status', async (req, res) => {
    try {
      const session = req.headers.authorization?.split(' ')[1];
      
      if (!session) {
        return res.status(401).json({ verified: false, message: "Unauthorized" });
      }
      
      // Use Supabase Admin API to get user details
      const { data: { user }, error } = await supabaseClient.auth.getUser(session);
      
      if (error || !user) {
        console.error("Error getting user for verification check:", error);
        return res.status(400).json({ verified: false, message: error?.message || "Failed to get user" });
      }
      
      // Check if email is confirmed
      const verified = user.email_confirmed_at !== null;
      
      return res.json({ 
        verified, 
        email: user.email,
        confirmedAt: user.email_confirmed_at 
      });
    } catch (error) {
      console.error("Error checking verification status:", error);
      return res.status(500).json({ verified: false, message: "Internal server error" });
    }
  });
  
  // Request OTP for first-time login
  app.post('/api/auth/request-otp', async (req, res) => {
    try {
      const { email, userId } = req.body;
      
      if (!email && !userId) {
        return res.status(400).json({ message: "Email or User ID is required" });
      }
      
      // Check if user exists
      let user;
      if (email) {
        user = await storage.getUserByEmail(email);
      } else if (userId) {
        user = await storage.getUser(userId);
      }
      
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }
      
      // Generate and send OTP
      const { success, error } = await createAndSendOtp(user.id, user.email, user.firstName || "User");
      
      if (!success || error) {
        console.error("Error generating OTP:", error);
        return res.status(500).json({ message: "Failed to generate verification code" });
      }
      
      return res.status(200).json({ 
        message: "Verification code sent", 
        userId: user.id 
      });
    } catch (error) {
      console.error("Error in OTP request:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });
  
  // Verify OTP code
  app.post('/api/auth/verify-otp', async (req, res) => {
    try {
      const { userId, code } = req.body;
      
      if (!userId || !code) {
        return res.status(400).json({ message: "User ID and verification code are required" });
      }
      
      // Verify the OTP
      const { success, message } = await verifyOtp(userId, code);
      
      if (!success) {
        return res.status(400).json({ message: message || "Invalid verification code" });
      }
      
      return res.status(200).json({ 
        message: "Verification successful",
        verified: true
      });
    } catch (error) {
      console.error("Error verifying OTP:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });
  
  // Simple endpoint to check if a user can log in - doesn't require admin access
  app.post('/api/auth/check-email', async (req, res) => {
    try {
      const { email } = req.body;
      
      if (!email) {
        return res.status(400).json({ message: "Email is required" });
      }
      
      // This is a more simple check that doesn't require admin API access
      // Basically, always allow the login attempt to proceed but make the client-side
      // check for verification status after login
      return res.status(200).json({
        exists: true, // We don't actually know but for security don't reveal this
        verified: true, // We'll check this after login on the client
        message: "Please proceed with login" 
      });
    } catch (error) {
      console.error("Error in login check:", error);
      return res.status(200).json({
        exists: true, 
        verified: true,
        message: "Proceed with login attempt"
      });
    }
  });
  
  // Check if email exists
  app.get('/api/auth/check-email', async (req, res) => {
    try {
      const email = req.query.email as string;
      
      if (!email) {
        return res.status(400).json({ message: "Email is required" });
      }
      
      // First check in our database
      const existingUser = await storage.getUserByEmail(email);
      
      if (existingUser) {
        return res.status(200).json({ exists: true });
      }
      
      // Since our database check isn't reliable, use a more direct method with Supabase
      try {
        // Try to sign in with dummy credentials - if the account exists but password is wrong
        // we'll get "Invalid login credentials" error
        const { error } = await supabaseClient.auth.signInWithPassword({
          email, 
          password: `ThisIsDefinitelyNotTheRightPassword${Date.now()}`
        });
        
        // If we get Invalid login credentials, the email exists
        if (error && (
          error.message.includes("Invalid login credentials") ||
          error.message.includes("Invalid email") === false // Any error that's not about invalid email
        )) {
          return res.status(200).json({ exists: true });
        }
        
        // If we get a specific "user not found" error, then it definitely doesn't exist
        if (error && (
          error.message.includes("Email not confirmed") ||
          error.message.includes("Invalid email")
        )) {
          return res.status(200).json({ exists: false });
        }
      } catch (authError) {
        console.error("Error checking auth:", authError);
        // Continue to conservative approach
      }
      
      // Conservative approach - if we're not sure, say it doesn't exist
      // so user can try to create a new account
      return res.status(200).json({ exists: false });
    } catch (error) {
      console.error("Error checking email:", error);
      // Default to false so user can try to sign up
      return res.status(200).json({ exists: false });
    }
  });

  // Pre-signup endpoint - ensure email can be verified
  app.post('/api/auth/pre-signup', async (req, res) => {
    try {
      const { email, firstName, lastName } = req.body;
      
      if (!email) {
        return res.status(400).json({ message: "Email is required" });
      }
      
      console.log(`[PRE-SIGNUP] Processing pre-signup verification for: ${email}`);
      
      // Check if the email is valid before proceeding
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(email)) {
        return res.status(400).json({ message: "Invalid email format" });
      }
      
      // Return success - this endpoint is mostly for logging and validation
      return res.status(200).json({ 
        message: "Pre-signup check successful",
        emailVerified: true 
      });
    } catch (error) {
      console.error("[PRE-SIGNUP] Error in pre-signup endpoint:", error);
      return res.status(500).json({ message: "Failed to process pre-signup check" });
    }
  });

  // Supabase Sign Up
  app.post('/api/auth/signup', async (req, res) => {
    try {
      const { email, password, firstName, lastName } = req.body;
      
      if (!email || !password) {
        return res.status(400).json({ message: "Email and password are required" });
      }
      
      // Sign up user with emailRedirectTo set but let Supabase handle the email
      const { data, error } = await supabaseClient.auth.signUp({
        email,
        password,
        options: {
          data: {
            first_name: firstName,
            last_name: lastName
          },
          emailRedirectTo: `${req.protocol}://${req.get('host')}/auth/callback?autoVerify=true&email=${encodeURIComponent(email)}`
        }
      });
      
      if (error) {
        console.error("Signup error:", error);
        
        // Special handling for rate limit errors
        if (error.message && error.message.includes("security purposes") || 
            error.status === 429 || 
            error.code === 'over_email_send_rate_limit') {
          return res.status(429).json({ 
            message: "Rate limit reached. Please wait a minute before trying again or use a different email address." 
          });
        }
        
        // Special handling for already registered users
        if (error.message && (
            error.message.includes("already registered") || 
            error.message.includes("already exists") ||
            error.code === "user_already_exists")) {
          
          // First try to get the existing user by email
          const existingUser = await storage.getUserByEmail(email);
          
          if (existingUser) {
            // User exists in our database - return a more specific message
            return res.status(409).json({ 
              message: "User already registered",
              code: "user_already_exists",
              userExists: true
            });
          }
          
          // User exists in Supabase but not in our DB
          return res.status(409).json({ 
            message: "User already registered", 
            code: "user_already_exists",
            userExists: true
          });
        }
        
        return res.status(400).json({ message: error.message });
      }
      
      // Get user ID from Supabase response
      const userId = data.user?.id;
      
      if (!userId) {
        return res.status(400).json({ message: "Failed to get user ID from signup response" });
      }
      
      // Users need to purchase a subscription to access premium content
      console.log(`New user ${userId} created successfully`);
      
      // Create the user in our database without a subscription
      await storage.upsertUser({
        id: userId,
        email,
        firstName: firstName || '',
        lastName: lastName || '',
        profileImageUrl: null,
        isAdmin: false
      });

      // Note: Email verification is handled by Supabase's built-in email system
      // Make sure to update the Supabase email template with autoVerify parameter
      console.log(`[SIGNUP] User created successfully. Supabase will send verification email to ${email}`);
      
      // Return success with session - let verification middleware handle auth checks
      return res.status(201).json({ 
        message: "Signup successful! Please check your email to verify your account.", 
        user: data.user,
        session: data.session,
        redirectToPricing: true
      });
    } catch (error) {
      console.error("Signup error:", error);
      res.status(500).json({ message: "Failed to create account" });
    }
  });
  
  // Supabase Sign In
  // OTP verification endpoint
  app.post('/api/auth/verify-otp', async (req, res) => {
    try {
      const { userId, code } = req.body;
      
      if (!userId || !code) {
        return res.status(400).json({ message: "User ID and verification code are required" });
      }
      
      // Verify the OTP
      const { success, message, error } = await verifyOtp(userId, code);
      
      if (!success) {
        return res.status(400).json({ 
          message: message || "Invalid verification code",
          error
        });
      }
      
      // Mark user as verified in our database
      const user = await storage.getUserById(userId);
      if (user) {
        await storage.updateUserVerificationStatus(userId, true);
      }
      
      return res.json({ 
        success: true,
        message: "Verification successful"
      });
      
    } catch (error) {
      console.error("OTP verification error:", error);
      res.status(500).json({ message: "Failed to verify code" });
    }
  });
  
  // Request new OTP endpoint
  app.post('/api/auth/request-otp', async (req, res) => {
    try {
      const { userId, email } = req.body;
      
      if (!userId || !email) {
        return res.status(400).json({ message: "User ID and email are required" });
      }
      
      // Check for too many active OTPs to prevent abuse
      const { hasActive, count } = await hasActiveOtps(userId);
      if (hasActive && count >= 3) {
        return res.status(429).json({ 
          message: "Too many verification attempts. Please wait a few minutes before requesting a new code." 
        });
      }
      
      // Generate and send new OTP
      const { success, error } = await createAndSendOtp(userId, email, "User");
      
      if (!success || error) {
        console.error("Error generating new OTP:", error);
        return res.status(500).json({ message: "Failed to send verification code. Please try again." });
      }
      
      return res.json({ 
        success: true, 
        message: "New verification code sent to your email" 
      });
      
    } catch (error) {
      console.error("Request OTP error:", error);
      res.status(500).json({ message: "Failed to send verification code" });
    }
  });

  app.post('/api/auth/signin', async (req, res) => {
    try {
      const { email, password } = req.body;
      
      if (!email || !password) {
        return res.status(400).json({ message: "Email and password are required" });
      }
      
      const { data, error } = await supabaseClient.auth.signInWithPassword({
        email,
        password
      });
      
      if (error) {
        console.error("Signin error:", error);
        
        // Special handling for rate limit errors
        if (error.message && error.message.includes("security purposes") || 
            error.status === 429 || 
            error.code === 'too_many_attempts') {
          return res.status(429).json({ 
            message: "Too many login attempts. Please wait a moment before trying again." 
          });
        }
        
        return res.status(401).json({ message: error.message });
      }
      
      // Check if user's email is verified
      if (data.user?.email_confirmed_at === null) {
        // Email is not verified
        return res.status(403).json({ 
          message: "Email not verified", 
          code: "email_not_verified",
          userId: data.user.id
        });
      }
      
      // Get user from our database to check additional verification requirements
      const user = await storage.getUserByEmail(email);
      
      if (!user) {
        console.log(`First-time login for user ${data.user.id} (${email}). Creating user record and sending OTP verification.`);
        
        // User exists in Supabase but not in our database
        // This is their first login - create them in our database
        
        // Check if this is an admin email (domain-based check or specific email addresses)
        const isAdmin = email.endsWith('@admin.com') || email === 'admin@veloplay.tv';
        
        const newUser = await storage.upsertUser({
          id: data.user.id,
          email,
          firstName: '',
          lastName: '',
          profileImageUrl: null,
          isAdmin: isAdmin
        });
        
        // Skip OTP verification for admin users
        if (isAdmin) {
          console.log(`Admin user detected (${email}). Skipping OTP verification.`);
          return res.json({ 
            message: "Signin successful", 
            session: data.session,
            user: data.user,
            isAdmin: true
          });
        }
        
        // For non-admin users, require OTP verification on first login
        // Generate and send OTP code
        const { success, error: otpError } = await createAndSendOtp(data.user.id, email, "User");
        
        if (!success || otpError) {
          console.error("Error generating OTP:", otpError);
          return res.status(500).json({ message: "Failed to send verification code. Please try again." });
        }
        
        console.log(`OTP verification code sent to ${email} for first-time login`);
        
        // Return pending OTP verification status
        return res.json({ 
          message: "Since this is your first login, please verify with the code sent to your email",
          session: data.session,
          user: data.user,
          requiresOtp: true,
          userId: data.user.id
        });
      }
      
      // Check if this is an admin account - admins don't need OTP verification
      if (user.isAdmin) {
        console.log(`Admin user detected (${email}). Skipping OTP verification.`);
        return res.json({ 
          message: "Signin successful", 
          session: data.session,
          user: data.user,
          isAdmin: true
        });
      }
      
      // Regular user - proceed with normal login
      res.json({ 
        message: "Signin successful", 
        session: data.session,
        user: data.user
      });
    } catch (error) {
      console.error("Signin error:", error);
      res.status(500).json({ message: "Failed to sign in" });
    }
  });
  
  // Supabase Sign Out
  app.post('/api/auth/signout', async (req, res) => {
    try {
      const { error } = await supabaseClient.auth.signOut();
      
      if (error) {
        console.error("Signout error:", error);
        return res.status(400).json({ message: error.message });
      }
      
      res.json({ message: "Signout successful" });
    } catch (error) {
      console.error("Signout error:", error);
      res.status(500).json({ message: "Failed to sign out" });
    }
  });
  
  // Get current user endpoint for client - required for admin panel access
  app.get('/api/auth/user', isAuthenticated, async (req, res) => {
    try {
      const userId = req.user?.id;
      
      if (!userId) {
        return res.status(401).json({ message: "Authentication required" });
      }
      
      // Get the user details from the database
      const user = await storage.getUser(userId);
      
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }
      
      // Return user data
      res.json(user);
    } catch (error) {
      console.error("Error fetching user data:", error);
      res.status(500).json({ message: "Failed to fetch user data" });
    }
  });

  // Games API routes
  app.get('/api/games', async (req, res) => {
    try {
      // Check if date parameter is passed
      const dateParam = req.query.date as string;
      // Check for includeTomorrow parameter
      const includeTomorrowParam = req.query.includeTomorrow as string;
      const includeTomorrow = includeTomorrowParam === 'true';
      
      let date: Date | undefined;
      
      if (dateParam) {
        // Parse date string in YYYY-MM-DD format
        const [year, month, day] = dateParam.split('-').map(Number);
        
        // Create date in Eastern Time (where all games are scheduled)
        // Setting hours to 12 noon ET to avoid any potential date rollover issues
        date = new Date(Date.UTC(year, month - 1, day, 16, 0, 0)); // 12 noon ET is 16:00 UTC
        
        // Validate date
        if (isNaN(date.getTime())) {
          return res.status(400).json({ message: "Invalid date format. Use ISO format (YYYY-MM-DD)" });
        }
        
        console.log(`Fetching games for date: ${date.toISOString()}, for calendar date: ${month}/${day}/${year}, including tomorrow: ${includeTomorrow}`);
      }
      
      const games = await getAllGames(date, includeTomorrow);
      res.json(games);
    } catch (error) {
      console.error("Error fetching games:", error);
      res.status(500).json({ message: "Failed to fetch games" });
    }
  });

  app.get('/api/games/:leagueId', async (req, res) => {
    try {
      const { leagueId } = req.params;
      const validLeagues = ['nba', 'nfl', 'nhl', 'mlb'];
      
      if (!validLeagues.includes(leagueId)) {
        return res.status(400).json({ message: "Invalid league ID" });
      }
      
      // Check if date parameter is passed
      const dateParam = req.query.date as string;
      // Check for includeTomorrow parameter
      const includeTomorrowParam = req.query.includeTomorrow as string;
      const includeTomorrow = includeTomorrowParam === 'true';
      
      let date: Date | undefined;
      
      if (dateParam) {
        // Parse date string in YYYY-MM-DD format
        const [year, month, day] = dateParam.split('-').map(Number);
        
        // Create date in Eastern Time (where all games are scheduled)
        // Setting hours to 12 noon ET to avoid any potential date rollover issues
        date = new Date(Date.UTC(year, month - 1, day, 16, 0, 0)); // 12 noon ET is 16:00 UTC
        
        // Validate date
        if (isNaN(date.getTime())) {
          return res.status(400).json({ message: "Invalid date format. Use ISO format (YYYY-MM-DD)" });
        }
        console.log(`Fetching ${leagueId} games for date: ${date.toISOString()}, for calendar date: ${month}/${day}/${year}, including tomorrow: ${includeTomorrow}`);
      }
      
      // For league games, we'll gather results from a specific league for today and possibly tomorrow
      const todayGames = await getLeagueGames(leagueId as any, date);
      
      if (!includeTomorrow) {
        // If we're not including tomorrow's games, just return today's games
        return res.json(todayGames);
      }
      
      // If includeTomorrow is true, also get tomorrow's games
      const tomorrow = new Date(date || new Date());
      tomorrow.setDate(tomorrow.getDate() + 1);
      console.log(`Also fetching ${leagueId} games for tomorrow: ${tomorrow.toISOString()}`);
      
      const tomorrowGames = await getLeagueGames(leagueId as any, tomorrow);
      
      // Combine the two sets of games
      let allGames = [...todayGames, ...tomorrowGames];
      
      // Check for upcoming games in our current result set
      const upcomingGames = allGames.filter(game => game.state === 'pre');
      
      // If no upcoming games found for today or tomorrow, search ahead for them
      if (upcomingGames.length === 0) {
        console.log(`No upcoming ${leagueId} games found for current dates. Searching for upcoming games in next 7 days.`);
        
        // Look ahead up to 7 days to find upcoming games
        let foundUpcomingGames: Game[] = [];
        
        for (let i = 2; i <= 7; i++) {
          const futureDate = new Date(date || new Date());
          futureDate.setDate(futureDate.getDate() + i);
          
          const futureDateFormatted = new Date(futureDate).toLocaleDateString();
          console.log(`Looking for upcoming ${leagueId} games on: ${futureDateFormatted}`);
          
          const futureGames = await getLeagueGames(leagueId as any, futureDate);
          
          // Filter to only get upcoming (pre-game) games
          const upcomingFutureGames = futureGames.filter(game => game.state === 'pre');
          
          // Tag these games as future games for UI handling
          upcomingFutureGames.forEach(game => {
            game.isFuture = true;
          });
          
          // If we found upcoming games, add them and stop looking further
          if (upcomingFutureGames.length > 0) {
            console.log(`Found ${upcomingFutureGames.length} upcoming ${leagueId} games for ${futureDateFormatted}`);
            foundUpcomingGames = upcomingFutureGames;
            break;
          }
        }
        
        // If we found upcoming games in the future, add them to our allGames array
        if (foundUpcomingGames.length > 0) {
          console.log(`Adding ${foundUpcomingGames.length} upcoming future games to the results for ${leagueId}`);
          allGames = [...allGames, ...foundUpcomingGames];
        }
      }
      
      // No longer adding test data to league endpoints
      // Just return the real games directly from the API
      console.log(`Returning ${allGames.length} games for ${leagueId} directly from ESPN API`);
      
      // Ensure all games have correct league field set
      const gamesWithLeague = allGames.map(game => ({
        ...game,
        league: game.league || (leagueId as any)
      }));
      
      res.json(gamesWithLeague);
    } catch (error) {
      console.error(`Error fetching ${req.params.leagueId} games:`, error);
      res.status(500).json({ message: "Failed to fetch league games" });
    }
  });

  // Debug endpoints removed for production
  
  app.get('/api/game/:gameId', async (req, res) => {
    try {
      const { gameId } = req.params;
      
      // Always use the ESPN API to dynamically fetch game data by ID
      const game = await getGameById(gameId);
      
      if (!game) {
        return res.status(404).json({ message: "Game not found" });
      }
      
      console.log(`Fetched game data for ID ${gameId}:`, game.homeTeam.name, "vs", game.awayTeam.name);
      res.json(game);
    } catch (error) {
      console.error("Error fetching game:", error);
      res.status(500).json({ message: "Failed to fetch game" });
    }
  });
  
  // Debug endpoints removed for production
  
  // Debug endpoint removed for production

  // Direct streaming is now used - no proxy needed
  app.get('/api/direct-stream-info', async (req, res) => {
    try {
      const streamUrl = req.query.url as string;
      
      if (!streamUrl) {
        return res.status(400).json({ error: "Missing stream URL parameter" });
      }
      
      // Log proxy request
      console.log(`Stream proxy request for: ${streamUrl}`);
      
      try {
        // Make request to the stream URL
        const response = await fetch(streamUrl, {
          headers: {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
            'Referer': 'https://www.hlsplayer.org/',
            'Origin': 'https://www.hlsplayer.org'
          }
        });
        
        // Check if the response is OK
        if (!response.ok) {
          console.error(`Proxy stream error: ${response.status} ${response.statusText}`);
          return res.status(response.status).json({ 
            error: "Failed to fetch stream", 
            status: response.status,
            message: response.statusText 
          });
        }
        
        // Get the content type from the response
        const contentType = response.headers.get('content-type');
        if (contentType) {
          res.setHeader('Content-Type', contentType);
        } else if (streamUrl.endsWith('.m3u8')) {
          // Force correct content type for m3u8 files
          res.setHeader('Content-Type', 'application/vnd.apple.mpegurl');
        }
        
        // Set CORS headers to allow access from any origin
        res.setHeader('Access-Control-Allow-Origin', '*');
        res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
        res.setHeader('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, Range');
        
        // Check if this is a binary file (like .ts segments)
        const isBinary = streamUrl.endsWith('.ts') || 
                         streamUrl.endsWith('.m4s') || 
                         streamUrl.endsWith('.mp4') || 
                         streamUrl.endsWith('.aac');
                         
        if (isBinary) {
          // For binary files, pipe the response directly
          console.log(`Proxying binary data from: ${streamUrl}`);
          const buffer = await response.arrayBuffer();
          res.send(Buffer.from(buffer));
          return;
        }
        
        // For text content, get the stream data
        let streamData = await response.text();
        
        // If this is an m3u8 file and contains references to other files, we need to rewrite those URLs
        if (streamUrl.endsWith('.m3u8')) {
          // Get the base URL to rewrite relative paths in the m3u8 file
          const baseUrl = new URL(streamUrl).href.substring(0, streamUrl.lastIndexOf('/') + 1);
          
          // Process each line in the m3u8 file
          const lines = streamData.split('\n');
          const processedLines = lines.map(line => {
            // Skip comments, tags, and empty lines
            if (line.startsWith('#') || line.trim() === '') {
              return line;
            }
            
            // If this is a TS file or another segment
            if (line.endsWith('.ts') || line.endsWith('.m4s') || line.endsWith('.mp4') || line.endsWith('.aac')) {
              // If it's a relative path, convert to absolute and then to our proxy URL
              if (!line.startsWith('http')) {
                const absoluteUrl = new URL(line, baseUrl).href;
                // For media segments, use direct URLs so the browser can cache them
                return absoluteUrl;
              }
              // If it's already an absolute URL, use it directly
              return line;
            }
            
            // For m3u8 files, use our proxy
            if (line.endsWith('.m3u8')) {
              // If it's a relative path, convert to absolute and then to our proxy URL
              if (!line.startsWith('http')) {
                const absoluteUrl = new URL(line, baseUrl).href;
                return `/api/proxy-stream?url=${encodeURIComponent(absoluteUrl)}`;
              }
              // If it's already an absolute URL, just wrap it in our proxy
              return `/api/proxy-stream?url=${encodeURIComponent(line)}`;
            }
            
            // For any other file type, leave as is
            return line;
          });
          
          // Replace the original m3u8 content with our processed content
          streamData = processedLines.join('\n');
          console.log('Rewrote m3u8 content to use proxy for all referenced files');
        }
        
        // Send the processed data
        res.send(streamData);
        
      } catch (error: any) {
        console.error('Error proxying stream:', error.message);
        res.status(500).json({ error: "Failed to proxy stream", message: error.message });
      }
    } catch (error: any) {
      console.error('Stream proxy error:', error);
      res.status(500).json({ error: error.message });
    }
  });

  // Stream routes - with subscription access control
  app.get('/api/stream/:gameId', async (req, res) => {
    try {
      const { gameId } = req.params;
      const feed = req.query.feed as string;
      
      // Set CORS headers
      res.header('Access-Control-Allow-Origin', '*');
      res.header('Access-Control-Allow-Methods', 'GET, OPTIONS');
      res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, Authorization');
      
      // Check authentication
      const authHeader = req.headers.authorization;
      if (!authHeader) {
        return res.status(401).json({ message: "Unauthorized", redirectTo: "/login" });
      }
      
      const token = authHeader.split('Bearer ')[1];
      if (!token) {
        console.log('❌ No token found in authorization header');
        return res.status(401).json({ message: "Unauthorized", redirectTo: "/login" });
      }
      
      console.log('🔑 Attempting to verify Supabase token...');
      
      // Try to decode Supabase JWT token (different format than custom JWT)
      let decoded: any;
      try {
        // Supabase tokens are typically signed with their own secret
        // We'll decode without verification first to get the user info
        const parts = token.split('.');
        if (parts.length !== 3) {
          throw new Error('Invalid token format');
        }
        
        const payload = JSON.parse(Buffer.from(parts[1], 'base64').toString());
        console.log('✅ Supabase token decoded, email:', payload.email);
        
        // Get user by email instead of userId since Supabase uses email
        const user = await storage.getUserByEmail(payload.email);
        if (!user) {
          console.log('❌ User not found for email:', payload.email);
          return res.status(401).json({ message: "User not found", redirectTo: "/login" });
        }
        console.log('✅ User found:', user.email, 'isAdmin:', user.isAdmin);
        decoded = user;
      } catch (supabaseError) {
        console.log('❌ Supabase token decode failed, error:', supabaseError.message);
        return res.status(401).json({ message: "Invalid token", redirectTo: "/login" });
      }
      
      // Check trial access
      const now = new Date();
      const createdAt = new Date(decoded.createdAt || new Date());
      const trialEndDate = new Date(createdAt.getTime() + (15 * 24 * 60 * 60 * 1000));
      const hasValidTrial = now <= trialEndDate;
      const isAdmin = decoded.isAdmin;
      
      console.log('🔍 Access check:', {
        email: decoded.email,
        isAdmin,
        hasValidTrial,
        trialEndDate: trialEndDate.toISOString(),
        currentTime: now.toISOString()
      });
      
      if (!hasValidTrial && !isAdmin) {
        return res.status(403).json({ 
          message: "Trial expired. Please upgrade to continue streaming.", 
          redirectTo: "/pricing",
          trialExpired: true 
        });
      }
      
      // STEP 1: Try database first (existing streams)
      const dbStream = await storage.getStreamByGameId(gameId);
      if (dbStream && (dbStream.streamUrl || dbStream.awayStreamUrl)) {
        console.log(`🎯 [CentralizedStream] Using database stream for game ${gameId}`);
        if (feed === 'away' && dbStream.awayStreamUrl) {
          return res.json({ 
            streamUrl: dbStream.awayStreamUrl,
            hasAwayFeed: true,
            hasHomeFeed: !!dbStream.streamUrl,
            currentFeed: 'away'
          });
        }
        
        return res.json({ 
          streamUrl: dbStream.streamUrl,
          hasAwayFeed: !!dbStream.awayStreamUrl,
          hasHomeFeed: true,
          currentFeed: 'home'
        });
      }

      // STEP 2: Use CENTRALIZED STREAM MAPPING SYSTEM (Supabase stream_sources)
      console.log(`🎯 [CentralizedStream] No database stream found for game ${gameId}, using centralized stream mapping`);
      
      try {
        // Get game data to identify teams
        const { getGameById } = await import('./espnApi');
        const game = await getGameById(gameId);
        
        if (!game) {
          return res.status(404).json({ 
            message: `Game not found: ${gameId}`,
            gameId: gameId
          });
        }

        // Use centralized stream manager for DYNAMIC home/away lookup
        const { getStreamUrlForTeam } = await import('./centralizedStreamManager');
        
        // Get streams for both teams dynamically
        const homeTeamStreamUrl = await getStreamUrlForTeam(game.homeTeam.name);
        const awayTeamStreamUrl = await getStreamUrlForTeam(game.awayTeam.name);
        
        console.log(`🎯 [DynamicCentralizedStream] Dynamic team lookup results:`, {
          gameId,
          homeTeam: game.homeTeam.name,
          awayTeam: game.awayTeam.name,
          homeStreamUrl: homeTeamStreamUrl ? 'Found' : 'Not found',
          awayStreamUrl: awayTeamStreamUrl ? 'Found' : 'Not found',
          requestedFeed: feed
        });

        // Determine which streams are available
        const hasHomeFeed = !!homeTeamStreamUrl;
        const hasAwayFeed = !!awayTeamStreamUrl;

        // Return requested feed if available, otherwise fallback intelligently
        let selectedStreamUrl = null;
        let actualFeed = 'home';

        if (feed === 'away' && awayTeamStreamUrl) {
          selectedStreamUrl = awayTeamStreamUrl;
          actualFeed = 'away';
        } else if (feed === 'home' && homeTeamStreamUrl) {
          selectedStreamUrl = homeTeamStreamUrl;
          actualFeed = 'home';
        } else if (homeTeamStreamUrl) {
          // Fallback to home feed if away not available
          selectedStreamUrl = homeTeamStreamUrl;
          actualFeed = 'home';
        } else if (awayTeamStreamUrl) {
          // Fallback to away feed if home not available
          selectedStreamUrl = awayTeamStreamUrl;
          actualFeed = 'away';
        }

        if (selectedStreamUrl) {
          return res.json({
            streamUrl: selectedStreamUrl,
            hasAwayFeed,
            hasHomeFeed,
            currentFeed: actualFeed,
            awayStreamUrl: awayTeamStreamUrl,
            homeStreamUrl: homeTeamStreamUrl,
            source: 'dynamic_centralized_mapping'
          });
        }

        // If no stream found in centralized system either
        return res.status(404).json({ 
          message: `No stream available for teams: ${game.homeTeam.name} vs ${game.awayTeam.name}`,
          gameId: gameId,
          homeTeam: game.homeTeam.name,
          awayTeam: game.awayTeam.name
        });

      } catch (streamError) {
        console.error(`🚨 [CentralizedStream] Error with centralized stream mapping:`, streamError);
        return res.status(404).json({ 
          message: `No stream available for game ID: ${gameId}`,
          gameId: gameId
        });
      }
    } catch (error) {
      console.error("Error fetching stream:", error);
      res.status(500).json({ message: "Failed to fetch stream" });
    }
  });

  // Admin stream management routes
  app.get('/api/admin/streams', isAuthenticated, isAdmin, async (req, res) => {
    try {
      const streams = await storage.getAllStreams();
      res.json(streams);
    } catch (error) {
      console.error("Error fetching streams:", error);
      res.status(500).json({ message: "Failed to fetch streams" });
    }
  });

  app.post('/api/admin/streams', isAuthenticated, isAdmin, async (req, res) => {
    try {
      const userId = req.user?.id;
      
      const streamData = insertStreamSchema.parse({
        ...req.body,
        addedById: userId
      });
      
      const stream = await storage.createStream(streamData);
      res.status(201).json(stream);
    } catch (error) {
      console.error("Error creating stream:", error);
      res.status(500).json({ message: "Failed to create stream" });
    }
  });

  app.put('/api/admin/streams/:id', isAuthenticated, isAdmin, async (req, res) => {
    try {
      const { id } = req.params;
      const { streamUrl, awayStreamUrl } = req.body;
      
      if (!streamUrl && !awayStreamUrl) {
        return res.status(400).json({ message: "At least one stream URL is required" });
      }
      
      const updateData: { streamUrl?: string; awayStreamUrl?: string } = {};
      
      if (streamUrl) {
        updateData.streamUrl = streamUrl;
      }
      
      if (awayStreamUrl !== undefined) {
        updateData.awayStreamUrl = awayStreamUrl;
      }
      
      const stream = await storage.updateStream(parseInt(id), updateData);
      res.json(stream);
    } catch (error) {
      console.error("Error updating stream:", error);
      res.status(500).json({ message: "Failed to update stream" });
    }
  });

  app.delete('/api/admin/streams/:id', isAuthenticated, isAdmin, async (req, res) => {
    try {
      const { id } = req.params;
      await storage.deleteStream(parseInt(id));
      res.status(204).send();
    } catch (error) {
      console.error("Error deleting stream:", error);
      res.status(500).json({ message: "Failed to delete stream" });
    }
  });
  
  // Stream mapping is now handled automatically by the system when streams are requested

  // Auto-generate stream URLs for a game based on team names
  app.post('/api/admin/auto-stream', isAuthenticated, isAdmin, async (req, res) => {
    try {
      const { gameId } = req.body;
      
      if (!gameId) {
        return res.status(400).json({ message: "Game ID is required" });
      }
      
      // Get the game data to extract team names
      const game = await getGameById(gameId);
      
      if (!game) {
        return res.status(404).json({ message: "Game not found" });
      }
      
      // CRITICAL FIX: Use updated team mappings from admin panel instead of hardcoded ones
      // First try to get from database if stream exists
      const existingStreamRecord = await storage.getStreamByGameId(gameId);
      if (existingStreamRecord && (existingStreamRecord.streamUrl || existingStreamRecord.awayStreamUrl)) {
        console.log(`🎯 Using database stream URLs for game ${gameId}`);
        return res.json({ 
          streamUrl: existingStreamRecord.streamUrl || null,
          awayStreamUrl: existingStreamRecord.awayStreamUrl || null,
          hasAwayFeed: !!existingStreamRecord.awayStreamUrl,
          hasHomeFeed: !!existingStreamRecord.streamUrl,
          currentFeed: feed === 'away' ? 'away' : 'home'
        });
      }
      
      // Use CENTRALIZED Supabase stream mapping system (no more hardcoded fallbacks!)
      const { getStreamUrlForTeam } = await import('./centralizedStreamManager');
      const homeTeamStreamUrl = await getStreamUrlForTeam(game.homeTeam.name);
      const awayTeamStreamUrl = await getStreamUrlForTeam(game.awayTeam.name);
      
      if (!homeTeamStreamUrl && !awayTeamStreamUrl) {
        return res.status(404).json({ 
          message: "Could not find stream URLs for this game's teams",
          homeTeam: game.homeTeam.name,
          awayTeam: game.awayTeam.name 
        });
      }
      
      const userId = req.user?.id;
      
      // Check if a stream already exists for this game
      const existingStream = await storage.getStreamByGameId(gameId);
      
      if (existingStream) {
        // Update the existing stream
        const updatedStream = await storage.updateStream(existingStream.id, {
          streamUrl: homeTeamStreamUrl || existingStream.streamUrl,
          awayStreamUrl: awayTeamStreamUrl || existingStream.awayStreamUrl
        });
        
        return res.json({
          message: "Stream URLs updated automatically",
          stream: updatedStream,
          homeTeam: game.homeTeam.name,
          awayTeam: game.awayTeam.name
        });
      } else {
        // Create a new stream
        const newStream = await storage.createStream({
          gameId,
          streamUrl: homeTeamStreamUrl || "",
          awayStreamUrl: awayTeamStreamUrl || null,
          isActive: true,
          addedById: userId
        });
        
        return res.status(201).json({
          message: "Stream URLs created automatically",
          stream: newStream,
          homeTeam: game.homeTeam.name,
          awayTeam: game.awayTeam.name
        });
      }
    } catch (error) {
      console.error("Error auto-generating stream URLs:", error);
      res.status(500).json({ message: "Failed to auto-generate stream URLs", error: String(error) });
    }
  });
  
  // Stream mapping is now handled automatically by the system when streams are requested
  
  // Auto-generate streams for ALL games endpoint with auto cleanup
  app.post('/api/admin/auto-generate-all-streams', isAuthenticated, isAdmin, async (req, res) => {
    try {
      // Get all games for today and tomorrow
      const allGames = await getAllGames(undefined, true);
      
      if (!allGames || allGames.length === 0) {
        return res.status(404).json({ message: "No games found to create streams for" });
      }
      
      const userId = req.user?.id;
      let successCount = 0;
      let failedCount = 0;
      
      // Step 1: Process each game and create/update streams
      for (const game of allGames) {
        try {
          // Skip games that are completed (but not postponed or delayed games)
          if (game.state === 'post') {
            const detailText = game.status?.detail || '';
            if (!detailText.includes('Postponed') && !detailText.includes('Delayed')) {
              continue;
            }
          }
          
          // Get stream URLs using the streamMapping utility
          const { homeTeamStreamUrl, awayTeamStreamUrl } = getStreamUrlsForGame(game);
          
          // Check if a stream already exists for this game
          const existingStream = await storage.getStreamByGameId(game.id);
          
          if (existingStream) {
            // Update the existing stream if we have new URLs
            if (homeTeamStreamUrl || awayTeamStreamUrl) {
              await storage.updateStream(existingStream.id, {
                streamUrl: homeTeamStreamUrl || existingStream.streamUrl,
                awayStreamUrl: awayTeamStreamUrl || existingStream.awayStreamUrl
              });
              successCount++;
            }
          } else {
            // Create a new stream if we have at least one URL
            if (homeTeamStreamUrl || awayTeamStreamUrl) {
              await storage.createStream({
                gameId: game.id,
                streamUrl: homeTeamStreamUrl || "",
                awayStreamUrl: awayTeamStreamUrl || null,
                isActive: true,
                addedById: userId
              });
              successCount++;
            }
          }
        } catch (error) {
          console.error(`Error processing game ${game.id}:`, error);
          failedCount++;
        }
      }
      
      // Step 2: Cleanup old streams
      // We'll remove streams for games that are:
      // 1. Older than 2 days
      // 2. In 'post' state (completed)
      // 3. Not marked as delayed or postponed
      
      let cleanupCount = 0;
      try {
        // Get all streams from database
        const allStreams = await storage.getAllStreams();
        
        // Get game IDs from current games to keep
        const currentGameIds = new Set(allGames.map(game => game.id));
        
        // Current date for comparison
        const now = new Date();
        
        // Process each stream
        for (const stream of allStreams) {
          try {
            // If game isn't in current games list, we need to check if it should be removed
            if (!currentGameIds.has(stream.gameId)) {
              // Get the game data by ID
              const gameData = await getGameById(stream.gameId);
              
              // If we get game data and it's a completed game (not delayed/postponed)
              if (gameData) {
                // Parse game date
                const gameDate = new Date(gameData.date);
                
                // Calculate days since game
                const daysSinceGame = Math.floor((now.getTime() - gameDate.getTime()) / (1000 * 60 * 60 * 24));
                
                // Check if game is completed and older than 2 days
                if (gameData.state === 'post' && daysSinceGame > 2) {
                  const gameDetailText = gameData.status?.detail || '';
                  
                  // Verify it's not a postponed or delayed game
                  if (!gameDetailText.includes('Postponed') && !gameDetailText.includes('Delayed')) {
                    // Delete the stream
                    await storage.deleteStream(stream.id);
                    cleanupCount++;
                  }
                }
              } else {
                // If game data not found, assume it's an old game and remove the stream
                await storage.deleteStream(stream.id);
                cleanupCount++;
              }
            }
          } catch (error) {
            console.error(`Error cleaning up stream ${stream.id}:`, error);
          }
        }
      } catch (error) {
        console.error("Error during stream cleanup:", error);
      }
      
      return res.status(200).json({
        message: "Auto-generation of stream URLs completed with cleanup",
        results: {
          totalGames: allGames.length,
          success: successCount,
          failed: failedCount,
          cleanedUp: cleanupCount
        }
      });
    } catch (error) {
      console.error("Error in auto-generate-all-streams:", error);
      res.status(500).json({ message: "Failed to auto-generate stream URLs", error: String(error) });
    }
  });
  
  // Admin user management routes
  app.get('/api/admin/users', isAuthenticated, isAdmin, async (req, res) => {
    try {
      const users = await storage.getAllUsers();
      res.json(users);
    } catch (error) {
      console.error("Error fetching users:", error);
      res.status(500).json({ message: "Failed to fetch users" });
    }
  });

  // Admin stream mappings endpoint - fetches from CentralizedStreamManager
  app.get('/api/admin/stream-mappings', isAuthenticated, isAdmin, async (req, res) => {
    try {
      const { getDeduplicatedTeamMappings } = require('./centralizedStreamManager');
      const streamMappings = await getDeduplicatedTeamMappings();
      res.json(streamMappings);
    } catch (error) {
      console.error("Error fetching stream mappings:", error);
      res.status(500).json({ message: "Failed to fetch stream mappings" });
    }
  });

  // Admin-only route to delete user permanently from database
  app.delete('/api/admin/users/:userId', isAuthenticated, isAdmin, async (req, res) => {
    try {
      const { userId } = req.params;
      const adminUserId = req.user?.id;
      
      // Get the target user before deletion
      const targetUser = await storage.getUserById(userId);
      if (!targetUser) {
        return res.status(404).json({ error: 'User not found' });
      }

      // Prevent admin from deleting themselves
      if (userId === adminUserId) {
        return res.status(400).json({ error: 'Cannot delete your own admin account' });
      }
      
      // Delete user's subscriptions first (foreign key constraint)
      try {
        const userSubscriptions = await storage.getSubscriptionsByUserId?.(userId);
        if (userSubscriptions) {
          for (const subscription of userSubscriptions) {
            await storage.deleteSubscription(subscription.id);
          }
        }
      } catch (subError) {
        console.log('No subscriptions to delete for user:', userId);
      }

      // Delete user alerts/notifications if they exist
      try {
        await storage.deleteUserAlerts?.(userId);
      } catch (alertError) {
        console.log('No alerts to delete for user:', userId);
      }
      
      // Delete user from database
      await storage.deleteUser(userId);
      
      return res.json({ 
        success: true,
        message: `User ${targetUser.email || targetUser.firstName || 'Unknown'} permanently deleted from database`,
        deletedUserId: userId
      });
    } catch (error: any) {
      console.error('Error deleting user:', error);
      res.status(500).json({ error: error.message || 'Failed to delete user from database' });
    }
  });
  
  // Delete user endpoint - removes user from both our database and Supabase
  app.delete('/api/admin/users/:id', isAuthenticated, isAdmin, async (req, res) => {
    try {
      const { id } = req.params;
      
      if (!id) {
        return res.status(400).json({ message: "User ID is required" });
      }
      
      console.log(`[USER DELETION] Admin initiated deletion of user ID: ${id}`);
      
      // First, get the user details so we have their email for confirmation
      const userToDelete = await storage.getUser(id);
      
      if (!userToDelete) {
        return res.status(404).json({ message: "User not found" });
      }
      
      console.log(`[USER DELETION] Deleting user: ${userToDelete.email}`);
      
      // 1. Delete user subscriptions first to avoid foreign key constraints
      try {
        await storage.deleteSubscriptionsByUserId(id);
        console.log(`[USER DELETION] Removed user subscriptions: ${id}`);
      } catch (subError) {
        console.error(`[USER DELETION] Error removing subscriptions:`, subError);
        // Continue with deletion even if subscriptions can't be removed
      }
      
      // 2. Delete the user from our application database
      await storage.deleteUser(id);
      console.log(`[USER DELETION] Removed user from application database: ${id}`);
      
      // 3. Delete the user from Supabase Auth using direct database connection
      // This is more reliable than the admin API which might have permission limitations
      try {
        // We'll use the DATABASE_URL to connect directly to Supabase's Postgres database
        if (process.env.DATABASE_URL) {
          console.log(`[USER DELETION] Using direct database connection for user ${id}`);
          
          // Use node-postgres to connect directly
          const { Pool } = require('pg');
          const pool = new Pool({
            connectionString: process.env.DATABASE_URL,
            ssl: { rejectUnauthorized: false }
          });
          
          // Delete the user from auth.users table
          await pool.query('DELETE FROM auth.users WHERE id = $1', [id]);
          
          // Close the connection
          await pool.end();
          
          console.log(`[USER DELETION] Successfully deleted user from Supabase database using direct SQL: ${id}`);
        } else {
          // Fallback to using the admin API if DATABASE_URL is not available
          try {
            const { error } = await supabaseClient.auth.admin.deleteUser(id);
            if (error) {
              console.error(`[USER DELETION] Supabase auth deletion error:`, error);
              // Don't return here - we want to send success message for the app database deletion
            } else {
              console.log(`[USER DELETION] Successfully deleted user from Supabase Auth: ${id}`);
            }
          } catch (authError) {
            console.error(`[USER DELETION] Supabase auth API error:`, authError);
            // Continue execution - at least app database was updated
          }
        }
      } catch (sqlError) {
        console.error(`[USER DELETION] SQL deletion error:`, sqlError);
        // Don't return error - we want to send success message for the app database deletion
      }
      
      // Always return success for the frontend as we've at least deleted from our app database
      return res.status(200).json({ 
        message: `User ${userToDelete.email} has been deleted successfully`,
        success: true 
      });
    } catch (error) {
      console.error("Error deleting user:", error);
      res.status(500).json({ message: "Failed to delete user", error: String(error) });
    }
  });

  app.get('/api/admin/users/:id', isAuthenticated, isAdmin, async (req, res) => {
    try {
      const { id } = req.params;
      const user = await storage.getUser(id);
      
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }
      
      res.json(user);
    } catch (error) {
      console.error("Error fetching user:", error);
      res.status(500).json({ message: "Failed to fetch user" });
    }
  });

  app.put('/api/admin/users/:id', isAuthenticated, isAdmin, async (req, res) => {
    try {
      const { id } = req.params;
      const { firstName, lastName, email, isAdmin: setAdmin } = req.body;
      
      // Get existing user
      const existingUser = await storage.getUser(id);
      if (!existingUser) {
        return res.status(404).json({ message: "User not found" });
      }
      
      // Update user in database
      const updatedUser = await storage.updateUser(id, {
        firstName: firstName || existingUser.firstName,
        lastName: lastName || existingUser.lastName,
        email: email || existingUser.email,
        isAdmin: setAdmin !== undefined ? setAdmin : existingUser.isAdmin
      });
      
      res.json(updatedUser);
    } catch (error) {
      console.error("Error updating user:", error);
      res.status(500).json({ message: "Failed to update user" });
    }
  });
  
  // This route is a duplicate of the one above at line 1836-1918 and has been removed

  // Admin subscription plan management routes
  app.get('/api/admin/subscription-plans', isAuthenticated, isAdmin, async (req, res) => {
    try {
      const plans = await storage.getAllSubscriptionPlans();
      res.json(plans);
    } catch (error) {
      console.error("Error fetching subscription plans:", error);
      res.status(500).json({ message: "Failed to fetch subscription plans" });
    }
  });

  app.post('/api/admin/subscription-plans', isAuthenticated, isAdmin, async (req, res) => {
    try {
      const { name, price, description, durationDays, features } = req.body;
      
      if (!name || !price || !durationDays) {
        return res.status(400).json({ message: "Name, price and duration are required" });
      }
      
      const plan = await storage.createSubscriptionPlan({
        name,
        price: parseInt(price),
        description,
        durationDays: parseInt(durationDays),
        features: features || []
      });
      
      res.status(201).json(plan);
    } catch (error) {
      console.error("Error creating subscription plan:", error);
      res.status(500).json({ message: "Failed to create subscription plan" });
    }
  });

  app.put('/api/admin/subscription-plans/:id', isAuthenticated, isAdmin, async (req, res) => {
    try {
      const { id } = req.params;
      const { name, price, description, durationDays, features } = req.body;
      
      const plan = await storage.updateSubscriptionPlan(parseInt(id), {
        name,
        price: price ? parseInt(price) : undefined,
        description,
        durationDays: durationDays ? parseInt(durationDays) : undefined,
        features
      });
      
      res.json(plan);
    } catch (error) {
      console.error("Error updating subscription plan:", error);
      res.status(500).json({ message: "Failed to update subscription plan" });
    }
  });

  app.delete('/api/admin/subscription-plans/:id', isAuthenticated, isAdmin, async (req, res) => {
    try {
      const { id } = req.params;
      await storage.deleteSubscriptionPlan(parseInt(id));
      res.status(204).send();
    } catch (error) {
      console.error("Error deleting subscription plan:", error);
      res.status(500).json({ message: "Failed to delete subscription plan" });
    }
  });
  
  // Admin subscription management routes
  app.get('/api/admin/subscriptions', isAuthenticated, isAdmin, async (req, res) => {
    try {
      const subscriptions = await storage.getAllSubscriptions();
      res.json(subscriptions);
    } catch (error) {
      console.error("Error fetching subscriptions:", error);
      res.status(500).json({ message: "Failed to fetch subscriptions" });
    }
  });
  
  app.put('/api/admin/subscriptions/:id', isAuthenticated, isAdmin, async (req, res) => {
    try {
      const { id } = req.params;
      const { isActive, endDate } = req.body;
      
      const subscription = await storage.adminUpdateSubscription(parseInt(id), {
        isActive: isActive !== undefined ? Boolean(isActive) : undefined,
        endDate: endDate ? new Date(endDate) : undefined
      });
      
      res.json(subscription);
    } catch (error) {
      console.error("Error updating subscription:", error);
      res.status(500).json({ message: "Failed to update subscription" });
    }
  });



  // Subscription plans routes
  app.get('/api/subscription-plans', async (req, res) => {
    try {
      const plans = await storage.getAllSubscriptionPlans();
      res.json(plans);
    } catch (error) {
      console.error("Error fetching subscription plans:", error);
      res.status(500).json({ message: "Failed to fetch subscription plans" });
    }
  });

  app.get('/api/subscription', isAuthenticated, async (req, res) => {
    try {
      const userId = req.user?.id;
      const subscription = await storage.getSubscriptionByUserId(userId);
      res.json(subscription || null);
    } catch (error) {
      console.error("Error fetching subscription:", error);
      res.status(500).json({ message: "Failed to fetch subscription" });
    }
  });
  
  // Endpoint to check subscription status for access control
  app.get('/api/subscription/status', isAuthenticated, async (req, res) => {
    try {
      const userId = req.user?.id;
      const subscription = await storage.getSubscriptionByUserId(userId);
      
      // Check if user has an active subscription
      const hasActiveSubscription = subscription && 
                                   subscription.isActive && 
                                   new Date(subscription.endDate) > new Date();
      
      return res.json({ 
        hasActiveSubscription,
        subscription: subscription || null
      });
    } catch (error) {
      console.error("Error checking subscription status:", error);
      res.status(500).json({ 
        message: "Failed to check subscription status",
        hasActiveSubscription: false 
      });
    }
  });

  app.post('/api/subscription', isAuthenticated, async (req, res) => {
    try {
      const userId = req.user?.id;
      
      // Get the selected plan
      const { planId } = req.body;
      
      if (!planId) {
        return res.status(400).json({ message: "Plan ID is required" });
      }
      
      // Calculate end date based on plan duration
      const plans = await storage.getAllSubscriptionPlans();
      const selectedPlan = plans.find(plan => plan.id === parseInt(planId));
      
      if (!selectedPlan) {
        return res.status(404).json({ message: "Subscription plan not found" });
      }
      
      // TEMPORARY: For development, we're automatically approving all subscriptions
      // without requiring actual payment processing
      console.log('DEVELOPMENT MODE: Auto-approving subscription without payment processing');
      
      const startDate = new Date();
      const endDate = new Date(startDate);
      endDate.setDate(endDate.getDate() + selectedPlan.durationDays);
      
      // Check if user already has a subscription and update it if needed
      const existingSubscription = await storage.getSubscriptionByUserId(userId);
      
      let subscription;
      if (existingSubscription) {
        // Update the existing subscription
        await storage.adminUpdateSubscription(existingSubscription.id, {
          isActive: true,
          endDate: endDate
        });
        // Get the updated subscription
        subscription = await storage.getSubscriptionByUserId(userId);
      } else {
        // Create new subscription record
        const subscriptionData = insertSubscriptionSchema.parse({
          userId,
          planId: parseInt(planId),
          startDate,
          endDate,
          isActive: true
        });
        
        subscription = await storage.createSubscription(subscriptionData);
      }
      
      res.status(201).json(subscription);
    } catch (error) {
      console.error("Error creating subscription:", error);
      res.status(500).json({ message: "Failed to create subscription" });
    }
  });

  app.post('/api/subscription/cancel', isAuthenticated, async (req, res) => {
    try {
      const userId = req.user?.id;
      const subscription = await storage.getSubscriptionByUserId(userId);
      
      if (!subscription) {
        return res.status(404).json({ message: "No active subscription found" });
      }
      
      await storage.cancelSubscription(subscription.id);
      res.status(200).json({ message: "Subscription canceled successfully" });
    } catch (error) {
      console.error("Error canceling subscription:", error);
      res.status(500).json({ message: "Failed to cancel subscription" });
    }
  });
  
  // Endpoint to automatically generate streams for all of today's games
  app.post('/api/admin/auto-generate-all-streams', isAuthenticated, isAdmin, async (req, res) => {
    try {
      // Get all games for today
      const today = new Date();
      const allGames = await getAllGames(today);
      
      if (!allGames || allGames.length === 0) {
        return res.status(404).json({ 
          message: "No games found for today", 
          date: today.toISOString() 
        });
      }
      
      const results = {
        totalGames: allGames.length,
        success: 0,
        failed: 0,
        gamesProcessed: [] as any[]
      };
      
      const userId = req.user?.id;
      
      // Process each game
      for (const game of allGames) {
        try {
          // Use our team name mapping to get stream URLs
          const { homeTeamStreamUrl, awayTeamStreamUrl } = getStreamUrlsForGame(game);
          
          // Check if streams were found
          const streamsFound = !!homeTeamStreamUrl || !!awayTeamStreamUrl;
          
          // Check if a stream already exists for this game
          const existingStream = await storage.getStreamByGameId(game.id);
          
          let streamResult;
          
          if (existingStream) {
            // Only update if streams were found
            if (streamsFound) {
              // Update the existing stream
              streamResult = await storage.updateStream(existingStream.id, {
                streamUrl: homeTeamStreamUrl || existingStream.streamUrl,
                awayStreamUrl: awayTeamStreamUrl || existingStream.awayStreamUrl
              });
            } else {
              streamResult = existingStream;
            }
          } else if (streamsFound) {
            // Create a new stream only if streams were found
            streamResult = await storage.createStream({
              gameId: game.id,
              streamUrl: homeTeamStreamUrl || "",
              awayStreamUrl: awayTeamStreamUrl || null,
              isActive: true,
              addedById: userId
            });
          }
          
          results.gamesProcessed.push({
            id: game.id,
            name: game.name,
            homeTeam: game.homeTeam.name,
            awayTeam: game.awayTeam.name,
            homeStreamFound: !!homeTeamStreamUrl,
            awayStreamFound: !!awayTeamStreamUrl,
            status: streamResult ? 'success' : 'no_streams_found'
          });
          
          if (streamResult) {
            results.success++;
          } else {
            results.failed++;
          }
        } catch (error) {
          console.error(`Error processing game ${game.id}:`, error);
          results.failed++;
          results.gamesProcessed.push({
            id: game.id,
            name: game.name,
            status: 'error',
            error: String(error)
          });
        }
      }
      
      return res.json({
        message: `Processed ${results.totalGames} games: ${results.success} succeeded, ${results.failed} failed`,
        results
      });
    } catch (error) {
      console.error("Error auto-generating all stream URLs:", error);
      return res.status(500).json({ 
        message: "Failed to auto-generate stream URLs", 
        error: String(error) 
      });
    }
  });
  
  // Automatic stream update endpoint that can be called by a cron job
  app.post('/api/auto-update-streams', async (req, res) => {
    try {
      const apiKey = req.headers['x-api-key'];
      
      // Simple API key check to protect this endpoint
      if (apiKey !== process.env.AUTO_UPDATE_API_KEY) {
        return res.status(401).json({ message: "Invalid API key" });
      }
      
      // Get all games for today
      const today = new Date();
      const allGames = await getAllGames(today);
      
      if (!allGames || allGames.length === 0) {
        return res.status(404).json({ 
          message: "No games found for today", 
          date: today.toISOString() 
        });
      }
      
      const results = {
        totalGames: allGames.length,
        success: 0,
        failed: 0,
        created: 0,
        updated: 0,
        unchanged: 0
      };
      
      // Process each game
      for (const game of allGames) {
        try {
          // Use our team name mapping to get stream URLs
          const { homeTeamStreamUrl, awayTeamStreamUrl } = getStreamUrlsForGame(game);
          
          // Check if streams were found
          const streamsFound = !!homeTeamStreamUrl || !!awayTeamStreamUrl;
          
          // Check if a stream already exists for this game
          const existingStream = await storage.getStreamByGameId(game.id);
          
          if (existingStream) {
            // Only update if streams were found
            if (streamsFound) {
              // Check if there are changes before updating
              const needsUpdate = 
                (homeTeamStreamUrl && homeTeamStreamUrl !== existingStream.streamUrl) || 
                (awayTeamStreamUrl && awayTeamStreamUrl !== existingStream.awayStreamUrl);
                
              if (needsUpdate) {
                // Update the existing stream with new URLs
                await storage.updateStream(existingStream.id, {
                  streamUrl: homeTeamStreamUrl || existingStream.streamUrl,
                  awayStreamUrl: awayTeamStreamUrl || existingStream.awayStreamUrl
                });
                results.updated++;
              } else {
                results.unchanged++;
              }
            } else {
              results.unchanged++;
            }
          } else if (streamsFound) {
            // Create a new stream only if streams were found
            await storage.createStream({
              gameId: game.id,
              streamUrl: homeTeamStreamUrl || "",
              awayStreamUrl: awayTeamStreamUrl || null,
              isActive: true,
              // Use the first admin user ID as creator
              addedById: "system-auto-update"
            });
            results.created++;
          } else {
            results.unchanged++;
          }
          
          results.success++;
        } catch (error) {
          console.error(`Error processing game ${game.id}:`, error);
          results.failed++;
        }
      }
      
      return res.json({
        message: `Auto-update complete. Processed ${results.totalGames} games.`,
        stats: `${results.created} created, ${results.updated} updated, ${results.unchanged} unchanged, ${results.failed} failed.`,
        results
      });
    } catch (error) {
      console.error("Error in auto-update streams:", error);
      return res.status(500).json({ 
        message: "Failed to auto-update streams", 
        error: String(error) 
      });
    }
  });
  
  // Admin - get active users
  app.get("/api/admin/active-users", isAuthenticated, isAdmin, (req, res) => {
    try {
      const activeUsers = getActiveUsers();
      res.json(activeUsers);
    } catch (error) {
      console.error("Error getting active users:", error);
      res.status(500).json({ error: "Failed to get active users" });
    }
  });
  
  // Email - send welcome email
  app.post("/api/email/welcome", (req: any, res) => {
    try {
      // Create a public endpoint for testing
      const { email, displayName } = req.body;
      
      if (!email) {
        return res.status(400).json({ error: "Email is required" });
      }
      
      // Use the imported function from the top of the file
      handleWelcomeEmail(email, displayName || email.split('@')[0])
        .then((result: any) => {
          if (result.success) {
            return res.json({ success: true, message: "Welcome email sent successfully" });
          } else {
            return res.status(500).json({ error: "Failed to send welcome email", details: result.error });
          }
        })
        .catch((error: any) => {
          console.error("Error sending welcome email:", error);
          return res.status(500).json({ error: "Failed to send welcome email" });
        });
    } catch (error) {
      console.error("Error in welcome email endpoint:", error);
      return res.status(500).json({ error: "Failed to process welcome email request" });
    }
  });
  
  // Email - send subscription expiration notification
  app.post("/api/email/subscription-expiration", isAuthenticated, (req: any, res) => {
    try {
      const { email, displayName, daysRemaining } = req.body;
      
      if (!email) {
        return res.status(400).json({ error: "Email is required" });
      }
      
      if (!daysRemaining || isNaN(daysRemaining)) {
        return res.status(400).json({ error: "Valid daysRemaining is required" });
      }
      
      // Use the user's own email and name if not specified
      const targetEmail = email || req.user.email;
      const targetName = displayName || req.user.firstName || req.user.email;
      
      // Import from emailService.ts
      const { handleSubscriptionExpirationEmail } = require('./emailService');
      
      handleSubscriptionExpirationEmail(targetEmail, targetName, daysRemaining)
        .then((result: any) => {
          if (result.success) {
            return res.json({ success: true, message: "Subscription expiration email sent successfully" });
          } else {
            return res.status(500).json({ error: "Failed to send subscription expiration email", details: result.error });
          }
        })
        .catch((error: any) => {
          console.error("Error sending subscription expiration email:", error);
          return res.status(500).json({ error: "Failed to send subscription expiration email" });
        });
    } catch (error) {
      console.error("Error in subscription expiration email endpoint:", error);
      return res.status(500).json({ error: "Failed to process subscription expiration email request" });
    }
  });
  
  // Email - send game alert (REDIRECTED TO SCHEDULER)
  app.post("/api/email/game-alert", isAuthenticated, async (req: any, res) => {
    try {
      console.log('🚨 OLD ROUTE HIT: Redirecting /api/email/game-alert to scheduler');
      const { email, displayName, gameDetails } = req.body;
      
      if (!email) {
        return res.status(400).json({ error: "Email is required" });
      }
      
      if (!gameDetails || !gameDetails.homeTeam || !gameDetails.awayTeam || !gameDetails.time || !gameDetails.league) {
        return res.status(400).json({ error: "Complete game details are required" });
      }
      
      // Use the proper scheduler instead of instant emails
      const { alertScheduler } = await import('./alertScheduler');
      const gameTime = new Date(gameDetails.time);
      const targetEmail = email || req.user.email;
      const notifyMinutesBefore = 30; // Default to 30 minutes
      
      try {
        console.log('📅 SCHEDULER: Scheduling alert via old route for:', { gameId: gameDetails.gameId, email: targetEmail, notifyMinutesBefore, gameTime });
        const alertId = alertScheduler.scheduleAlert(gameDetails.gameId || 'unknown', targetEmail, notifyMinutesBefore, gameTime);
        console.log('📅 SCHEDULER: Alert scheduled successfully with ID:', alertId);
        return res.json({ 
          success: true, 
          message: `Alert scheduled! You'll be notified ${notifyMinutesBefore} minutes before the game starts.`,
          alertId 
        });
      } catch (schedulingError: any) {
        console.log('📅 SCHEDULER ERROR via old route:', schedulingError.message);
        return res.status(400).json({ 
          success: false, 
          message: schedulingError.message || 'Failed to schedule alert'
        });
      }
    } catch (error) {
      console.error("Error in game alert email endpoint:", error);
      return res.status(500).json({ error: "Failed to process game alert email request" });
    }
  });
  
  // Email - send test email (admin only)
  app.post("/api/admin/email/test", isAuthenticated, isAdmin, (req: any, res) => {
    try {
      const { email } = req.body;
      
      if (!email) {
        return res.status(400).json({ error: "Email is required" });
      }
      
      // Import from emailService.ts
      const { handleTestEmail } = require('./emailService');
      
      handleTestEmail(email)
        .then((result: any) => {
          if (result.success) {
            return res.json({ success: true, message: "Test email sent successfully" });
          } else {
            return res.status(500).json({ error: "Failed to send test email", details: result.error });
          }
        })
        .catch((error: any) => {
          console.error("Error sending test email:", error);
          return res.status(500).json({ error: "Failed to send test email" });
        });
    } catch (error) {
      console.error("Error in test email endpoint:", error);
      return res.status(500).json({ error: "Failed to process test email request" });
    }
  });

  // User activity tracking middleware for authenticated requests
  app.use((req: any, res, next) => {
    if (req.user) {
      // Extract current page from referer
      let currentPage = "Home";
      if (req.headers.referer) {
        try {
          const url = new URL(req.headers.referer);
          currentPage = url.pathname === "/" ? "Home" : url.pathname.replace(/^\//, "").split("/")[0];
          // Capitalize first letter
          currentPage = currentPage.charAt(0).toUpperCase() + currentPage.slice(1);
        } catch (e) {
          // If URL parsing fails, use path
          currentPage = req.path.replace(/^\/api\//, "").split("/")[0] || "Home";
          currentPage = currentPage.charAt(0).toUpperCase() + currentPage.slice(1);
        }
      }
      
      // Track user activity
      trackUserActivity(req.user.id, {
        firstName: req.user.firstName,
        lastName: req.user.lastName,
        email: req.user.email,
        ip: req.ip,
        currentPage
      });
    }
    next();
  });

  // Start the cleanup interval for inactive users
  startCleanupInterval();
  
  // Stripe Payment Routes
  app.post('/api/create-checkout-session', isAuthenticated, async (req, res) => {
    try {
      const { planId } = req.body;
      const userId = req.user?.id;
      
      if (!userId) {
        return res.status(401).json({ message: 'User not authenticated' });
      }
      
      if (!planId) {
        return res.status(400).json({ message: 'Plan ID is required' });
      }

      // Create success and cancel URLs
      const baseUrl = req.headers.origin || 'http://localhost:5000';
      const successUrl = `${baseUrl}/payment-success?session_id={CHECKOUT_SESSION_ID}`;
      const cancelUrl = `${baseUrl}/pricing?canceled=true`;

      // Stripe checkout removed for deployment optimization
      const session = { success: false, message: "Checkout system not available" };
      
      res.json({ 
        url: session.url,
        sessionId: session.sessionId 
      });
    } catch (error: any) {
      console.error('Error creating checkout session:', error);
      res.status(500).json({ message: error.message });
    }
  });

  app.post('/api/create-subscription', isAuthenticated, async (req, res) => {
    try {
      const { planId, amount } = req.body;
      const userId = req.user?.id;
      
      if (!userId) {
        return res.status(401).json({ message: 'User not authenticated' });
      }
      
      if (!planId || !amount) {
        return res.status(400).json({ message: 'Missing required parameters' });
      }
      
      // Stripe subscriptions removed for deployment optimization
      const result = { success: false, message: "Subscription system not available" };
      
      res.json({ clientSecret: result.clientSecret });
    } catch (error: any) {
      console.error('Error creating subscription:', error);
      res.status(500).json({ message: error.message });
    }
  });
  
  app.post('/api/process-payment', isAuthenticated, async (req, res) => {
    try {
      const { paymentMethodId, planId, amount } = req.body;
      const userId = req.user?.id;
      
      if (!userId) {
        return res.status(401).json({ error: 'User not authenticated' });
      }
      
      if (!paymentMethodId || !planId || !amount) {
        return res.status(400).json({ error: 'Missing required parameters' });
      }
      
      // Get the plan details
      const plan = await storage.getSubscriptionPlanById(planId);
      if (!plan) {
        return res.status(404).json({ error: 'Plan not found' });
      }
      
      // Create a payment with Stripe
      // Import Stripe from the already imported module
      const { default: Stripe } = await import('stripe');
      const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || '');
      
      try {
        // Create a payment intent
        const paymentIntent = await stripe.paymentIntents.create({
          amount: amount,
          currency: 'usd',
          payment_method: paymentMethodId,
          confirm: true, // Confirm the payment immediately
          description: `VeloPlay Subscription - ${plan.name}`,
          automatic_payment_methods: {
            enabled: true,
            allow_redirects: 'always'
          },
          return_url: `${req.protocol}://${req.get('host')}/payment-success`,
          metadata: {
            userId,
            planId: planId.toString()
          }
        });
        
        // Check the status of the payment intent
        if (paymentIntent.status === 'succeeded') {
          return res.json({ success: true, paymentIntentId: paymentIntent.id });
        } else if (paymentIntent.status === 'requires_action') {
          // 3D Secure authentication is required
          return res.json({
            requires_action: true,
            clientSecret: paymentIntent.client_secret,
            paymentIntentId: paymentIntent.id
          });
        } else {
          return res.status(400).json({ error: `Payment failed with status: ${paymentIntent.status}` });
        }
      } catch (stripeError: any) {
        console.error('Stripe error:', stripeError);
        return res.status(400).json({ error: stripeError.message });
      }
    } catch (error: any) {
      console.error('Error processing payment:', error);
      res.status(500).json({ error: error.message || 'An unexpected error occurred' });
    }
  });
  
  app.post('/api/activate-subscription', isAuthenticated, async (req, res) => {
    try {
      const { planId } = req.body;
      const userId = req.user?.id;
      
      if (!userId) {
        return res.status(401).json({ error: 'User not authenticated' });
      }
      
      if (!planId) {
        return res.status(400).json({ error: 'Missing plan ID' });
      }
      
      // Get the plan details to calculate end date
      const plan = await storage.getSubscriptionPlanById(planId);
      if (!plan) {
        return res.status(404).json({ error: 'Plan not found' });
      }
      
      // Calculate subscription dates
      const startDate = new Date();
      const endDate = new Date();
      endDate.setDate(startDate.getDate() + plan.durationDays);
      
      // Create a new subscription
      const subscription = await storage.createSubscription({
        userId,
        planId,
        startDate,
        endDate,
        isActive: true
      });
      
      return res.json({ success: true, subscription });
    } catch (error: any) {
      console.error('Error activating subscription:', error);
      res.status(500).json({ error: error.message || 'Failed to activate subscription' });
    }
  });
  
  // Special admin route for direct subscription activation (no payment required)
  app.post('/api/admin-activate-subscription', isAuthenticated, async (req, res) => {
    try {
      const { planId, activationCode } = req.body;
      const userId = req.user?.id;
      
      if (!userId) {
        return res.status(401).json({ error: 'User not authenticated' });
      }
      
      if (!planId) {
        return res.status(400).json({ error: 'Missing plan ID' });
      }
      
      // Verify admin activation code - simple solution for testing
      if (activationCode !== 'VELOPLAY-ADMIN') {
        return res.status(403).json({ error: 'Invalid activation code' });
      }
      
      // Get the plan details to calculate end date
      const plan = await storage.getSubscriptionPlanById(planId);
      if (!plan) {
        return res.status(404).json({ error: 'Plan not found' });
      }
      
      // Check if user already has an active subscription
      const existingSubscription = await storage.getSubscriptionByUserId(userId);
      if (existingSubscription && existingSubscription.isActive) {
        // Update the existing subscription
        const endDate = new Date();
        endDate.setDate(endDate.getDate() + plan.durationDays);
        
        const updatedSubscription = await storage.updateSubscription(existingSubscription.id, {
          planId,
          endDate,
          isActive: true
        });
        
        return res.json({ 
          success: true, 
          subscription: updatedSubscription,
          message: 'Existing subscription updated'
        });
      }
      
      // Calculate subscription dates
      const startDate = new Date();
      const endDate = new Date();
      endDate.setDate(startDate.getDate() + plan.durationDays);
      
      // Create a new subscription
      const subscription = await storage.createSubscription({
        userId,
        planId,
        startDate,
        endDate,
        isActive: true
      });
      
      return res.json({ 
        success: true, 
        subscription,
        message: 'Subscription activated successfully'
      });
    } catch (error: any) {
      console.error('Error activating admin subscription:', error);
      res.status(500).json({ error: error.message || 'Failed to activate subscription' });
    }
  });
  
  // Admin-only route to grant/update user subscription
  app.post('/api/admin/users/:userId/subscription', isAuthenticated, async (req, res) => {
    try {
      const { userId } = req.params;
      const { planId, extensionDays, action } = req.body; // action: 'grant', 'extend', 'revoke'
      const adminUserId = req.user?.id;
      
      // Check if user is admin
      const adminUser = await storage.getUserById(adminUserId);
      if (!adminUser || adminUser.email !== 'main@admin.com') {
        return res.status(403).json({ error: 'Admin access required' });
      }
      
      if (action === 'grant' && planId) {
        // Grant new subscription
        const plan = await storage.getSubscriptionPlanById(planId);
        if (!plan) {
          return res.status(404).json({ error: 'Plan not found' });
        }
        
        // Check if user already has an active subscription
        const existingSubscription = await storage.getSubscriptionByUserId(userId);
        if (existingSubscription && existingSubscription.isActive) {
          // Update existing subscription
          const endDate = new Date();
          endDate.setDate(endDate.getDate() + plan.durationDays);
          
          const updatedSubscription = await storage.updateSubscriptionPlan(existingSubscription.id, {
            planId,
            endDate,
            isActive: true
          });
          
          return res.json({ 
            success: true, 
            subscription: updatedSubscription,
            message: `Updated to ${plan.name} plan`
          });
        } else {
          // Create new subscription
          const startDate = new Date();
          const endDate = new Date();
          endDate.setDate(startDate.getDate() + plan.durationDays);
          
          const subscription = await storage.createSubscription({
            userId,
            planId,
            startDate,
            endDate,
            isActive: true
          });
          
          return res.json({ 
            success: true, 
            subscription,
            message: `Granted ${plan.name} plan`
          });
        }
      } else if (action === 'extend' && extensionDays) {
        // Extend existing subscription
        const existingSubscription = await storage.getSubscriptionByUserId(userId);
        if (!existingSubscription) {
          return res.status(404).json({ error: 'No subscription found to extend' });
        }
        
        const currentEndDate = new Date(existingSubscription.endDate);
        const newEndDate = new Date(currentEndDate);
        newEndDate.setDate(currentEndDate.getDate() + parseInt(extensionDays));
        
        const updatedSubscription = await storage.updateSubscriptionPlan(existingSubscription.id, {
          endDate: newEndDate,
          isActive: true
        });
        
        return res.json({ 
          success: true, 
          subscription: updatedSubscription,
          message: `Extended subscription by ${extensionDays} days`
        });
      } else if (action === 'revoke') {
        // Revoke subscription
        const existingSubscription = await storage.getSubscriptionByUserId(userId);
        if (!existingSubscription) {
          return res.status(404).json({ error: 'No subscription found to revoke' });
        }
        
        const updatedSubscription = await storage.updateSubscriptionPlan(existingSubscription.id, {
          isActive: false,
          endDate: new Date() // Set end date to now
        });
        
        return res.json({ 
          success: true, 
          subscription: updatedSubscription,
          message: 'Subscription revoked'
        });
      } else {
        return res.status(400).json({ error: 'Invalid action or missing parameters' });
      }
    } catch (error: any) {
      console.error('Error managing user subscription:', error);
      res.status(500).json({ error: error.message || 'Failed to manage subscription' });
    }
  });

  // Admin-only route to reset user password
  app.post('/api/admin/users/:userId/reset-password', isAuthenticated, async (req, res) => {
    try {
      const { userId } = req.params;
      const adminUserId = req.user?.id;
      
      // Check if user is admin
      const adminUser = await storage.getUserById(adminUserId);
      if (!adminUser || adminUser.email !== 'main@admin.com') {
        return res.status(403).json({ error: 'Admin access required' });
      }
      
      // Get the target user
      const targetUser = await storage.getUserById(userId);
      if (!targetUser) {
        return res.status(404).json({ error: 'User not found' });
      }
      
      // Generate a temporary password or send reset email
      // For now, we'll send a password reset email
      try {
        const response = await fetch('/api/send-password-reset', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ 
            email: targetUser.email,
            isAdminReset: true 
          }),
        });
        
        if (response.ok) {
          return res.json({ 
            success: true, 
            message: `Password reset email sent to ${targetUser.email}`
          });
        } else {
          throw new Error('Failed to send reset email');
        }
      } catch (emailError) {
        console.error('Error sending password reset email:', emailError);
        return res.status(500).json({ error: 'Failed to send password reset email' });
      }
    } catch (error: any) {
      console.error('Error resetting user password:', error);
      res.status(500).json({ error: error.message || 'Failed to reset password' });
    }
  });

  app.post('/api/confirm-payment', isAuthenticated, async (req, res) => {
    try {
      const { paymentIntentId } = req.body;
      const userId = req.user?.id;
      
      if (!userId) {
        return res.status(401).json({ error: 'User not authenticated' });
      }
      
      if (!paymentIntentId) {
        return res.status(400).json({ error: 'Missing payment intent ID' });
      }
      
      // Verify the payment with Stripe
      const { default: Stripe } = await import('stripe');
      const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || '');
      
      try {
        // Retrieve the payment intent
        const paymentIntent = await stripe.paymentIntents.retrieve(paymentIntentId);
        
        // Make sure it belongs to this user
        if (paymentIntent.metadata.userId !== userId) {
          return res.status(403).json({ error: 'Payment intent does not belong to this user' });
        }
        
        if (paymentIntent.status !== 'succeeded') {
          // If it's not succeeded, try to capture it
          if (paymentIntent.status === 'requires_capture') {
            await stripe.paymentIntents.capture(paymentIntentId);
          } else {
            return res.status(400).json({ error: `Payment is not successful: ${paymentIntent.status}` });
          }
        }
        
        return res.json({ success: true });
      } catch (stripeError: any) {
        console.error('Stripe error during confirmation:', stripeError);
        return res.status(400).json({ error: stripeError.message });
      }
    } catch (error: any) {
      console.error('Error confirming payment:', error);
      res.status(500).json({ error: error.message || 'Failed to confirm payment' });
    }
  });
  
  app.post('/api/verify-payment', isAuthenticated, async (req, res) => {
    try {
      const { paymentIntentId } = req.body;
      
      if (!paymentIntentId) {
        return res.status(400).json({ 
          success: false, 
          message: 'Missing payment_intent parameter' 
        });
      }
      
      // Payment verification removed for deployment optimization
      const result = { success: false, message: "Payment system not available" };
      
      res.json(result);
    } catch (error: any) {
      console.error('Error verifying payment:', error);
      res.status(500).json({ 
        success: false, 
        message: error.message 
      });
    }
  });
  
  // Stripe webhook handler - does not use authentication as it's called by Stripe
  app.post('/api/webhook/stripe', express.raw({ type: 'application/json' }), async (req, res) => {
    try {
      const signature = req.headers['stripe-signature'] as string;
      
      if (!signature) {
        return res.status(400).json({ message: 'Missing stripe-signature header' });
      }
      
      // Stripe webhook removed for deployment optimization
      const result = { success: false, message: "Stripe webhooks not available" };
      
      res.json(result);
    } catch (error: any) {
      console.error('Error processing webhook:', error);
      res.status(400).json({ message: error.message });
    }
  });
  
  // Set up auth verification callback route
  app.get('/auth/callback', (req, res) => {
    try {
      const { code } = req.query;
      
      // If no code is provided, redirect to login with error
      if (!code) {
        return res.redirect('/login?error=missing_code');
      }
      
      console.log(`Auth callback received with code: ${String(code).substring(0, 5)}...`);
      
      // Redirect to the client-side auth callback page
      res.redirect(`/auth-callback?code=${code}`);
    } catch (error: any) {
      console.error('Auth callback error:', error.message);
      res.redirect('/login?error=verification_failed');
    }
  });



  // Get all alerts for a user
  app.get('/api/game-alerts', isAuthenticated, async (req, res) => {
    try {
      const userId = req.user?.id;
      
      if (!userId) {
        return res.status(401).json({ error: 'User not authenticated' });
      }
      
      const alerts = await storage.getGameAlertsByUserId(userId);
      return res.json(alerts);
    } catch (error) {
      console.error('Error fetching game alerts:', error);
      return res.status(500).json({ error: 'Failed to fetch game alerts' });
    }
  });

  // Check if user has alert for specific game
  app.get('/api/game-alerts/:gameId', async (req, res) => {
    try {
      // Get user ID from session or hardcode for testing
      const userId = req.session?.passport?.user || 'e72ece9e-11e3-452b-ab22-e0a4c52facb0';
      const gameId = req.params.gameId;
      
      console.log('🔍 Checking alert for user:', userId, 'game:', gameId);
      
      const alert = await storage.getGameAlertByUserAndGame(userId, gameId);
      console.log('🎯 Alert found:', alert);
      
      return res.json({ exists: !!alert, alert: alert || null });
    } catch (error) {
      console.error('Error checking game alert:', error);
      return res.status(500).json({ error: 'Failed to check game alert' });
    }
  });

  // Simple test route to verify routing works
  app.get('/api/test-routing', (req, res) => {
    console.log('✅ TEST ROUTE WORKING!');
    res.json({ message: 'Routing works!' });
  });

  // Create game alert - temporarily bypass auth for testing
  app.post('/api/game-alerts-temp', isAuthenticated, async (req: any, res) => {
    console.log('🎯 ALERT ROUTE HIT! Request received:', req.method, req.url);
    console.log('📦 Request body:', req.body);
    
    try {
      const userId = req.user?.id;
      const { gameId, notifyMinutesBefore } = req.body;
      
      if (!userId) {
        return res.status(401).json({ error: 'User not authenticated' });
      }
      
      if (!gameId) {
        return res.status(400).json({ error: 'Game ID is required' });
      }
      
      console.log('🚨 Creating game alert:', { userId, gameId, notifyMinutesBefore });
      
      // Default to 30 minutes if not specified
      const minutesBefore = notifyMinutesBefore || 30;
      
      console.log('📋 Checking for existing alert...');
      
      // Check if alert already exists
      const existingAlert = await storage.getGameAlertByUserAndGame(userId, gameId);
      
      console.log('🔍 Existing alert check result:', existingAlert);
      
      if (existingAlert) {
        return res.status(409).json({ 
          message: 'Alert already exists for this game',
          alert: existingAlert 
        });
      }
      
      // Create new alert using our storage system (which handles ID generation properly)
      const newAlert = await storage.createGameAlert({
        userId,
        gameId,
        notifyMinutesBefore: minutesBefore
      });
      
      console.log('✅ Game alert created successfully:', newAlert);
      
      return res.status(201).json({
        message: 'Game alert created successfully',
        alert: newAlert
      });
    } catch (error) {
      console.error('Error creating game alert:', error);
      return res.status(500).json({ error: 'Failed to create game alert' });
    }
  });



  // Delete game alert
  app.delete('/api/game-alerts/:alertId', isAuthenticated, async (req, res) => {
    try {
      const userId = req.user?.id;
      const alertId = parseInt(req.params.alertId);
      
      if (!userId) {
        return res.status(401).json({ error: 'User not authenticated' });
      }
      
      await storage.deleteGameAlert(alertId);
      return res.json({ success: true });
    } catch (error) {
      console.error('Error deleting game alert:', error);
      return res.status(500).json({ error: 'Failed to delete game alert' });
    }
  });

  // Check if user has alert for specific game
  app.get('/api/game-alerts/:gameId', isAuthenticated, async (req: any, res) => {
    try {
      const { gameId } = req.params;
      const userId = req.user?.id;
      
      if (!userId) {
        return res.status(401).json({ 
          exists: false,
          error: 'User not authenticated' 
        });
      }
      
      // Get the specific alert for this user and game
      const alert = await storage.getGameAlertByUserAndGame(userId, gameId);
      
      return res.json({ 
        exists: !!alert,
        alert: alert || null
      });
    } catch (error) {
      console.error('Error checking game alert:', error);
      return res.status(500).json({ error: 'Failed to check game alert' });
    }
  });

  // Delete a game alert
  app.delete('/api/game-alerts/:id', isAuthenticated, async (req, res) => {
    try {
      const alertId = parseInt(req.params.id);
      const userId = req.user?.id;
      
      if (!userId) {
        return res.status(401).json({ error: 'User not authenticated' });
      }
      
      if (isNaN(alertId)) {
        return res.status(400).json({ error: 'Invalid alert ID' });
      }
      
      // Check if the alert exists and belongs to the user
      const alerts = await storage.getGameAlertsByUserId(userId);
      const userAlert = alerts.find(alert => alert.id === alertId);
      
      if (!userAlert) {
        return res.status(404).json({ error: 'Alert not found or does not belong to user' });
      }
      
      await storage.deleteGameAlert(alertId);
      return res.status(200).json({ success: true });
    } catch (error) {
      console.error('Error deleting game alert:', error);
      return res.status(500).json({ error: 'Failed to delete game alert' });
    }
  });

  // Check if a game alert exists for a user
  app.get('/api/game-alerts/:gameId', isAuthenticated, async (req, res) => {
    try {
      const gameId = req.params.gameId;
      const userId = req.user?.id;
      
      if (!userId) {
        return res.status(401).json({ error: 'User not authenticated' });
      }
      
      if (!gameId) {
        return res.status(400).json({ error: 'Game ID is required' });
      }
      
      const alert = await storage.getGameAlertByUserAndGame(userId, gameId);
      
      if (!alert) {
        return res.status(404).json({ 
          exists: false,
          message: 'No alert found for this game' 
        });
      }
      
      return res.status(200).json({
        exists: true,
        alert
      });
    } catch (error) {
      console.error('Error checking game alert:', error);
      return res.status(500).json({ error: 'Failed to check game alert' });
    }
  });

  // User dashboard statistics endpoint
  app.get('/api/user/dashboard-stats', isAuthenticated, async (req, res) => {
    try {
      console.log('📊 [API] Fetching user dashboard statistics');
      
      const supabase = (await import('./supabaseClient')).default;
      const userId = req.user?.id;
      
      // Get user's subscription info
      const { data: subscription } = await supabase
        .from('subscriptions')
        .select('*, subscription_plans(*)')
        .eq('user_id', userId)
        .eq('is_active', true)
        .single();
      
      // Get user's game alerts as a proxy for favorite teams
      const { data: gameAlerts } = await supabase
        .from('game_alerts')
        .select('*')
        .eq('user_id', userId)
        .limit(10);
      
      // Calculate total watch time (simulated based on user activity)
      const watchTime = gameAlerts?.length ? gameAlerts.length * 45 : 15; // 45 minutes per alert as proxy
      
      const userStats = {
        watchTime: watchTime,
        favoriteTeams: gameAlerts?.length > 0 ? ['Based on your alerts', 'Game preferences'] : ['No preferences yet'],
        subscriptionStatus: subscription?.subscription_plans?.name || 'Free',
        nextBilling: subscription?.end_date || null,
        alertsSet: gameAlerts?.length || 0,
        watchHistory: gameAlerts?.slice(0, 3).map((alert: any, index: number) => ({
          game: `Alert ${index + 1}`,
          date: new Date(alert.created_at).toLocaleDateString(),
          duration: 2.5 + (index * 0.5)
        })) || []
      };
      
      return res.status(200).json(userStats);
    } catch (error) {
      console.error('Error fetching user dashboard stats:', error);
      return res.status(500).json({ error: 'Failed to fetch user dashboard stats' });
    }
  });

  // Admin dashboard statistics endpoint
  app.get('/api/admin/dashboard-stats', isAuthenticated, isAdmin, async (req, res) => {
    try {
      console.log('📊 [API] Fetching dashboard statistics');
      
      const supabase = (await import('./supabaseClient')).default;
      
      // Get total sales from subscriptions
      const { data: subscriptions } = await supabase
        .from('subscriptions')
        .select('*')
        .eq('is_active', true);
      
      // Get subscription plans for pricing
      const { data: plans } = await supabase
        .from('subscription_plans')
        .select('*');
      
      // Get total users
      const { data: users } = await supabase
        .from('users')
        .select('id, email, created_at');
      
      // Calculate statistics
      const activeSubscriptions = subscriptions?.length || 0;
      const totalUsers = users?.length || 0;
      
      // Calculate total sales (mock calculation based on active subscriptions)
      let totalSales = 0;
      if (subscriptions && plans) {
        subscriptions.forEach(sub => {
          const plan = plans.find(p => p.id === sub.plan_id);
          if (plan) {
            totalSales += plan.price;
          }
        });
      }
      
      // Mock monthly revenue data (you can replace with real data)
      const monthlyRevenue = [
        { month: 'Jan', revenue: 12000 },
        { month: 'Feb', revenue: 15000 },
        { month: 'Mar', revenue: 18000 },
        { month: 'Apr', revenue: 22000 },
        { month: 'May', revenue: totalSales || 25000 },
      ];
      
      // Plan distribution
      const planDistribution = plans?.map((plan, index) => ({
        name: plan.name,
        value: subscriptions?.filter(s => s.plan_id === plan.id).length || 0,
        color: ['#7f00ff', '#ff6b6b', '#4ecdc4', '#45b7d1', '#96ceb4'][index % 5]
      })) || [];
      
      // Recent activity (mock data - replace with real activity logs)
      const recentActivity = [
        {
          id: '1',
          type: 'subscription',
          description: 'New Premium subscription activated',
          timestamp: '2 hours ago'
        },
        {
          id: '2',
          type: 'user',
          description: 'New user registered',
          timestamp: '4 hours ago'
        },
        {
          id: '3',
          type: 'payment',
          description: 'Payment processed successfully',
          timestamp: '6 hours ago'
        }
      ];
      
      const stats = {
        totalSales,
        totalRefunds: 0, // Add real refund calculation if needed
        activeSubscriptions,
        onlineUsers: Math.floor(Math.random() * 50) + 10, // Mock online users
        totalUsers,
        monthlyRevenue,
        planDistribution,
        recentActivity
      };
      
      return res.status(200).json(stats);
    } catch (error) {
      console.error('Error fetching dashboard stats:', error);
      return res.status(500).json({ error: 'Failed to fetch dashboard statistics' });
    }
  });

  // OLD ENDPOINT REMOVED - Now using centralized Supabase system below

  // Get stream mappings for M3U8 URL Management - SIMPLIFIED WORKING VERSION
  app.get('/api/admin/stream-mappings', isAuthenticated, isAdmin, async (req, res) => {
    try {
      console.log('🎯 [API] Fetching stream mappings for admin panel');
      
      // SIMPLE FIX: Get raw data from Supabase and deduplicate manually
      const supabase = (await import('./supabaseClient')).default;
      const { data: streamSources, error } = await supabase
        .from('stream_sources')
        .select('*')
        .eq('is_active', true);
      
      if (error) {
        console.error('Supabase error:', error);
        return res.status(500).json({ error: 'Database error', details: error.message });
      }
      
      console.log(`🎯 [AdminMappings] Found ${streamSources?.length || 0} stream sources in database`);
      
      // Manual deduplication - group by standardized team names
      const teamMap = new Map();
      
      for (const source of streamSources || []) {
        const teamName = source.team_name || 'Unknown';
        // Standardize team name (prefer longer names like "OAKLAND ATHLETICS" over "ATHLETICS")
        const standardKey = teamName.toUpperCase().trim();
        
        if (!teamMap.has(standardKey) || teamMap.get(standardKey).team_name.length < teamName.length) {
          // Extract stream ID from URL
          const urlMatch = source.url?.match(/\/(\d+)\.m3u8$/) || [];
          const streamId = urlMatch[1] ? parseInt(urlMatch[1]) : 0;
          
          // Determine league
          let league = source.league_id?.toUpperCase() || 'UNKNOWN';
          if (league === 'AUTO-DETECTED' || league === 'UNKNOWN') {
            if (streamId >= 185 && streamId <= 214) league = 'MLB';
            else if (streamId >= 65 && streamId <= 95) league = 'NBA';
            else if (streamId >= 219 && streamId <= 222) league = 'NBA'; // Extended NBA
            else if (streamId >= 35 && streamId <= 63) league = 'NFL';
            else if (streamId >= 6 && streamId <= 35) league = 'NHL';
            else if (streamId >= 215 && streamId <= 218) league = 'NHL'; // Extended NHL
          }
          
          teamMap.set(standardKey, {
            team: teamName,
            streamId,
            league,
            url: source.url || ''
          });
        }
      }
      
      const mappings = Array.from(teamMap.values()).sort((a, b) => a.team.localeCompare(b.team));
      
      console.log(`🎯 [AdminMappings] Returning ${mappings.length} deduplicated mappings`);
      
      res.json(mappings);
    } catch (error) {
      console.error('Error fetching stream mappings:', error);
      res.status(500).json({ error: 'Failed to fetch stream mappings', details: String(error) });
    }
  });

  // M3U8 URL Management API endpoint - CENTRALIZED SUPABASE VERSION
  app.put('/api/admin/update-stream-url', isAuthenticated, isAdmin, async (req, res) => {
    try {
      const { teamName, newUrl } = req.body;
      
      if (!teamName || !newUrl) {
        return res.status(400).json({ error: 'Team name and new URL are required' });
      }
      
      // Extract stream ID from the new URL
      const urlMatch = newUrl.match(/\/(\d+)\.m3u8$/);
      if (!urlMatch) {
        return res.status(400).json({ error: 'Invalid M3U8 URL format' });
      }
      
      const newStreamId = parseInt(urlMatch[1]);
      
      // CRITICAL FIX: Use centralized stream manager instead of fragmented mappings
      const { updateStreamUrlForTeam } = await import('./centralizedStreamManager');
      const success = await updateStreamUrlForTeam(teamName, newUrl);
      
      if (success) {
        console.log(`🎯 [CentralizedUpdate] Updated ${teamName} M3U8 URL to ${newUrl} (Stream ID: ${newStreamId}) in Supabase`);
        
        res.json({ 
          success: true, 
          message: `Successfully updated ${teamName} stream URL`,
          teamName,
          newUrl,
          newStreamId,
          source: 'centralized_supabase'
        });
      } else {
        console.error(`🚨 [CentralizedUpdate] Failed to update ${teamName} in Supabase`);
        res.status(500).json({ 
          error: `Failed to update stream URL for ${teamName}`,
          teamName
        });
      }
    } catch (error) {
      console.error('Error updating stream URL:', error);
      res.status(500).json({ error: 'Failed to update stream URL' });
    }
  });

  // Network Channels routes
  app.get('/api/channels', async (req, res) => {
    try {
      const channels = await storage.getNetworkChannels();
      // Add stream URLs to the channels
      const channelsWithUrls = channels.map(channel => ({
        ...channel,
        streamUrl: `${STREAM_BASE_URL}${channel.id}.m3u8`
      }));
      res.json(channelsWithUrls);
    } catch (error) {
      console.error('Error fetching network channels:', error);
      res.status(500).json({ message: 'Error fetching network channels' });
    }
  });

  app.get('/api/channels/:id', async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const channel = await storage.getNetworkChannelById(id);
      
      if (!channel) {
        return res.status(404).json({ message: 'Channel not found' });
      }
      
      // Add stream URL
      const channelWithUrl = {
        ...channel,
        streamUrl: `${STREAM_BASE_URL}${channel.id}.m3u8`
      };
      
      res.json(channelWithUrl);
    } catch (error) {
      console.error('Error fetching network channel:', error);
      res.status(500).json({ message: 'Error fetching network channel' });
    }
  });

  // Admin routes for managing channels - protected by admin check
  app.post('/api/channels', isAuthenticated, async (req: any, res) => {
    // Check if user is admin
    if (!req.user?.isAdmin) {
      return res.status(403).json({ message: 'Admin access required' });
    }
    
    try {
      const { name, icon, description, streamId, isActive, isPremium } = req.body;
      
      if (!name || !icon || !description || !streamId) {
        return res.status(400).json({ message: 'Missing required fields' });
      }
      
      const newChannel = await storage.createNetworkChannel({
        id: parseInt(streamId), // The ID will be used as the stream ID for URL generation
        name,
        icon, 
        description,
        isActive: isActive !== undefined ? isActive : true,
        isPremium: isPremium !== undefined ? isPremium : false
      });
      
      // Add stream URL for convenience
      const channelWithUrl = {
        ...newChannel,
        streamUrl: `${STREAM_BASE_URL}${newChannel.id}.m3u8`
      };
      
      res.status(201).json(channelWithUrl);
    } catch (error) {
      console.error('Error creating network channel:', error);
      res.status(500).json({ message: 'Error creating network channel' });
    }
  });

  app.put('/api/channels/:id', isAuthenticated, async (req: any, res) => {
    // Check if user is admin
    if (!req.user?.isAdmin) {
      return res.status(403).json({ message: 'Admin access required' });
    }
    
    try {
      const id = parseInt(req.params.id);
      const { name, icon, description, streamId, isActive, isPremium } = req.body;
      
      // Check if channel exists
      const existingChannel = await storage.getNetworkChannelById(id);
      if (!existingChannel) {
        return res.status(404).json({ message: 'Channel not found' });
      }
      
      const updatedChannel = await storage.updateNetworkChannel(id, {
        name,
        icon,
        description,
        id: streamId ? parseInt(streamId) : undefined, // Allow updating the stream ID
        isActive,
        isPremium
      });
      
      // Add stream URL for convenience
      const channelWithUrl = {
        ...updatedChannel,
        streamUrl: `${STREAM_BASE_URL}${updatedChannel.id}.m3u8`
      };
      
      res.json(channelWithUrl);
    } catch (error) {
      console.error('Error updating network channel:', error);
      res.status(500).json({ message: 'Error updating network channel' });
    }
  });

  app.delete('/api/channels/:id', isAuthenticated, async (req: any, res) => {
    // Check if user is admin
    if (!req.user?.isAdmin) {
      return res.status(403).json({ message: 'Admin access required' });
    }
    
    try {
      const id = parseInt(req.params.id);
      
      // Check if channel exists
      const existingChannel = await storage.getNetworkChannelById(id);
      if (!existingChannel) {
        return res.status(404).json({ message: 'Channel not found' });
      }
      
      await storage.deleteNetworkChannel(id);
      
      res.status(204).send();
    } catch (error) {
      console.error('Error deleting network channel:', error);
      res.status(500).json({ message: 'Error deleting network channel' });
    }
  });
  
  // Register Stream Sources API routes - admin section
  app.use('/api/stream-sources', isAuthenticated, streamSourcesRoutes);
  
  // Register Stream Sources Latest endpoint for dynamic player URL updates
  // This endpoint needs to be public for client-side URL standardization and fallbacks
  app.use('/api/stream-sources/latest', streamSourcesLatestFixedRoutes);
  
  // Register Stream URL Editor specific routes
  app.use('/api/stream-url-editor', streamUrlEditorRoutes);
  
  // Register Direct Stream URL routes (more reliable method)
  app.use('/api/direct-stream-url', directStreamUrlRoutes);
  
  // Initialize stream sources table if needed
  app.get('/api/init-stream-sources', isAuthenticated, isAdmin, async (req, res) => {
    try {
      res.redirect(307, '/api/direct-stream-url/init');
    } catch (error) {
      console.error('Error initializing stream sources:', error);
      res.status(500).json({ error: 'Failed to initialize stream sources' });
    }
  });
  
  // Setup endpoint for initializing stream sources table
  app.get('/api/setup-stream-sources', isAuthenticated, isAdmin, async (req, res) => {
    try {
      const { setupStreamSourcesTable } = await import('./routes/db-setup');
      const result = await setupStreamSourcesTable();
      res.json(result);
    } catch (error) {
      console.error('Error setting up stream sources:', error);
      res.status(500).json({ error: 'Failed to setup stream sources table' });
    }
  });

  // Redis test routes
  app.use('/api', redisTestRoutes);
  
  const httpServer = createServer(app);
  
  return httpServer;
}
