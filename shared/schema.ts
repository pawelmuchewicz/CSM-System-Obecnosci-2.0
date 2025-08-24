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
};

export type AttendanceItem = {
  student_id: string;
  status: 'obecny' | 'nieobecny';
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

export const attendanceRequestSchema = z.object({
  groupId: z.string().min(1),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  items: z.array(z.object({
    student_id: z.string(),
    status: z.enum(['obecny', 'nieobecny']),
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
  status?: 'obecny' | 'nieobecny' | 'all';
}

export interface AttendanceReportItem {
  student_id: string;
  student_name: string;
  group_id: string;
  group_name: string;
  date: string;
  status: 'obecny' | 'nieobecny';
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
  active: boolean("active").default(true),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Instructor-Group assignments (what groups each instructor can access)
export const instructorGroupAssignments = pgTable("instructor_group_assignments", {
  id: serial("id").primaryKey(),
  instructorId: integer("instructor_id").notNull().references(() => instructorsAuth.id, { onDelete: "cascade" }),
  groupId: varchar("group_id", { length: 50 }).notNull(), // Maps to Google Sheets groups like "TTI", "HipHop"
  role: varchar("role", { length: 20 }).default("instructor"), // "admin", "instructor"
  createdAt: timestamp("created_at").defaultNow(),
});

// Relations
export const instructorsAuthRelations = relations(instructorsAuth, ({ many }) => ({
  groupAssignments: many(instructorGroupAssignments),
}));

export const instructorGroupAssignmentsRelations = relations(instructorGroupAssignments, ({ one }) => ({
  instructor: one(instructorsAuth, {
    fields: [instructorGroupAssignments.instructorId],
    references: [instructorsAuth.id],
  }),
}));

// Types for database tables
export type InstructorAuth = typeof instructorsAuth.$inferSelect;
export type InsertInstructorAuth = typeof instructorsAuth.$inferInsert;
export type InstructorGroupAssignment = typeof instructorGroupAssignments.$inferSelect;
export type InsertInstructorGroupAssignment = typeof instructorGroupAssignments.$inferInsert;

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
}).omit({ id: true, createdAt: true, updatedAt: true });

export type LoginRequest = z.infer<typeof loginSchema>;
export type CreateInstructorRequest = z.infer<typeof createInstructorSchema>;
