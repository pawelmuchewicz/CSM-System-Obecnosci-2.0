import { queryClient } from "./queryClient";
import type { Group, Student, AttendanceResponse, AttendanceRequest, AttendanceUpdateResponse } from "@shared/schema";

const API_BASE = "/api";

export async function fetchGroups(): Promise<{ groups: Group[] }> {
  const response = await fetch(`${API_BASE}/groups`);
  if (!response.ok) {
    throw new Error(`Failed to fetch groups: ${response.statusText}`);
  }
  return response.json();
}

export async function fetchStudents(groupId?: string): Promise<{ students: Student[] }> {
  const url = groupId ? `${API_BASE}/students?groupId=${groupId}` : `${API_BASE}/students`;
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`Failed to fetch students: ${response.statusText}`);
  }
  return response.json();
}

export async function fetchAttendance(groupId: string, date: string): Promise<AttendanceResponse> {
  const response = await fetch(`${API_BASE}/attendance?groupId=${groupId}&date=${date}`);
  if (!response.ok) {
    throw new Error(`Failed to fetch attendance: ${response.statusText}`);
  }
  return response.json();
}

export async function saveAttendance(data: AttendanceRequest): Promise<AttendanceUpdateResponse> {
  const response = await fetch(`${API_BASE}/attendance`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(data),
  });
  if (!response.ok) {
    throw new Error(`Failed to save attendance: ${response.statusText}`);
  }
  return response.json();
}

export function invalidateAttendanceQueries(groupId?: string, date?: string) {
  queryClient.invalidateQueries({ queryKey: ['/api/attendance'] });
  if (groupId) {
    queryClient.invalidateQueries({ queryKey: ['/api/students', groupId] });
  }
}
