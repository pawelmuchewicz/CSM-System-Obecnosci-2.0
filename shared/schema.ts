import { z } from "zod";

export type Group = {
  id: string;
  name: string;
};

export type Student = {
  id: string;
  first_name: string;
  last_name: string;
  group_id: string;
  active: boolean;
  class?: string;
  phone?: string;
};

export type AttendanceItem = {
  student_id: string;
  status: 'obecny' | 'nieobecny';
  updated_at?: string;
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

export const attendanceRequestSchema = z.object({
  groupId: z.string().min(1),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  items: z.array(z.object({
    student_id: z.string(),
    status: z.enum(['obecny', 'nieobecny']),
    updated_at: z.string().optional()
  }))
});
