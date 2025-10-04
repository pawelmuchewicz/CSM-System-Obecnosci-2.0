import { google } from 'googleapis';
import type { Group, Student, AttendanceItem, Instructor, InstructorGroup, AttendanceReportFilters, AttendanceReportResponse, AttendanceReportItem, StudentStats, GroupStats, AttendanceStats } from '@shared/schema';
import { db } from '../db';
import { instructorsAuth, groupsConfig } from '@shared/schema';
import { eq } from 'drizzle-orm';

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

// Users spreadsheet configuration
const USERS_SPREADSHEET_ID = '1qsGYl1VQ1XRw8wJ2EfXWptsw4ZhfjQM-0Dbs09c7_jU';

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

export function clearCache(pattern?: string): void {
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
  },
  'k-pop': {
    name: 'k-pop',
    spreadsheetId: '1hfHr0_v34KSenDvy_JwSZZlIiEzusPyrvy7eSN18jKY',
    sheetGroupId: 'k-pop'
  },
};

// Helper to get spreadsheet ID for a group from database
async function getSpreadsheetId(groupId: string): Promise<string> {
  try {
    // Try to get from database first
    const [config] = await db
      .select({ spreadsheetId: groupsConfig.spreadsheetId })
      .from(groupsConfig)
      .where(eq(groupsConfig.groupId, groupId))
      .limit(1);
    
    if (config) {
      return config.spreadsheetId;
    }
    
    // Fallback to hardcoded configuration
    const hardcodedConfig = GROUPS_CONFIG[groupId];
    if (hardcodedConfig) {
      return hardcodedConfig.spreadsheetId;
    }
    
    throw new Error(`Unknown group: ${groupId}`);
  } catch (error) {
    console.error(`Error getting spreadsheet ID for group ${groupId}:`, error);
    throw error;
  }
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

// Helper function to normalize attendance status
function normalizeAttendanceStatus(s: any): 'obecny' | 'nieobecny' | 'wypisani' {
  const str = String(s).toLowerCase().trim();
  const presentValues = ['present', 'obecny', '1', 'true', 'tak', 'y', 'yes', 't'];
  const expelledValues = ['wypisani', 'expelled', 'removed', 'inactive', 'withdrawn'];
  
  if (expelledValues.includes(str)) return 'wypisani';
  return presentValues.includes(str) ? 'obecny' : 'nieobecny';
}

export async function getGroups(): Promise<Group[]> {
  const cacheKey = getCacheKey('groups');
  const cached = getFromCache<Group[]>(cacheKey, CACHE_DURATION);
  if (cached) return cached;

  try {
    // Try to get from database first
    const dbConfigs = await db
      .select({
        id: groupsConfig.groupId,
        name: groupsConfig.name,
        spreadsheetId: groupsConfig.spreadsheetId
      })
      .from(groupsConfig)
      .where(eq(groupsConfig.active, true))
      .orderBy(groupsConfig.name);
    
    if (dbConfigs.length > 0) {
      const groups = dbConfigs.map(config => ({
        id: config.id,
        name: config.name,
        spreadsheetId: config.spreadsheetId
      }));
      setCache(cacheKey, groups);
      return groups;
    }
    
    // Fallback to hardcoded configuration
    const groups = Object.entries(GROUPS_CONFIG).map(([id, config]) => ({
      id,
      name: config.name,
      spreadsheetId: config.spreadsheetId
    }));
    
    setCache(cacheKey, groups);
    return groups;
  } catch (error) {
    console.error('Error fetching groups:', error);
    // Fallback to hardcoded groups if database fails
    const groups = Object.entries(GROUPS_CONFIG).map(([id, config]) => ({
      id,
      name: config.name,
      spreadsheetId: config.spreadsheetId
    }));
    setCache(cacheKey, groups);
    return groups;
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
    const spreadsheetId = await getSpreadsheetId(groupId);
    
    const response = await sheets.spreadsheets.values.get({
      spreadsheetId,
      range: 'Students!A1:M2000' // Include new columns: status, start_date, end_date, added_by, created_at
    });

    const rows = response.data.values || [];
    
    if (rows.length < 2) {
      return [];
    }

    const headers = rows[0].map((h: any) => String(h).toLowerCase().trim());
    const students: Student[] = [];
    let foundStudentsCount = 0;

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
          case 'status':
            const statusStr = String(value || 'active').toLowerCase().trim();
            if (['active', 'pending', 'inactive'].includes(statusStr)) {
              student.status = statusStr as 'active' | 'pending' | 'inactive';
            } else {
              student.status = 'active'; // default
            }
            break;
          case 'start_date':
          case 'startdate':
            student.start_date = value ? String(value).trim() : undefined;
            break;
          case 'end_date':
          case 'enddate':
            student.end_date = value ? String(value).trim() : undefined;
            break;
          case 'added_by':
          case 'addedby':
            student.added_by = value ? String(value).trim() : undefined;
            break;
          case 'created_at':
          case 'createdat':
            student.created_at = value ? String(value).trim() : undefined;
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
    const spreadsheetId = await getSpreadsheetId(groupId);

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
    const spreadsheetId = await getSpreadsheetId(groupId);

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
    const spreadsheetId = await getSpreadsheetId(groupId);
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

export async function addInstructorGroupAssignment(instructorId: string, groupId: string, role: string = 'instruktor'): Promise<void> {
  try {
    const sheets = await getSheets();
    const mainSpreadsheetId = process.env.GOOGLE_SHEETS_SPREADSHEET_ID!;

    console.log(`Adding instructor ${instructorId} to group ${groupId} with role ${role}`);
    
    // Check if assignment already exists
    const existingGroups = await getInstructorGroups();
    const exists = existingGroups.some(ig => 
      ig.instructor_id === instructorId && ig.group_id === groupId
    );
    
    if (exists) {
      console.log(`Assignment already exists for instructor ${instructorId} in group ${groupId}`);
      return;
    }

    // Get current sheet data to find next row
    const currentResponse = await sheets.spreadsheets.values.get({
      spreadsheetId: mainSpreadsheetId,
      range: 'InstructorGroups!A:F'
    });
    
    const currentRows = currentResponse.data.values || [];
    const nextRow = currentRows.length + 1;
    
    console.log(`Current InstructorGroups has ${currentRows.length} rows, adding to row ${nextRow}`);

    // Use direct update instead of append
    await sheets.spreadsheets.values.update({
      spreadsheetId: mainSpreadsheetId,
      range: `InstructorGroups!A${nextRow}:F${nextRow}`,
      valueInputOption: 'RAW',
      requestBody: {
        values: [[instructorId, groupId, role, '', '']] // instructor_id, group_id, role, start_date, end_date
      }
    });

    console.log(`Successfully added instructor ${instructorId} to group ${groupId} with role ${role} at row ${nextRow}`);
    
    // Clear any caches that might be related to instructor groups
    clearCache('instructor-groups');
    
  } catch (error) {
    console.error('Error adding instructor group assignment:', error);
    throw new Error('Failed to add instructor group assignment to Google Sheets');
  }
}

// Add multiple assignments at once
export async function addMultipleInstructorAssignments(assignments: Array<{instructorId: string, groupId: string, role: string}>): Promise<void> {
  try {
    const sheets = await getSheets();
    const mainSpreadsheetId = process.env.GOOGLE_SHEETS_SPREADSHEET_ID!;

    console.log(`Adding ${assignments.length} instructor assignments`);
    
    // Check existing assignments
    const existingGroups = await getInstructorGroups();
    const newAssignments = assignments.filter(assignment => 
      !existingGroups.some(ig => 
        ig.instructor_id === assignment.instructorId && ig.group_id === assignment.groupId
      )
    );
    
    if (newAssignments.length === 0) {
      console.log('All assignments already exist');
      return;
    }

    // Get current sheet data
    const currentResponse = await sheets.spreadsheets.values.get({
      spreadsheetId: mainSpreadsheetId,
      range: 'InstructorGroups!A:F'
    });
    
    const currentRows = currentResponse.data.values || [];
    const nextRow = currentRows.length + 1;
    
    // Prepare values for batch insert
    const values = newAssignments.map(assignment => [
      assignment.instructorId, 
      assignment.groupId, 
      assignment.role, 
      '', 
      ''
    ]);
    
    const endRow = nextRow + values.length - 1;
    
    // Batch insert
    await sheets.spreadsheets.values.update({
      spreadsheetId: mainSpreadsheetId,
      range: `InstructorGroups!A${nextRow}:F${endRow}`,
      valueInputOption: 'RAW',
      requestBody: {
        values
      }
    });

    console.log(`Successfully added ${newAssignments.length} instructor assignments starting at row ${nextRow}`);
    
    // Clear cache
    clearCache('instructor-groups');
    
  } catch (error) {
    console.error('Error adding multiple instructor assignments:', error);
    throw new Error('Failed to add instructor assignments to Google Sheets');
  }
}

export async function getInstructorsForGroup(groupId: string): Promise<(Instructor & { role?: string })[]> {
  try {
    if (!groupId) {
      return [];
    }

    // Get users from database who have access to this group
    const dbUsers = await db
      .select({
        id: instructorsAuth.id,
        username: instructorsAuth.username,
        firstName: instructorsAuth.firstName,
        lastName: instructorsAuth.lastName,
        email: instructorsAuth.email,
        role: instructorsAuth.role,
        groupIds: instructorsAuth.groupIds,
      })
      .from(instructorsAuth)
      .where(eq(instructorsAuth.active, true));

    // Filter users who have access to this group
    const usersWithAccess = dbUsers.filter(user => {
      // Admins (owner, reception) have access to all groups
      if (user.role === 'owner' || user.role === 'reception') {
        return true;
      }
      // Regular instructors need explicit group assignment
      return user.groupIds && user.groupIds.includes(groupId);
    });

    // Build instructors list from database users only
    const instructorsForGroup: (Instructor & { role?: string })[] = [];
    
    // Add database users with access to this group
    usersWithAccess.forEach(user => {
      instructorsForGroup.push({
        id: `db-${user.id}`,
        first_name: user.firstName,
        last_name: user.lastName,
        email: user.email || undefined,
        phone: undefined,
        specialization: undefined,
        active: true,
        role: user.role === 'owner' ? 'właściciel' :
              user.role === 'reception' ? 'recepcja' :
              'instruktor'
      });
    });

    // Sort by role priority (owners first, then reception, then instructors), then by name
    instructorsForGroup.sort((a, b) => {
      // Role priority
      const roleOrder = { 'właściciel': 1, 'recepcja': 2, 'glowny': 3, 'instruktor': 4, 'asystent': 5 };
      const aRoleOrder = roleOrder[a.role as keyof typeof roleOrder] || 99;
      const bRoleOrder = roleOrder[b.role as keyof typeof roleOrder] || 99;
      
      if (aRoleOrder !== bRoleOrder) {
        return aRoleOrder - bRoleOrder;
      }
      
      // Then sort by name
      const lastNameCompare = a.last_name.localeCompare(b.last_name, 'pl');
      if (lastNameCompare !== 0) return lastNameCompare;
      return a.first_name.localeCompare(b.first_name, 'pl');
    });

    return instructorsForGroup;
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
    const spreadsheetId = await getSpreadsheetId(groupId);

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

// ===== USER SYNCHRONIZATION FUNCTIONS =====

interface UserSheetData {
  username: string;
  firstName: string;
  lastName: string;
  email: string;
  role: string;
  status: string;
  active: boolean;
  groups?: string; // Comma-separated group IDs
}

/**
 * Read users from Google Sheets
 * Columns: username, first_name, last_name, email, role, status, active
 * Note: Passwords are NOT stored in Google Sheets for security reasons
 */
/**
 * Convert Polish role names to English system values
 */
function normalizeRole(role: string): string {
  const roleMap: { [key: string]: string } = {
    'właściciel': 'owner',
    'wlasciciel': 'owner', // without polish characters
    'nauczyciel': 'owner',
    'owner': 'owner',
    'recepcja': 'reception',
    'reception': 'reception',
    'instruktor': 'instructor',
    'instructor': 'instructor'
  };
  
  const normalizedRole = role.toLowerCase().trim();
  return roleMap[normalizedRole] || 'instructor';
}

/**
 * Convert English system roles to Polish display names for Google Sheets
 */
function roleToPolish(role: string): string {
  const roleMap: { [key: string]: string } = {
    'owner': 'właściciel',
    'reception': 'recepcja',
    'instructor': 'instruktor'
  };
  
  return roleMap[role.toLowerCase()] || role;
}

/**
 * Convert English system status to Polish display names for Google Sheets
 */
function statusToPolish(status: string): string {
  const statusMap: { [key: string]: string } = {
    'active': 'aktywny',
    'inactive': 'nieaktywny', 
    'pending': 'oczekuje'
  };
  
  return statusMap[status.toLowerCase()] || status;
}

/**
 * Convert Polish user status names to English system values
 */
function normalizeUserStatus(status: string): string {
  const statusMap: { [key: string]: string } = {
    'aktywny': 'active',
    'nieaktywny': 'inactive',
    'oczekuje': 'pending',
    'active': 'active',
    'inactive': 'inactive',
    'pending': 'pending'
  };
  
  const normalizedStatus = status.toLowerCase().trim();
  return statusMap[normalizedStatus] || 'active';
}

export async function getUsersFromSheets(): Promise<UserSheetData[]> {
  try {
    const cacheKey = getCacheKey('users_sheet');
    const cached = getFromCache<UserSheetData[]>(cacheKey, CACHE_DURATION);
    if (cached) return cached;

    const sheets = await getSheets();
    const response = await sheets.spreadsheets.values.get({
      spreadsheetId: USERS_SPREADSHEET_ID,
      range: 'A1:H1000' // Extended to include groups column
    });

    const rows = response.data.values || [];
    const users: UserSheetData[] = [];
    
    // Skip header row (row 0)
    for (let i = 1; i < rows.length; i++) {
      const row = rows[i];
      if (row && row[0]) { // username is required
        const rawRole = row[4] || 'instructor';
        const rawStatus = row[5] || 'active';
        users.push({
          username: row[0] || '',
          firstName: row[1] || '',
          lastName: row[2] || '',
          email: row[3] || '',
          role: normalizeRole(rawRole),
          status: normalizeUserStatus(rawStatus),
          active: row[6] === 'TRUE' || row[6] === 'true' || row[6] === '1',
          groups: row[7] || '' // Groups column
        });
      }
    }

    setCache(cacheKey, users);
    return users;
  } catch (error) {
    console.error('Error fetching users from sheets:', error);
    throw new Error('Failed to fetch users from Google Sheets');
  }
}

/**
 * Write a single user to Google Sheets
 * Updates existing user or adds new user
 */
export async function syncUserToSheets(user: UserSheetData): Promise<void> {
  try {
    const sheets = await getSheets();
    
    // First get all users to find if user exists
    const response = await sheets.spreadsheets.values.get({
      spreadsheetId: USERS_SPREADSHEET_ID,
      range: 'A1:H1000' // Extended to include groups column
    });

    const rows = response.data.values || [];
    let userRowIndex = -1;
    
    // Find existing user row
    for (let i = 1; i < rows.length; i++) {
      if (rows[i] && rows[i][0] === user.username) {
        userRowIndex = i + 1; // +1 because sheets are 1-indexed
        break;
      }
    }

    const userData = [
      user.username,
      user.firstName,
      user.lastName,
      user.email,
      roleToPolish(user.role),
      statusToPolish(user.status),
      user.active ? 'TRUE' : 'FALSE',
      user.groups || '' // Groups column
    ];

    if (userRowIndex > 0) {
      // Update existing user
      await sheets.spreadsheets.values.update({
        spreadsheetId: USERS_SPREADSHEET_ID,
        range: `A${userRowIndex}:H${userRowIndex}`,
        valueInputOption: 'RAW',
        requestBody: {
          values: [userData]
        }
      });
    } else {
      // Add new user - find first empty row
      let nextRow = rows.length + 1;
      await sheets.spreadsheets.values.update({
        spreadsheetId: USERS_SPREADSHEET_ID,
        range: `A${nextRow}:H${nextRow}`,
        valueInputOption: 'RAW',
        requestBody: {
          values: [userData]
        }
      });
    }

    // Clear cache
    clearCache('users_sheet');
  } catch (error) {
    console.error('Error syncing user to sheets:', error);
    throw new Error('Failed to sync user to Google Sheets');
  }
}

/**
 * Remove a user from Google Sheets
 */
export async function removeUserFromSheets(username: string): Promise<void> {
  try {
    const sheets = await getSheets();
    
    // First get all users to find the row to delete
    const response = await sheets.spreadsheets.values.get({
      spreadsheetId: USERS_SPREADSHEET_ID,
      range: 'A1:H1000' // Extended to include groups column
    });

    const rows = response.data.values || [];
    let userRowIndex = -1;
    
    // Find user row (skip header row)
    for (let i = 1; i < rows.length; i++) {
      if (rows[i] && rows[i][0] === username) {
        userRowIndex = i + 1; // +1 because sheets are 1-indexed
        break;
      }
    }

    if (userRowIndex > 0) {
      // Delete the row
      await sheets.spreadsheets.batchUpdate({
        spreadsheetId: USERS_SPREADSHEET_ID,
        requestBody: {
          requests: [{
            deleteDimension: {
              range: {
                sheetId: 0,
                dimension: 'ROWS',
                startIndex: userRowIndex - 1, // Convert to 0-indexed
                endIndex: userRowIndex
              }
            }
          }]
        }
      });
    }

    // Clear cache
    clearCache('users_sheet');
  } catch (error) {
    console.error('Error removing user from sheets:', error);
    throw new Error('Failed to remove user from Google Sheets');
  }
}

/**
 * Sync all users from database to Google Sheets
 * This will overwrite the entire sheet with database data
 */
export async function syncUsersToSheets(users: UserSheetData[]): Promise<void> {
  try {
    const sheets = await getSheets();
    
    // Prepare data with header
    const header = ['username', 'first_name', 'last_name', 'email', 'role', 'status', 'active'];
    const data = [
      header,
      ...users.map(user => [
        user.username,
        user.firstName,
        user.lastName,
        user.email,
        roleToPolish(user.role),
        statusToPolish(user.status),
        user.active ? 'TRUE' : 'FALSE'
      ])
    ];

    // Clear existing data and write new data
    await sheets.spreadsheets.values.clear({
      spreadsheetId: USERS_SPREADSHEET_ID,
      range: 'A:G'
    });

    await sheets.spreadsheets.values.update({
      spreadsheetId: USERS_SPREADSHEET_ID,
      range: 'A1',
      valueInputOption: 'RAW',
      requestBody: {
        values: data
      }
    });

    // Clear cache
    clearCache('users_sheet');
  } catch (error) {
    console.error('Error syncing users to sheets:', error);
    throw new Error('Failed to sync users to Google Sheets');
  }
}
