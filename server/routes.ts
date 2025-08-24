import type { Express } from "express";
import { createServer, type Server } from "http";
import { getGroups, getStudents, getAttendance, setAttendance } from "./lib/sheets";
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

  const httpServer = createServer(app);
  return httpServer;
}
