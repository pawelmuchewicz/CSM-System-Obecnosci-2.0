# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Student attendance management system with Google Sheets integration. Full-stack TypeScript application with React frontend and Express backend. Supports role-based access control (owner, reception, instructor) with different permissions for each role.

## Development Commands

```bash
# Development (with hot reload)
npm run dev

# Type checking
npm run check

# Build for production
npm run build

# Start production server
npm run start

# Database migrations
npm run db:push
```

## Architecture

### Monorepo Structure

- `client/` - React frontend (Vite + TypeScript)
  - `client/src/pages/` - Main application pages (admin, attendance, login, profile, reports)
  - `client/src/components/` - Reusable React components
  - `client/src/components/ui/` - shadcn/ui components
- `server/` - Express backend
  - `server/routes.ts` - All API endpoints
  - `server/lib/sheets.ts` - Google Sheets integration logic
  - `server/auth.ts` - Authentication and session management
- `shared/` - Shared types and schemas
  - `shared/schema.ts` - Zod schemas and TypeScript types

### Data Flow

**Primary Storage**: Google Sheets with three worksheets per group:
- `Students` - Columns A-M (13 columns):
  - A: id, B: first_name, C: last_name, D: class, E: phone, F: mail, G: group_id
  - H: active, I: status, J: start_date, K: end_date, L: added_by, M: created_at
- `Sessions` (session_id, group_id, date)
- `Attendance` (session_id, student_id, status, notes, updated_at, student_name, class, phone, group_name)

**Database**: PostgreSQL (Drizzle ORM) for:
- User authentication (`instructorsAuth` table)
- Groups configuration (`groupsConfig` table)
- Session storage (express-session)

Each dance group has its own Google Sheets spreadsheet. Hardcoded configurations in `server/lib/sheets.ts` with database override support.

### Authentication & Authorization

- Session-based auth with express-session
- Three roles: `owner`, `reception`, `instructor`
- Permissions defined in `/api/auth/login` response
- Middleware: `requireAuth`, `optionalAuth`, `requireGroupAccess` (in `server/auth.ts`)

### Google Sheets Integration

- Service account authentication (JWT)
- Environment variables: `GOOGLE_SERVICE_ACCOUNT_EMAIL`, `GOOGLE_PRIVATE_KEY`, `GOOGLE_SHEETS_SPREADSHEET_ID`
- Separate users spreadsheet: `USERS_SPREADSHEET_ID` (hardcoded in `server/lib/sheets.ts`)
- Caching system with different TTLs:
  - Students: 15 minutes
  - Attendance: 5 minutes
  - Groups/Users: 10 minutes
- Polish locale support for sorting (students sorted by class for school groups: `Sp*`)

## Key Features Implementation

### Conflict Detection
Last-write-wins with timestamp comparison in `setAttendance()`. Conflicts returned if frontend timestamp differs from backend.

### Multi-Group Configuration
Groups can be managed through database (`groupsConfig` table) with fallback to hardcoded `GROUPS_CONFIG` in `server/lib/sheets.ts`.

### User Synchronization
Bidirectional sync between database and Google Sheets:
- `getUsersFromSheets()` - Read users from sheets
- `syncUserToSheets()` - Write/update user to sheets
- `syncUsersToSheets()` - Bulk sync all users
- Role/status normalization between Polish (sheets) and English (system)

### Attendance Reports
Generated in `getAttendanceReport()` with filters for date range, groups, students, and status. Returns per-student stats, per-group stats, and total stats.

## Important Patterns

### Status Values
- Attendance status in Polish: `'obecny'` | `'nieobecny'` | `'wypisani'`
- User status: `'active'` | `'inactive'` | `'pending'`
- All status values use Polish in Google Sheets, normalized to English in code

