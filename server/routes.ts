import type { Express } from "express";
import { createServer, type Server } from "http";
import { getGroups, getStudents, getAttendance, setAttendance, getInstructors, getInstructorGroups, getInstructorsForGroup, getAttendanceReport } from "./lib/sheets";
import { attendanceRequestSchema } from "@shared/schema";

export async function registerRoutes(app: Express): Promise<Server> {
  // GET /api/groups
  app.get("/api/groups", async (req, res) => {
    try {
      const groups = await getGroups();
      res.json({ groups });
    } catch (error) {
      console.error("Error fetching groups:", error);
      res.status(502).json({ 
        message: "Failed to fetch groups from Google Sheets",
        hint: "Ensure the sheet is shared with the service account as Editor"
      });
    }
  });

  // GET /api/students?groupId=G1&showInactive=true
  app.get("/api/students", async (req, res) => {
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

  // GET /api/attendance?groupId=G1&date=2025-01-01
  app.get("/api/attendance", async (req, res) => {
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

  // GET /api/attendance/exists - Check if attendance already exists
  app.get("/api/attendance/exists", async (req, res) => {
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

  // POST /api/attendance
  app.post("/api/attendance", async (req, res) => {
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

  const httpServer = createServer(app);
  return httpServer;
}
