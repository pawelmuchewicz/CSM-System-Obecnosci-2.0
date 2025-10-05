import { z } from "zod";
import { sql, relations } from 'drizzle-orm';
import {
  index,
  jsonb,
  pgTable,
  timestamp,
  varchar,
  boolean,
  serial,
  integer,
  text,
} from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";

export type Group = {
  id: string;
  name: string;
  spreadsheetId: string;
};

export type Student = {
  id: string;
  first_name: string;
  last_name: string;
  group_id: string;
  active: boolean;
  class?: string;
  phone?: string;
  mail?: string;
  status?: 'active' | 'pending' | 'inactive';
  start_date?: string;  // YYYY-MM-DD format
  end_date?: string;    // YYYY-MM-DD format
  added_by?: string;    // User ID who added this student
  created_at?: string;  // ISO timestamp
};

export type AttendanceItem = {
  student_id: string;
  status: 'obecny' | 'nieobecny' | 'wypisani';
  updated_at?: string;
  notes?: string;
};

export type AttendanceResponse = {
  session_id: string;
  items: AttendanceItem[];
};

export type AttendanceRequest = {
  groupId: string;
  date: string;
  items: AttendanceItem[];
};

export type AttendanceUpdateResponse = {
  session_id: string;
  updated: AttendanceItem[];
  conflicts: AttendanceItem[];
};

export type Instructor = {
  id: string;
  first_name: string;
  last_name: string;
  email?: string;
  phone?: string;
  specialization?: string;
  active: boolean;
};

export type InstructorGroup = {
  instructor_id: string;
  group_id: string;
  role?: string; // "główny" | "zastępca" | "asystent"
  start_date?: string;
  end_date?: string;
};

// Groups configuration table for Google Sheets integration
export const groupsConfig = pgTable("groups_config", {
  id: serial("id").primaryKey(),
  groupId: varchar("group_id", { length: 50 }).notNull().unique(),
  name: varchar("name", { length: 100 }).notNull(),
  spreadsheetId: varchar("spreadsheet_id", { length: 100 }).notNull(),
  sheetGroupId: varchar("sheet_group_id", { length: 50 }),
  active: boolean("active").default(true).notNull(),
  createdAt: timestamp("created_at").default(sql`CURRENT_TIMESTAMP`).notNull(),
  updatedAt: timestamp("updated_at").default(sql`CURRENT_TIMESTAMP`).notNull(),
  createdBy: integer("created_by").references(() => instructorsAuth.id),
  updatedBy: integer("updated_by").references(() => instructorsAuth.id),
});

export const attendanceRequestSchema = z.object({
  groupId: z.string().min(1),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  items: z.array(z.object({
    student_id: z.string(),
    status: z.enum(['obecny', 'nieobecny', 'wypisani']),
    updated_at: z.string().optional(),
    notes: z.string().optional()
  }))
});

// Report types
export interface AttendanceReportFilters {
  groupIds?: string[];
  studentIds?: string[];
  dateFrom?: string;
  dateTo?: string;
  status?: 'obecny' | 'nieobecny' | 'wypisani' | 'all';
}

export interface AttendanceReportItem {
  student_id: string;
  student_name: string;
  group_id: string;
  group_name: string;
  date: string;
  status: 'obecny' | 'nieobecny' | 'wypisani';
  notes?: string;
}

export interface AttendanceStats {
  totalSessions: number;
  presentSessions: number;
  absentSessions: number;
  attendancePercentage: number;
}

export interface StudentStats extends AttendanceStats {
  student_id: string;
  student_name: string;
  group_id: string;
}

export interface GroupStats extends AttendanceStats {
  group_id: string;
  group_name: string;
  studentCount: number;
}

export interface AttendanceReportResponse {
  items: AttendanceReportItem[];
  studentStats: StudentStats[];
  groupStats: GroupStats[];
  totalStats: AttendanceStats;
}

// === DATABASE TABLES FOR AUTHENTICATION ===

// Session storage table (required for auth)
export const sessions = pgTable(
  "sessions",
  {
    sid: varchar("sid").primaryKey(),
    sess: jsonb("sess").notNull(),
    expire: timestamp("expire").notNull(),
  },
  (table) => [index("IDX_session_expire").on(table.expire)],
);

