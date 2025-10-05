import type { Express } from "express";
import { createServer, type Server } from "http";
import { getGroups, getStudents, getAttendance, setAttendance, getInstructorGroups, getInstructorsForGroup, addInstructorGroupAssignment, getAttendanceReport, clearCache, addStudent, approveStudent, expelStudent } from "./lib/sheets";
import { sql } from "drizzle-orm";
import { attendanceRequestSchema, loginSchema, instructorsAuth, instructorGroupAssignments, registerInstructorSchema, updateUserStatusSchema, approveUserSchema, assignGroupSchema, groupsConfig, createGroupConfigSchema, updateGroupConfigSchema, addStudentSchema, approveStudentSchema, expelStudentSchema } from "@shared/schema";
import { setupSession, requireAuth, optionalAuth, requireGroupAccess, hashPassword, verifyPassword, type AuthenticatedRequest } from "./auth";
import { db } from "./db";
import { eq, and } from "drizzle-orm";

export async function registerRoutes(app: Express): Promise<Server> {
  // Setup session middleware
  setupSession(app);

  // === AUTHENTICATION ROUTES ===

  // POST /api/auth/login
  app.post("/api/auth/login", async (req, res) => {
    try {
      const { username, password } = loginSchema.parse(req.body);

      // Find user by username
      const [user] = await db
        .select({
          id: instructorsAuth.id,
          username: instructorsAuth.username,
          password: instructorsAuth.password,
          firstName: instructorsAuth.firstName,
          lastName: instructorsAuth.lastName,
          email: instructorsAuth.email,
          role: instructorsAuth.role,
          status: instructorsAuth.status,
          active: instructorsAuth.active,
          groupIds: instructorsAuth.groupIds,
        })
        .from(instructorsAuth)
        .where(eq(instructorsAuth.username, username));

      if (!user) {
        return res.status(401).json({
          message: "Nieprawidłowa nazwa użytkownika lub hasło",
          code: "INVALID_CREDENTIALS"
        });
      }

      // Verify password
      const passwordValid = await verifyPassword(password, user.password);
      if (!passwordValid) {
        return res.status(401).json({
          message: "Nieprawidłowa nazwa użytkownika lub hasło",
          code: "INVALID_CREDENTIALS"
        });
      }

      // Check if user is pending approval
      if (user.status === 'pending') {
        return res.status(403).json({
          message: "Twoje konto oczekuje na akceptację przez administratora",
          code: "ACCOUNT_PENDING_APPROVAL"
        });
      }

      // Check if user is active
      if (!user.active || user.status === 'inactive') {
        return res.status(403).json({
          message: "Twoje konto zostało dezaktywowane. Skontaktuj się z administratorem.",
          code: "ACCOUNT_INACTIVE"
        });
      }

      // Set session
      (req.session as any).userId = user.id;

      // Get user's groups from the groupIds column
      const groupIds = user.groupIds || [];

      // Get user's permissions and role info
      const userRole = (user.role || 'instructor') as 'owner' | 'reception' | 'instructor';
      const getUserPermissions = (role: 'owner' | 'reception' | 'instructor') => {
        switch (role) {
          case 'owner':
            return {
              canManageUsers: true,
              canAssignGroups: true,
              canManageStudents: true,
              canViewAllGroups: true,
              canChangeContactInfo: true,
              canExpelStudents: true,
              canViewReports: true,
            };
          case 'reception':
            return {
              canManageUsers: true,
              canAssignGroups: true,
              canManageStudents: true,
              canViewAllGroups: true,
              canChangeContactInfo: true,
              canExpelStudents: true,
              canViewReports: true,
            };
          case 'instructor':
          default:
            return {
              canManageUsers: false,
              canAssignGroups: false,
              canManageStudents: false,
              canViewAllGroups: false,
              canChangeContactInfo: false,
              canExpelStudents: false,
              canViewReports: true,
            };
        }
      };
      
      const permissions = getUserPermissions(userRole);

      res.json({ 
        message: "Zalogowano pomyślnie",
        user: {
          id: user.id,
          username: user.username,
          firstName: user.firstName,
          lastName: user.lastName,
          email: user.email,
          role: userRole,
          status: user.status || 'active',
          groupIds,
          isAdmin: userRole === 'owner' || userRole === 'reception',
          permissions,
        }
      });
    } catch (error) {
      console.error("Login error:", error);
      res.status(400).json({ 
        message: "Błąd podczas logowania",
        code: "LOGIN_ERROR" 
      });
    }
  });

  // POST /api/auth/logout
  app.post("/api/auth/logout", (req, res) => {
    req.session?.destroy((err) => {
      if (err) {
        console.error("Logout error:", err);
        return res.status(500).json({ 
          message: "Błąd podczas wylogowywania",
          code: "LOGOUT_ERROR" 
        });
      }
      res.clearCookie('connect.sid');
      res.json({ message: "Wylogowano pomyślnie" });
    });
  });

  // GET /api/auth/me
  app.get("/api/auth/me", requireAuth, async (req: AuthenticatedRequest, res) => {
    res.json({ user: req.user });
  });

  // === PROTECTED ROUTES ===

  // GET /api/groups (now requires authentication)
  app.get("/api/groups", requireAuth, async (req: AuthenticatedRequest, res) => {
    try {
      const allGroups = await getGroups();
      
      // Filter groups based on user permissions
      let filteredGroups = allGroups;
      if (!req.user?.isAdmin) {
        filteredGroups = allGroups.filter(group => 
          req.user?.groupIds.includes(group.id)
        );
      }
      
      res.json({ groups: filteredGroups });
    } catch (error) {
      console.error("Error fetching groups:", error);
      res.status(502).json({ 
        message: "Failed to fetch groups from Google Sheets",
        hint: "Ensure the sheet is shared with the service account as Editor"
      });
    }
  });

  // GET /api/students?groupId=G1&showInactive=true (now requires auth and group access)
  app.get("/api/students", requireAuth, requireGroupAccess, async (req: AuthenticatedRequest, res) => {
    try {
      const groupId = req.query.groupId as string;
      const showInactive = req.query.showInactive === 'true';
      
      const students = await getStudents(groupId, showInactive);
      res.json({ students });
    } catch (error) {
      console.error("Error fetching students:", error);
      res.status(502).json({ 
        message: "Failed to fetch students from Google Sheets",
        hint: "Ensure the sheet is shared with the service account as Editor"
      });
    }
  });

  // POST /api/students - Add new student (instructors only, to their assigned groups)
  app.post("/api/students", requireAuth, async (req: AuthenticatedRequest, res) => {
    try {
      const data = addStudentSchema.parse(req.body);

      // Check if user has access to this group
      const userGroupIds = req.user?.groupIds || [];
      const userRole = req.user?.role;

      // Owner and reception can add to any group, instructors only to their groups
      if (userRole !== 'owner' && userRole !== 'reception') {
        if (!userGroupIds.includes(data.groupId)) {
          return res.status(403).json({
            message: "Brak uprawnień do dodawania uczniów do tej grupy",
            code: "INSUFFICIENT_PERMISSIONS"
          });
        }
      }

      const studentId = await addStudent({
        groupId: data.groupId,
        firstName: data.firstName,
        lastName: data.lastName,
        startDate: data.startDate,
        class: data.class,
        phone: data.phone,
        mail: data.mail,
        addedBy: String(req.user?.id),
      });

      res.status(201).json({
        message: "Uczeń został dodany i oczekuje na zatwierdzenie",
        studentId
      });
    } catch (error) {
      console.error("Error adding student:", error);

      // Handle Zod validation errors
      if (error instanceof Error && error.name === 'ZodError') {
        const zodError = error as any;
        const firstError = zodError.errors?.[0];
        return res.status(400).json({
          message: firstError?.message || "Błąd walidacji danych",
          code: "VALIDATION_ERROR"
        });
      }

      res.status(500).json({
        message: "Błąd podczas dodawania ucznia",
        code: "ADD_STUDENT_ERROR"
      });
    }
  });

  // GET /api/admin/pending-students - Get all pending students (admin only)
  app.get("/api/admin/pending-students", requireAuth, async (req: AuthenticatedRequest, res) => {
    try {
      if (!req.user?.permissions?.canManageUsers) {
        return res.status(403).json({
          message: "Brak uprawnień do zarządzania uczniami",
          code: "INSUFFICIENT_PERMISSIONS"
        });
      }

      // Get all groups
      const groups = await getGroups();
      const allPendingStudents: any[] = [];

      // Fetch students from each group and filter pending ones
      for (const group of groups) {
        const students = await getStudents(group.id, true); // include inactive
        const pendingInGroup = students.filter(s => s.status === 'pending');

        // Add group name to each student
        pendingInGroup.forEach(student => {
          allPendingStudents.push({
            ...student,
            groupName: group.name
          });
        });
      }

      res.json({ students: allPendingStudents });
    } catch (error) {
      console.error("Error fetching pending students:", error);
      res.status(500).json({
        message: "Błąd podczas pobierania oczekujących uczniów",
        code: "FETCH_PENDING_ERROR"
      });
    }
  });

  // POST /api/admin/approve-student - Approve pending student (admin only)
  app.post("/api/admin/approve-student", requireAuth, async (req: AuthenticatedRequest, res) => {
    try {
      if (!req.user?.permissions?.canManageUsers) {
        return res.status(403).json({
          message: "Brak uprawnień do zatwierdzania uczniów",
          code: "INSUFFICIENT_PERMISSIONS"
        });
      }

      const data = approveStudentSchema.parse(req.body);

      await approveStudent(
        data.studentId,
        data.groupId,
        data.endDate && data.endDate.trim() !== '' ? data.endDate : undefined
      );

      res.json({
        message: "Uczeń został zatwierdzony",
        studentId: data.studentId
      });
    } catch (error) {
      console.error("Error approving student:", error);
      res.status(500).json({
        message: "Błąd podczas zatwierdzania ucznia",
        code: "APPROVE_STUDENT_ERROR"
      });
    }
  });

  // PATCH /api/admin/expel-student - Expel student with end date (admin only)
  app.patch("/api/admin/expel-student", requireAuth, async (req: AuthenticatedRequest, res) => {
    try {
      if (!req.user?.permissions?.canManageUsers) {
        return res.status(403).json({
          message: "Brak uprawnień do wypisywania uczniów",
          code: "INSUFFICIENT_PERMISSIONS"
        });
      }

      const data = expelStudentSchema.parse(req.body);

      await expelStudent(data.studentId, data.groupId, data.endDate);

      res.json({
        message: "Uczeń został wypisany",
        studentId: data.studentId
      });
    } catch (error) {
      console.error("Error expelling student:", error);
      res.status(500).json({
        message: "Błąd podczas wypisywania ucznia",
        code: "EXPEL_STUDENT_ERROR"
      });
    }
  });

  // GET /api/attendance?groupId=G1&date=2025-01-01 (now requires auth and group access)
  app.get("/api/attendance", requireAuth, requireGroupAccess, async (req: AuthenticatedRequest, res) => {
    try {
      const { groupId, date } = req.query;
      
      if (!groupId || !date) {
        return res.status(400).json({ 
          message: "Missing required parameters: groupId and date" 
        });
      }

      const attendance = await getAttendance(groupId as string, date as string);
      res.json(attendance);
    } catch (error) {
      console.error("Error fetching attendance:", error);
      res.status(502).json({ 
        message: "Failed to fetch attendance from Google Sheets",
        hint: "Ensure the sheet is shared with the service account as Editor"
      });
    }
  });

  // GET /api/attendance/exists - Check if attendance already exists (requires auth and group access)
  app.get("/api/attendance/exists", requireAuth, requireGroupAccess, async (req: AuthenticatedRequest, res) => {
    try {
      const { groupId, date } = req.query;
      
      if (!groupId || !date) {
        return res.status(400).json({ 
          message: "Missing required parameters: groupId and date" 
        });
      }

      const attendance = await getAttendance(groupId as string, date as string);
      // Check if any student has attendance recorded (has updated_at timestamp)
      const hasExistingAttendance = attendance.items.some(item => item.updated_at);
      res.json({ exists: hasExistingAttendance });
    } catch (error) {
      console.error("Error checking attendance existence:", error);
      res.status(502).json({ 
        message: "Failed to check attendance existence" 
      });
    }
  });

  // POST /api/attendance (requires auth and group access)
  app.post("/api/attendance", requireAuth, requireGroupAccess, async (req: AuthenticatedRequest, res) => {
    try {
      const validation = attendanceRequestSchema.safeParse(req.body);
      if (!validation.success) {
        return res.status(400).json({ 
          message: "Invalid request body",
          errors: validation.error.issues 
        });
      }

      const { groupId, date, items } = validation.data;
      const result = await setAttendance(groupId, date, items);
      res.json(result);
    } catch (error) {
      console.error("Error saving attendance:", error);
      res.status(502).json({ 
        message: "Failed to save attendance to Google Sheets",
        hint: "Ensure the sheet is shared with the service account as Editor"
      });
    }
  });

  // POST /api/attendance/notes - Save notes for specific student
  app.post("/api/attendance/notes", async (req, res) => {
    try {
      const { groupId, date, student_id, notes } = req.body;
      
      if (!groupId || !date || !student_id) {
        return res.status(400).json({ 
          message: "Missing required fields: groupId, date, student_id" 
        });
      }

      // Get current attendance to preserve status
      const currentAttendance = await getAttendance(groupId, date);
      const existingItem = currentAttendance.items.find(item => item.student_id === student_id);
      
      // IMPORTANT: Only add notes if student already has some attendance status
      // Don't create attendance record just for notes!
      if (!existingItem || !existingItem.status) {
        return res.status(400).json({ 
          message: "Nie można dodać notatki do studenta który nie ma ustalonej obecności. Najpierw oznacz obecność (obecny/nieobecny).", 
          code: "NO_ATTENDANCE_STATUS"
        });
      }
      
      // Create updated item with notes (preserve existing status)
      const updatedItem = {
        student_id,
        status: existingItem.status, // Keep existing status exactly as is
        updated_at: new Date().toISOString(),
        notes: notes || ''
      };

      // Save the updated attendance item
      const result = await setAttendance(groupId, date, [updatedItem]);
      res.json({ success: true, item: updatedItem });
    } catch (error) {
      console.error("Error saving notes:", error);
      res.status(502).json({ 
        message: "Failed to save notes to Google Sheets",
        hint: "Ensure the sheet is shared with the service account as Editor"
      });
    }
  });

  // GET /api/instructors - DISABLED, using database only
  app.get("/api/instructors", async (req, res) => {
    try {
      // Return instructors from database instead of Google Sheets
      const dbUsers = await db
        .select({
          id: instructorsAuth.id,
          first_name: instructorsAuth.firstName,
          last_name: instructorsAuth.lastName,
          email: instructorsAuth.email,
          phone: sql`NULL`, // Not stored in database
          specialization: sql`NULL`, // Not stored in database 
          active: instructorsAuth.active,
        })
        .from(instructorsAuth)
        .where(eq(instructorsAuth.active, true));
      
      const instructors = dbUsers.map(user => ({
        id: `db-${user.id}`,
        first_name: user.first_name,
        last_name: user.last_name,
        email: user.email || undefined,
        phone: undefined,
        specialization: undefined,
        active: user.active,
      }));
      
      res.json({ instructors });
    } catch (error) {
      console.error("Error fetching instructors from database:", error);
      res.status(502).json({ 
        message: "Failed to fetch instructors from database"
      });
    }
  });

  // GET /api/instructor-groups
  app.get("/api/instructor-groups", async (req, res) => {
    try {
      const instructorGroups = await getInstructorGroups();
      res.json({ instructorGroups });
    } catch (error) {
      console.error("Error fetching instructor groups:", error);
      res.status(502).json({ 
        message: "Failed to fetch instructor groups from Google Sheets",
        hint: "Ensure the InstructorGroups sheet exists and is shared with the service account as Editor"
      });
    }
  });

  // GET /api/instructors/group/:groupId
  app.get("/api/instructors/group/:groupId", async (req, res) => {
    try {
      const { groupId } = req.params;
      const instructors = await getInstructorsForGroup(groupId);
      res.json({ instructors });
    } catch (error) {
      console.error("Error fetching instructors for group:", error);
      res.status(502).json({ 
        message: "Failed to fetch instructors for group from Google Sheets",
        hint: "Ensure both Instructors and InstructorGroups sheets exist and are shared with the service account as Editor"
      });
    }
  });

  // POST /api/instructor-group-assignments - Add instructor to group
  app.post("/api/instructor-group-assignments", async (req, res) => {
    try {
      const { instructorId, groupId, role } = req.body;
      
      if (!instructorId || !groupId) {
        return res.status(400).json({ 
          message: "Missing required fields: instructorId and groupId" 
        });
      }

      await addInstructorGroupAssignment(instructorId, groupId, role || 'instruktor');
      res.json({ 
        success: true, 
        message: `Added instructor ${instructorId} to group ${groupId}` 
      });
    } catch (error) {
      console.error("Error adding instructor group assignment:", error);
      res.status(502).json({ 
        message: "Failed to add instructor group assignment",
        hint: "Ensure the InstructorGroups sheet exists and is shared with the service account as Editor"
      });
    }
  });

  // GET /api/reports/attendance
  app.get("/api/reports/attendance", async (req, res) => {
    try {
      const filters = {
        groupIds: req.query.groupIds ? (req.query.groupIds as string).split(',') : undefined,
        studentIds: req.query.studentIds ? (req.query.studentIds as string).split(',') : undefined,
        dateFrom: req.query.dateFrom as string,
        dateTo: req.query.dateTo as string,
        status: req.query.status as 'obecny' | 'nieobecny' | 'all' | undefined
      };

      const report = await getAttendanceReport(filters);
      res.json(report);
    } catch (error) {
      console.error("Error generating attendance report:", error);
      res.status(502).json({ 
        message: "Failed to generate attendance report",
        hint: "Ensure the sheets are accessible and contain valid data"
      });
    }
  });

  // GET /api/export/csv
  app.get("/api/export/csv", async (req, res) => {
    try {
      const filters = {
        groupIds: req.query.groupIds ? (req.query.groupIds as string).split(',') : undefined,
        studentIds: req.query.studentIds ? (req.query.studentIds as string).split(',') : undefined,
        dateFrom: req.query.dateFrom as string,
        dateTo: req.query.dateTo as string,
        status: req.query.status as 'obecny' | 'nieobecny' | 'all' | undefined
      };

      const report = await getAttendanceReport(filters);
      
      // Generate CSV content
      const csvHeaders = ['Student', 'Grupa', 'Data', 'Status', 'Notatki'];
      const csvRows = report.items.map(item => [
        item.student_name,
        item.group_name,
        item.date,
        item.status,
        item.notes || ''
      ]);

      const csvContent = [
        csvHeaders.join(','),
        ...csvRows.map(row => row.map(cell => `"${cell}"`).join(','))
      ].join('\n');

      res.setHeader('Content-Type', 'text/csv; charset=utf-8');
      res.setHeader('Content-Disposition', `attachment; filename="raport-obecnosci-${new Date().toISOString().split('T')[0]}.csv"`);
      res.send('\uFEFF' + csvContent); // Add BOM for proper UTF-8 encoding in Excel
    } catch (error) {
      console.error("Error generating CSV export:", error);
      res.status(502).json({ 
        message: "Failed to generate CSV export"
      });
    }
  });

  // GET /api/export/pdf
  app.get("/api/export/pdf", async (req, res) => {
    try {
      const filters = {
        groupIds: req.query.groupIds ? (req.query.groupIds as string).split(',') : undefined,
        studentIds: req.query.studentIds ? (req.query.studentIds as string).split(',') : undefined,
        dateFrom: req.query.dateFrom as string,
        dateTo: req.query.dateTo as string,
        status: req.query.status as 'obecny' | 'nieobecny' | 'all' | undefined
      };

      const report = await getAttendanceReport(filters);
      
      // Generate HTML content for PDF
      const htmlContent = `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <title>Raport Obecności</title>
          <style>
            body { font-family: Arial, sans-serif; margin: 20px; }
            .header { text-align: center; margin-bottom: 30px; }
            .stats { display: flex; gap: 20px; margin-bottom: 30px; }
            .stat-box { border: 1px solid #ddd; padding: 15px; border-radius: 5px; flex: 1; }
            table { width: 100%; border-collapse: collapse; }
            th, td { border: 1px solid #ddd; padding: 8px; text-align: left; }
            th { background-color: #f2f2f2; }
            .present { color: #16a34a; font-weight: bold; }
            .absent { color: #dc2626; font-weight: bold; }
            .filters { margin-bottom: 20px; font-size: 0.9em; color: #666; }
          </style>
        </head>
        <body>
          <div class="header">
            <h1>Raport Obecności</h1>
            <p>Wygenerowano: ${new Date().toLocaleDateString('pl-PL')}</p>
          </div>
          
          <div class="filters">
            <strong>Filtry:</strong>
            ${filters.dateFrom ? `Data od: ${filters.dateFrom}` : ''}
            ${filters.dateTo ? ` do: ${filters.dateTo}` : ''}
            ${filters.groupIds?.length ? ` | Grupy: ${filters.groupIds.join(', ')}` : ''}
            ${filters.status && filters.status !== 'all' ? ` | Status: ${filters.status}` : ''}
          </div>

          <div class="stats">
            <div class="stat-box">
              <h3>Łączna obecność</h3>
              <p style="font-size: 24px; font-weight: bold;">${report.totalStats.attendancePercentage}%</p>
            </div>
            <div class="stat-box">
              <h3>Obecni</h3>
              <p style="font-size: 24px; color: #16a34a; font-weight: bold;">${report.totalStats.presentSessions}</p>
            </div>
            <div class="stat-box">
              <h3>Nieobecni</h3>
              <p style="font-size: 24px; color: #dc2626; font-weight: bold;">${report.totalStats.absentSessions}</p>
            </div>
          </div>

          <h2>Szczegóły obecności</h2>
          <table>
            <thead>
              <tr>
                <th>Student</th>
                <th>Grupa</th>
                <th>Data</th>
                <th>Status</th>
                <th>Notatki</th>
              </tr>
            </thead>
            <tbody>
              ${report.items.map(item => `
                <tr>
                  <td>${item.student_name}</td>
                  <td>${item.group_name}</td>
                  <td>${new Date(item.date).toLocaleDateString('pl-PL')}</td>
                  <td class="${item.status === 'obecny' ? 'present' : 'absent'}">${item.status}</td>
                  <td>${item.notes || '-'}</td>
                </tr>
              `).join('')}
            </tbody>
          </table>

          ${report.groupStats.length > 0 ? `
          <h2 style="margin-top: 40px;">Statystyki grup</h2>
          <table>
            <thead>
              <tr>
                <th>Grupa</th>
                <th>Liczba studentów</th>
                <th>Obecni</th>
                <th>Nieobecni</th>
                <th>% obecności</th>
              </tr>
            </thead>
            <tbody>
              ${report.groupStats.map(group => `
                <tr>
                  <td>${group.group_name}</td>
                  <td>${group.studentCount}</td>
                  <td class="present">${group.presentSessions}</td>
                  <td class="absent">${group.absentSessions}</td>
                  <td>${group.attendancePercentage}%</td>
                </tr>
              `).join('')}
            </tbody>
          </table>
          ` : ''}
        </body>
        </html>
      `;

      // Generate PDF using puppeteer - simplified approach without browser
      const htmlToPdf = `
        <div style="font-family: Arial; margin: 20px;">
          <h1>Raport Obecności</h1>
          <p>Data: ${new Date().toLocaleDateString('pl-PL')}</p>
          <p>Grupa: ${filters.groupIds?.join(', ') || 'Wszystkie'}</p>
          <p>Okres: ${filters.dateFrom} - ${filters.dateTo}</p>
          <h3>Statystyki:</h3>
          <p>Łączna obecność: ${report.totalStats.attendancePercentage}%</p>
          <p>Obecni: ${report.totalStats.presentSessions}, Nieobecni: ${report.totalStats.absentSessions}</p>
          <h3>Lista studentów:</h3>
          ${report.items.map(item => `
            <p>${item.student_name} (${item.group_name}) - ${new Date(item.date).toLocaleDateString('pl-PL')} - ${item.status}</p>
          `).join('')}
        </div>
      `;
      
      // For now, return HTML instead of PDF due to puppeteer complexity in Replit
      res.setHeader('Content-Type', 'text/html; charset=utf-8');
      res.setHeader('Content-Disposition', `attachment; filename="raport-obecnosci-${new Date().toISOString().split('T')[0]}.html"`);
      res.send(htmlToPdf);
    } catch (error) {
      console.error("Error generating PDF export:", error);
      res.status(502).json({ 
        message: "Failed to generate PDF export"
      });
    }
  });

  // === USER MANAGEMENT ROUTES ===
  
  // POST /api/auth/register - Public registration
  app.post("/api/auth/register", async (req, res) => {
    try {
      const userData = registerInstructorSchema.parse(req.body);

      // Convert empty phone to undefined (email is required)
      const phone = userData.phone && userData.phone.trim() !== '' ? userData.phone : undefined;

      // Check if username already exists
      const [existingUser] = await db
        .select({ id: instructorsAuth.id })
        .from(instructorsAuth)
        .where(eq(instructorsAuth.username, userData.username));

      if (existingUser) {
        return res.status(400).json({
          message: "Nazwa użytkownika już istnieje",
          code: "USERNAME_EXISTS"
        });
      }

      // Check if email already exists
      const [existingEmail] = await db
        .select({ id: instructorsAuth.id })
        .from(instructorsAuth)
        .where(eq(instructorsAuth.email, userData.email));

      if (existingEmail) {
        return res.status(400).json({
          message: "Adres email już istnieje",
          code: "EMAIL_EXISTS"
        });
      }

      // Hash password
      const hashedPassword = await hashPassword(userData.password);

      // Create user with pending status
      const [newUser] = await db
        .insert(instructorsAuth)
        .values({
          username: userData.username,
          password: hashedPassword,
          firstName: userData.firstName,
          lastName: userData.lastName,
          email: userData.email,
          phone: phone,
          role: 'instructor',
          status: 'pending',
          active: false, // Kept for compatibility
        })
        .returning();
        
      res.status(201).json({ 
        message: "Konto zostało utworzone. Oczekuje na zatwierdzenie przez administratora.",
        userId: newUser.id 
      });
    } catch (error) {
      console.error("Registration error:", error);

      // Handle Zod validation errors
      if (error instanceof Error && error.name === 'ZodError') {
        const zodError = error as any;
        const firstError = zodError.errors?.[0];
        return res.status(400).json({
          message: firstError?.message || "Błąd walidacji danych",
          code: "VALIDATION_ERROR"
        });
      }

      res.status(400).json({
        message: "Błąd podczas rejestracji",
        code: "REGISTRATION_ERROR"
      });
    }
  });

  // GET /api/admin/pending-users - List pending users (admin/reception only)
  app.get("/api/admin/pending-users", requireAuth, async (req: AuthenticatedRequest, res) => {
    if (!req.user?.permissions.canManageUsers) {
      return res.status(403).json({ 
        message: "Brak uprawnień do zarządzania użytkownikami",
        code: "INSUFFICIENT_PERMISSIONS" 
      });
    }
    
    try {
      const pendingUsers = await db
        .select({
          id: instructorsAuth.id,
          username: instructorsAuth.username,
          firstName: instructorsAuth.firstName,
          lastName: instructorsAuth.lastName,
          email: instructorsAuth.email,
          phone: instructorsAuth.phone,
          role: instructorsAuth.role,
          status: instructorsAuth.status,
          createdAt: instructorsAuth.createdAt,
        })
        .from(instructorsAuth)
        .where(eq(instructorsAuth.status, 'pending'));
        
      res.json({ users: pendingUsers });
    } catch (error) {
      console.error("Error fetching pending users:", error);
      res.status(500).json({ 
        message: "Błąd podczas pobierania użytkowników",
        code: "FETCH_USERS_ERROR" 
      });
    }
  });
  
  // POST /api/admin/approve-user - Approve pending user (admin/reception only)
  app.post("/api/admin/approve-user", requireAuth, async (req: AuthenticatedRequest, res) => {
    if (!req.user?.permissions.canManageUsers) {
      return res.status(403).json({ 
        message: "Brak uprawnień do zarządzania użytkownikami",
        code: "INSUFFICIENT_PERMISSIONS" 
      });
    }
    
    try {
      const { userId, role } = approveUserSchema.parse(req.body);
      
      // Update user status and role
      const [updatedUser] = await db
        .update(instructorsAuth)
        .set({
          status: 'active',
          role: role || 'instructor',
          active: true,
          approvedBy: req.user.id,
          approvedAt: new Date(),
          updatedAt: new Date(),
        })
        .where(eq(instructorsAuth.id, userId))
        .returning();
        
      if (!updatedUser) {
        return res.status(404).json({ 
          message: "Użytkownik nie został znaleziony",
          code: "USER_NOT_FOUND" 
        });
      }
      
      res.json({ 
        message: "Użytkownik został zatwierdzony",
        user: updatedUser 
      });
    } catch (error) {
      console.error("Error approving user:", error);
      res.status(400).json({ 
        message: "Błąd podczas zatwierdzania użytkownika",
        code: "APPROVE_USER_ERROR" 
      });
    }
  });

  // POST /api/auth/change-password - Change user password
  app.post("/api/auth/change-password", requireAuth, async (req: AuthenticatedRequest, res) => {
    try {
      const { currentPassword, newPassword } = req.body;
      
      if (!currentPassword || !newPassword) {
        return res.status(400).json({
          message: "Brak wymaganych pól",
          code: "MISSING_FIELDS"
        });
      }
      
      if (newPassword.length < 6) {
        return res.status(400).json({
          message: "Nowe hasło musi mieć co najmniej 6 znaków",
          code: "PASSWORD_TOO_SHORT"
        });
      }
      
      // Get current user
      const [user] = await db
        .select()
        .from(instructorsAuth)
        .where(eq(instructorsAuth.id, req.user!.id));
        
      if (!user) {
        return res.status(404).json({
          message: "Użytkownik nie został znaleziony",
          code: "USER_NOT_FOUND"
        });
      }
      
      // Verify current password
      const passwordValid = await verifyPassword(currentPassword, user.password);
      if (!passwordValid) {
        return res.status(400).json({
          message: "Obecne hasło jest nieprawidłowe",
          code: "INVALID_CURRENT_PASSWORD"
        });
      }
      
      // Hash new password and update
      const hashedNewPassword = await hashPassword(newPassword);
      await db
        .update(instructorsAuth)
        .set({
          password: hashedNewPassword,
          updatedAt: new Date()
        })
        .where(eq(instructorsAuth.id, req.user!.id));
        
      res.json({
        message: "Hasło zostało zmienione pomyślnie"
      });
    } catch (error) {
      console.error("Error changing password:", error);
      res.status(500).json({
        message: "Błąd podczas zmiany hasła",
        code: "CHANGE_PASSWORD_ERROR"
      });
    }
  });

  // === USER MANAGEMENT ROUTES ===

  // GET /api/admin/users - Get all users
  app.get("/api/admin/users", requireAuth, async (req: AuthenticatedRequest, res) => {
    try {
      // Only owners and reception can view all users
      if (!req.user?.permissions?.canManageUsers) {
        return res.status(403).json({
          message: "Brak uprawnień do zarządzania użytkownikami",
          code: "INSUFFICIENT_PERMISSIONS"
        });
      }

      const users = await db.select().from(instructorsAuth).orderBy(instructorsAuth.createdAt);
      res.json({ users });
    } catch (error) {
      console.error("Error fetching users:", error);
      res.status(500).json({
        message: "Błąd podczas pobierania użytkowników",
        code: "FETCH_USERS_ERROR"
      });
    }
  });

  // PUT /api/admin/users/:id/password - Update user password (admin only)
  app.put("/api/admin/users/:id/password", requireAuth, async (req: AuthenticatedRequest, res) => {
    try {
      // Only owners can update passwords
      if (req.user?.role !== 'owner') {
        return res.status(403).json({
          message: "Tylko właściciel może resetować hasła",
          code: "INSUFFICIENT_PERMISSIONS"
        });
      }

      const userId = parseInt(req.params.id);
      const { password } = req.body;

      if (!password) {
        return res.status(400).json({
          message: "Hasło jest wymagane",
          code: "MISSING_PASSWORD"
        });
      }

      // Hash the new password
      const hashedPassword = await hashPassword(password);
      
      await db
        .update(instructorsAuth)
        .set({
          password: hashedPassword,
          updatedAt: new Date()
        })
        .where(eq(instructorsAuth.id, userId));

      res.json({
        message: "Hasło zostało zmienione pomyślnie"
      });
    } catch (error) {
      console.error("Error updating password:", error);
      res.status(500).json({
        message: "Błąd podczas zmiany hasła",
        code: "UPDATE_PASSWORD_ERROR"
      });
    }
  });

  // POST /api/admin/create-user - Create new user
  app.post("/api/admin/create-user", requireAuth, async (req: AuthenticatedRequest, res) => {
    try {
      // Only owners and reception can create users
      if (!req.user?.permissions?.canManageUsers) {
        return res.status(403).json({
          message: "Brak uprawnień do tworzenia użytkowników",
          code: "INSUFFICIENT_PERMISSIONS"
        });
      }

      const { username, firstName, lastName, email, role } = req.body;

      if (!username || !firstName || !lastName) {
        return res.status(400).json({
          message: "Wymagane pola: username, firstName, lastName",
          code: "MISSING_REQUIRED_FIELDS"
        });
      }

      // Check if username already exists
      const [existingUser] = await db
        .select()
        .from(instructorsAuth)
        .where(eq(instructorsAuth.username, username));

      if (existingUser) {
        return res.status(400).json({
          message: "Użytkownik o tej nazwie już istnieje",
          code: "USERNAME_EXISTS"
        });
      }

      // Create user with default password
      const defaultPassword = await hashPassword('changeme123');
      
      const [newUser] = await db.insert(instructorsAuth).values({
        username,
        password: defaultPassword,
        firstName,
        lastName,
        email: email || null,
        role: role || 'instructor',
        status: 'active',
        active: true,
        createdAt: new Date(),
        updatedAt: new Date()
      }).returning();

      // NOTE: User sync to Google Sheets removed - using only database now

      res.json({
        message: "Użytkownik został utworzony",
        user: {
          id: newUser.id,
          username: newUser.username,
          firstName: newUser.firstName,
          lastName: newUser.lastName,
          email: newUser.email,
          role: newUser.role,
          status: newUser.status,
          active: newUser.active
        }
      });
    } catch (error) {
      console.error("Error creating user:", error);
      res.status(500).json({
        message: "Błąd podczas tworzenia użytkownika",
        code: "CREATE_USER_ERROR"
      });
    }
  });

  // PATCH /api/admin/users/:id - Update user information
  app.patch("/api/admin/users/:id", requireAuth, async (req: AuthenticatedRequest, res) => {
    try {
      // Only owners and reception can update users
      if (!req.user?.permissions?.canManageUsers) {
        return res.status(403).json({
          message: "Brak uprawnień do aktualizacji użytkowników",
          code: "INSUFFICIENT_PERMISSIONS"
        });
      }

      const userId = parseInt(req.params.id);
      const { firstName, lastName, email, role, active, status } = req.body;

      if (!userId) {
        return res.status(400).json({
          message: "Nieprawidłowe ID użytkownika",
          code: "INVALID_USER_ID"
        });
      }

      // Check if user exists
      const [existingUser] = await db
        .select()
        .from(instructorsAuth)
        .where(eq(instructorsAuth.id, userId));

      if (!existingUser) {
        return res.status(404).json({
          message: "Użytkownik nie został znaleziony",
          code: "USER_NOT_FOUND"
        });
      }

      // Build update data - only update provided fields
      const updateData: any = {
        updatedAt: new Date()
      };

      if (firstName !== undefined) updateData.firstName = firstName;
      if (lastName !== undefined) updateData.lastName = lastName;
      if (email !== undefined) updateData.email = email;
      if (role !== undefined) updateData.role = role;
      if (active !== undefined) {
        updateData.active = active;
        // Auto-update status based on active flag if status not explicitly provided
        if (status === undefined) {
          updateData.status = active ? 'active' : 'inactive';
        }
      }
      if (status !== undefined) updateData.status = status;

      const [updatedUser] = await db
        .update(instructorsAuth)
        .set(updateData)
        .where(eq(instructorsAuth.id, userId))
        .returning();

      res.json({
        message: "Użytkownik został zaktualizowany",
        user: updatedUser
      });
    } catch (error) {
      console.error("Error updating user:", error);
      res.status(500).json({
        message: "Błąd podczas aktualizacji użytkownika",
        code: "UPDATE_USER_ERROR"
      });
    }
  });

  // === DEBUG ROUTE ===
  app.get("/api/debug/kpop-sheet", requireAuth, async (req: AuthenticatedRequest, res) => {
    try {
      const sheets = await db.execute(sql`
        SELECT spreadsheet_id FROM groups_config WHERE group_id = 'k-pop'
      `);
      
      const spreadsheetId = sheets.rows[0]?.spreadsheet_id;
      res.json({
        group: 'k-pop',
        spreadsheetId,
        message: 'Check this spreadsheet ID manually in Google Sheets'
      });
    } catch (error: any) {
      res.json({ error: error?.message || 'Unknown error' });
    }
  });

  // === USER SYNCHRONIZATION ROUTES ===
  // REMOVED: All user sync endpoints - using only database now
  // Note: PATCH /api/admin/users/:id endpoint is now consolidated above (line 961)

  // PUT /api/admin/users/:id/groups - Update user's assigned groups
  app.put("/api/admin/users/:id/groups", requireAuth, async (req: AuthenticatedRequest, res) => {
    try {
      // Only owners and reception can assign groups
      if (!req.user?.permissions?.canAssignGroups) {
        return res.status(403).json({
          message: "Brak uprawnień do przypisywania grup",
          code: "INSUFFICIENT_PERMISSIONS"
        });
      }

      const userId = parseInt(req.params.id);
      const { groupIds } = req.body;

      if (!userId) {
        return res.status(400).json({
          message: "Nieprawidłowe ID użytkownika",
          code: "INVALID_USER_ID"
        });
      }

      if (!Array.isArray(groupIds)) {
        return res.status(400).json({
          message: "grupIds musi być tablicą",
          code: "INVALID_GROUP_IDS"
        });
      }

      // Update user's groups
      const [updatedUser] = await db
        .update(instructorsAuth)
        .set({
          groupIds,
          updatedAt: new Date()
        })
        .where(eq(instructorsAuth.id, userId))
        .returning();

      if (!updatedUser) {
        return res.status(404).json({
          message: "Użytkownik nie został znaleziony",
          code: "USER_NOT_FOUND"
        });
      }

      // NOTE: User sync to Google Sheets removed - using only database now

      res.json({
        message: "Grupy użytkownika zostały zaktualizowane",
        user: {
          id: updatedUser.id,
          username: updatedUser.username,
          firstName: updatedUser.firstName,
          lastName: updatedUser.lastName,
          groupIds: updatedUser.groupIds
        }
      });
    } catch (error) {
      console.error("Error updating user groups:", error);
      res.status(500).json({
        message: "Błąd podczas aktualizacji grup użytkownika",
        code: "UPDATE_GROUPS_ERROR"
      });
    }
  });

  // DELETE /api/admin/users/:id - Delete inactive user (owner only)
  app.delete("/api/admin/users/:id", requireAuth, async (req: AuthenticatedRequest, res) => {
    try {
      // Only owners can delete users
      if (req.user?.role !== 'owner') {
        return res.status(403).json({
          message: "Tylko właściciel może usuwać użytkowników",
          code: "INSUFFICIENT_PERMISSIONS"
        });
      }

      const userId = parseInt(req.params.id);

      if (!userId) {
        return res.status(400).json({
          message: "Nieprawidłowe ID użytkownika",
          code: "INVALID_USER_ID"
        });
      }

      // Check if user exists and is inactive
      const [existingUser] = await db
        .select()
        .from(instructorsAuth)
        .where(eq(instructorsAuth.id, userId));

      if (!existingUser) {
        return res.status(404).json({
          message: "Użytkownik nie został znaleziony",
          code: "USER_NOT_FOUND"
        });
      }

      if (existingUser.active) {
        return res.status(400).json({
          message: "Można usunąć tylko nieaktywnych użytkowników",
          code: "USER_IS_ACTIVE"
        });
      }

      // Delete user
      await db
        .delete(instructorsAuth)
        .where(eq(instructorsAuth.id, userId));

      res.json({
        message: "Użytkownik został usunięty",
        deletedUserId: userId
      });
    } catch (error) {
      console.error("Error deleting user:", error);
      res.status(500).json({
        message: "Błąd podczas usuwania użytkownika",
        code: "USER_DELETE_ERROR"
      });
    }
  });

  // === GROUPS CONFIGURATION ROUTES ===
  
  // GET /api/admin/groups-config - List all groups configurations (reception/owner only)
  app.get("/api/admin/groups-config", requireAuth, async (req: AuthenticatedRequest, res) => {
    if (!req.user?.permissions.canManageUsers) {
      return res.status(403).json({ 
        message: "Brak uprawnień do zarządzania konfiguracją arkuszy",
        code: "INSUFFICIENT_PERMISSIONS" 
      });
    }
    
    try {
      const configs = await db
        .select({
          id: groupsConfig.id,
          groupId: groupsConfig.groupId,
          name: groupsConfig.name,
          spreadsheetId: groupsConfig.spreadsheetId,
          sheetGroupId: groupsConfig.sheetGroupId,
          active: groupsConfig.active,
          createdAt: groupsConfig.createdAt,
          updatedAt: groupsConfig.updatedAt,
        })
        .from(groupsConfig)
        .orderBy(groupsConfig.name);
        
      res.json({ configs });
    } catch (error) {
      console.error("Error fetching groups configurations:", error);
      res.status(500).json({ 
        message: "Błąd podczas pobierania konfiguracji grup",
        code: "FETCH_CONFIGS_ERROR" 
      });
    }
  });
  
  // POST /api/admin/groups-config - Create new group configuration (reception/owner only)
  app.post("/api/admin/groups-config", requireAuth, async (req: AuthenticatedRequest, res) => {
    if (!req.user?.permissions.canManageUsers) {
      return res.status(403).json({ 
        message: "Brak uprawnień do zarządzania konfiguracją arkuszy",
        code: "INSUFFICIENT_PERMISSIONS" 
      });
    }
    
    try {
      const configData = createGroupConfigSchema.parse(req.body);
      
      // Check if groupId already exists
      const [existingConfig] = await db
        .select({ id: groupsConfig.id })
        .from(groupsConfig)
        .where(eq(groupsConfig.groupId, configData.groupId));
        
      if (existingConfig) {
        return res.status(400).json({ 
          message: "Konfiguracja dla tej grupy już istnieje",
          code: "GROUP_CONFIG_EXISTS" 
        });
      }
      
      // Create new configuration
      const [newConfig] = await db
        .insert(groupsConfig)
        .values({
          ...configData,
          createdBy: req.user.id,
          updatedBy: req.user.id,
        })
        .returning({
          id: groupsConfig.id,
          groupId: groupsConfig.groupId,
          name: groupsConfig.name,
          spreadsheetId: groupsConfig.spreadsheetId,
          sheetGroupId: groupsConfig.sheetGroupId,
          active: groupsConfig.active,
          createdAt: groupsConfig.createdAt,
          updatedAt: groupsConfig.updatedAt,
        });
        
      // Clear groups cache to refresh groups list
      clearCache('groups');
        
      res.status(201).json({ 
        message: "Konfiguracja grupy została utworzona",
        config: newConfig
      });
    } catch (error) {
      console.error("Error creating group configuration:", error);
      res.status(400).json({ 
        message: "Błąd podczas tworzenia konfiguracji grupy",
        code: "CREATE_CONFIG_ERROR" 
      });
    }
  });
  
  // PUT /api/admin/groups-config/:id - Update group configuration (reception/owner only)
  app.put("/api/admin/groups-config/:id", requireAuth, async (req: AuthenticatedRequest, res) => {
    if (!req.user?.permissions.canManageUsers) {
      return res.status(403).json({ 
        message: "Brak uprawnień do zarządzania konfiguracją arkuszy",
        code: "INSUFFICIENT_PERMISSIONS" 
      });
    }
    
    try {
      const configId = parseInt(req.params.id);
      const updateData = updateGroupConfigSchema.parse(req.body);
      
      if (!configId) {
        return res.status(400).json({
          message: "Nieprawidłowe ID konfiguracji",
          code: "INVALID_CONFIG_ID"
        });
      }
      
      // Update configuration
      const [updatedConfig] = await db
        .update(groupsConfig)
        .set({
          ...updateData,
          updatedBy: req.user.id,
          updatedAt: new Date()
        })
        .where(eq(groupsConfig.id, configId))
        .returning({
          id: groupsConfig.id,
          groupId: groupsConfig.groupId,
          name: groupsConfig.name,
          spreadsheetId: groupsConfig.spreadsheetId,
          sheetGroupId: groupsConfig.sheetGroupId,
          active: groupsConfig.active,
          createdAt: groupsConfig.createdAt,
          updatedAt: groupsConfig.updatedAt,
        });
        
      if (!updatedConfig) {
        return res.status(404).json({
          message: "Konfiguracja grupy nie została znaleziona",
          code: "CONFIG_NOT_FOUND"
        });
      }
      
      // Clear groups cache to refresh groups list
      clearCache('groups');
      
      res.json({
        message: "Konfiguracja grupy została zaktualizowana",
        config: updatedConfig
      });
    } catch (error) {
      console.error("Error updating group configuration:", error);
      res.status(500).json({
        message: "Błąd podczas aktualizacji konfiguracji grupy",
        code: "UPDATE_CONFIG_ERROR"
      });
    }
  });
  
  // DELETE /api/admin/groups-config/:id - Delete group configuration (owner only)
  app.delete("/api/admin/groups-config/:id", requireAuth, async (req: AuthenticatedRequest, res) => {
    if (req.user?.role !== 'owner') {
      return res.status(403).json({ 
        message: "Tylko właściciel może usuwać konfiguracje arkuszy",
        code: "INSUFFICIENT_PERMISSIONS" 
      });
    }
    
    try {
      const configId = parseInt(req.params.id);
      
      if (!configId) {
        return res.status(400).json({
          message: "Nieprawidłowe ID konfiguracji",
          code: "INVALID_CONFIG_ID"
        });
      }
      
      // Delete configuration (soft delete by setting active = false)
      const [deletedConfig] = await db
        .update(groupsConfig)
        .set({
          active: false,
          updatedBy: req.user.id,
          updatedAt: new Date()
        })
        .where(eq(groupsConfig.id, configId))
        .returning({
          id: groupsConfig.id,
          groupId: groupsConfig.groupId,
          name: groupsConfig.name
        });
        
      if (!deletedConfig) {
        return res.status(404).json({
          message: "Konfiguracja grupy nie została znaleziona",
          code: "CONFIG_NOT_FOUND"
        });
      }
      
      // Clear groups cache to refresh groups list
      clearCache('groups');
      
      res.json({
        message: "Konfiguracja grupy została usunięta",
        config: deletedConfig
      });
    } catch (error) {
      console.error("Error deleting group configuration:", error);
      res.status(500).json({
        message: "Błąd podczas usuwania konfiguracji grupy",
        code: "DELETE_CONFIG_ERROR"
      });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}
