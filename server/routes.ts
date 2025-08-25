import type { Express } from "express";
import { createServer, type Server } from "http";
import { getGroups, getStudents, getAttendance, setAttendance, getInstructors, getInstructorGroups, getInstructorsForGroup, getAttendanceReport, getUsersFromSheets, syncUserToSheets, syncUsersToSheets, removeUserFromSheets } from "./lib/sheets";
import { attendanceRequestSchema, loginSchema, instructorsAuth, instructorGroupAssignments, registerInstructorSchema, updateUserStatusSchema, assignGroupSchema } from "@shared/schema";
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

      if (!user || !user.active) {
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
      
      // Create updated item with notes
      const updatedItem = {
        student_id,
        status: existingItem?.status || 'nieobecny',
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

  // GET /api/instructors
  app.get("/api/instructors", async (req, res) => {
    try {
      const instructors = await getInstructors();
      res.json({ instructors });
    } catch (error) {
      console.error("Error fetching instructors:", error);
      res.status(502).json({ 
        message: "Failed to fetch instructors from Google Sheets",
        hint: "Ensure the Instructors sheet exists and is shared with the service account as Editor"
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
      if (userData.email) {
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
          phone: userData.phone,
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
      const { userId, role } = updateUserStatusSchema.parse(req.body);
      
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

      // Sync to Google Sheets
      try {
        await syncUserToSheets({
          username: newUser.username,
          firstName: newUser.firstName || '',
          lastName: newUser.lastName || '',
          email: newUser.email || '',
          role: newUser.role || 'instructor',
          status: newUser.status || 'active',
          active: newUser.active !== false
        });
      } catch (syncError) {
        console.error('Failed to sync new user to sheets:', syncError);
        // Don't fail the request if sheet sync fails
      }

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

  // PATCH /api/admin/users/:id - Update user status
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
      const { active } = req.body;

      if (typeof active !== 'boolean') {
        return res.status(400).json({
          message: "Pole 'active' musi być typu boolean",
          code: "INVALID_ACTIVE_VALUE"
        });
      }

      // Update user
      const [updatedUser] = await db
        .update(instructorsAuth)
        .set({
          active,
          status: active ? 'active' : 'inactive',
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

      // Sync to Google Sheets
      try {
        await syncUserToSheets({
          username: updatedUser.username,
          firstName: updatedUser.firstName || '',
          lastName: updatedUser.lastName || '',
          email: updatedUser.email || '',
          role: updatedUser.role || 'instructor',
          status: updatedUser.status || 'active',
          active: updatedUser.active !== false
        });
      } catch (syncError) {
        console.error('Failed to sync updated user to sheets:', syncError);
        // Don't fail the request if sheet sync fails
      }

      res.json({
        message: "Status użytkownika został zaktualizowany",
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

  // === USER SYNCHRONIZATION ROUTES ===

  // Helper function to convert database user to sheet format
  function convertUserToSheetFormat(user: any) {
    return {
      username: user.username,
      firstName: user.firstName || user.first_name || '',
      lastName: user.lastName || user.last_name || '',
      email: user.email || '',
      role: user.role || 'instructor',
      status: user.status || 'active',
      active: user.active !== false,
      groups: user.groupIds ? user.groupIds.join(',') : '' // Convert array to comma-separated string
    };
  }

  // GET /api/users/sync/sheets - Get users from Google Sheets
  app.get("/api/users/sync/sheets", requireAuth, async (req: AuthenticatedRequest, res) => {
    try {
      // Only owners and reception can sync users
      if (!req.user?.permissions?.canManageUsers) {
        return res.status(403).json({
          message: "Brak uprawnień do synchronizacji użytkowników",
          code: "INSUFFICIENT_PERMISSIONS"
        });
      }

      const sheetUsers = await getUsersFromSheets();
      res.json({ users: sheetUsers });
    } catch (error) {
      console.error("Error fetching users from sheets:", error);
      res.status(500).json({
        message: "Błąd podczas pobierania użytkowników z arkusza",
        code: "SHEETS_FETCH_ERROR"
      });
    }
  });

  // POST /api/users/sync/to-sheets - Export users from database to Google Sheets
  app.post("/api/users/sync/to-sheets", requireAuth, async (req: AuthenticatedRequest, res) => {
    try {
      // Only owners and reception can sync users
      if (!req.user?.permissions?.canManageUsers) {
        return res.status(403).json({
          message: "Brak uprawnień do synchronizacji użytkowników",
          code: "INSUFFICIENT_PERMISSIONS"
        });
      }

      // Get all users from database
      const dbUsers = await db.select().from(instructorsAuth);
      
      // Convert to sheet format (excluding passwords)
      const sheetUsers = dbUsers.map(convertUserToSheetFormat);
      
      // Sync to sheets
      await syncUsersToSheets(sheetUsers);
      
      res.json({
        message: `Zsynchronizowano ${sheetUsers.length} użytkowników do arkusza`,
        count: sheetUsers.length
      });
    } catch (error) {
      console.error("Error syncing users to sheets:", error);
      res.status(500).json({
        message: "Błąd podczas synchronizacji użytkowników do arkusza",
        code: "SHEETS_SYNC_ERROR"
      });
    }
  });

  // POST /api/users/sync/from-sheets - Import users from Google Sheets to database
  app.post("/api/users/sync/from-sheets", requireAuth, async (req: AuthenticatedRequest, res) => {
    try {
      // Only owners and reception can sync users
      if (!req.user?.permissions?.canManageUsers) {
        return res.status(403).json({
          message: "Brak uprawnień do synchronizacji użytkowników",
          code: "INSUFFICIENT_PERMISSIONS"
        });
      }

      const sheetUsers = await getUsersFromSheets();
      let imported = 0;
      let updated = 0;
      let errors = 0;

      for (const sheetUser of sheetUsers) {
        try {
          // Check if user exists in database
          const [existingUser] = await db
            .select()
            .from(instructorsAuth)
            .where(eq(instructorsAuth.username, sheetUser.username));

          if (existingUser) {
            // Update existing user (except password)
            await db
              .update(instructorsAuth)
              .set({
                firstName: sheetUser.firstName,
                lastName: sheetUser.lastName,
                email: sheetUser.email,
                role: sheetUser.role as any,
                status: sheetUser.status as any,
                active: sheetUser.active,
                updatedAt: new Date()
              })
              .where(eq(instructorsAuth.username, sheetUser.username));
            updated++;
          } else {
            // Create new user with default password (should be changed on first login)
            const defaultPassword = await hashPassword('changeme123');
            
            await db.insert(instructorsAuth).values({
              username: sheetUser.username,
              password: defaultPassword,
              firstName: sheetUser.firstName,
              lastName: sheetUser.lastName,
              email: sheetUser.email,
              role: sheetUser.role as any,
              status: sheetUser.status as any,
              active: sheetUser.active,
              createdAt: new Date(),
              updatedAt: new Date()
            });
            imported++;
          }
        } catch (userError) {
          console.error(`Error processing user ${sheetUser.username}:`, userError);
          errors++;
        }
      }

      res.json({
        message: `Synchronizacja zakończona: ${imported} nowych, ${updated} zaktualizowanych, ${errors} błędów`,
        imported,
        updated,
        errors
      });
    } catch (error) {
      console.error("Error importing users from sheets:", error);
      res.status(500).json({
        message: "Błąd podczas importu użytkowników z arkusza",
        code: "SHEETS_IMPORT_ERROR"
      });
    }
  });

  // POST /api/users/sync/bidirectional - Full bidirectional sync
  app.post("/api/users/sync/bidirectional", requireAuth, async (req: AuthenticatedRequest, res) => {
    try {
      // Only owners and reception can sync users
      if (!req.user?.permissions?.canManageUsers) {
        return res.status(403).json({
          message: "Brak uprawnień do synchronizacji użytkowników",
          code: "INSUFFICIENT_PERMISSIONS"
        });
      }

      // Get users from both sources
      const [dbUsers, sheetUsers] = await Promise.all([
        db.select().from(instructorsAuth),
        getUsersFromSheets()
      ]);

      let dbImported = 0;
      let dbUpdated = 0;
      let sheetImported = 0;
      let sheetUpdated = 0;
      let errors = 0;

      // Create maps for easier lookup
      const dbUserMap = new Map(dbUsers.map(u => [u.username, u]));
      const sheetUserMap = new Map(sheetUsers.map(u => [u.username, u]));

      // Import from sheets to database
      for (const sheetUser of sheetUsers) {
        try {
          const dbUser = dbUserMap.get(sheetUser.username);
          
          if (dbUser) {
            // Update existing user in database
            await db
              .update(instructorsAuth)
              .set({
                firstName: sheetUser.firstName,
                lastName: sheetUser.lastName,
                email: sheetUser.email,
                role: sheetUser.role as any,
                status: sheetUser.status as any,
                active: sheetUser.active,
                updatedAt: new Date()
              })
              .where(eq(instructorsAuth.username, sheetUser.username));
            dbUpdated++;
          } else {
            // Create new user in database
            const defaultPassword = await hashPassword('changeme123');
            
            await db.insert(instructorsAuth).values({
              username: sheetUser.username,
              password: defaultPassword,
              firstName: sheetUser.firstName,
              lastName: sheetUser.lastName,
              email: sheetUser.email,
              role: sheetUser.role as any,
              status: sheetUser.status as any,
              active: sheetUser.active,
              createdAt: new Date(),
              updatedAt: new Date()
            });
            dbImported++;
          }
        } catch (userError) {
          console.error(`Error processing sheet user ${sheetUser.username}:`, userError);
          errors++;
        }
      }

      // Export new database users to sheets
      for (const dbUser of dbUsers) {
        try {
          const sheetUser = sheetUserMap.get(dbUser.username);
          
          if (!sheetUser) {
            // Add new user to sheets
            await syncUserToSheets(convertUserToSheetFormat(dbUser));
            sheetImported++;
          } else {
            // Check if sheet needs update (compare key fields)
            const dbConverted = convertUserToSheetFormat(dbUser);
            const needsUpdate = 
              sheetUser.firstName !== dbConverted.firstName ||
              sheetUser.lastName !== dbConverted.lastName ||
              sheetUser.email !== dbConverted.email ||
              sheetUser.role !== dbConverted.role ||
              sheetUser.status !== dbConverted.status ||
              sheetUser.active !== dbConverted.active;
              
            if (needsUpdate) {
              await syncUserToSheets(dbConverted);
              sheetUpdated++;
            }
          }
        } catch (userError) {
          console.error(`Error processing db user ${dbUser.username}:`, userError);
          errors++;
        }
      }

      // Remove users from sheets that don't exist in database
      let sheetDeleted = 0;
      for (const sheetUser of sheetUsers) {
        try {
          const dbUser = dbUserMap.get(sheetUser.username);
          if (!dbUser) {
            // User exists in sheet but not in database - remove from sheet
            await removeUserFromSheets(sheetUser.username);
            sheetDeleted++;
          }
        } catch (userError) {
          console.error(`Error removing sheet user ${sheetUser.username}:`, userError);
          errors++;
        }
      }

      res.json({
        message: `Synchronizacja dwukierunkowa zakończona`,
        database: {
          imported: dbImported,
          updated: dbUpdated
        },
        sheets: {
          imported: sheetImported,
          updated: sheetUpdated,
          deleted: sheetDeleted
        },
        errors
      });
    } catch (error) {
      console.error("Error in bidirectional sync:", error);
      res.status(500).json({
        message: "Błąd podczas synchronizacji dwukierunkowej",
        code: "BIDIRECTIONAL_SYNC_ERROR"
      });
    }
  });

  // PATCH /api/admin/users/:id - Update user information
  app.patch("/api/admin/users/:id", requireAuth, async (req: AuthenticatedRequest, res) => {
    try {
      // Only owners and reception can update users
      if (!req.user?.permissions?.canManageUsers) {
        return res.status(403).json({
          message: "Brak uprawnień do edycji użytkowników",
          code: "INSUFFICIENT_PERMISSIONS"
        });
      }

      const userId = parseInt(req.params.id);
      const { firstName, lastName, email, role, active } = req.body;

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

      // Update user
      const updateData: any = {
        firstName,
        lastName,
        email,
        role: role as any,
        updatedAt: new Date()
      };
      
      // Only update active/status if provided
      if (active !== undefined) updateData.active = active;
      if (req.body.status !== undefined) updateData.status = req.body.status;
      
      await db
        .update(instructorsAuth)
        .set(updateData)
        .where(eq(instructorsAuth.id, userId));

      res.json({
        message: "Użytkownik został zaktualizowany",
        userId
      });
    } catch (error) {
      console.error("Error updating user:", error);
      res.status(500).json({
        message: "Błąd podczas aktualizacji użytkownika",
        code: "USER_UPDATE_ERROR"
      });
    }
  });

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

      // Sync to Google Sheets
      try {
        await syncUserToSheets({
          username: updatedUser.username,
          firstName: updatedUser.firstName || '',
          lastName: updatedUser.lastName || '',
          email: updatedUser.email || '',
          role: updatedUser.role || 'instructor',
          status: updatedUser.status || 'active',
          active: updatedUser.active !== false,
          groups: groupIds.join(',')
        });
      } catch (syncError) {
        console.error('Failed to sync updated user groups to sheets:', syncError);
        // Don't fail the request if sheet sync fails
      }

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

  const httpServer = createServer(app);
  return httpServer;
}
