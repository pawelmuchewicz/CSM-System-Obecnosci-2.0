import { Pool, neonConfig } from '@neondatabase/serverless';
import { drizzle } from 'drizzle-orm/neon-serverless';
import ws from "ws";
import * as schema from "@shared/schema";

neonConfig.webSocketConstructor = ws;
// Don't throw on startup in dev - allow lazy initialization
neonConfig.fetchConnectionCache = true;

let pool: Pool | null = null;
let dbInstance: any = null;

function initializeDatabase() {
  if (dbInstance) return dbInstance;

  if (!process.env.DATABASE_URL) {
    throw new Error(
      "DATABASE_URL must be set. Did you forget to provision a database?",
    );
  }

  pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    connectionTimeoutMillis: 5000,
    idleTimeoutMillis: 30000,
    max: 20
  });
  dbInstance = drizzle({ client: pool, schema });
  return dbInstance;
}

export function getDb() {
  return initializeDatabase();
}

// Export lazy getters for backwards compatibility
export const db = new Proxy({}, {
  get(_target, prop) {
    const database = initializeDatabase();
    return (database as any)[prop];
  }
}) as any;

export { pool };