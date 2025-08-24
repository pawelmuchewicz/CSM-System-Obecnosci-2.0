import { google } from 'googleapis';
import type { Group, Student, AttendanceItem, Instructor, InstructorGroup, AttendanceReportFilters, AttendanceReportResponse, AttendanceReportItem, StudentStats, GroupStats, AttendanceStats } from '@shared/schema';

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

// Enhanced cache system to reduce Google Sheets API calls
interface CacheItem<T> {
  data: T;
  timestamp: number;
}

const cache = new Map<string, CacheItem<any>>();
const CACHE_DURATION = 10 * 60 * 1000; // 10 minutes
const STUDENTS_CACHE_DURATION = 15 * 60 * 1000; // 15 minutes for students
const ATTENDANCE_CACHE_DURATION = 5 * 60 * 1000; // 5 minutes for attendance

function getCacheKey(operation: string, ...params: any[]): string {
  return `${operation}:${params.join(':')}`;
}

function getFromCache<T>(key: string, maxAge: number = CACHE_DURATION): T | null {
  const item = cache.get(key);
  if (item && (Date.now() - item.timestamp) < maxAge) {
    console.log(`Cache HIT for ${key}`);
    return item.data as T;
  }
  if (item) cache.delete(key);
  return null;
}

function setCache<T>(key: string, data: T): void {
  cache.set(key, { data, timestamp: Date.now() });
  console.log(`Cache SET for ${key}`);
}

function clearCache(pattern?: string): void {
  if (pattern) {
    const keys = Array.from(cache.keys());
    for (const key of keys) {
      if (key.includes(pattern)) {
        cache.delete(key);
      }
    }
  } else {
    cache.clear();
  }
}

