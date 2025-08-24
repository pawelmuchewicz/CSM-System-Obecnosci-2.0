import { queryClient } from "./queryClient";
import type { Group, Student, AttendanceResponse, AttendanceRequest, AttendanceUpdateResponse, Instructor, InstructorGroup } from "@shared/schema";

const API_BASE = "/api";

export async function fetchGroups(): Promise<{ groups: Group[] }> {
  const response = await fetch(`${API_BASE}/groups`);
  if (!response.ok) {
    throw new Error(`Failed to fetch groups: ${response.statusText}`);
  }
  return response.json();
}

export async function fetchStudents(groupId?: string, showInactive?: boolean): Promise<{ students: Student[] }> {
  let url = `${API_BASE}/students`;
  const params = new URLSearchParams();
  
  if (groupId) {
    params.append('groupId', groupId);
  }
  if (showInactive !== undefined) {
    params.append('showInactive', showInactive.toString());
  }
  
  if (params.toString()) {
    url += `?${params.toString()}`;
  }
  
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

// Instructor API functions
export async function fetchInstructors(): Promise<{ instructors: Instructor[] }> {
  const response = await fetch(`${API_BASE}/instructors`);
  if (!response.ok) {
    throw new Error(`Failed to fetch instructors: ${response.statusText}`);
  }
  return response.json();
}

export async function fetchInstructorGroups(): Promise<{ instructorGroups: InstructorGroup[] }> {
  const response = await fetch(`${API_BASE}/instructor-groups`);
  if (!response.ok) {
    throw new Error(`Failed to fetch instructor groups: ${response.statusText}`);
  }
  return response.json();
}

export async function fetchInstructorsForGroup(groupId: string): Promise<{ instructors: (Instructor & { role?: string })[] }> {
  const response = await fetch(`${API_BASE}/instructors/group/${groupId}`);
  if (!response.ok) {
    throw new Error(`Failed to fetch instructors for group: ${response.statusText}`);
  }
  return response.json();
}
