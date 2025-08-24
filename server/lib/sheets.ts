import { google } from 'googleapis';

// Validate required environment variables
if (!process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL) {
  throw new Error('Missing GOOGLE_SERVICE_ACCOUNT_EMAIL environment variable');
}
if (!process.env.GOOGLE_PRIVATE_KEY) {
  throw new Error('Missing GOOGLE_PRIVATE_KEY environment variable');
}
if (!process.env.GOOGLE_SHEETS_SPREADSHEET_ID) {
  throw new Error('Missing GOOGLE_SHEETS_SPREADSHEET_ID environment variable');
}

const SPREADSHEET_ID = process.env.GOOGLE_SHEETS_SPREADSHEET_ID;

// Helper function to get authenticated sheets client
export async function getSheets() {
  const privateKey = process.env.GOOGLE_PRIVATE_KEY!.replace(/\\n/g, '\n');
  
  const auth = new google.auth.JWT(
    process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL,
    undefined,
    privateKey,
    ['https://www.googleapis.com/auth/spreadsheets']
  );

  return google.sheets({ version: 'v4', auth });
}

// Helper function to normalize text
export function norm(text: string): string {
  return String(text).trim().normalize().toUpperCase();
}

// Helper function to build session ID
function buildSessionId(groupId: string, dateISO: string): string {
  return `SESS-${dateISO}-${norm(groupId)}`;
}

// Helper function to normalize status
function normalizeStatus(s: any): 'obecny' | 'nieobecny' {
  const str = String(s).toLowerCase().trim();
  const presentValues = ['present', 'obecny', '1', 'true', 'tak', 'y', 'yes', 't'];
  return presentValues.includes(str) ? 'obecny' : 'nieobecny';
}

export async function getGroups(): Promise<Group[]> {
  try {
    const sheets = await getSheets();
    const response = await sheets.spreadsheets.values.get({
      spreadsheetId: SPREADSHEET_ID,
      range: 'Students!A1:G2000'
    });

    const rows = response.data.values || [];
    if (rows.length < 2) {
      return [{ id: 'G1', name: 'G1' }];
    }

    // Extract unique group_ids from column D (index 3)
    const groupIds = new Set<string>();
    for (let i = 1; i < rows.length; i++) {
      const row = rows[i];
      if (row[3]) {
        groupIds.add(String(row[3]).trim());
      }
    }

    if (groupIds.size === 0) {
      return [{ id: 'G1', name: 'G1' }];
    }

    return Array.from(groupIds).map(id => ({ id, name: id }));
  } catch (error) {
    console.error('Error fetching groups:', error);
    return [{ id: 'G1', name: 'G1' }];
  }
}

export async function getStudents(groupId?: string): Promise<Student[]> {
  try {
    const sheets = await getSheets();
    const response = await sheets.spreadsheets.values.get({
      spreadsheetId: SPREADSHEET_ID,
      range: 'Students!A1:G2000'
    });

    const rows = response.data.values || [];
    if (rows.length < 2) {
      return [];
    }

    const headers = rows[0].map((h: any) => String(h).toLowerCase().trim());
    const students: Student[] = [];

    for (let i = 1; i < rows.length; i++) {
      const row = rows[i];
      if (row.length === 0) continue;

      const student: any = {};
      headers.forEach((header, index) => {
        const value = row[index];
        switch (header) {
          case 'id':
            student.id = String(value || '').trim();
            break;
          case 'first_name':
          case 'firstname':
            student.first_name = String(value || '').trim();
            break;
          case 'last_name':
          case 'lastname':
            student.last_name = String(value || '').trim();
            break;
          case 'group_id':
          case 'groupid':
          case 'group':
            student.group_id = String(value || '').trim();
            break;
          case 'active':
            const activeStr = String(value || '').toLowerCase().trim();
            student.active = ['true', '1', 'yes', 'tak', 'y', 't'].includes(activeStr);
            break;
          case 'class':
            student.class = value ? String(value).trim() : undefined;
            break;
          case 'phone':
            student.phone = value ? String(value).trim() : undefined;
            break;
        }
      });

      // Validate required fields
      if (student.id && student.first_name && student.last_name && student.group_id && student.active) {
        students.push(student as Student);
      }
    }

    // Filter by group if specified
    let filteredStudents = students;
    if (groupId) {
      filteredStudents = students.filter(s => s.group_id === groupId);
    }

    // Sort by last_name then first_name using Polish locale
    filteredStudents.sort((a, b) => {
      const lastNameCompare = a.last_name.localeCompare(b.last_name, 'pl');
      if (lastNameCompare !== 0) return lastNameCompare;
      return a.first_name.localeCompare(b.first_name, 'pl');
    });

    return filteredStudents;
  } catch (error) {
    console.error('Error fetching students:', error);
    throw new Error('Failed to fetch students from Google Sheets. Please ensure the sheet is shared with the service account as Editor.');
  }
}