// Configuration for groups and their spreadsheets
const GROUPS_CONFIG: Record<string, { name: string; spreadsheetId: string; sheetGroupId?: string }> = {
  'TTI': {
    name: 'TTI',
    spreadsheetId: '1Q-vUdf3pxIMvqvhzk_npNQZ1eXd4r6ElJUPy0n4tFNg',
    sheetGroupId: 'TTI'
  },
  'TTII': {
    name: 'TTII',
    spreadsheetId: '1oJWg3SORQeDNbLnSbjzkZ3mFx26r6mhwdt0lwu8v_JY',
    sheetGroupId: 'TTII'
  },
  'TTIII': {
    name: 'TTIII',
    spreadsheetId: '1eIeh_pdV90GY25tVbzYe15xjgpK0OsHqEkAzYFpHHTg',
    sheetGroupId: 'TTIII'
  },
  'HipHop': {
    name: 'HipHop',
    spreadsheetId: '1LOzldQX10sqjG4WRmCDy0mZE6EDloWu4zOTR-j1ChfU',
    sheetGroupId: 'HipHop'
  },
  'HipHop2': {
    name: 'HipHop2',
    spreadsheetId: '1Q3m_lWrha-7xSXS_Q9yh2j32ca4VstY_35KVV7Yol7o',
    sheetGroupId: 'HipHop2'
  },
  'TikTok': {
    name: 'TikTok',
    spreadsheetId: '1TrZW92kfw88psTOOffuwM2Qy8y7JYu7aYBCL5-3E_R4',
    sheetGroupId: 'TikTok'
  },
  'Sp10': {
    name: 'Sp10',
    spreadsheetId: '1AmxiH2vOlxcTPqiw0qMppUgQX9oCssUdOpqTDhTPaWU',
    sheetGroupId: 'Sp10'
  },
  'SpEkolog': {
    name: 'SpEkolog',
    spreadsheetId: '1NFSyuxroK0qWnMx6k8mZJP0DXqQa9f46ZgGVY5N65Eg',
    sheetGroupId: 'SpEkolog'
  },
  'Sp8': {
    name: 'Sp8',
    spreadsheetId: '1cPlpeLcuhaMF_iwHfA-Rnm6Tl7E3zxhMkWv3nz7oe88',
    sheetGroupId: 'Sp8'
  },
  'Sp1': {
    name: 'Sp1',
    spreadsheetId: '1l1p1YQP8CYf9eAGzRTHZW2j3Gpzdco2UBwHGGPCwIoM',
    sheetGroupId: 'Sp1'
  },
  'Sp4': {
    name: 'Sp4',
    spreadsheetId: '1WBbKXuU8kxI1PS-bymSOUOtfX3l6vFMMcZKkEalB0i4',
    sheetGroupId: 'Sp4'
  },
  'Sp6': {
    name: 'Sp6',
    spreadsheetId: '1MQ6BIt-1jWXfFbSkq0vf0DAWRs-5xvdVh1-z5ZK1E3s',
    sheetGroupId: 'Sp6'
  },
  'Sp9': {
    name: 'Sp9',
    spreadsheetId: '1y_9Zkr8Q589YGQ9BpUDaZXFN3h_y7QiXLcCeL1aKJz8',
    sheetGroupId: 'Sp9'
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
  const cacheKey = getCacheKey('groups');
  const cached = getFromCache<Group[]>(cacheKey, CACHE_DURATION);
  if (cached) return cached;

  try {
    // Return groups from configuration
    const groups = Object.entries(GROUPS_CONFIG).map(([id, config]) => ({
      id,
      name: config.name,
      spreadsheetId: config.spreadsheetId
    }));
    
    setCache(cacheKey, groups);
    return groups;
  } catch (error) {
    console.error('Error fetching groups:', error);
    const fallbackGroups = [{
      id: 'TTI',
      name: 'TTI',
      spreadsheetId: process.env.GOOGLE_SHEETS_SPREADSHEET_ID!
    }];
    setCache(cacheKey, fallbackGroups);
    return fallbackGroups;
  }
}

export async function getStudents(groupId?: string, showInactive: boolean = false): Promise<Student[]> {
  if (!groupId) {
    return [];
  }

  // Cache dla studentów - każda grupa osobno
  const cacheKey = getCacheKey('students', groupId, showInactive.toString());
  const cached = getFromCache<Student[]>(cacheKey, STUDENTS_CACHE_DURATION);
  if (cached) return cached;

  try {
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

      // Validate required fields and filter by active status
      const isValidStudent = student.id && student.first_name && student.last_name && student.group_id;
      const shouldInclude = showInactive || student.active;
      
      if (isValidStudent && shouldInclude) {
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

    // Helper function for natural class sorting (0A, 0B, 1A, 1C, 2B, 3A)
    const parseClass = (className: string) => {
      if (!className) return { year: 999, section: 'Z' };
      const match = className.match(/^(\d+)([A-Z])$/);
      if (!match) return { year: 999, section: className };
      return {
        year: parseInt(match[1], 10),
        section: match[2]
      };
    };

    // Check if current group is a school group (needs class sorting)
    const isSchoolGroup = groupId && groupId.startsWith('Sp');

    // Sort students based on group type
    filteredStudents.sort((a, b) => {
      if (isSchoolGroup && a.class && b.class) {
        // For school groups: sort by class first, then name
        const classA = parseClass(a.class);
        const classB = parseClass(b.class);
        
        // Compare year first
        if (classA.year !== classB.year) {
          return classA.year - classB.year;
        }
        
        // If same year, compare section
        if (classA.section !== classB.section) {
          return classA.section.localeCompare(classB.section, 'pl');
        }
      }
      
      // Within same class or for non-school groups: sort by last_name then first_name
      const lastNameCompare = a.last_name.localeCompare(b.last_name, 'pl');
      if (lastNameCompare !== 0) return lastNameCompare;
      return a.first_name.localeCompare(b.first_name, 'pl');
    });

    setCache(cacheKey, filteredStudents);
    return filteredStudents;
  } catch (error) {
    console.error(`Failed to fetch students for group ${groupId}:`, error);
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
        
        // Check if column D contains a timestamp (old format) or actual notes
        let notes = '';
        let updatedAt = '';
        
        if (row[3] && row[3].includes('T') && row[3].includes('Z')) {
          // Old format: timestamp in column D
          notes = '';
          updatedAt = row[3];
        } else {
          // New format: notes in column D, timestamp in column E
          notes = row[3] || '';
          updatedAt = row[4] || new Date().toISOString();
        }
        
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

    // Update existing attendance records or add new ones
    // Use Polish timezone (UTC+1 in winter, UTC+2 in summer)
    const now = new Date();
    const polandTime = new Date(now.getTime() + (now.getTimezoneOffset() * 60000) + (2 * 3600000)); // UTC+2 for Poland summer time
    const formattedTime = polandTime.toISOString();
    
    // Get group name
    const config = GROUPS_CONFIG[groupId];
    const groupName = config?.name || groupId;
    
    // Get all attendance data to find existing rows
    const attendanceResponse = await sheets.spreadsheets.values.get({
      spreadsheetId,
      range: 'Attendance!A:I'
    });
    
    const allRows = attendanceResponse.data.values || [];
    const existingRowsMap = new Map<string, number>(); // student_id -> row index
    
    // Find existing rows for this session
    for (let i = 1; i < allRows.length; i++) {
      const row = allRows[i];
      if (row[0] === sessionId && row[1]) {
        const studentId = row[1];
        existingRowsMap.set(studentId, i + 1); // +1 because sheets are 1-indexed
      }
    }
    
    const updateOperations = [];
    const newRows = [];
    
    for (const item of validUpdates) {
      const student = studentsMap.get(item.student_id);
      const rowData = [
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
      
      const existingRowIndex = existingRowsMap.get(item.student_id);
      
      if (existingRowIndex) {
        // Update existing row
        updateOperations.push({
          range: `Attendance!A${existingRowIndex}:I${existingRowIndex}`,
          values: [rowData]
        });
      } else {
        // Add new row
        newRows.push(rowData);
      }
    }
    
    // Perform updates for existing rows
    if (updateOperations.length > 0) {
      await sheets.spreadsheets.values.batchUpdate({
        spreadsheetId,
        requestBody: {
          valueInputOption: 'RAW',
          data: updateOperations
        }
      });
    }
    
    // Append new rows
    if (newRows.length > 0) {
      await sheets.spreadsheets.values.append({
        spreadsheetId,
        range: 'Attendance!A:I',
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

// Instructor management functions
export async function getInstructors(): Promise<Instructor[]> {
  try {
    const sheets = await getSheets();
    const mainSpreadsheetId = process.env.GOOGLE_SHEETS_SPREADSHEET_ID!;

    const response = await sheets.spreadsheets.values.get({
      spreadsheetId: mainSpreadsheetId,
      range: 'Instructors!A1:G1000'
    });

    const rows = response.data.values || [];
    if (rows.length === 0) return [];

    const header = rows[0];
    const instructors: Instructor[] = [];

    for (let i = 1; i < rows.length; i++) {
      const row = rows[i];
      if (!row || row.length === 0) continue;

      const instructor: Partial<Instructor> = {};
      
      header.forEach((columnName, index) => {
        const value = row[index];
        const normalizedColumn = columnName.toLowerCase().trim();
        
        switch (normalizedColumn) {
          case 'id':
            instructor.id = value ? String(value).trim() : '';
            break;
          case 'first_name':
          case 'imie':
            instructor.first_name = value ? String(value).trim() : '';
            break;
          case 'last_name':
          case 'nazwisko':
            instructor.last_name = value ? String(value).trim() : '';
            break;
          case 'email':
          case 'mail':
            instructor.email = value ? String(value).trim() : undefined;
            break;
          case 'phone':
          case 'telefon':
            instructor.phone = value ? String(value).trim() : undefined;
            break;
          case 'specialization':
          case 'specjalizacja':
            instructor.specialization = value ? String(value).trim() : undefined;
            break;
          case 'active':
          case 'aktywny':
            const activeValue = String(value || '').toLowerCase().trim();
            instructor.active = ['true', '1', 'tak', 'yes'].includes(activeValue);
            break;
        }
      });

      // Validate required fields
      if (instructor.id && instructor.first_name && instructor.last_name) {
        instructors.push(instructor as Instructor);
      }
    }

    // Sort by last_name then first_name
    instructors.sort((a, b) => {
      const lastNameCompare = a.last_name.localeCompare(b.last_name, 'pl');
      if (lastNameCompare !== 0) return lastNameCompare;
      return a.first_name.localeCompare(b.first_name, 'pl');
    });

    return instructors;
  } catch (error) {
    console.error('Error fetching instructors:', error);
    throw new Error('Failed to fetch instructors from Google Sheets');
  }
}

export async function getInstructorGroups(): Promise<InstructorGroup[]> {
  try {
    const sheets = await getSheets();
    const mainSpreadsheetId = process.env.GOOGLE_SHEETS_SPREADSHEET_ID!;

    const response = await sheets.spreadsheets.values.get({
      spreadsheetId: mainSpreadsheetId,
      range: 'InstructorGroups!A1:F1000'
    });

    const rows = response.data.values || [];
    if (rows.length === 0) return [];

    const header = rows[0];
    const instructorGroups: InstructorGroup[] = [];

    for (let i = 1; i < rows.length; i++) {
      const row = rows[i];
      if (!row || row.length === 0) continue;

      const instructorGroup: Partial<InstructorGroup> = {};
      
      header.forEach((columnName, index) => {
        const value = row[index];
        const normalizedColumn = columnName.toLowerCase().trim();
        
        switch (normalizedColumn) {
          case 'instructor_id':
          case 'id_instruktora':
            instructorGroup.instructor_id = value ? String(value).trim() : '';
            break;
          case 'group_id':
          case 'id_grupy':
            instructorGroup.group_id = value ? String(value).trim() : '';
            break;
          case 'role':
          case 'rola':
            instructorGroup.role = value ? String(value).trim() : undefined;
            break;
          case 'start_date':
          case 'data_rozpoczecia':
            instructorGroup.start_date = value ? String(value).trim() : undefined;
            break;
          case 'end_date':
          case 'data_zakonczenia':
            instructorGroup.end_date = value ? String(value).trim() : undefined;
            break;
        }
      });

      // Validate required fields
      if (instructorGroup.instructor_id && instructorGroup.group_id) {
        instructorGroups.push(instructorGroup as InstructorGroup);
      }
    }

    return instructorGroups;
  } catch (error) {
    console.error('Error fetching instructor groups:', error);
    throw new Error('Failed to fetch instructor groups from Google Sheets');
  }
}

export async function getInstructorsForGroup(groupId: string): Promise<(Instructor & { role?: string })[]> {
  try {
    if (!groupId) {
      return [];
    }
    
    const sheets = await getSheets();
    const spreadsheetId = getSpreadsheetId(groupId);

    const response = await sheets.spreadsheets.values.get({
      spreadsheetId,
      range: 'Instructors!A1:H1000'
    });

    const rows = response.data.values || [];
    if (rows.length === 0) return [];

    const header = rows[0];
    const instructors: (Instructor & { role?: string })[] = [];

    for (let i = 1; i < rows.length; i++) {
      const row = rows[i];
      if (!row || row.length === 0) continue;

      const instructor: Partial<Instructor & { role?: string }> = {};
      
      header.forEach((columnName, index) => {
        const value = row[index];
        const normalizedColumn = columnName.toLowerCase().trim();
        
        switch (normalizedColumn) {
          case 'id':
            instructor.id = value ? String(value).trim() : '';
            break;
          case 'first_name':
          case 'imie':
            instructor.first_name = value ? String(value).trim() : '';
            break;
          case 'last_name':
          case 'nazwisko':
            instructor.last_name = value ? String(value).trim() : '';
            break;
          case 'email':
          case 'mail':
            instructor.email = value ? String(value).trim() : undefined;
            break;
          case 'phone':
          case 'telefon':
            instructor.phone = value ? String(value).trim() : undefined;
            break;
          case 'specialization':
          case 'specjalizacja':
            instructor.specialization = value ? String(value).trim() : undefined;
            break;
          case 'role':
          case 'rola':
            instructor.role = value ? String(value).trim() : undefined;
            break;
          case 'active':
          case 'aktywny':
            const activeValue = String(value || '').toLowerCase().trim();
            instructor.active = ['true', '1', 'tak', 'yes'].includes(activeValue);
            break;
        }
      });

      // Validate required fields
      if (instructor.id && instructor.first_name && instructor.last_name) {
        instructors.push(instructor as Instructor & { role?: string });
      }
    }

    // Sort by last_name then first_name
    instructors.sort((a, b) => {
      const lastNameCompare = a.last_name.localeCompare(b.last_name, 'pl');
      if (lastNameCompare !== 0) return lastNameCompare;
      return a.first_name.localeCompare(b.first_name, 'pl');
    });

    return instructors;
  } catch (error) {
    console.error('Error fetching instructors for group:', error);
    throw new Error('Failed to fetch instructors for group');
  }
}

// Report functions
export async function getAttendanceReport(filters: AttendanceReportFilters): Promise<AttendanceReportResponse> {
  try {
    const groups = await getGroups();
    
    // Limit to specific groups to avoid API rate limits
    let filteredGroups = filters.groupIds ? 
      groups.filter(g => filters.groupIds!.includes(g.id)) : 
      [];
    
    // If no specific groups selected, default to first group only to avoid rate limits
    if (filteredGroups.length === 0) {
      filteredGroups = groups.slice(0, 1);
    }

    const allItems: AttendanceReportItem[] = [];
    const studentStatsMap = new Map<string, StudentStats>();
    const groupStatsMap = new Map<string, GroupStats>();

    // Process each group
    for (const group of filteredGroups) {
      try {
        const students = await getStudents(group.id, true);
        const filteredStudents = filters.studentIds ? 
          students.filter(s => filters.studentIds!.includes(s.id)) : 
          students;

        // Get all sessions for this group within date range
        const sessions = await getGroupSessions(group.id, filters.dateFrom, filters.dateTo);
      
      for (const session of sessions) {
        const attendance = await getAttendance(group.id, session.date);
        
        for (const student of filteredStudents) {
          const attendanceItem = attendance.items.find(item => item.student_id === student.id);
          const status = attendanceItem?.status || 'nieobecny';
          
          // Apply status filter
          if (filters.status && filters.status !== 'all' && status !== filters.status) {
            continue;
          }

          const reportItem: AttendanceReportItem = {
            student_id: student.id,
            student_name: `${student.first_name} ${student.last_name}`,
            group_id: group.id,
            group_name: group.name,
            date: session.date,
            status,
            notes: attendanceItem?.notes
          };

          allItems.push(reportItem);

          // Update student stats
          const studentKey = `${student.id}-${group.id}`;
          if (!studentStatsMap.has(studentKey)) {
            studentStatsMap.set(studentKey, {
              student_id: student.id,
              student_name: `${student.first_name} ${student.last_name}`,
              group_id: group.id,
              totalSessions: 0,
              presentSessions: 0,
              absentSessions: 0,
              attendancePercentage: 0
            });
          }

          const studentStats = studentStatsMap.get(studentKey)!;
          studentStats.totalSessions++;
          if (status === 'obecny') {
            studentStats.presentSessions++;
          } else {
            studentStats.absentSessions++;
          }
          studentStats.attendancePercentage = Math.round((studentStats.presentSessions / studentStats.totalSessions) * 100);
        }
      }

      // Calculate group stats
      const groupStudents = filteredStudents;
      if (groupStudents.length > 0) {
        const groupKey = group.id;
        const totalGroupSessions = sessions.length * groupStudents.length;
        const presentGroupSessions = allItems.filter(item => 
          item.group_id === group.id && item.status === 'obecny'
        ).length;

        groupStatsMap.set(groupKey, {
          group_id: group.id,
          group_name: group.name,
          studentCount: groupStudents.length,
          totalSessions: totalGroupSessions,
          presentSessions: presentGroupSessions,
          absentSessions: totalGroupSessions - presentGroupSessions,
          attendancePercentage: totalGroupSessions > 0 ? Math.round((presentGroupSessions / totalGroupSessions) * 100) : 0
        });
      }
      } catch (error) {
        console.warn(`Skipping group ${group.id} due to access error:`, error);
        // Continue with other groups instead of failing the entire report
        continue;
      }
    }

    // Calculate total stats
    const totalStats: AttendanceStats = {
      totalSessions: allItems.length,
      presentSessions: allItems.filter(item => item.status === 'obecny').length,
      absentSessions: allItems.filter(item => item.status === 'nieobecny').length,
      attendancePercentage: 0
    };
    totalStats.attendancePercentage = totalStats.totalSessions > 0 ? 
      Math.round((totalStats.presentSessions / totalStats.totalSessions) * 100) : 0;

    return {
      items: allItems,
      studentStats: Array.from(studentStatsMap.values()),
      groupStats: Array.from(groupStatsMap.values()),
      totalStats
    };
  } catch (error) {
    console.error('Error generating attendance report:', error);
    throw new Error('Failed to generate attendance report');
  }
}

async function getGroupSessions(groupId: string, dateFrom?: string, dateTo?: string): Promise<{date: string}[]> {
  try {
    const sheets = await getSheets();
    const spreadsheetId = getSpreadsheetId(groupId);

    const response = await sheets.spreadsheets.values.get({
      spreadsheetId,
      range: 'Sessions!A1:C1000'
    });

    const rows = response.data.values || [];
    const sessions: {date: string}[] = [];
    
    for (let i = 1; i < rows.length; i++) {
      const row = rows[i];
      if (row && row[1] === groupId && row[2]) {
        const date = row[2];
        
        // Apply date filters
        if (dateFrom && date < dateFrom) continue;
        if (dateTo && date > dateTo) continue;
        
        sessions.push({ date });
      }
    }

    return sessions.sort((a, b) => a.date.localeCompare(b.date));
  } catch (error) {
    console.error(`Error fetching sessions for group ${groupId}:`, error);
    return [];
  }
}
