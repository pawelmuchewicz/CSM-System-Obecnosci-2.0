import bcrypt from 'bcrypt';
import session from 'express-session';
import connectPg from 'connect-pg-simple';
import type { Express, Request, Response, NextFunction } from 'express';
import { db } from './db';
import { instructorsAuth, instructorGroupAssignments } from '@shared/schema';
import { eq } from 'drizzle-orm';

// Session configuration
export function setupSession(app: Express) {
  const pgStore = connectPg(session);
  
  const sessionStore = new pgStore({
    conString: process.env.DATABASE_URL,
    createTableIfMissing: false,
    ttl: 7 * 24 * 60 * 60, // 7 days in seconds
    tableName: 'sessions',
  });

  app.use(session({
    secret: process.env.SESSION_SECRET || 'attendance-app-secret-key-change-in-production',
    store: sessionStore,
    resave: false,
    saveUninitialized: false,
    cookie: {
      httpOnly: true,
      secure: false, // Set to true in production with HTTPS
      maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days in milliseconds
    },
  }));
}

// Password hashing utilities
export async function hashPassword(password: string): Promise<string> {
  const saltRounds = 10;
  return bcrypt.hash(password, saltRounds);
}

export async function verifyPassword(password: string, hashedPassword: string): Promise<boolean> {
  return bcrypt.compare(password, hashedPassword);
}

// Authentication middleware
export interface AuthenticatedRequest extends Request {
  user?: {
    id: number;
    username: string;
    firstName: string;
    lastName: string;
    email?: string;
    groupIds: string[];
    isAdmin: boolean;
  };
}

export async function requireAuth(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  if (!req.session?.userId) {
    return res.status(401).json({ 
      message: 'Unauthorized',
      code: 'NOT_AUTHENTICATED' 
    });
  }

  try {
    // Get user with their group assignments
    const [user] = await db
      .select({
        id: instructorsAuth.id,
        username: instructorsAuth.username,
        firstName: instructorsAuth.firstName,
        lastName: instructorsAuth.lastName,
        email: instructorsAuth.email,
        active: instructorsAuth.active,
      })
      .from(instructorsAuth)
      .where(eq(instructorsAuth.id, req.session.userId));

    if (!user || !user.active) {
      req.session.destroy((err) => {
        if (err) console.error('Session destroy error:', err);
      });
      return res.status(401).json({ 
        message: 'Account deactivated',
        code: 'ACCOUNT_DEACTIVATED' 
      });
    }

    // Get user's group assignments
    const groupAssignments = await db
      .select({
        groupId: instructorGroupAssignments.groupId,
        role: instructorGroupAssignments.role,
      })
      .from(instructorGroupAssignments)
      .where(eq(instructorGroupAssignments.instructorId, user.id));

    const groupIds = groupAssignments.map(g => g.groupId);
    const isAdmin = groupAssignments.some(g => g.role === 'admin');

    req.user = {
      id: user.id,
      username: user.username,
      firstName: user.firstName,
      lastName: user.lastName,
      email: user.email || undefined,
      groupIds,
      isAdmin,
    };

    next();
  } catch (error) {
    console.error('Auth middleware error:', error);
    return res.status(500).json({ 
      message: 'Authentication error',
      code: 'AUTH_ERROR' 
    });
  }
}

// Optional auth middleware (adds user to request if logged in, but doesn't require it)
export async function optionalAuth(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  if (req.session?.userId) {
    try {
      // Same logic as requireAuth but don't fail if no user
      await requireAuth(req, res, () => next());
    } catch (error) {
      // Ignore auth errors in optional auth
      next();
    }
  } else {
    next();
  }
}

// Group access middleware
export function requireGroupAccess(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  const groupId = req.params.groupId || req.query.groupId as string;
  
  if (!req.user) {
    return res.status(401).json({ 
      message: 'Unauthorized',
      code: 'NOT_AUTHENTICATED' 
    });
  }

  // Admins can access all groups
  if (req.user.isAdmin) {
    return next();
  }

  // Check if user has access to this specific group
  if (groupId && !req.user.groupIds.includes(groupId)) {
    return res.status(403).json({ 
      message: 'Access denied to this group',
      code: 'GROUP_ACCESS_DENIED',
      allowedGroups: req.user.groupIds 
    });
  }

  next();
}

// Declare session data interface for TypeScript
declare module 'express-session' {
  interface SessionData {
    userId: number;
  }
}