// Load .env for development
import { config as dotenvConfig } from 'dotenv';
import { fileURLToPath } from 'url';
import path from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.resolve(__dirname, '..');

const dotenvResult = dotenvConfig({ path: path.join(projectRoot, '.env') });
if (dotenvResult.parsed) {
  // Override process.env with .env values to ensure development config is loaded
  Object.assign(process.env, dotenvResult.parsed);
}

import express, { type Request, Response, NextFunction } from "express";
import { registerRoutes } from "./routes";

// Development mode - use stubs, production mode will load real modules dynamically
const isDev = process.env.NODE_ENV === 'development';

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

(async () => {
  const server = await registerRoutes(app);


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
    } catch (err) {
      console.warn('Could not setup vite, routes will be available at /api/*:', err);
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
  server.listen({
    port,
    host: "0.0.0.0",
    reusePort: true,
  }, () => {
    log(`serving on port ${port}`);

    // Start metrics logging every 15 minutes
    if (process.env.NODE_ENV === 'production') {
      startMetricsLogging(15);
    }
  });
})();