export async function findOrCreateSession(groupId: string, dateISO: string): Promise<string> {
  try {
    const sheets = await getSheets();
    const sessionId = buildSessionId(groupId, dateISO);

    // Check if session exists
    const response = await sheets.spreadsheets.values.get({
      spreadsheetId: SPREADSHEET_ID,
      range: 'Sessions!A1:C1000'
    });

    const rows = response.data.values || [];
    
    // Look for existing session
    for (let i = 1; i < rows.length; i++) {
      const row = rows[i];
      if (row[1] === groupId && row[2] === dateISO) {
        return row[0]; // Return existing session ID
      }
    }

    // Create new session
    await sheets.spreadsheets.values.append({
      spreadsheetId: SPREADSHEET_ID,
      range: 'Sessions!A:C',
      valueInputOption: 'RAW',
      requestBody: {
        values: [[sessionId, groupId, dateISO]]
      }
    });

    return sessionId;
  } catch (error) {
    console.error('Error finding/creating session:', error);
    throw new Error('Failed to manage session in Google Sheets');
  }
}

export async function getAttendance(groupId: string, dateISO: string): Promise<{ session_id: string; items: AttendanceItem[] }> {
  try {
    const sessionId = await findOrCreateSession(groupId, dateISO);
    const students = await getStudents(groupId);

    const sheets = await getSheets();
    const response = await sheets.spreadsheets.values.get({
      spreadsheetId: SPREADSHEET_ID,
      range: 'Attendance!A1:D10000'
    });

    const rows = response.data.values || [];
    const attendanceMap = new Map<string, { status: string; updated_at: string }>();

    // Process attendance records for this session
    for (let i = 1; i < rows.length; i++) {
      const row = rows[i];
      if (row[0] === sessionId && row[1]) {
        const studentId = row[1];
        const status = row[2] || 'absent';
        const updatedAt = row[3] || new Date().toISOString();
        
        // Keep only the latest record for each student
        if (!attendanceMap.has(studentId) || updatedAt > (attendanceMap.get(studentId)?.updated_at || '')) {
          attendanceMap.set(studentId, { status, updated_at: updatedAt });
        }
      }
    }

    // Build response for all students
    const items: AttendanceItem[] = students.map(student => {
      const attendance = attendanceMap.get(student.id);
      return {
        student_id: student.id,
        status: attendance ? normalizeStatus(attendance.status) : 'nieobecny',
        updated_at: attendance?.updated_at
      };
    });

    return { session_id: sessionId, items };
  } catch (error) {
    console.error('Error fetching attendance:', error);
    throw new Error('Failed to fetch attendance from Google Sheets');
  }
}

export async function setAttendance(
  groupId: string, 
  dateISO: string, 
  items: AttendanceItem[]
): Promise<{ session_id: string; updated: AttendanceItem[]; conflicts: AttendanceItem[] }> {
  try {
    const sessionId = await findOrCreateSession(groupId, dateISO);
    const sheets = await getSheets();

    // Get current attendance to check for conflicts
    const currentAttendance = await getAttendance(groupId, dateISO);
    const conflicts: AttendanceItem[] = [];
    const validUpdates: AttendanceItem[] = [];

    // Check for conflicts
    for (const item of items) {
      const current = currentAttendance.items.find(a => a.student_id === item.student_id);
      
      if (item.updated_at && current?.updated_at && item.updated_at !== current.updated_at) {
        conflicts.push({
          student_id: item.student_id,
          status: current.status,
          updated_at: current.updated_at
        });
      } else {
        validUpdates.push(item);
      }
    }

    // Append new attendance records for valid updates
    const now = new Date().toISOString();
    const newRows = validUpdates.map(item => [
      sessionId,
      item.student_id,
      item.status === 'obecny' ? 'present' : 'absent',
      now
    ]);

    if (newRows.length > 0) {
      await sheets.spreadsheets.values.append({
        spreadsheetId: SPREADSHEET_ID,
        range: 'Attendance!A:D',
        valueInputOption: 'RAW',
        requestBody: {
          values: newRows
        }
      });
    }

    // Prepare updated items with new timestamps
    const updated = validUpdates.map(item => ({
      student_id: item.student_id,
      status: item.status,
      updated_at: now
    }));

    return { session_id: sessionId, updated, conflicts };
  } catch (error) {
    console.error('Error setting attendance:', error);
    throw new Error('Failed to save attendance to Google Sheets');
  }
}
