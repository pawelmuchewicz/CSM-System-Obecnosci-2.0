import bcrypt from 'bcrypt';
import session from 'express-session';
import connectPg from 'connect-pg-simple';
import type { Express, Request, Response, NextFunction } from 'express';
import { db } from './db';
import { instructorsAuth, instructorGroupAssignments, type UserPermissions, type UserRole } from '@shared/schema';
import { eq } from 'drizzle-orm';

/**
 * Configure express-session with PostgreSQL store
 *
 * Sets up session middleware with persistent PostgreSQL storage.
 * Sessions expire after 7 days of inactivity.
 *
 * @param app - Express application instance
 */
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

/**
 * Hash a plaintext password using bcrypt
 *
 * @param password - Plaintext password to hash
 * @returns Hashed password string (bcrypt format)
 */
export async function hashPassword(password: string): Promise<string> {
  const saltRounds = 10;
  return bcrypt.hash(password, saltRounds);
}

/**
 * Verify a plaintext password against a bcrypt hash
 *
 * @param password - Plaintext password to verify
 * @param hashedPassword - Bcrypt hash to compare against
 * @returns True if password matches, false otherwise
 */
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
    role: "owner" | "reception" | "instructor";
    status: "pending" | "active" | "inactive";
    groupIds: string[];
    isAdmin: boolean; // Computed from role for backward compatibility
    permissions: UserPermissions;
  };
}

/**
 * Get user permissions based on their role
 *
 * Maps user roles to their corresponding permission sets:
 * - owner: Full access to all features
 * - reception: Full access except some admin functions
 * - instructor: Limited access (only attendance and profile)
 *
 * @param role - User role ('owner' | 'reception' | 'instructor')
 * @returns UserPermissions object with boolean flags for each permission
 */
function getUserPermissions(role: UserRole): UserPermissions {
  switch (role) {
    case 'owner':
      return {
        canManageUsers: true,
        canAssignGroups: true,
        canManageStudents: true,
        canViewAllGroups: true,
        canChangeContactInfo: true,
        canExpelStudents: true,
        canViewReports: true,
      };
    case 'reception':
      return {
        canManageUsers: true,
        canAssignGroups: true,
        canManageStudents: true,
        canViewAllGroups: true,
        canChangeContactInfo: true,
        canExpelStudents: true,
        canViewReports: true,
      };
    case 'instructor':
    default:
      return {
        canManageUsers: false,
        canAssignGroups: false,
        canManageStudents: false,
        canViewAllGroups: false,
        canChangeContactInfo: false,
        canExpelStudents: false,
        canViewReports: false, // Instructors CANNOT view reports - only profile and attendance
      };
  }
}

/**
 * Authentication middleware - requires valid session
 *
 * Validates user session and loads user data from database.
 * Attaches user object to req.user for downstream handlers.
 * Returns 401 if not authenticated or user not found.
 *
 * @param req - Express request object (AuthenticatedRequest)
 * @param res - Express response object
 * @param next - Express next function
 */
export async function requireAuth(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  if (!req.session?.userId) {
    return res.status(401).json({ 
      message: 'Unauthorized',
      code: 'NOT_AUTHENTICATED' 
    });
  }

  try {
    // Get user with their information including new role and status
    const [user] = await db
      .select({
        id: instructorsAuth.id,
        username: instructorsAuth.username,
        firstName: instructorsAuth.firstName,
        lastName: instructorsAuth.lastName,
        email: instructorsAuth.email,
        role: instructorsAuth.role,
        status: instructorsAuth.status,
        active: instructorsAuth.active,
        groupIds: instructorsAuth.groupIds,
      })
      .from(instructorsAuth)
      .where(eq(instructorsAuth.id, req.session.userId));

    if (!user || !user.active || user.status === 'inactive') {
      req.session.destroy((err) => {
        if (err) console.error('Session destroy error:', err);
      });
      return res.status(401).json({ 
        message: user?.status === 'pending' ? 'Account pending approval' : 'Account deactivated',
        code: user?.status === 'pending' ? 'ACCOUNT_PENDING' : 'ACCOUNT_DEACTIVATED' 
      });
    }

    // Check if account is pending approval
    if (user.status === 'pending') {
      return res.status(403).json({ 
        message: 'Konto oczekuje na zatwierdzenie przez administratora',
        code: 'ACCOUNT_PENDING' 
      });
    }

    // Get user's group assignments from the groupIds column
    const groupIds = user.groupIds || [];
    const userRole = (user.role || 'instructor') as UserRole;
    const permissions = getUserPermissions(userRole);
    
    // For backward compatibility, keep the permissions as set by role

    // Update last login time
    await db
      .update(instructorsAuth)
      .set({ lastLoginAt: new Date() })
      .where(eq(instructorsAuth.id, user.id));

    req.user = {
      id: user.id,
      username: user.username,
      firstName: user.firstName,
      lastName: user.lastName,
      email: user.email || undefined,
      role: userRole,
      status: (user.status || 'active') as "pending" | "active" | "inactive",
      groupIds,
      isAdmin: userRole === 'owner' || userRole === 'reception', // Backward compatibility
      permissions,
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
/**
 * Optional authentication middleware
 *
 * Similar to requireAuth but doesn't fail if user is not authenticated.
 * Loads user data if session exists, otherwise continues without user.
 * Useful for endpoints that work for both authenticated and anonymous users.
 *
 * @param req - Express request object (AuthenticatedRequest)
 * @param res - Express response object
 * @param next - Express next function
 */
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
/**
 * Authorization middleware - requires group access
 *
 * Validates that authenticated user has access to the requested group.
 * Must be used after requireAuth middleware.
 * Checks groupId from req.params or req.body against user's groupIds.
 * Owner and reception roles have access to all groups.
 *
 * @param req - Express request object (AuthenticatedRequest with user)
 * @param res - Express response object
 * @param next - Express next function
 */
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