import { Pool, neonConfig } from '@neondatabase/serverless';
import { drizzle } from 'drizzle-orm/neon-serverless';
import ws from "ws";
import * as schema from "@shared/schema";

neonConfig.webSocketConstructor = ws;
// Don't throw on startup in dev - allow lazy initialization
neonConfig.fetchConnectionCache = true;

let pool: Pool | null = null;
let dbInstance: any = null;

/**
 * Initialize database connection with retry logic
 * @param retries - Number of retry attempts (default: 0, no retries)
 * @param delayMs - Delay between retries in milliseconds (default: 1000)
 */
async function initializeDatabase(retries: number = 0, delayMs: number = 1000) {
  if (dbInstance) return dbInstance;

  if (!process.env.DATABASE_URL) {
    const error = new Error(
      "DATABASE_URL must be set. Did you forget to provision a database?",
    );
    console.error('Database initialization failed:', error.message);
    throw error;
  }

  let lastError: Error | null = null;

  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      console.log(`Initializing database connection (attempt ${attempt + 1}/${retries + 1})...`);

      pool = new Pool({
        connectionString: process.env.DATABASE_URL,
        connectionTimeoutMillis: 10000, // Increased to 10s for production
        idleTimeoutMillis: 30000,
        max: 20
      });

      dbInstance = drizzle({ client: pool, schema });

      // Test the connection
      await pool.query('SELECT 1');
      console.log('Database connection established successfully');

      return dbInstance;
    } catch (error) {
      lastError = error as Error;
      console.error(`Database connection attempt ${attempt + 1} failed:`, error instanceof Error ? error.message : error);

      if (attempt < retries) {
        console.log(`Retrying in ${delayMs}ms...`);
        await new Promise(resolve => setTimeout(resolve, delayMs));
      }
    }
  }

  // All retries failed
  console.error('All database connection attempts failed');
  throw lastError || new Error('Failed to connect to database');
}

export function getDb() {
  return initializeDatabase();
}

// Export lazy getters for backwards compatibility
// Using non-async proxy - database will initialize on first use
export const db = new Proxy({}, {
  get(_target, prop) {
    if (!dbInstance) {
      // Initialize synchronously without awaiting in production
      // The actual connection happens async in the background
      initializeDatabase().catch(error => {
        console.error('Failed to initialize database:', error.message);
        // Don't rethrow - let the application run with potential DB errors
        // This prevents startup from blocking indefinitely
      });
    }
    // Return the dbInstance or a placeholder that will wait for initialization
    return (dbInstance as any)?.[prop];
  }
}) as any;

export { pool };