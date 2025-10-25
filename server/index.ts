// Load .env only in development mode
import { config as dotenvConfig } from 'dotenv';
import { fileURLToPath } from 'url';
import path from 'path';

const isDev = process.env.NODE_ENV !== 'production';

if (isDev) {
  const __filename = fileURLToPath(import.meta.url);
  const __dirname = path.dirname(__filename);
  const projectRoot = path.resolve(__dirname, '..');

  const dotenvResult = dotenvConfig({ path: path.join(projectRoot, '.env') });
  if (dotenvResult.parsed) {
    // Override process.env with .env values to ensure development config is loaded
    Object.assign(process.env, dotenvResult.parsed);
  }
}

// Global error handlers - must be set up before anything else
process.on('uncaughtException', (error) => {
  console.error('UNCAUGHT EXCEPTION! Shutting down gracefully...');
  console.error('Error:', error.message);
  console.error('Stack:', error.stack);
  // Give time for logs to flush
  setTimeout(() => {
    process.exit(1);
  }, 1000);
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('UNHANDLED REJECTION! Shutting down gracefully...');
  console.error('Promise:', promise);
  console.error('Reason:', reason);
  // Give time for logs to flush
  setTimeout(() => {
    process.exit(1);
  }, 1000);
});

import express, { type Request, Response, NextFunction } from "express";
import { registerRoutes } from "./routes";
import { startMetricsLogging } from "./lib/metrics";

// Log environment configuration for debugging
console.log('📋 Server Initialization Starting...');
console.log('  NODE_ENV:', process.env.NODE_ENV || 'not set');
console.log('  PORT:', process.env.PORT || 'will use default');
console.log('  DATABASE_URL:', process.env.DATABASE_URL ? '✅ set' : '❌ NOT SET');
console.log('  SESSION_SECRET:', process.env.SESSION_SECRET ? '✅ set' : '❌ NOT SET');
console.log('  GOOGLE credentials:', process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL && process.env.GOOGLE_PRIVATE_KEY ? '✅ set' : '❌ NOT SET');

// Stubs for development
const log = isDev ? console.log : (msg: string) => {};
const logger = isDev ? { error: console.error, warn: console.warn, info: console.info } : { error: () => {}, warn: () => {}, info: () => {} };
const metricsMiddleware = () => (req: any, res: any, next: any) => next();
const initializeSentry = isDev ? () => {} : () => {};
const sentryRequestHandler = (req: any, res: any, next: any) => next();
const sentryTracingHandler = (req: any, res: any, next: any) => next();
const sentryErrorHandler = (err: any, req: any, res: any, next: any) => next(err);

const app = express();

app.use(express.json());
app.use(express.urlencoded({ extended: false }));

// Performance metrics middleware
app.use(metricsMiddleware());

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

// Health check endpoint for monitoring (must be before registerRoutes)
app.get("/health", (req, res) => {
  const healthStatus = {
    status: "ok",
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    environment: process.env.NODE_ENV || "development",
    database: process.env.DATABASE_URL ? "configured" : "NOT configured",
    googleSheets: process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL && process.env.GOOGLE_PRIVATE_KEY ? "configured" : "NOT configured",
    session: process.env.SESSION_SECRET ? "configured" : "NOT configured",
  };
  res.status(200).json(healthStatus);
});

// API root endpoint
app.get("/", (req, res) => {
  res.status(200).json({
    message: "CSM System Obecnosci API",
    status: "ok",
    version: "2.0",
    endpoints: {
      health: "/health",
      api: "/api/*",
      auth: "/api/auth/*"
    }
  });
});

(async () => {
  try {
    console.log('Starting server initialization...');
    console.log('NODE_ENV:', process.env.NODE_ENV);
    console.log('PORT:', process.env.PORT || 'not set');
    console.log('DATABASE_URL:', process.env.DATABASE_URL ? 'set' : 'NOT SET');
    console.log('SESSION_SECRET:', process.env.SESSION_SECRET ? 'set' : 'NOT SET');
    console.log('GOOGLE_SERVICE_ACCOUNT_EMAIL:', process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL ? 'set' : 'NOT SET');
    console.log('GOOGLE_PRIVATE_KEY:', process.env.GOOGLE_PRIVATE_KEY ? 'set' : 'NOT SET');

    const server = await registerRoutes(app);
    console.log('Routes registered successfully');

    // Sentry error handler (must be before other error handlers)
    app.use(sentryErrorHandler);

    app.use((err: any, _req: Request, res: Response, _next: NextFunction) => {
      const status = err.status || err.statusCode || 500;
      const message = err.message || "Internal Server Error";

      logger.error('Express error handler', { error: err.message, status, stack: err.stack });
      res.status(status).json({ message });
    });

    // importantly only setup vite in development and after
    // setting up all the other routes so the catch-all route
    // doesn't interfere with the other routes
    if (app.get("env") === "development") {
      // Development mode - serve static files from dist/
      // Vite dev server would be run separately
      try {
        const { serveStatic } = await import("./vite");
        serveStatic(app);
        console.log('Vite static serving enabled');
      } catch (err) {
        console.warn('Could not setup vite, routes will be available at /api/*:', err);
      }
    } else {
      // Production mode - serve built static files
      console.log('Production mode - setting up static file serving');
      try {
        const { serveStatic } = await import("./vite");
        serveStatic(app);
        console.log('Static files serving enabled');
      } catch (err) {
        console.error('Failed to setup static file serving:', err);
        console.error('Application will only serve API routes');
      }
    }

    // ALWAYS serve the app on the port specified in the environment variable PORT
    // Other ports are firewalled. Default to 5000 if not specified.
    // this serves both the API and the client.
    // It is the only port that is not firewalled.
    // Default to 3000 in development for easy local testing
    const defaultPort = isDev ? '3000' : '5000';
    const portEnv = process.env.PORT || defaultPort;
    const port = parseInt(portEnv, 10);

    console.log(`Attempting to listen on port ${port}...`);

    server.listen({
      port,
      host: "0.0.0.0",
      reusePort: true,
    }, () => {
      console.log(`SERVER STARTED SUCCESSFULLY on port ${port}`);
      log(`serving on port ${port}`);

      // Start metrics logging every 15 minutes
      if (process.env.NODE_ENV === 'production') {
        startMetricsLogging(15);
      }
    });

    // Handle server errors
    server.on('error', (error: any) => {
      console.error('SERVER ERROR:', error);
      if (error.code === 'EADDRINUSE') {
        console.error(`Port ${port} is already in use`);
      }
      process.exit(1);
    });

  } catch (error) {
    console.error('FATAL ERROR during server initialization:');
    console.error('Error:', error);
    console.error('Stack:', error instanceof Error ? error.stack : 'No stack trace');
    process.exit(1);
  }
})();
