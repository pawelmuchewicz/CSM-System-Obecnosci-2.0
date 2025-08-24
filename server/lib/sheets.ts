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
const GROUPS_CONFIG: Record<string, { name: string; spreadsheetId: string; sheetGroupId?: string }> = {
  'TTI': {
    name: 'TTI',
    spreadsheetId: '1Q-vUdf3pxIMvqvhzk_npNQZ1eXd4r6ElJUPy0n4tFNg',
    sheetGroupId: 'G1'
  },
  'TTII': {
    name: 'TTII',
    spreadsheetId: '1oJWg3SORQeDNbLnSbjzkZ3mFx26r6mhwdt0lwu8v_JY',
    sheetGroupId: 'G1'
  },
  'TTIII': {
    name: 'TTIII',
    spreadsheetId: '1eIeh_pdV90GY25tVbzYe15xjgpK0OsHqEkAzYFpHHTg',
    sheetGroupId: 'G1'
  },
  'HipHop': {
    name: 'HipHop',
    spreadsheetId: '1LOzldQX10sqjG4WRmCDy0mZE6EDloWu4zOTR-j1ChfU',
    sheetGroupId: 'G1'
  },
  'HipHop2': {
    name: 'HipHop2',
    spreadsheetId: '1Q3m_lWrha-7xSXS_Q9yh2j32ca4VstY_35KVV7Yol7o',
    sheetGroupId: 'G1'
  },
  'TikTok': {
    name: 'TikTok',
    spreadsheetId: '1TrZW92kfw88psTOOffuwM2Qy8y7JYu7aYBCL5-3E_R4',
    sheetGroupId: 'G1'
  },
  'Sp10': {
    name: 'Sp10',
    spreadsheetId: '1AmxiH2vOlxcTPqiw0qMppUgQX9oCssUdOpqTDhTPaWU',
    sheetGroupId: 'G1'
  },
  'SpEkolog': {
    name: 'SpEkolog',
    spreadsheetId: '1NFSyuxroK0qWnMx6k8mZJP0DXqQa9f46ZgGVY5N65Eg',
    sheetGroupId: 'G1'
  },
  'Sp8': {
    name: 'Sp8',
    spreadsheetId: '1cPlpeLcuhaMF_iwHfA-Rnm6Tl7E3zxhMkWv3nz7oe88',
    sheetGroupId: 'G1'
  },
  'Sp1': {
    name: 'Sp1',
    spreadsheetId: '1l1p1YQP8CYf9eAGzRTHZW2j3Gpzdco2UBwHGGPCwIoM',
    sheetGroupId: 'G1'
  },
  'Sp4': {
    name: 'Sp4',
    spreadsheetId: '1WBbKXuU8kxI1PS-bymSOUOtfX3l6vFMMcZKkEalB0i4',
    sheetGroupId: 'G1'
  },
  'Sp6': {
    name: 'Sp6',
    spreadsheetId: '1MQ6BIt-1jWXfFbSkq0vf0DAWRs-5xvdVh1-z5ZK1E3s',
    sheetGroupId: 'G1'
  },
  'Sp9': {
    name: 'Sp9',
    spreadsheetId: '1y_9Zkr8Q589YGQ9BpUDaZXFN3h_y7QiXLcCeL1aKJz8',
    sheetGroupId: 'G1'
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
    
    // Authentication successful
    
    const auth = new google.auth.JWT({
      email: serviceEmail,
      key: privateKey,
      scopes: ['https://www.googleapis.com/auth/spreadsheets']
    });

    // Test authentication
    await auth.authorize();

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
    const response = await sheets.spreadsheets.values.get({
      spreadsheetId,
      range: 'Students!A1:H2000' // Include mail column
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
          case 'mail':
          case 'email':
            student.mail = value ? String(value).trim() : undefined;
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
      const config = GROUPS_CONFIG[groupId];
      const sheetGroupId = config?.sheetGroupId || groupId;
      filteredStudents = students.filter(s => s.group_id === sheetGroupId);
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
      range: 'Attendance!A1:I10000' // Include all columns A-I
    });

    const rows = response.data.values || [];
    const attendanceMap = new Map<string, { status: string; updated_at: string; notes?: string }>();

    // Process attendance records for this session
    // Structure: A=session_id, B=student_id, C=status, D=note, E=updated_at, F=student_name, G=class, H=phone, I=group_name
    for (let i = 1; i < rows.length; i++) {
      const row = rows[i];
      if (row[0] === sessionId && row[1]) {
        const studentId = row[1];
        const status = row[2] || 'nieobecny';    // Column C: status (po polsku)
        const notes = row[3] || '';              // Column D: note
        const updatedAt = row[4] || new Date().toISOString(); // Column E: updated_at
        
        // Keep only the latest record for each student
        if (!attendanceMap.has(studentId) || updatedAt > (attendanceMap.get(studentId)?.updated_at || '')) {
          attendanceMap.set(studentId, { status, updated_at: updatedAt, notes });
        }
      }
    }

    // Build response for all students
    const items: AttendanceItem[] = students.map(student => {
      const attendance = attendanceMap.get(student.id);
      return {
        student_id: student.id,
        status: attendance?.status === 'obecny' ? 'obecny' : 'nieobecny', // Status już po polsku
        updated_at: attendance?.updated_at,
        notes: attendance?.notes || ''
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

    // Get students data to include additional info
    const students = await getStudents(groupId);
    const studentsMap = new Map(students.map(s => [s.id, s]));

    // Check for conflicts - only if both frontend and backend have timestamps
    for (const item of items) {
      const current = currentAttendance.items.find(a => a.student_id === item.student_id);
      
      // Only check for conflicts if:
      // 1. Frontend has a timestamp (item.updated_at exists)
      // 2. Backend has a timestamp (current.updated_at exists) 
      // 3. They are different
      // If frontend doesn't have timestamp, it's a new change, so no conflict
      if (item.updated_at && current?.updated_at && 
          item.updated_at !== current.updated_at && 
          item.status !== current.status) {
        // Only conflict if status actually changed
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
    // Use Polish timezone (UTC+1 in winter, UTC+2 in summer)
    const now = new Date();
    const polandTime = new Date(now.getTime() + (now.getTimezoneOffset() * 60000) + (2 * 3600000)); // UTC+2 for Poland summer time
    const formattedTime = polandTime.toISOString();
    
    // Get group name
    const config = GROUPS_CONFIG[groupId];
    const groupName = config?.name || groupId;
    
    const newRows = validUpdates.map(item => {
      const student = studentsMap.get(item.student_id);
      return [
        sessionId,                                    // A: session_id
        item.student_id,                             // B: student_id
        item.status,                                 // C: status (po polsku: obecny/nieobecny)
        item.notes || '',                            // D: note
        formattedTime,                               // E: updated_at
        student?.first_name || '',                   // F: student_name
        student?.class || '',                        // G: class
        student?.phone || '',                        // H: phone
        groupName                                    // I: group_name
      ];
    });

    if (newRows.length > 0) {
      await sheets.spreadsheets.values.append({
        spreadsheetId,
        range: 'Attendance!A:I', // A-I columns as per sheet structure
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
      updated_at: formattedTime,
      notes: item.notes || ''
    }));

    return { session_id: sessionId, updated, conflicts };
  } catch (error) {
    console.error('Error setting attendance:', error);
    throw new Error('Failed to save attendance to Google Sheets');
  }
}
