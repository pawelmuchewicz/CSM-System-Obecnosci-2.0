import { z } from "zod";

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
