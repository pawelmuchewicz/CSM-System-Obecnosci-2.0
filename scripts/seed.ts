#!/usr/bin/env tsx

/**
 * Seed script to generate example CSV data for Google Sheets
 * Run with: npx tsx scripts/seed.ts
 */

console.log('=== ATTENDANCE SYSTEM - SEED DATA ===\n');

console.log('1. Students Sheet Headers (paste to row 1):');
console.log('id,first_name,last_name,group_id,active,class,phone\n');

console.log('2. Example Students Data (paste starting from row 2):');
const students = [
  'S001,Anna,Kowalska,G1,true,1A,+48123456789',
  'S002,Piotr,Nowak,G1,true,1A,+48123456790',
  'S003,Maria,Wiśniewska,G1,true,1A,+48123456791',
  'S004,Jakub,Dąbrowski,G1,true,1A,+48123456792',
  'S005,Katarzyna,Lewandowska,G1,true,1A,+48123456793',
  'S006,Tomasz,Jankowski,G2,true,1B,+48123456794',
  'S007,Agnieszka,Wójcik,G2,true,1B,+48123456795',
  'S008,Michał,Kowalczyk,G2,true,1B,+48123456796',
  'S009,Magdalena,Kamińska,G2,true,1B,+48123456797',
  'S010,Paweł,Zieliński,G2,true,1B,+48123456798'
];

students.forEach(student => console.log(student));

console.log('\n3. Sessions Sheet Headers (paste to row 1):');
console.log('id,group_id,date\n');

console.log('4. Sessions Sheet - No initial data needed (will be auto-created)\n');

console.log('5. Attendance Sheet Headers (paste to row 1):');
console.log('session_id,student_id,status,updated_at\n');

console.log('6. Attendance Sheet - No initial data needed (will be auto-created)\n');

console.log('=== SETUP INSTRUCTIONS ===');
console.log('1. Create a new Google Sheets spreadsheet');
console.log('2. Create three sheets: "Students", "Sessions", "Attendance"');
console.log('3. Paste the headers and data above into respective sheets');
console.log('4. Share the spreadsheet with your service account email as Editor');
console.log('5. Copy the spreadsheet ID from the URL and add to .env');
console.log('6. Make sure your Google Service Account credentials are configured\n');

console.log('=== GOOGLE SERVICE ACCOUNT SETUP ===');
console.log('1. Go to Google Cloud Console');
console.log('2. Create a new project or select existing one');
console.log('3. Enable Google Sheets API');
console.log('4. Create a Service Account');
console.log('5. Download the JSON key file');
console.log('6. Extract email and private key for .env file');
console.log('7. Share your spreadsheet with the service account email\n');