// Instructors authentication table
export const instructorsAuth = pgTable("instructors_auth", {
  id: serial("id").primaryKey(),
  username: varchar("username", { length: 50 }).unique().notNull(),
  password: varchar("password", { length: 255 }).notNull(), // Hashed password
  firstName: varchar("first_name", { length: 100 }).notNull(),
  lastName: varchar("last_name", { length: 100 }).notNull(),
  email: varchar("email", { length: 255 }).unique(),
  phone: varchar("phone", { length: 20 }),
  role: varchar("role", { length: 20 }).default("instructor"), // "owner", "reception", "instructor"
  status: varchar("status", { length: 20 }).default("pending"), // "pending", "active", "inactive"
  active: boolean("active").default(true), // Kept for backward compatibility
  groupIds: text("group_ids").array().default([]).notNull(), // Array of group IDs this user can access
  approvedBy: integer("approved_by"),
  approvedAt: timestamp("approved_at"),
  lastLoginAt: timestamp("last_login_at"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Instructor-Group assignments (what groups each instructor can access)
export const instructorGroupAssignments = pgTable("instructor_group_assignments", {
  id: serial("id").primaryKey(),
  instructorId: integer("instructor_id").notNull().references(() => instructorsAuth.id, { onDelete: "cascade" }),
  groupId: varchar("group_id", { length: 50 }).notNull(), // Maps to Google Sheets groups like "TTI", "HipHop"
  role: varchar("role", { length: 20 }).default("instructor"), // Kept for backward compatibility, now use instructorsAuth.role
  canManageStudents: boolean("can_manage_students").default(false), // Can add/remove/edit students
  canViewReports: boolean("can_view_reports").default(true), // Can view attendance reports
  assignedBy: integer("assigned_by"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Relations
export const instructorsAuthRelations = relations(instructorsAuth, ({ many, one }) => ({
  groupAssignments: many(instructorGroupAssignments),
  approvedUsers: many(instructorsAuth, { relationName: "approver" }),
  approver: one(instructorsAuth, { 
    fields: [instructorsAuth.approvedBy], 
    references: [instructorsAuth.id],
    relationName: "approver"
  }),
}));

export const instructorGroupAssignmentsRelations = relations(instructorGroupAssignments, ({ one }) => ({
  instructor: one(instructorsAuth, {
    fields: [instructorGroupAssignments.instructorId],
    references: [instructorsAuth.id],
  }),
  assignedByUser: one(instructorsAuth, {
    fields: [instructorGroupAssignments.assignedBy],
    references: [instructorsAuth.id],
  }),
}));

export const groupsConfigRelations = relations(groupsConfig, ({ one }) => ({
  createdBy: one(instructorsAuth, {
    fields: [groupsConfig.createdBy],
    references: [instructorsAuth.id],
  }),
  updatedBy: one(instructorsAuth, {
    fields: [groupsConfig.updatedBy],
    references: [instructorsAuth.id],
  }),
}));

// Types for database tables
export type InstructorAuth = typeof instructorsAuth.$inferSelect;
export type InsertInstructorAuth = typeof instructorsAuth.$inferInsert;
export type InstructorGroupAssignment = typeof instructorGroupAssignments.$inferSelect;
export type InsertInstructorGroupAssignment = typeof instructorGroupAssignments.$inferInsert;
export type GroupConfig = typeof groupsConfig.$inferSelect;
export type InsertGroupConfig = typeof groupsConfig.$inferInsert;

// Validation schemas
export const loginSchema = z.object({
  username: z.string().min(3, "Nazwa użytkownika musi mieć co najmniej 3 znaki"),
  password: z.string().min(6, "Hasło musi mieć co najmniej 6 znaków"),
});

export const createInstructorSchema = createInsertSchema(instructorsAuth, {
  username: z.string().min(3, "Nazwa użytkownika musi mieć co najmniej 3 znaki"),
  password: z.string().min(6, "Hasło musi mieć co najmniej 6 znaków"),
  firstName: z.string().min(2, "Imię musi mieć co najmniej 2 znaki"),
  lastName: z.string().min(2, "Nazwisko musi mieć co najmniej 2 znaki"),
  email: z.string().email("Nieprawidłowy adres email").optional(),
  role: z.enum(["owner", "reception", "instructor"]).default("instructor"),
}).omit({ id: true, status: true, active: true, approvedBy: true, approvedAt: true, lastLoginAt: true, createdAt: true, updatedAt: true });

export const registerInstructorSchema = z.object({
  username: z.string().min(3, "Nazwa użytkownika musi mieć co najmniej 3 znaki"),
  password: z.string().min(6, "Hasło musi mieć co najmniej 6 znaków"),
  firstName: z.string().min(2, "Imię musi mieć co najmniej 2 znaki"),
  lastName: z.string().min(2, "Nazwisko musi mieć co najmniej 2 znaki"),
  email: z.string().email("Nieprawidłowy adres email").min(1, "Email jest wymagany"),
  phone: z.string().optional().or(z.literal('')),
});

export const updateUserStatusSchema = z.object({
  userId: z.number(),
  status: z.enum(["pending", "active", "inactive"]),
  role: z.enum(["owner", "reception", "instructor"]).optional(),
});

export const approveUserSchema = z.object({
  userId: z.number(),
  role: z.enum(["owner", "reception", "instructor"]).optional(),
});

export const assignGroupSchema = z.object({
  instructorId: z.number(),
  groupId: z.string().min(1),
  canManageStudents: z.boolean().default(false),
  canViewReports: z.boolean().default(true),
});

// Student management schemas
export const addStudentSchema = z.object({
  firstName: z.string().min(2, "Imię musi mieć co najmniej 2 znaki"),
  lastName: z.string().min(2, "Nazwisko musi mieć co najmniej 2 znaki"),
  groupId: z.string().min(1, "Grupa jest wymagana"),
  startDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Nieprawidłowy format daty (YYYY-MM-DD)"),
  class: z.string().optional(),
  phone: z.string().optional(),
  mail: z.string().email("Nieprawidłowy adres email").optional().or(z.literal('')),
});

export const approveStudentSchema = z.object({
  studentId: z.string().min(1),
  groupId: z.string().min(1),
  endDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional().or(z.literal('')),
});

export const expelStudentSchema = z.object({
  studentId: z.string().min(1),
  groupId: z.string().min(1),
  endDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Nieprawidłowy format daty (YYYY-MM-DD)"),
});

// Group configuration schemas
export const createGroupConfigSchema = createInsertSchema(groupsConfig, {
  groupId: z.string().min(1, "ID grupy jest wymagane"),
  name: z.string().min(1, "Nazwa grupy jest wymagana"), 
  spreadsheetId: z.string().min(1, "ID arkusza Google Sheets jest wymagane"),
  sheetGroupId: z.string().optional(),
}).omit({ id: true, createdAt: true, updatedAt: true, createdBy: true, updatedBy: true });

export const updateGroupConfigSchema = createGroupConfigSchema.partial();

// Permission helper types
export type UserRole = "owner" | "reception" | "instructor";
export type UserStatus = "pending" | "active" | "inactive";

export interface UserPermissions {
  canManageUsers: boolean;        // Create, approve, deactivate users
  canAssignGroups: boolean;       // Assign instructors to groups  
  canManageStudents: boolean;     // Add, remove, edit students
  canViewAllGroups: boolean;      // See all groups or only assigned ones
  canChangeContactInfo: boolean;  // Edit phone/email of students
  canExpelStudents: boolean;      // Change status to "wypisani"
  canViewReports: boolean;        // Access reports
}

export type LoginRequest = z.infer<typeof loginSchema>;
export type CreateInstructorRequest = z.infer<typeof createInstructorSchema>;
export type RegisterInstructorRequest = z.infer<typeof registerInstructorSchema>;
export type UpdateUserStatusRequest = z.infer<typeof updateUserStatusSchema>;
export type AssignGroupRequest = z.infer<typeof assignGroupSchema>;
export type CreateGroupConfigRequest = z.infer<typeof createGroupConfigSchema>;
export type UpdateGroupConfigRequest = z.infer<typeof updateGroupConfigSchema>;
