import { google } from 'googleapis';
import type { Group, Student, AttendanceItem } from '@shared/schema';

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

// Configuration for groups and their spreadsheets
// For now, we'll use the default spreadsheet with TTI group
// Later this can be expanded to support multiple spreadsheets
const GROUPS_CONFIG: Record<string, { name: string; spreadsheetId: string }> = {
  'TTI': {
    name: 'TTI',
    spreadsheetId: process.env.GOOGLE_SHEETS_SPREADSHEET_ID!
  }
};

// Helper to get spreadsheet ID for a group
function getSpreadsheetId(groupId: string): string {
  const config = GROUPS_CONFIG[groupId];
  if (!config) {
    throw new Error(`Unknown group: ${groupId}`);
  }
  return config.spreadsheetId;
}

// Helper function to get authenticated sheets client
export async function getSheets() {
  try {
    const serviceEmail = process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL;
    const privateKeyRaw = process.env.GOOGLE_PRIVATE_KEY;
    
    if (!serviceEmail || !privateKeyRaw) {
      throw new Error('Missing Google service account credentials');
    }
    
    // More robust private key processing
    let privateKey = privateKeyRaw
      .replace(/\\n/g, '\n')  // Replace escaped newlines
      .replace(/\r\n/g, '\n') // Replace Windows line endings
      .replace(/\r/g, '\n');  // Replace old Mac line endings
    
    // Ensure proper PEM format
    if (!privateKey.includes('-----BEGIN PRIVATE KEY-----')) {
      throw new Error('Invalid private key format - missing BEGIN marker');
    }
    if (!privateKey.includes('-----END PRIVATE KEY-----')) {
      throw new Error('Invalid private key format - missing END marker');
    }
    
    console.log('Authenticating with service account:', serviceEmail);
    console.log('Private key length:', privateKey.length);
    console.log('Private key format check: BEGIN present:', privateKey.includes('-----BEGIN PRIVATE KEY-----'));
    console.log('Private key format check: END present:', privateKey.includes('-----END PRIVATE KEY-----'));
    
    const auth = new google.auth.JWT({
      email: serviceEmail,
      key: privateKey,
      scopes: ['https://www.googleapis.com/auth/spreadsheets']
    });

    // Test authentication
    await auth.authorize();
    console.log('Authentication successful');

    return google.sheets({ version: 'v4', auth });
  } catch (error) {
    console.error('Authentication failed:', error);
    if (error instanceof Error && error.message.includes('DECODER')) {
      throw new Error('Private key format is corrupted. Please ensure the key is properly copied with all line breaks intact.');
    }
    throw new Error('Failed to authenticate with Google Sheets API. Please check your service account credentials.');
  }
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
    // Return groups from configuration
    return Object.entries(GROUPS_CONFIG).map(([id, config]) => ({
      id,
      name: config.name,
      spreadsheetId: config.spreadsheetId
    }));
  } catch (error) {
    console.error('Error fetching groups:', error);
    return [{
      id: 'TTI',
      name: 'TTI',
      spreadsheetId: process.env.GOOGLE_SHEETS_SPREADSHEET_ID!
    }];
  }
}

export async function getStudents(groupId?: string): Promise<Student[]> {
  try {
    if (!groupId) {
      return [];
    }
    
    const sheets = await getSheets();
    const spreadsheetId = getSpreadsheetId(groupId);
    console.log(`Fetching students for group ${groupId} from spreadsheet ${spreadsheetId}`);
    
    const response = await sheets.spreadsheets.values.get({
      spreadsheetId,
      range: 'Students!A1:G2000'
    });

    const rows = response.data.values || [];
    console.log(`Found ${rows.length} rows in Students sheet`);
    
    if (rows.length >= 1) {
      console.log('Headers:', rows[0]);
    }
    if (rows.length >= 2) {
      console.log('First data row:', rows[1]);
      console.log('Sample of all rows:', rows.slice(0, 5));
    }
    
    if (rows.length < 2) {
      console.log('No data rows found in Students sheet');
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
    const spreadsheetId = getSpreadsheetId(groupId);

    // Check if session exists
    const response = await sheets.spreadsheets.values.get({
      spreadsheetId,
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
      spreadsheetId,
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
    const spreadsheetId = getSpreadsheetId(groupId);

    const sheets = await getSheets();
    const response = await sheets.spreadsheets.values.get({
      spreadsheetId,
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
    const spreadsheetId = getSpreadsheetId(groupId);
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
        spreadsheetId,
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
