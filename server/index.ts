import express, { type Request, Response, NextFunction } from "express";
import { registerRoutes } from "./routes";
import { setupVite, serveStatic, log } from "./vite";
import dotenv from 'dotenv';
import cors from 'cors';
import { initEmailService } from './emailService';
import session from 'express-session';
import { setupRequiredTables } from './setupTables';
import { startGameAlertScheduler } from './gameAlertScheduler';

// Load environment variables
dotenv.config();

// Check if Resend API key is available
if (!process.env.RESEND_API_KEY) {
  console.warn('⚠️ RESEND_API_KEY not found in environment. Email functionality will not work properly.');
} else {
  console.log('✅ RESEND_API_KEY is configured correctly.');
}

const app = express();

// Configure CORS to allow any website to access the API
const corsOptions = {
  origin: '*', // Allow ALL origins (veloplay.tv, localhost, etc.)
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'Origin', 'X-Requested-With', 'Accept'],
  optionsSuccessStatus: 204,
  exposedHeaders: ['Content-Length', 'Content-Range']
};

// Apply CORS middleware
app.use(cors(corsOptions));

app.use(express.json());
app.use(express.urlencoded({ extended: false }));

// Set up session middleware for OTP verification
app.use(session({
  secret: process.env.JWT_SECRET || 'veloplay-session-secret',
  resave: false,
  saveUninitialized: true,
  cookie: { 
    secure: process.env.NODE_ENV === 'production',
    maxAge: 1000 * 60 * 60 * 24 // 24 hours
  }
}));

app.use((req, res, next) => {
  const start = Date.now();
  const path = req.path;
  let capturedJsonResponse: Record<string, any> | undefined = undefined;

  const originalResJson = res.json;
  res.json = function (bodyJson, ...args) {
    capturedJsonResponse = bodyJson;
    return originalResJson.apply(res, [bodyJson, ...args]);
  };

  res.on("finish", () => {
    const duration = Date.now() - start;
    if (path.startsWith("/api")) {
      let logLine = `${req.method} ${path} ${res.statusCode} in ${duration}ms`;
      if (capturedJsonResponse) {
        logLine += ` :: ${JSON.stringify(capturedJsonResponse)}`;
      }

      if (logLine.length > 80) {
        logLine = logLine.slice(0, 79) + "…";
      }

      log(logLine);
    }
  });

  next();
});

(async () => {
  // Set up database tables first
  try {
    await setupRequiredTables();
    console.log('Database tables setup complete');
  } catch (err) {
    console.error('Error setting up database tables:', err);
  }
  
  const server = await registerRoutes(app);

  app.use((err: any, _req: Request, res: Response, _next: NextFunction) => {
    const status = err.status || err.statusCode || 500;
    const message = err.message || "Internal Server Error";

    res.status(status).json({ message });
    throw err;
  });

  // importantly only setup vite in development and after
  // setting up all the other routes so the catch-all route
  // doesn't interfere with the other routes
  if (app.get("env") === "development") {
    await setupVite(app, server);
  } else {
    serveStatic(app);
  }

  // Initialize email service
  initEmailService();
  
  // Start game alert scheduler
  startGameAlertScheduler();
  
  // ALWAYS serve the app on port 5000
  // this serves both the API and the client.
  // It is the only port that is not firewalled.
  const port = 5000;
  server.listen({
    port,
    host: "0.0.0.0",
    reusePort: true,
  }, () => {
    log(`serving on port ${port}`);
  });
})();