### API Endpoints Structure
All routes in `server/routes.ts`:
- `/api/auth/*` - Authentication
- `/api/groups/*` - Group management
- `/api/students/*` - Student data
- `/api/attendance/*` - Attendance operations
- `/api/instructors/*` - Instructor management
- `/api/admin/*` - Admin operations (users, groups config)
- `/api/reports/*` - Attendance reports and PDF export

### Caching Strategy
Clear cache after mutations using `clearCache(pattern)`. Cache keys constructed with `getCacheKey(operation, ...params)`.

## Dark Mode Implementation

The application uses `next-themes` for dark mode support with full CSS variable-based styling.

### Color System
- Uses Tailwind CSS variables instead of hardcoded colors
- Main variables: `bg-background`, `bg-card`, `bg-muted`, `text-foreground`, `text-muted-foreground`, `border-border`
- All components use semantic color names that automatically adapt to light/dark mode

### Pages with Full Dark Mode Support
All main pages have been updated with complete dark mode support:
- `pages/attendance.tsx` - Header, tables, footer, alert banners
- `pages/admin.tsx` - Forms, dialogs, info boxes
- `pages/profile.tsx` - User info boxes, edit forms
- `pages/login.tsx`, `pages/register.tsx`, `pages/reset-password.tsx` - Auth forms
- `components/attendance-table.tsx` - Table rows, badges, status colors with dark: variants
- `components/toolbar.tsx` - Buttons, filters, badges

### Important Pattern
When adding new styles:
- **DO NOT** use hardcoded colors like `text-gray-700`, `bg-white`, `border-gray-300`
- **DO USE** CSS variables: `text-foreground`, `bg-card`, `border-border`
- For dark mode specific styling: use `dark:` prefix (e.g., `dark:bg-blue-950`, `dark:text-blue-300`)
- Input/Select components automatically inherit dark mode styles from shadcn/ui

## Security Notes

- Passwords stored with bcrypt hashing
- Google Sheets credentials in environment variables
- Session secret required (`SESSION_SECRET` env var)
- Service account must have Editor access to all spreadsheets

## Database Schema

Uses Drizzle ORM with PostgreSQL. Main tables:
- `instructorsAuth` - User accounts with groupIds array
- `groupsConfig` - Google Sheets configuration per group
- Session store via `connect-pg-simple`

Run `npm run db:push` after schema changes in `shared/schema.ts`.

## Deployment

### Coolify Configuration

The application is deployed on Coolify with the following setup:

**Build Configuration:**
- Build Pack: Nixpacks (auto-detected)
- Install Command: `npm install`
- Build Command: `npm run build`
- Start Command: `npm run dev`
- Port: `5000`

**Environment Variables (Production):**
```bash
DATABASE_URL=postgresql://neondb_owner:***@***.neon.tech/neondb?sslmode=require&channel_binding=require
GOOGLE_PRIVATE_KEY=(Multiline environment variable, edit in normal view)
GOOGLE_SERVICE_ACCOUNT_EMAIL=dance-attendance-sa@danceattendance.iam.gserviceaccount.com
GOOGLE_SHEETS_SPREADSHEET_ID=1qtM0b8yBwdYvv3fH9gmblmiKo0grqGT1ylNxFgDprUvE
NODE_ENV=production
PORT=5000
SESSION_SECRET=hjhjhu123uihkbhjkhjgjhgj
```

**Domain:**
- Auto-generated Coolify domain: `http://rgcocw0ogsg8ccgo880soc4o.168.231.126.45.sslip.io`

**Deployment Process:**
1. Push code to GitHub repository
2. Coolify automatically pulls latest code from main branch
3. Runs build process with Nixpacks
4. Deploys with configured environment variables
5. Application accessible via configured domain

**Important Notes:**
- `GOOGLE_PRIVATE_KEY` is multiline - must be edited in "Normal view" mode in Coolify
- Database uses Neon PostgreSQL with SSL required
- Session secret is set for production sessions
- Port 5000 must match the PORT environment variable
