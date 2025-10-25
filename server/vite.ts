import express, { type Express } from "express";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { createServer as createViteServer, createLogger } from "vite";
import { type Server } from "http";
import viteConfig from "../vite.config";
import { nanoid } from "nanoid";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const viteLogger = createLogger();

export function log(message: string, source = "express") {
  const formattedTime = new Date().toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
    second: "2-digit",
    hour12: true,
  });

  console.log(`${formattedTime} [${source}] ${message}`);
}

export async function setupVite(app: Express, server: Server) {
  const serverOptions = {
    middlewareMode: true,
    hmr: { server },
    allowedHosts: true as const,
  };

  const vite = await createViteServer({
    ...viteConfig,
    configFile: false,
    customLogger: {
      ...viteLogger,
      error: (msg, options) => {
        viteLogger.error(msg, options);
        process.exit(1);
      },
    },
    server: serverOptions,
    appType: "custom",
  });

  app.use(vite.middlewares);
  app.use("*", async (req, res, next) => {
    const url = req.originalUrl;

    try {
      const clientTemplate = path.resolve(
        __dirname,
        "..",
        "client",
        "index.html",
      );

      // always reload the index.html file from disk incase it changes
      let template = await fs.promises.readFile(clientTemplate, "utf-8");
      template = template.replace(
        `src="/src/main.tsx"`,
        `src="/src/main.tsx?v=${nanoid()}"`,
      );
      const page = await vite.transformIndexHtml(url, template);
      res.status(200).set({ "Content-Type": "text/html" }).end(page);
    } catch (e) {
      vite.ssrFixStacktrace(e as Error);
      next(e);
    }
  });
}

export function serveStatic(app: Express) {
  const distPath = path.resolve(__dirname, "public");

  console.log('serveStatic() called');
  console.log('__dirname:', __dirname);
  console.log('distPath:', distPath);
  console.log('distPath exists?', fs.existsSync(distPath));

  if (!fs.existsSync(distPath)) {
    // Try alternative paths
    const altPath1 = path.resolve(__dirname, "..", "dist", "public");
    const altPath2 = path.resolve(process.cwd(), "dist", "public");

    console.log('Trying alternative path 1:', altPath1, 'exists?', fs.existsSync(altPath1));
    console.log('Trying alternative path 2:', altPath2, 'exists?', fs.existsSync(altPath2));

    if (fs.existsSync(altPath1)) {
      console.log('Using alternative path 1:', altPath1);
      app.use(express.static(altPath1));
      app.use("*", (_req, res) => {
        res.sendFile(path.resolve(altPath1, "index.html"));
      });
      return;
    } else if (fs.existsSync(altPath2)) {
      console.log('Using alternative path 2:', altPath2);
      app.use(express.static(altPath2));
      app.use("*", (_req, res) => {
        res.sendFile(path.resolve(altPath2, "index.html"));
      });
      return;
    }

    // If no paths work, log warning but don't throw
    console.warn(`WARNING: Could not find the build directory: ${distPath}`);
    console.warn('Static files will not be served. API routes will still work.');
    console.warn('Make sure to run "npm run build" before starting the production server.');
    return; // Don't throw, just return - API will still work
  }

  console.log('Serving static files from:', distPath);
  app.use(express.static(distPath));

  // fall through to index.html if the file doesn't exist
  // IMPORTANT: Only catch non-API routes to avoid blocking API requests
  app.use("*", (req, res, next) => {
    // Skip if this is an API route - let it fall through to 404
    if (req.originalUrl.startsWith('/api') || req.originalUrl.startsWith('/health')) {
      return next();
    }

    const indexPath = path.resolve(distPath, "index.html");
    if (fs.existsSync(indexPath)) {
      res.sendFile(indexPath);
    } else {
      console.error('index.html not found at:', indexPath);
      res.status(404).send('Application not built. Please run "npm run build".');
    }
  });
}
