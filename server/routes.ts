import type { Express } from "express";
import { createServer, type Server } from "http";
import { getGroups, getStudents, getAttendance, setAttendance, getInstructors, getInstructorGroups, getInstructorsForGroup, getAttendanceReport } from "./lib/sheets";
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
        .select()
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

      // Get user's groups
      const groupAssignments = await db
        .select({ groupId: instructorGroupAssignments.groupId, role: instructorGroupAssignments.role })
        .from(instructorGroupAssignments)
        .where(eq(instructorGroupAssignments.instructorId, user.id));

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
          groupIds: groupAssignments.map(g => g.groupId),
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

  const httpServer = createServer(app);
  return httpServer;
}
