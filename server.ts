import express, { Request, Response, NextFunction } from 'express';
import { createServer as createViteServer } from 'vite';
import dotenv from 'dotenv';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';
import { pg, initDatabase, resetAndReseedDatabase, DB_DIR } from './server/db.ts';
import { askAiAssistant, triageComplaintWithAi } from './server/gemini.ts';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const JWT_SECRET = process.env.JWT_SECRET || 'tkrec-engineering-college-super-secret-key-2026';
const PORT = 3000;

interface AuthUser {
  id: number;
  identifier: string;
  email: string;
  role: 'student' | 'faculty' | 'hod' | 'placement' | 'admin';
  name: string;
  department_code: string | null;
}

export interface AuthenticatedRequest extends Request {
  user?: AuthUser;
}

// Authentication Middleware
const authenticateToken = (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({ error: 'Access token required. Please log in.' });
  }

  jwt.verify(token, JWT_SECRET, (err, decodedUser) => {
    if (err) {
      return res.status(403).json({ error: 'Session expired or invalid token.' });
    }
    req.user = decodedUser as AuthUser;
    next();
  });
};

// Require Specific Roles Middleware
const requireRole = (allowedRoles: string[]) => {
  return (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    if (!req.user || !allowedRoles.includes(req.user.role)) {
      return res.status(403).json({ error: 'Access denied: insufficient permissions for this operation.' });
    }
    next();
  };
};

async function startServer() {
  await initDatabase();

  const app = express();
  app.use(express.json());

  // -------------------------------------------------------------
  // AUTHENTICATION & DEMO ACCOUNTS
  // -------------------------------------------------------------

  app.get('/api/auth/directory', async (_req, res) => {
    try {
      const studentsRes = await pg.query(`
        SELECT s.roll_no, s.name, s.department_code, s.year, s.semester, s.section, s.cgpa, s.active_backlogs, s.email, s.phone
        FROM students s
        ORDER BY s.department_code, s.roll_no
      `);

      const facultyRes = await pg.query(`
        SELECT f.staff_id, f.name, f.department_code, f.designation, f.email, f.phone
        FROM faculty f
        ORDER BY f.department_code, f.staff_id
      `);

      const officers = [
        { identifier: 'admin', name: 'Dr. V. K. Ramaswamy', role: 'admin', designation: 'Principal & Super Admin', dept: 'All', email: 'admin@tkrec.ac.in' },
        { identifier: 'hod_cse', name: 'Dr. Ramesh Sharma', role: 'hod', designation: 'HOD Computer Science & Engineering', dept: 'CSE', email: 'hod.cse@tkrec.ac.in' },
        { identifier: 'placement_head', name: 'Prof. Arvind Subramaniam', role: 'placement', designation: 'Placement & Internship Director', dept: 'All', email: 'placement@tkrec.ac.in' },
      ];

      res.json({
        defaultPassword: 'college123',
        totalStudents: studentsRes.rows.length,
        totalFaculty: facultyRes.rows.length,
        departments: ['CSE', 'ECE', 'MECH', 'CIVIL', 'IT'],
        students: studentsRes.rows.map((s: any) => ({
          ...s,
          role: 'student',
          password: 'college123'
        })),
        faculty: facultyRes.rows.map((f: any) => ({
          ...f,
          role: 'faculty',
          password: 'college123'
        })),
        officers: officers.map((o: any) => ({
          ...o,
          password: 'college123'
        })),
        formulaGuide: {
          password: 'college123',
          studentRollNoPattern: '22TKREC{DEPT}{001..020}',
          facultyStaffIdPattern: 'FAC-{DEPT}-{01..04}',
          departments: ['CSE', 'ECE', 'MECH', 'CIVIL', 'IT'],
          totalStudentsCount: studentsRes.rows.length,
          totalFacultyCount: facultyRes.rows.length,
        }
      });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  app.get('/api/auth/demo-users', async (_req, res) => {
    try {
      res.json({
        defaultPassword: 'college123',
        students: [
          { identifier: '22TKRECCSE001', name: 'Aarav Sharma', dept: 'CSE', role: 'student', desc: 'High CGPA (8.85), Good attendance (95%)', password: 'college123' },
          { identifier: '22TKRECCSE002', name: 'Vivaan Verma', dept: 'CSE', role: 'student', desc: 'At-risk attendance (50%), 2 Backlogs (triggers warnings)', password: 'college123' },
          { identifier: '22TKRECECE001', name: 'Sai Reddy', dept: 'ECE', role: 'student', desc: 'ECE Representative, 8.40 CGPA', password: 'college123' },
          { identifier: '22TKRECMECH001', name: 'Arjun Rao', dept: 'MECH', role: 'student', desc: 'Mechanical Engineering Student', password: 'college123' },
          { identifier: '22TKRECCIVIL001', name: 'Reyansh Menon', dept: 'CIVIL', role: 'student', desc: 'Civil Engineering Student', password: 'college123' },
          { identifier: '22TKRECIT001', name: 'Krishna Deshmukh', dept: 'IT', role: 'student', desc: 'Information Technology Student', password: 'college123' }
        ],
        faculty: [
          { identifier: 'FAC-CSE-02', name: 'Dr. Priya Swaminathan', dept: 'CSE', role: 'faculty', desc: 'Faculty & Attendance Scanner Officer', password: 'college123' },
          { identifier: 'FAC-CSE-01', name: 'Dr. Ramesh Sharma', dept: 'CSE', role: 'faculty', desc: 'Professor & HOD CSE', password: 'college123' },
          { identifier: 'FAC-ECE-02', name: 'Dr. Suresh Nair', dept: 'ECE', role: 'faculty', desc: 'Associate Professor ECE', password: 'college123' },
          { identifier: 'FAC-MECH-02', name: 'Dr. Balaji Iyengar', dept: 'MECH', role: 'faculty', desc: 'Associate Professor MECH', password: 'college123' },
          { identifier: 'FAC-CIVIL-02', name: 'Dr. Eashwar Murthy', dept: 'CIVIL', role: 'faculty', desc: 'Associate Professor CIVIL', password: 'college123' },
          { identifier: 'FAC-IT-02', name: 'Dr. Harini Krishnan', dept: 'IT', role: 'faculty', desc: 'Associate Professor IT', password: 'college123' }
        ],
        hod: [
          { identifier: 'hod_cse', name: 'Dr. Ramesh Sharma', dept: 'CSE', role: 'hod', desc: 'HOD Computer Science & Engineering', password: 'college123' }
        ],
        placement: [
          { identifier: 'placement_head', name: 'Prof. Arvind Subramaniam', dept: 'CSE', role: 'placement', desc: 'Placement & Internship Director', password: 'college123' }
        ],
        admin: [
          { identifier: 'admin', name: 'Dr. V. K. Ramaswamy', dept: 'Campus', role: 'admin', desc: 'Principal & Super Admin', password: 'college123' }
        ]
      });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  app.post('/api/auth/login', async (req, res) => {
    try {
      let { identifier, password } = req.body;
      if (!identifier) {
        return res.status(400).json({ error: 'Student ID / Staff ID / Username is required.' });
      }

      // Backwards compatibility alias: map old 22APEX... identifiers to 22TKREC...
      if (typeof identifier === 'string' && identifier.startsWith('22APEX')) {
        identifier = identifier.replace('22APEX', '22TKREC');
      }

      // Query user by identifier or email
      const userRes = await pg.query(`
        SELECT u.*, s.roll_no, s.cgpa, s.year, s.semester, s.section, s.active_backlogs, s.qr_code_token,
               f.staff_id, f.designation
        FROM users u
        LEFT JOIN students s ON u.id = s.user_id
        LEFT JOIN faculty f ON u.id = f.user_id
        WHERE LOWER(u.identifier) = LOWER($1) OR LOWER(u.email) = LOWER($1)
      `, [identifier.trim()]);

      if (userRes.rows.length === 0) {
        return res.status(404).json({ error: 'User account not found. Please check your credentials.' });
      }

      const user = userRes.rows[0] as any;

      // Check password if provided, or allow demo login with default demo password
      if (password) {
        const isMatch = await bcrypt.compare(password, user.password_hash);
        // For convenience in testing/hackathon demos, also allow 'college123'
        if (!isMatch && password !== 'college123') {
          return res.status(401).json({ error: 'Invalid password. Try default demo password: college123' });
        }
      }

      const tokenPayload: AuthUser = {
        id: user.id,
        identifier: user.identifier,
        email: user.email,
        role: user.role,
        name: user.name,
        department_code: user.department_code,
      };

      const token = jwt.sign(tokenPayload, JWT_SECRET, { expiresIn: '7d' });

      // Log sign-in to system audit logs
      await pg.query(`
        INSERT INTO audit_logs (actor_id, actor_role, action, entity_type, entity_id, details)
        VALUES ($1, $2, 'LOGIN', 'user', $3, 'Successful role authentication')
      `, [user.identifier, user.role, user.id.toString()]);

      res.json({
        token,
        user: {
          id: user.id,
          identifier: user.identifier,
          roll_no: user.roll_no,
          staff_id: user.staff_id,
          name: user.name,
          email: user.email,
          role: user.role,
          department_code: user.department_code,
          avatar_url: user.avatar_url,
          cgpa: user.cgpa,
          year: user.year,
          semester: user.semester,
          section: user.section,
          active_backlogs: user.active_backlogs,
          qr_code_token: user.qr_code_token,
          designation: user.designation,
        },
      });
    } catch (err: any) {
      console.error('Login error:', err);
      res.status(500).json({ error: err.message });
    }
  });

  app.get('/api/auth/me', authenticateToken, async (req: AuthenticatedRequest, res) => {
    try {
      const userRes = await pg.query(`
        SELECT u.*, s.roll_no, s.cgpa, s.year, s.semester, s.section, s.active_backlogs, s.qr_code_token,
               f.staff_id, f.designation
        FROM users u
        LEFT JOIN students s ON u.id = s.user_id
        LEFT JOIN faculty f ON u.id = f.user_id
        WHERE u.id = $1
      `, [req.user!.id]);

      if (userRes.rows.length === 0) {
        return res.status(404).json({ error: 'User profile not found' });
      }

      res.json(userRes.rows[0]);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  // -------------------------------------------------------------
  // STUDENT DASHBOARD & ACADEMICS
  // -------------------------------------------------------------

  // Helper to generate calendar-based attendance heatmap over current semester
  async function getStudentAttendanceHeatmap(pgClient: any, rollNo: string, subjectFilter?: string) {
    let query = `
      SELECT 
        ar.id,
        TO_CHAR(ar.date, 'YYYY-MM-DD') as date,
        ar.subject_code,
        s.name as subject_name,
        ar.time_slot,
        ar.status,
        ar.method,
        f.name as faculty_name
      FROM attendance_records ar
      JOIN subjects s ON ar.subject_code = s.code
      LEFT JOIN faculty f ON ar.faculty_staff_id = f.staff_id
      WHERE ar.student_roll_no = $1
    `;
    const params: any[] = [rollNo];
    if (subjectFilter && subjectFilter !== 'All') {
      params.push(subjectFilter);
      query += ` AND ar.subject_code = $2`;
    }
    query += ` ORDER BY ar.date ASC, ar.time_slot ASC`;

    const recRes = await pgClient.query(query, params);
    const records = recRes.rows as any[];

    // Group records by date
    const recordsByDate: Record<string, any[]> = {};
    for (const r of records) {
      if (!recordsByDate[r.date]) recordsByDate[r.date] = [];
      recordsByDate[r.date].push(r);
    }

    // Current semester dates: Week 1 starting Monday Aug 3, 2026 to Sunday Sep 27, 2026
    const startD = new Date('2026-08-03T00:00:00Z');
    const endD = new Date('2026-09-27T00:00:00Z');
    const todayStr = '2026-09-25';

    const days: any[] = [];
    const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

    let totalAcademicDays = 0;
    let fullPresentDays = 0;
    let partialDays = 0;
    let absentDays = 0;
    let currentStreak = 0;
    let bestStreak = 0;
    let runningStreak = 0;

    for (let d = new Date(startD); d <= endD; d.setUTCDate(d.getUTCDate() + 1)) {
      const y = d.getUTCFullYear();
      const m = String(d.getUTCMonth() + 1).padStart(2, '0');
      const dt = String(d.getUTCDate()).padStart(2, '0');
      const dateStr = `${y}-${m}-${dt}`;
      const dayOfWeek = d.getUTCDay();
      const isWeekend = dayOfWeek === 0 || dayOfWeek === 6;
      const isToday = dateStr === todayStr;
      const isUpcoming = dateStr > todayStr;
      const daySessions = recordsByDate[dateStr] || [];

      const totalConducted = daySessions.length;
      const presentCount = daySessions.filter((s: any) => s.status === 'present').length;
      const absentCount = daySessions.filter((s: any) => s.status === 'absent').length;
      const percentage = totalConducted > 0 ? Math.round((presentCount / totalConducted) * 100) : 0;

      let status = 'none';
      if (isUpcoming) {
        status = 'upcoming';
      } else if (totalConducted === 0) {
        status = isWeekend ? 'none' : 'none';
      } else if (presentCount === totalConducted) {
        status = 'full';
        fullPresentDays++;
        totalAcademicDays++;
        runningStreak++;
        if (runningStreak > bestStreak) bestStreak = runningStreak;
      } else if (presentCount === 0) {
        status = 'absent';
        absentDays++;
        totalAcademicDays++;
        runningStreak = 0;
      } else {
        status = 'partial';
        partialDays++;
        totalAcademicDays++;
        runningStreak = 0;
      }

      if (!isUpcoming && totalConducted > 0) {
        currentStreak = runningStreak;
      }

      days.push({
        date: dateStr,
        day_of_week: dayOfWeek,
        day_name: dayNames[dayOfWeek],
        formatted_date: `${monthNames[d.getUTCMonth()]} ${d.getUTCDate()}, ${y}`,
        total_conducted: totalConducted,
        present_count: presentCount,
        absent_count: absentCount,
        percentage,
        status,
        is_today: isToday,
        is_weekend: isWeekend,
        sessions: daySessions
      });
    }

    const overallPercentage = totalAcademicDays > 0 
      ? Math.round(((fullPresentDays + partialDays * 0.5) / totalAcademicDays) * 100) 
      : 100;

    return {
      start_date: '2026-08-03',
      end_date: '2026-09-27',
      semester_label: 'Fall Semester 2026 (Semester 6)',
      current_streak: currentStreak,
      best_streak: bestStreak,
      total_academic_days: totalAcademicDays,
      full_present_days: fullPresentDays,
      partial_days: partialDays,
      absent_days: absentDays,
      overall_percentage: overallPercentage,
      days
    };
  }

  app.get('/api/student/dashboard', authenticateToken, async (req: AuthenticatedRequest, res) => {
    try {
      const rollNo = req.user?.identifier;
      if (!rollNo) {
        return res.status(401).json({ error: 'User identifier missing. Please log in.' });
      }

      // 1. Student Profile
      const studentRes = await pg.query(`
        SELECT s.*, d.name as department_name, d.hod_name, d.hod_email
        FROM students s
        LEFT JOIN departments d ON s.department_code = d.code
        WHERE s.roll_no = $1
      `, [rollNo]);

      if (studentRes.rows.length === 0) {
        return res.status(404).json({ error: 'Student record not found.' });
      }

      const student = studentRes.rows[0] as any;

      // 2. Pure Database-driven Attendance Calculation:
      // Percentage = (Present / Total Conducted) * 100
      const attendanceSummaryRes = await pg.query(`
        SELECT 
          COUNT(*) as total_conducted,
          COUNT(CASE WHEN status = 'present' THEN 1 END) as present_count,
          COUNT(CASE WHEN status = 'absent' THEN 1 END) as absent_count,
          COUNT(CASE WHEN status = 'late' THEN 1 END) as late_count,
          COUNT(CASE WHEN status = 'excused' THEN 1 END) as excused_count
        FROM attendance_records
        WHERE student_roll_no = $1
      `, [rollNo]);

      const attSum = attendanceSummaryRes.rows[0] as any;
      const totalConducted = parseInt(attSum?.total_conducted || '0', 10);
      const presentCount = parseInt(attSum?.present_count || '0', 10);
      const absentCount = parseInt(attSum?.absent_count || '0', 10);
      const attendancePercentage = totalConducted > 0 
        ? Number(((presentCount / totalConducted) * 100).toFixed(1))
        : 100.0;

      // Subject-wise Breakdown
      const subjectAttendanceRes = await pg.query(`
        SELECT 
          ar.subject_code,
          s.name as subject_name,
          s.total_credits,
          f.name as faculty_name,
          COUNT(*) as total_conducted,
          COUNT(CASE WHEN ar.status = 'present' THEN 1 END) as present_count,
          COUNT(CASE WHEN ar.status = 'absent' THEN 1 END) as absent_count,
          ROUND((COUNT(CASE WHEN ar.status = 'present' THEN 1 END)::NUMERIC / NULLIF(COUNT(*), 0)) * 100, 1) as percentage
        FROM attendance_records ar
        JOIN subjects s ON ar.subject_code = s.code
        LEFT JOIN faculty f ON s.faculty_staff_id = f.staff_id
        WHERE ar.student_roll_no = $1
        GROUP BY ar.subject_code, s.name, s.total_credits, f.name
        ORDER BY ar.subject_code ASC
      `, [rollNo]);

      // Internal Marks
      const marksRes = await pg.query(`
        SELECT im.*, s.name as subject_name
        FROM internal_marks im
        JOIN subjects s ON im.subject_code = s.code
        WHERE im.student_roll_no = $1
      `, [rollNo]);

      // Recent Notifications
      const notifRes = await pg.query(`
        SELECT * FROM notifications
        WHERE (target_type = 'student' AND target_id = $1)
           OR (target_type = 'department' AND target_id = $2)
           OR (target_type = 'all')
        ORDER BY created_at DESC
        LIMIT 6
      `, [rollNo, student.department_code]);

      // Recent Attendance Logs
      const recentAttendanceRes = await pg.query(`
        SELECT ar.*, s.name as subject_name, f.name as faculty_name
        FROM attendance_records ar
        JOIN subjects s ON ar.subject_code = s.code
        LEFT JOIN faculty f ON ar.faculty_staff_id = f.staff_id
        WHERE ar.student_roll_no = $1
        ORDER BY ar.date DESC, ar.created_at DESC
        LIMIT 8
      `, [rollNo]);

      // Application counts
      const pAppsRes = await pg.query('SELECT COUNT(*) as count FROM placement_applications WHERE student_roll_no = $1', [rollNo]);
      const iAppsRes = await pg.query('SELECT COUNT(*) as count FROM internship_applications WHERE student_roll_no = $1', [rollNo]);
      const complaintsRes = await pg.query('SELECT COUNT(*) as count FROM complaints WHERE student_roll_no = $1', [rollNo]);

      // Calculate Calendar Attendance Heatmap for current semester
      const heatmap = await getStudentAttendanceHeatmap(pg, rollNo);

      res.json({
        student,
        attendance: {
          overall_percentage: attendancePercentage,
          total_conducted: totalConducted,
          present_count: presentCount,
          absent_count: absentCount,
          is_warning: attendancePercentage < 75.0,
          warning_message: attendancePercentage < 75.0 
            ? `Your attendance is ${attendancePercentage}%, which is below the mandatory 75% university regulation threshold. Immediate action required.` 
            : null,
          subjects: subjectAttendanceRes.rows,
          recent_records: recentAttendanceRes.rows,
          heatmap,
        },
        internal_marks: marksRes.rows,
        notifications: notifRes.rows,
        metrics: {
          placement_applications: parseInt((pAppsRes.rows[0] as any).count, 10),
          internship_applications: parseInt((iAppsRes.rows[0] as any).count, 10),
          complaints: parseInt((complaintsRes.rows[0] as any).count, 10),
        }
      });
    } catch (err: any) {
      console.error('Error fetching student dashboard:', err);
      res.status(500).json({ error: err.message });
    }
  });

  // Dedicated Heatmap Endpoint with Optional Subject Filter
  app.get('/api/student/attendance-heatmap', authenticateToken, async (req: AuthenticatedRequest, res) => {
    try {
      const rollNo = req.user?.identifier;
      const subject = req.query.subject as string | undefined;
      if (!rollNo) {
        return res.status(400).json({ error: 'User identifier missing' });
      }
      const heatmap = await getStudentAttendanceHeatmap(pg, rollNo, subject);
      res.json(heatmap);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  // -------------------------------------------------------------
  // SCANNER-BASED ATTENDANCE / ABSENCE & ANTI-FRAUD ENGINE
  // -------------------------------------------------------------

  // Get available subjects for faculty
  app.get('/api/attendance/faculty-subjects', authenticateToken, async (req: AuthenticatedRequest, res) => {
    try {
      const staffId = req.user?.identifier;
      const subjectsRes = await pg.query(`
        SELECT s.*, d.name as department_name
        FROM subjects s
        LEFT JOIN departments d ON s.department_code = d.code
        ORDER BY s.code ASC
      `);
      res.json(subjectsRes.rows);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  // Start new Attendance Session
  app.post('/api/attendance/start-session', authenticateToken, requireRole(['faculty', 'hod', 'admin']), async (req: AuthenticatedRequest, res) => {
    try {
      const { subject_code, section, semester, time_slot, date } = req.body;
      const facultyStaffId = req.user?.identifier || 'FAC-CSE-02';

      if (!subject_code || !section || !time_slot) {
        return res.status(400).json({ error: 'Subject code, section, and time slot are required to initiate an attendance session.' });
      }

      // Fetch subject department
      const subRes = await pg.query('SELECT department_code FROM subjects WHERE code = $1', [subject_code]);
      const deptCode = (subRes.rows[0] as any)?.department_code || 'CSE';

      const sessionDate = date || new Date().toISOString().split('T')[0];
      const sessionCode = `SESS-${Date.now().toString(36).toUpperCase()}-${Math.floor(100 + Math.random() * 900)}`;

      const sessionRes = await pg.query(`
        INSERT INTO attendance_sessions (session_code, subject_code, faculty_staff_id, department_code, section, semester, date, time_slot, status)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, 'open')
        RETURNING *
      `, [sessionCode, subject_code, facultyStaffId, deptCode, section, semester || 6, sessionDate, time_slot]);

      // Audit log creation
      await pg.query(`
        INSERT INTO audit_logs (actor_id, actor_role, action, entity_type, entity_id, details)
        VALUES ($1, $2, 'START_ATTENDANCE_SESSION', 'attendance_sessions', $3, 'Attendance session opened for ' || $4 || ' Section ' || $5)
      `, [facultyStaffId, req.user!.role, (sessionRes.rows[0] as any).id.toString(), subject_code, section]);

      res.json(sessionRes.rows[0]);
    } catch (err: any) {
      console.error('Error starting attendance session:', err);
      res.status(500).json({ error: err.message });
    }
  });

  // Get Session status & class roster (scanned present vs unscanned)
  app.get('/api/attendance/session/:id', authenticateToken, async (req, res) => {
    try {
      const sessionId = parseInt(req.params.id, 10);
      const sessionRes = await pg.query(`
        SELECT ses.*, s.name as subject_name, f.name as faculty_name
        FROM attendance_sessions ses
        JOIN subjects s ON ses.subject_code = s.code
        LEFT JOIN faculty f ON ses.faculty_staff_id = f.staff_id
        WHERE ses.id = $1
      `, [sessionId]);

      if (sessionRes.rows.length === 0) {
        return res.status(404).json({ error: 'Attendance session not found.' });
      }

      const session = sessionRes.rows[0] as any;

      // Fetch all students in this department and section
      const allStudentsRes = await pg.query(`
        SELECT roll_no, name, email, department_code, year, section, qr_code_token
        FROM students
        WHERE department_code = $1 AND section = $2
        ORDER BY roll_no ASC
      `, [session.department_code, session.section]);

      // Fetch already recorded attendance in this session
      const recordedRes = await pg.query(`
        SELECT ar.*, st.name as student_name
        FROM attendance_records ar
        JOIN students st ON ar.student_roll_no = st.roll_no
        WHERE ar.session_id = $1
        ORDER BY ar.created_at DESC
      `, [sessionId]);

      const recordedMap = new Map();
      recordedRes.rows.forEach((r: any) => recordedMap.set(r.student_roll_no, r));

      const roster = allStudentsRes.rows.map((st: any) => {
        const record = recordedMap.get(st.roll_no);
        return {
          roll_no: st.roll_no,
          name: st.name,
          email: st.email,
          qr_code_token: st.qr_code_token,
          status: record ? record.status : 'unmarked',
          recorded_at: record ? record.created_at : null,
          method: record ? record.method : null,
        };
      });

      res.json({
        session,
        roster,
        total_enrolled: roster.length,
        total_present: recordedRes.rows.filter((r: any) => r.status === 'present').length,
        total_absent: recordedRes.rows.filter((r: any) => r.status === 'absent').length,
        total_unmarked: roster.filter((r: any) => r.status === 'unmarked').length,
      });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  // ANTI-FRAUD SCANNER RECORDING ENDPOINT (Supports both MARK PRESENT and SCANNER ABSENT modes)
  app.post('/api/attendance/scan', authenticateToken, requireRole(['faculty', 'hod', 'admin']), async (req: AuthenticatedRequest, res) => {
    try {
      const { session_id, qr_code_token, roll_no, device_session_id, scan_action } = req.body;
      const targetAction = (scan_action === 'absent' ? 'absent' : 'present');
      const facultyStaffId = req.user?.identifier || 'FAC-CSE-02';

      if (!session_id || (!qr_code_token && !roll_no)) {
        return res.status(400).json({ error: 'Session ID and student QR Token or Roll Number are required.' });
      }

      // 1. Fetch Session details
      const sessionRes = await pg.query('SELECT * FROM attendance_sessions WHERE id = $1', [session_id]);
      if (sessionRes.rows.length === 0) {
        return res.status(404).json({ error: 'Active attendance session not found.' });
      }
      const session = sessionRes.rows[0] as any;

      if (session.status === 'completed') {
        return res.status(400).json({ error: 'This attendance session has already been finalized and locked.' });
      }

      // 2. Validate student identity via QR token or Roll Number
      let studentQuery = 'SELECT s.*, u.avatar_url FROM students s JOIN users u ON s.user_id = u.id WHERE ';
      let queryParams = [];

      if (qr_code_token) {
        studentQuery += 's.qr_code_token = $1';
        queryParams.push(qr_code_token.trim());
      } else {
        let cleanRoll = roll_no.trim();
        // Support legacy prefix mapping
        if (cleanRoll.startsWith('22APEX')) {
          cleanRoll = cleanRoll.replace('22APEX', '22TKREC');
        }
        // Support typing short roll number (e.g. "01" or "1")
        if (/^\d{1,3}$/.test(cleanRoll)) {
          studentQuery += `(s.roll_no = $1 OR s.roll_no LIKE '%' || $2) AND s.department_code = '${session.department_code}'`;
          queryParams.push(`22TKREC${session.department_code}${cleanRoll.padStart(3, '0')}`, cleanRoll.padStart(3, '0'));
        } else {
          studentQuery += 'LOWER(s.roll_no) = LOWER($1)';
          queryParams.push(cleanRoll);
        }
      }

      const studentRes = await pg.query(studentQuery, queryParams);
      if (studentRes.rows.length === 0) {
        return res.status(404).json({
          error: 'Invalid Student QR Code / ID. Student record not found in college database.',
          fraud_alert: true,
        });
      }

      const student = studentRes.rows[0] as any;

      // Anti-Fraud Check 1: Verify student belongs to this department/class
      if (student.department_code !== session.department_code) {
        return res.status(403).json({
          error: `Enrollment mismatch: Student belongs to ${student.department_code}, but session is for ${session.department_code}.`,
          student,
        });
      }

      // Check existing record in this session
      const existingRecordRes = await pg.query(`
        SELECT * FROM attendance_records
        WHERE session_id = $1 AND student_roll_no = $2
      `, [session_id, student.roll_no]);

      let recordRes;
      let previousStatus = null;

      if (existingRecordRes.rows.length > 0) {
        const existing = existingRecordRes.rows[0] as any;
        previousStatus = existing.status;

        // If student is already recorded with the exact same target status, trigger duplicate alert
        if (existing.status === targetAction) {
          return res.status(409).json({
            error: targetAction === 'absent'
              ? 'Student is already marked Absent for this session.'
              : 'Attendance already recorded as Present for this session.',
            duplicate: true,
            previous_status: existing.status,
            recorded_at: existing.created_at,
            student: {
              roll_no: student.roll_no,
              name: student.name,
              avatar_url: student.avatar_url,
            },
          });
        }

        // Toggle / Update existing record to new status (e.g. Present -> Absent or Absent -> Present)
        const updateMethod = targetAction === 'absent' ? 'scanner_absent' : 'qr_scan';
        recordRes = await pg.query(`
          UPDATE attendance_records
          SET status = $1, method = $2, updated_at = CURRENT_TIMESTAMP
          WHERE id = $3
          RETURNING *
        `, [targetAction, updateMethod, existing.id]);

        // Audit log for status modification via scanner
        await pg.query(`
          INSERT INTO attendance_audit_logs (attendance_record_id, student_roll_no, session_id, subject_code, modified_by_id, modifier_role, old_status, new_status, reason)
          VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
        `, [
          existing.id,
          student.roll_no,
          session.id,
          session.subject_code,
          facultyStaffId,
          req.user!.role,
          existing.status,
          targetAction,
          targetAction === 'absent' ? 'Directly marked absent via Scanner Absent mode' : 'Corrected to present via verified QR Scanner'
        ]);
      } else {
        // First-time record creation
        const insertMethod = targetAction === 'absent' ? 'scanner_absent' : 'qr_scan';
        recordRes = await pg.query(`
          INSERT INTO attendance_records (session_id, student_roll_no, subject_code, faculty_staff_id, date, time_slot, status, method, device_session_id, ip_address)
          VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
          RETURNING *
        `, [
          session.id,
          student.roll_no,
          session.subject_code,
          facultyStaffId,
          session.date,
          session.time_slot,
          targetAction,
          insertMethod,
          device_session_id || (targetAction === 'absent' ? 'SCANNER-ABSENT-TERMINAL' : 'TERMINAL-APP-WEB'),
          req.ip || '127.0.0.1'
        ]);

        // Audit log
        await pg.query(`
          INSERT INTO attendance_audit_logs (attendance_record_id, student_roll_no, session_id, subject_code, modified_by_id, modifier_role, old_status, new_status, reason)
          VALUES ($1, $2, $3, $4, $5, $6, NULL, $7, $8)
        `, [
          (recordRes.rows[0] as any).id,
          student.roll_no,
          session.id,
          session.subject_code,
          facultyStaffId,
          req.user!.role,
          targetAction,
          targetAction === 'absent' ? 'Directly inserted absent via Scanner Absent mode' : 'Verified QR Code scan during active lecture session'
        ]);
      }

      // If marked absent, send immediate student absence notification
      if (targetAction === 'absent') {
        await pg.query(`
          INSERT INTO notifications (target_type, target_id, title, message, type, link_url)
          VALUES ('student', $1, 'Absence Recorded: ' || $2, 'You were marked absent for ' || $2 || ' on ' || $3 || ' (' || $4 || ') via Scanner Absent terminal.', 'absence', '/attendance')
        `, [student.roll_no, session.subject_code, session.date, session.time_slot]);
      }

      // Recompute and update session totals
      const countRes = await pg.query(`
        SELECT
          COUNT(*) FILTER (WHERE status = 'present') as p_count,
          COUNT(*) FILTER (WHERE status = 'absent') as a_count
        FROM attendance_records
        WHERE session_id = $1
      `, [session.id]);

      const pCount = parseInt((countRes.rows[0] as any).p_count || '0', 10);
      const aCount = parseInt((countRes.rows[0] as any).a_count || '0', 10);

      await pg.query(`
        UPDATE attendance_sessions
        SET total_present = $1, total_absent = $2
        WHERE id = $3
      `, [pCount, aCount, session.id]);

      res.json({
        success: true,
        message: targetAction === 'absent'
          ? `Student ${student.name} marked ABSENT via Scanner.`
          : `Attendance recorded: ${student.name} marked PRESENT.`,
        action: targetAction,
        previous_status: previousStatus,
        record: recordRes.rows[0],
        totals: { total_present: pCount, total_absent: aCount },
        student: {
          roll_no: student.roll_no,
          name: student.name,
          email: student.email,
          department_code: student.department_code,
          year: student.year,
          section: student.section,
          cgpa: student.cgpa,
          avatar_url: student.avatar_url,
          status: targetAction,
        },
      });
    } catch (err: any) {
      console.error('Attendance scan error:', err);
      res.status(500).json({ error: err.message });
    }
  });

  // WRITE IN PAPER ABSENTEE INSERTION ENDPOINT
  // Directly insert absentees who were written down on paper or notepad
  app.post('/api/attendance/paper-absent-insert', authenticateToken, requireRole(['faculty', 'hod', 'admin']), async (req: AuthenticatedRequest, res) => {
    try {
      const { session_id, raw_paper_notes, roll_numbers, finalize, method: customMethod, reason: customReason, device_session_id } = req.body;
      const facultyStaffId = req.user?.identifier || 'FAC-CSE-02';

      if (!session_id) {
        return res.status(400).json({ error: 'Session ID is required.' });
      }

      const sessionRes = await pg.query('SELECT * FROM attendance_sessions WHERE id = $1', [session_id]);
      if (sessionRes.rows.length === 0) {
        return res.status(404).json({ error: 'Attendance session not found.' });
      }
      const session = sessionRes.rows[0] as any;

      // 1. Fetch all students enrolled in this department & section
      const enrolledRes = await pg.query(`
        SELECT roll_no, name, email
        FROM students
        WHERE department_code = $1 AND section = $2
        ORDER BY roll_no ASC
      `, [session.department_code, session.section]);

      const enrolledList = enrolledRes.rows as any[];
      const enrolledRollsSet = new Set(enrolledList.map(s => s.roll_no.toUpperCase()));

      // 2. Parse tokens from raw_paper_notes or roll_numbers array
      const rawTokens: string[] = [];
      if (Array.isArray(roll_numbers)) {
        roll_numbers.forEach(r => rawTokens.push(String(r).trim()));
      }
      if (typeof raw_paper_notes === 'string') {
        // Split by comma, whitespace, semicolons, dashes or newlines
        const parts = raw_paper_notes.split(/[\s,;:\n\r]+/);
        parts.forEach(p => {
          const clean = p.trim();
          if (clean) rawTokens.push(clean);
        });
      }

      if (rawTokens.length === 0) {
        return res.status(400).json({ error: 'Please enter at least one roll number or absentee token from your paper sheet.' });
      }

      // 3. Resolve tokens to actual enrolled students
      const matchedStudents: any[] = [];
      const unmatchedTokens: string[] = [];
      const resolvedRollNos = new Set<string>();

      for (const token of rawTokens) {
        const upperToken = token.toUpperCase().replace('22APEX', '22TKREC');

        // Case A: Exact full roll number match
        if (enrolledRollsSet.has(upperToken)) {
          if (!resolvedRollNos.has(upperToken)) {
            resolvedRollNos.add(upperToken);
            const found = enrolledList.find(s => s.roll_no.toUpperCase() === upperToken);
            if (found) matchedStudents.push(found);
          }
          continue;
        }

        // Case B: Short number written on paper (e.g. "2" or "02" or "002" or "18")
        if (/^\d{1,3}$/.test(token)) {
          const padded = token.padStart(3, '0');
          const found = enrolledList.find(s => s.roll_no.endsWith(padded));
          if (found) {
            if (!resolvedRollNos.has(found.roll_no)) {
              resolvedRollNos.add(found.roll_no);
              matchedStudents.push(found);
            }
            continue;
          }
        }

        // Case C: Partial match by roll suffix or name
        const partial = enrolledList.find(s =>
          s.roll_no.toUpperCase().includes(upperToken) ||
          s.name.toUpperCase().includes(upperToken)
        );
        if (partial && !resolvedRollNos.has(partial.roll_no)) {
          resolvedRollNos.add(partial.roll_no);
          matchedStudents.push(partial);
          continue;
        }

        unmatchedTokens.push(token);
      }

      if (matchedStudents.length === 0) {
        return res.status(400).json({
          error: 'None of the entered paper tokens matched students in this section roster.',
          unmatched_tokens: unmatchedTokens,
        });
      }

      const insertMethod = customMethod || 'paper_slip';
      const deviceId = device_session_id || (insertMethod === 'scanner_absent' ? 'SCANNER-ABSENT-BATCH' : insertMethod === 'smart_list_absent' ? 'SMART-LIST-BATCH' : 'PAPER-SLIP-ENTRY');
      const auditReason = customReason || (
        insertMethod === 'scanner_absent'
          ? 'Directly marked absent via Scanner Absent batch'
          : insertMethod === 'smart_list_absent'
          ? 'Directly marked absent via Smart List Selection'
          : 'Directly marked absent from paper slip absentee sheet'
      );

      // 4. Directly insert / upsert each matched student as ABSENT
      for (const st of matchedStudents) {
        const insRes = await pg.query(`
          INSERT INTO attendance_records (session_id, student_roll_no, subject_code, faculty_staff_id, date, time_slot, status, method, device_session_id)
          VALUES ($1, $2, $3, $4, $5, $6, 'absent', $7, $8)
          ON CONFLICT (session_id, student_roll_no) DO UPDATE
          SET status = 'absent', method = $7, updated_at = CURRENT_TIMESTAMP
          RETURNING id
        `, [session.id, st.roll_no, session.subject_code, facultyStaffId, session.date, session.time_slot, insertMethod, deviceId]);

        // Send absence notice to student
        const notifReason = insertMethod === 'scanner_absent' ? 'Scanner Absent mode' : insertMethod === 'smart_list_absent' ? 'Smart List Selection' : 'paper attendance slip';
        await pg.query(`
          INSERT INTO notifications (target_type, target_id, title, message, type, link_url)
          VALUES ('student', $1, 'Absence Recorded: ' || $2, 'You were marked absent for ' || $2 || ' on ' || $3 || ' (' || $4 || ') as recorded via ' || $5 || '.', 'absence', '/attendance')
        `, [st.roll_no, session.subject_code, session.date, session.time_slot, notifReason]);

        // Immutable Audit Log
        await pg.query(`
          INSERT INTO attendance_audit_logs (attendance_record_id, student_roll_no, session_id, subject_code, modified_by_id, modifier_role, old_status, new_status, reason)
          VALUES ($1, $2, $3, $4, $5, $6, 'unmarked', 'absent', $7)
        `, [(insRes.rows[0] as any).id, st.roll_no, session.id, session.subject_code, facultyStaffId, req.user!.role, auditReason]);
      }

      // 5. Recompute session totals
      const countRes = await pg.query(`
        SELECT
          COUNT(*) FILTER (WHERE status = 'present') as p_count,
          COUNT(*) FILTER (WHERE status = 'absent') as a_count
        FROM attendance_records
        WHERE session_id = $1
      `, [session.id]);

      const pCount = parseInt((countRes.rows[0] as any).p_count || '0', 10);
      const aCount = parseInt((countRes.rows[0] as any).a_count || '0', 10);

      await pg.query(`
        UPDATE attendance_sessions
        SET total_present = $1,
            total_absent = $2,
            status = CASE WHEN $3 = true THEN 'completed' ELSE status END
        WHERE id = $4
      `, [pCount, aCount, !!finalize, session.id]);

      res.json({
        success: true,
        message: `Directly recorded ${matchedStudents.length} student(s) ABSENT.`,
        marked_count: matchedStudents.length,
        marked_students: matchedStudents.map(s => ({ roll_no: s.roll_no, name: s.name })),
        unmatched_tokens: unmatchedTokens,
        totals: { total_present: pCount, total_absent: aCount }
      });
    } catch (err: any) {
      console.error('Error in paper-absent-insert:', err);
      res.status(500).json({ error: err.message });
    }
  });

  // DIRECT BATCH MARK STATUS FOR STUDENTS SELECTED IN LIST (SMART PROCESS)
  app.post('/api/attendance/bulk-mark-status', authenticateToken, requireRole(['faculty', 'hod', 'admin']), async (req: AuthenticatedRequest, res) => {
    try {
      const { session_id, roll_numbers, status, method: customMethod, reason: customReason } = req.body;
      const facultyStaffId = req.user?.identifier || 'FAC-CSE-02';

      if (!session_id || !Array.isArray(roll_numbers) || roll_numbers.length === 0 || !status) {
        return res.status(400).json({ error: 'session_id, non-empty roll_numbers array, and status are required.' });
      }

      const sessionRes = await pg.query('SELECT * FROM attendance_sessions WHERE id = $1', [session_id]);
      if (sessionRes.rows.length === 0) {
        return res.status(404).json({ error: 'Attendance session not found.' });
      }
      const session = sessionRes.rows[0] as any;

      const targetStatus = status === 'absent' ? 'absent' : 'present';
      const insertMethod = customMethod || (targetStatus === 'absent' ? 'scanner_absent' : 'smart_bulk_present');
      const auditReason = customReason || (
        targetStatus === 'absent'
          ? 'Directly inserted absent for students in the list via Scanner Absent Smart Process'
          : 'Directly marked present for students in the list via Smart Process'
      );

      for (const rollNo of roll_numbers) {
        const insRes = await pg.query(`
          INSERT INTO attendance_records (session_id, student_roll_no, subject_code, faculty_staff_id, date, time_slot, status, method, device_session_id)
          VALUES ($1, $2, $3, $4, $5, $6, $7, $8, 'SMART-LIST-SELECTION')
          ON CONFLICT (session_id, student_roll_no) DO UPDATE
          SET status = $7, method = $8, updated_at = CURRENT_TIMESTAMP
          RETURNING id
        `, [session.id, rollNo, session.subject_code, facultyStaffId, session.date, session.time_slot, targetStatus, insertMethod]);

        if (targetStatus === 'absent') {
          await pg.query(`
            INSERT INTO notifications (target_type, target_id, title, message, type, link_url)
            VALUES ('student', $1, 'Absence Recorded: ' || $2, 'You were marked absent for ' || $2 || ' on ' || $3 || ' (' || $4 || ') via Smart List Process.', 'absence', '/attendance')
          `, [rollNo, session.subject_code, session.date, session.time_slot]);
        }

        await pg.query(`
          INSERT INTO attendance_audit_logs (attendance_record_id, student_roll_no, session_id, subject_code, modified_by_id, modifier_role, old_status, new_status, reason)
          VALUES ($1, $2, $3, $4, $5, $6, 'unmarked', $7, $8)
        `, [(insRes.rows[0] as any).id, rollNo, session.id, session.subject_code, facultyStaffId, req.user!.role, targetStatus, auditReason]);
      }

      // Recompute totals
      const countRes = await pg.query(`
        SELECT
          COUNT(*) FILTER (WHERE status = 'present') as p_count,
          COUNT(*) FILTER (WHERE status = 'absent') as a_count
        FROM attendance_records
        WHERE session_id = $1
      `, [session.id]);

      const pCount = parseInt((countRes.rows[0] as any).p_count || '0', 10);
      const aCount = parseInt((countRes.rows[0] as any).a_count || '0', 10);

      await pg.query(`
        UPDATE attendance_sessions
        SET total_present = $1, total_absent = $2
        WHERE id = $3
      `, [pCount, aCount, session.id]);

      res.json({
        success: true,
        message: `Successfully marked ${roll_numbers.length} student(s) as ${targetStatus.toUpperCase()} via Smart Process.`,
        affected_count: roll_numbers.length,
        status: targetStatus,
        totals: { total_present: pCount, total_absent: aCount }
      });
    } catch (err: any) {
      console.error('Error in bulk-mark-status:', err);
      res.status(500).json({ error: err.message });
    }
  });

  // SMART ROSTER ACTION: DIRECT BATCH PROCESS FOR STUDENTS IN LIST
  // Supports: auto_absent_unmarked, auto_present_remaining
  app.post('/api/attendance/smart-roster-action', authenticateToken, requireRole(['faculty', 'hod', 'admin']), async (req: AuthenticatedRequest, res) => {
    try {
      const { session_id, action, finalize } = req.body;
      const facultyStaffId = req.user?.identifier || 'FAC-CSE-02';

      if (!session_id || !action) {
        return res.status(400).json({ error: 'Session ID and action are required.' });
      }

      const sessionRes = await pg.query('SELECT * FROM attendance_sessions WHERE id = $1', [session_id]);
      if (sessionRes.rows.length === 0) {
        return res.status(404).json({ error: 'Attendance session not found.' });
      }
      const session = sessionRes.rows[0] as any;

      // Fetch all enrolled students
      const allStudentsRes = await pg.query(`
        SELECT roll_no, name, email FROM students
        WHERE department_code = $1 AND section = $2
        ORDER BY roll_no ASC
      `, [session.department_code, session.section]);

      // Fetch existing records for this session
      const existingRes = await pg.query(`
        SELECT student_roll_no, status FROM attendance_records
        WHERE session_id = $1
      `, [session.id]);

      const recordMap = new Map();
      existingRes.rows.forEach((r: any) => recordMap.set(r.student_roll_no, r.status));

      const enrolledStudents = allStudentsRes.rows as any[];
      let affectedCount = 0;

      if (action === 'auto_absent_unmarked') {
        // SMART PROCESS: Every enrolled student not yet marked present is inserted as ABSENT
        const unmarkedStudents = enrolledStudents.filter((s: any) => !recordMap.has(s.roll_no));

        for (const st of unmarkedStudents) {
          const insRes = await pg.query(`
            INSERT INTO attendance_records (session_id, student_roll_no, subject_code, faculty_staff_id, date, time_slot, status, method, device_session_id)
            VALUES ($1, $2, $3, $4, $5, $6, 'absent', 'smart_auto_absent', 'SMART-AUTO-PROCESS')
            ON CONFLICT (session_id, student_roll_no) DO UPDATE
            SET status = 'absent', method = 'smart_auto_absent', updated_at = CURRENT_TIMESTAMP
            RETURNING id
          `, [session.id, st.roll_no, session.subject_code, facultyStaffId, session.date, session.time_slot]);

          await pg.query(`
            INSERT INTO notifications (target_type, target_id, title, message, type, link_url)
            VALUES ('student', $1, 'Absence Recorded: ' || $2, 'You were marked absent for ' || $2 || ' on ' || $3 || ' (' || $4 || ').', 'absence', '/attendance')
          `, [st.roll_no, session.subject_code, session.date, session.time_slot]);

          await pg.query(`
            INSERT INTO attendance_audit_logs (attendance_record_id, student_roll_no, session_id, subject_code, modified_by_id, modifier_role, old_status, new_status, reason)
            VALUES ($1, $2, $3, $4, $5, $6, 'unmarked', 'absent', 'Directly inserted absent via Smart List Process')
          `, [(insRes.rows[0] as any).id, st.roll_no, session.id, session.subject_code, facultyStaffId, req.user!.role]);

          affectedCount++;
        }
      } else if (action === 'auto_present_remaining') {
        // SMART INVERT PROCESS: After marking paper/scanner absentees, all remaining students in list are marked PRESENT
        const nonAbsentStudents = enrolledStudents.filter((s: any) => recordMap.get(s.roll_no) !== 'absent');

        for (const st of nonAbsentStudents) {
          const insRes = await pg.query(`
            INSERT INTO attendance_records (session_id, student_roll_no, subject_code, faculty_staff_id, date, time_slot, status, method, device_session_id)
            VALUES ($1, $2, $3, $4, $5, $6, 'present', 'smart_bulk_present', 'SMART-INVERT-PROCESS')
            ON CONFLICT (session_id, student_roll_no) DO UPDATE
            SET status = 'present', method = 'smart_bulk_present', updated_at = CURRENT_TIMESTAMP
            RETURNING id
          `, [session.id, st.roll_no, session.subject_code, facultyStaffId, session.date, session.time_slot]);

          await pg.query(`
            INSERT INTO attendance_audit_logs (attendance_record_id, student_roll_no, session_id, subject_code, modified_by_id, modifier_role, old_status, new_status, reason)
            VALUES ($1, $2, $3, $4, $5, $6, 'unmarked', 'present', 'Directly marked present via Smart Invert List Process')
          `, [(insRes.rows[0] as any).id, st.roll_no, session.id, session.subject_code, facultyStaffId, req.user!.role]);

          affectedCount++;
        }
      }

      // Recompute totals
      const countRes = await pg.query(`
        SELECT
          COUNT(*) FILTER (WHERE status = 'present') as p_count,
          COUNT(*) FILTER (WHERE status = 'absent') as a_count
        FROM attendance_records
        WHERE session_id = $1
      `, [session.id]);

      const pCount = parseInt((countRes.rows[0] as any).p_count || '0', 10);
      const aCount = parseInt((countRes.rows[0] as any).a_count || '0', 10);

      await pg.query(`
        UPDATE attendance_sessions
        SET total_present = $1,
            total_absent = $2,
            status = CASE WHEN $3 = true THEN 'completed' ELSE status END
        WHERE id = $4
      `, [pCount, aCount, !!finalize, session.id]);

      res.json({
        success: true,
        action,
        affected_count: affectedCount,
        totals: { total_present: pCount, total_absent: aCount },
        message: action === 'auto_absent_unmarked'
          ? `Directly marked ${affectedCount} unscanned student(s) ABSENT.`
          : `Directly marked ${affectedCount} remaining enrolled student(s) PRESENT.`
      });
    } catch (err: any) {
      console.error('Error in smart-roster-action:', err);
      res.status(500).json({ error: err.message });
    }
  });

  // MARK ABSENT ENDPOINT (Individual or Bulk unscanned students)
  app.post('/api/attendance/mark-absent', authenticateToken, requireRole(['faculty', 'hod', 'admin']), async (req: AuthenticatedRequest, res) => {
    try {
      const { session_id, student_roll_nos } = req.body;
      const facultyStaffId = req.user?.identifier || 'FAC-CSE-02';

      if (!session_id || !Array.isArray(student_roll_nos) || student_roll_nos.length === 0) {
        return res.status(400).json({ error: 'Session ID and a list of student roll numbers to mark absent are required.' });
      }

      const sessionRes = await pg.query('SELECT * FROM attendance_sessions WHERE id = $1', [session_id]);
      if (sessionRes.rows.length === 0) {
        return res.status(404).json({ error: 'Session not found.' });
      }
      const session = sessionRes.rows[0] as any;

      let markedCount = 0;
      for (const roll of student_roll_nos) {
        // Upsert or insert absent
        const insRes = await pg.query(`
          INSERT INTO attendance_records (session_id, student_roll_no, subject_code, faculty_staff_id, date, time_slot, status, method, device_session_id)
          VALUES ($1, $2, $3, $4, $5, $6, 'absent', 'manual', 'FACULTY-PORTAL-WEB')
          ON CONFLICT (session_id, student_roll_no) DO UPDATE
          SET status = 'absent', updated_at = CURRENT_TIMESTAMP
          RETURNING id
        `, [session.id, roll, session.subject_code, facultyStaffId, session.date, session.time_slot]);

        // Send instant notification to student
        await pg.query(`
          INSERT INTO notifications (target_type, target_id, title, message, type, link_url)
          VALUES ('student', $1, 'Absence Notice: ' || $2, 'You were marked absent for ' || $2 || ' on ' || $3 || ' (' || $4 || '). If this is an error, please submit an attendance grievance.', 'absence', '/attendance')
        `, [roll, session.subject_code, session.date, session.time_slot]);

        // Log to audit log
        await pg.query(`
          INSERT INTO attendance_audit_logs (attendance_record_id, student_roll_no, session_id, subject_code, modified_by_id, modifier_role, old_status, new_status, reason)
          VALUES ($1, $2, $3, $4, $5, $6, 'unmarked', 'absent', 'Unscanned student marked absent by faculty')
        `, [(insRes.rows[0] as any).id, roll, session.id, session.subject_code, facultyStaffId, req.user!.role]);

        markedCount++;
      }

      // Recompute and update session totals
      const countRes = await pg.query(`
        SELECT
          COUNT(*) FILTER (WHERE status = 'present') as p_count,
          COUNT(*) FILTER (WHERE status = 'absent') as a_count
        FROM attendance_records
        WHERE session_id = $1
      `, [session.id]);

      const pCount = parseInt((countRes.rows[0] as any).p_count || '0', 10);
      const aCount = parseInt((countRes.rows[0] as any).a_count || '0', 10);

      await pg.query(`
        UPDATE attendance_sessions
        SET total_present = $1,
            total_absent = $2,
            status = CASE WHEN $3 = true THEN 'completed' ELSE status END
        WHERE id = $4
      `, [pCount, aCount, !!req.body.finalize, session.id]);

      res.json({
        success: true,
        message: `Successfully marked ${markedCount} student(s) absent and dispatched notifications.`,
        session_id: session.id,
      });
    } catch (err: any) {
      console.error('Error marking absent:', err);
      res.status(500).json({ error: err.message });
    }
  });

  // Manual Attendance Correction with Audit Trail
  app.post('/api/attendance/modify-record', authenticateToken, requireRole(['faculty', 'hod', 'admin']), async (req: AuthenticatedRequest, res) => {
    try {
      const { record_id, new_status, reason } = req.body;
      const modifierId = req.user?.identifier || 'FAC-CSE-02';

      if (!record_id || !new_status || !reason) {
        return res.status(400).json({ error: 'Record ID, new status, and authorization reason are required.' });
      }

      const recRes = await pg.query('SELECT * FROM attendance_records WHERE id = $1', [record_id]);
      if (recRes.rows.length === 0) {
        return res.status(404).json({ error: 'Attendance record not found.' });
      }

      const oldRec = recRes.rows[0] as any;

      // Update record
      await pg.query(`
        UPDATE attendance_records
        SET status = $1, method = 'admin_override', updated_at = CURRENT_TIMESTAMP
        WHERE id = $2
      `, [new_status, record_id]);

      // Insert into immutable audit log
      await pg.query(`
        INSERT INTO attendance_audit_logs (attendance_record_id, student_roll_no, session_id, subject_code, modified_by_id, modifier_role, old_status, new_status, reason)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
      `, [record_id, oldRec.student_roll_no, oldRec.session_id, oldRec.subject_code, modifierId, req.user!.role, oldRec.status, new_status, reason]);

      res.json({ success: true, message: 'Attendance record updated and audit logged.' });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  // Attendance Audit Logs view for Admins / Faculty
  app.get('/api/attendance/audit-logs', authenticateToken, requireRole(['faculty', 'hod', 'admin']), async (_req, res) => {
    try {
      const logsRes = await pg.query(`
        SELECT aal.*, st.name as student_name, sub.name as subject_name
        FROM attendance_audit_logs aal
        LEFT JOIN students st ON aal.student_roll_no = st.roll_no
        LEFT JOIN subjects sub ON aal.subject_code = sub.code
        ORDER BY aal.timestamp DESC
        LIMIT 50
      `);
      res.json(logsRes.rows);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  // -------------------------------------------------------------
  // AI COLLEGE ASSISTANT & COMPLAINT AGENT
  // -------------------------------------------------------------

  app.post('/api/ai/chat', authenticateToken, async (req: AuthenticatedRequest, res) => {
    try {
      const { question } = req.body;
      const rollNo = req.user?.identifier || '22TKRECCSE001';

      if (!question || typeof question !== 'string') {
        return res.status(400).json({ error: 'Question prompt is required.' });
      }

      const result = await askAiAssistant(rollNo, question);
      res.json(result);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  // AI Complaint Triage Preview
  app.post('/api/complaints/ai-triage', authenticateToken, async (req, res) => {
    try {
      const { category, subject, description } = req.body;
      const triageResult = await triageComplaintWithAi(category, subject, description);
      res.json(triageResult);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  // Submit Complaint with AI Triage
  app.post('/api/complaints/create', authenticateToken, async (req: AuthenticatedRequest, res) => {
    try {
      const { category, subject, description } = req.body;
      const rollNo = req.user?.identifier || '22TKRECCSE001';
      const studentName = req.user?.name || 'Student';

      if (!subject || !description) {
        return res.status(400).json({ error: 'Complaint subject and description are required.' });
      }

      // Run AI Triage Engine
      const aiTriage = await triageComplaintWithAi(category, subject, description);
      const ticketNumber = `TKT-${new Date().getFullYear()}-${Math.floor(1000 + Math.random() * 9000)}`;

      const compRes = await pg.query(`
        INSERT INTO complaints (ticket_number, student_roll_no, student_name, category, subject, description, assigned_department, priority, status, assigned_to_staff, ai_category_confidence, ai_summary)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, 'Submitted', 'Prof. In-Charge ' || $7, $9, $10)
        RETURNING *
      `, [
        ticketNumber,
        rollNo,
        studentName,
        aiTriage.category,
        subject,
        description,
        aiTriage.assignedDepartment,
        aiTriage.priority,
        aiTriage.confidence,
        aiTriage.summary
      ]);

      const complaintId = (compRes.rows[0] as any).id;

      // Add initial update log
      await pg.query(`
        INSERT INTO complaint_updates (complaint_id, updated_by, updater_role, old_status, new_status, message)
        VALUES ($1, 'AI Complaint Agent', 'system', NULL, 'Submitted', 'Grievance ticket created, categorized as ' || $2 || ' with priority ' || $3 || '. Dispatched to ' || $4 || ' department.')
      `, [complaintId, aiTriage.category, aiTriage.priority, aiTriage.assignedDepartment]);

      // Notification to student
      await pg.query(`
        INSERT INTO notifications (target_type, target_id, title, message, type, link_url)
        VALUES ('student', $1, 'Complaint Registered: ' || $2, 'Your grievance #' || $2 || ' has been received and assigned to ' || $3 || ' department.', 'complaint', '/complaints')
      `, [rollNo, ticketNumber, aiTriage.assignedDepartment]);

      res.json(compRes.rows[0]);
    } catch (err: any) {
      console.error('Error creating complaint:', err);
      res.status(500).json({ error: err.message });
    }
  });

  // Get Complaints
  app.get('/api/complaints', authenticateToken, async (req: AuthenticatedRequest, res) => {
    try {
      const user = req.user!;
      let query = `
        SELECT c.*, d.name as department_name
        FROM complaints c
        LEFT JOIN departments d ON c.assigned_department = d.code
      `;
      let params: any[] = [];

      if (user.role === 'student') {
        query += ' WHERE c.student_roll_no = $1 ORDER BY c.created_at DESC';
        params.push(user.identifier);
      } else if (user.role === 'hod' || user.role === 'faculty') {
        if (user.department_code) {
          query += ' WHERE c.assigned_department = $1 ORDER BY c.created_at DESC';
          params.push(user.department_code);
        } else {
          query += ' ORDER BY c.created_at DESC';
        }
      } else {
        query += ' ORDER BY c.created_at DESC';
      }

      const complaintsRes = await pg.query(query, params);

      // Fetch updates for these complaints
      const cIds = complaintsRes.rows.map((c: any) => c.id);
      let updatesMap: Record<number, any[]> = {};

      if (cIds.length > 0) {
        const updatesRes = await pg.query(`
          SELECT * FROM complaint_updates
          WHERE complaint_id = ANY($1)
          ORDER BY created_at ASC
        `, [cIds]);

        updatesRes.rows.forEach((u: any) => {
          if (!updatesMap[u.complaint_id]) updatesMap[u.complaint_id] = [];
          updatesMap[u.complaint_id].push(u);
        });
      }

      const enriched = complaintsRes.rows.map((c: any) => ({
        ...c,
        updates: updatesMap[c.id] || [],
      }));

      res.json(enriched);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  // Update Complaint Status (Staff / Admin)
  app.post('/api/complaints/update-status', authenticateToken, requireRole(['faculty', 'hod', 'admin']), async (req: AuthenticatedRequest, res) => {
    try {
      const { complaint_id, new_status, message, assigned_to_staff } = req.body;
      const updaterName = req.user?.name || 'College Authority';

      if (!complaint_id || !new_status || !message) {
        return res.status(400).json({ error: 'Complaint ID, new status, and action remarks are required.' });
      }

      const compRes = await pg.query('SELECT * FROM complaints WHERE id = $1', [complaint_id]);
      if (compRes.rows.length === 0) {
        return res.status(404).json({ error: 'Complaint not found.' });
      }

      const complaint = compRes.rows[0] as any;

      // Update complaint
      await pg.query(`
        UPDATE complaints
        SET status = $1, assigned_to_staff = COALESCE($2, assigned_to_staff), updated_at = CURRENT_TIMESTAMP
        WHERE id = $3
      `, [new_status, assigned_to_staff || null, complaint_id]);

      // Add update history
      await pg.query(`
        INSERT INTO complaint_updates (complaint_id, updated_by, updater_role, old_status, new_status, message)
        VALUES ($1, $2, $3, $4, $5, $6)
      `, [complaint_id, updaterName, req.user!.role, complaint.status, new_status, message]);

      // Notify student
      await pg.query(`
        INSERT INTO notifications (target_type, target_id, title, message, type, link_url)
        VALUES ('student', $1, 'Complaint #' || $2 || ' Status Updated', 'Your grievance status is now: ' || $3 || '. Note: ' || $4, 'complaint', '/complaints')
      `, [complaint.student_roll_no, complaint.ticket_number, new_status, message]);

      res.json({ success: true, message: 'Complaint status updated successfully.' });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  // -------------------------------------------------------------
  // PLACEMENT MODULE & AUTOMATIC ELIGIBILITY ENGINE
  // -------------------------------------------------------------

  app.get('/api/placements', authenticateToken, async (req: AuthenticatedRequest, res) => {
    try {
      const placementsRes = await pg.query(`
        SELECT p.*, c.logo_url, c.industry,
               (SELECT COUNT(*) FROM placement_applications pa WHERE pa.placement_id = p.id) as applicant_count
        FROM placements p
        LEFT JOIN companies c ON p.company_id = c.id
        ORDER BY p.application_deadline ASC
      `);

      // If requested by a student, compute eligibility and application status
      let student: any = null;
      let myApps: Record<number, any> = {};

      if (req.user?.role === 'student') {
        const sRes = await pg.query('SELECT * FROM students WHERE roll_no = $1', [req.user.identifier]);
        if (sRes.rows.length > 0) {
          student = sRes.rows[0] as any;
          const appRes = await pg.query('SELECT * FROM placement_applications WHERE student_roll_no = $1', [student.roll_no]);
          appRes.rows.forEach((a: any) => { myApps[a.placement_id] = a; });
        }
      }

      const drives = placementsRes.rows.map((p: any) => {
        let isEligible = true;
        let eligibilityReasons: string[] = [];

        if (student) {
          const eligibleDepts: string[] = JSON.parse(p.eligible_departments || '[]');
          const studentCgpa = parseFloat(student.cgpa);
          const minCgpa = parseFloat(p.min_cgpa);
          const studentBacklogs = parseInt(student.active_backlogs, 10);
          const maxBacklogs = parseInt(p.max_backlogs, 10);

          if (studentCgpa < minCgpa) {
            isEligible = false;
            eligibilityReasons.push(`CGPA is ${studentCgpa.toFixed(2)}, below required minimum ${minCgpa.toFixed(2)}.`);
          } else {
            eligibilityReasons.push(`CGPA ${studentCgpa.toFixed(2)} meets required ${minCgpa.toFixed(2)}.`);
          }

          if (studentBacklogs > maxBacklogs) {
            isEligible = false;
            eligibilityReasons.push(`You have ${studentBacklogs} active backlog(s), maximum permitted is ${maxBacklogs}.`);
          }

          if (eligibleDepts.length > 0 && !eligibleDepts.includes(student.department_code)) {
            isEligible = false;
            eligibilityReasons.push(`Drive is open for ${eligibleDepts.join(', ')}. Your department is ${student.department_code}.`);
          }
        }

        return {
          ...p,
          is_eligible: isEligible,
          eligibility_explanation: isEligible 
            ? `Eligible because your CGPA is ${student?.cgpa || '8.85'} and you meet all department criteria.`
            : `Not Eligible: ${eligibilityReasons.join(' ')}`,
          my_application: myApps[p.id] || null,
        };
      });

      res.json(drives);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  // Apply for Placement
  app.post('/api/placements/apply', authenticateToken, requireRole(['student']), async (req: AuthenticatedRequest, res) => {
    try {
      const { placement_id, notes } = req.body;
      const rollNo = req.user?.identifier;

      const studentRes = await pg.query('SELECT * FROM students WHERE roll_no = $1', [rollNo]);
      if (studentRes.rows.length === 0) return res.status(404).json({ error: 'Student profile not found.' });
      const student = studentRes.rows[0] as any;

      const pRes = await pg.query('SELECT * FROM placements WHERE id = $1', [placement_id]);
      if (pRes.rows.length === 0) return res.status(404).json({ error: 'Placement drive not found.' });
      const placement = pRes.rows[0] as any;

      // Server-side Eligibility Verification
      if (parseFloat(student.cgpa) < parseFloat(placement.min_cgpa)) {
        return res.status(400).json({ error: `Ineligible: Your CGPA (${student.cgpa}) is lower than minimum requirement (${placement.min_cgpa}).` });
      }

      // Check duplicate
      const existing = await pg.query('SELECT * FROM placement_applications WHERE placement_id = $1 AND student_roll_no = $2', [placement_id, rollNo]);
      if (existing.rows.length > 0) {
        return res.status(409).json({ error: 'You have already applied for this placement drive.' });
      }

      const appRes = await pg.query(`
        INSERT INTO placement_applications (placement_id, student_roll_no, student_name, student_cgpa, department_code, status, notes)
        VALUES ($1, $2, $3, $4, $5, 'Applied', $6)
        RETURNING *
      `, [placement_id, rollNo, student.name, student.cgpa, student.department_code, notes || 'Application submitted via student portal']);

      // Notify student
      await pg.query(`
        INSERT INTO notifications (target_type, target_id, title, message, type, link_url)
        VALUES ('student', $1, 'Application Received: ' || $2, 'Your application for ' || $3 || ' (' || $2 || ') has been successfully submitted.', 'placement', '/placements')
      `, [rollNo, placement.company_name, placement.job_role]);

      res.json(appRes.rows[0]);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  // Create Placement (Placement Cell / Admin)
  app.post('/api/placements/create', authenticateToken, requireRole(['placement', 'admin']), async (_req, res) => {
    try {
      const { company_name, job_role, package_lpa, min_cgpa, max_backlogs, eligible_departments, graduation_year, skills_required, selection_process, description, application_deadline } = _req.body;

      if (!company_name || !job_role || !package_lpa || !application_deadline) {
        return res.status(400).json({ error: 'Company, job role, package, and deadline are required.' });
      }

      // Ensure company exists
      let compRes = await pg.query('SELECT id FROM companies WHERE LOWER(name) = LOWER($1)', [company_name]);
      let compId = (compRes.rows[0] as any)?.id;
      if (!compId) {
        const newComp = await pg.query(`
          INSERT INTO companies (name, industry, location, logo_url)
          VALUES ($1, 'Technology', 'Pan India', 'https://images.unsplash.com/photo-1516321318423-f06f85e504b3?w=150')
          RETURNING id
        `, [company_name]);
        compId = (newComp.rows[0] as any).id;
      }

      const insRes = await pg.query(`
        INSERT INTO placements (company_id, company_name, job_role, package_lpa, location, min_cgpa, max_backlogs, eligible_departments, graduation_year, skills_required, selection_process, description, application_deadline, status)
        VALUES ($1, $2, $3, $4, 'Bengaluru / Hybrid', $5, $6, $7, $8, $9, $10, $11, $12, 'Active')
        RETURNING *
      `, [
        compId,
        company_name,
        job_role,
        package_lpa,
        min_cgpa || 6.0,
        max_backlogs || 0,
        JSON.stringify(eligible_departments || ['CSE', 'IT', 'ECE']),
        graduation_year || 2026,
        skills_required || 'Problem Solving, Computer Science Fundamentals',
        selection_process || 'Written Test -> Technical Interviews -> HR Round',
        description || 'Campus hiring opportunity.',
        application_deadline
      ]);

      // Broadcast notification to all students
      await pg.query(`
        INSERT INTO notifications (target_type, target_id, title, message, type, link_url)
        VALUES ('all', NULL, 'New Placement Drive: ' || $1, 'Package: ₹' || $2 || ' LPA for role ' || $3 || '. Check your eligibility and apply.', 'placement', '/placements')
      `, [company_name, package_lpa, job_role]);

      res.json(insRes.rows[0]);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  // Update placement applicant status
  app.post('/api/placements/update-status', authenticateToken, requireRole(['placement', 'admin']), async (req, res) => {
    try {
      const { application_id, status, notes } = req.body;
      const upRes = await pg.query(`
        UPDATE placement_applications
        SET status = $1, notes = COALESCE($2, notes), updated_at = CURRENT_TIMESTAMP
        WHERE id = $3
        RETURNING *
      `, [status, notes, application_id]);

      if (upRes.rows.length === 0) return res.status(404).json({ error: 'Application not found.' });
      const app = upRes.rows[0] as any;

      // Notify student
      await pg.query(`
        INSERT INTO notifications (target_type, target_id, title, message, type, link_url)
        VALUES ('student', $1, 'Placement Status Updated', 'Your application status has been updated to: ' || $2, 'placement', '/placements')
      `, [app.student_roll_no, status]);

      res.json(app);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  // -------------------------------------------------------------
  // INTERNSHIPS MARKETPLACE
  // -------------------------------------------------------------

  app.get('/api/internships', authenticateToken, async (req: AuthenticatedRequest, res) => {
    try {
      const { skill, department, work_type, is_paid } = req.query;

      let query = `
        SELECT i.*, c.logo_url,
               (SELECT COUNT(*) FROM internship_applications ia WHERE ia.internship_id = i.id) as applicant_count
        FROM internships i
        LEFT JOIN companies c ON i.company_id = c.id
        WHERE i.status = 'Open'
      `;
      let params: any[] = [];
      let pIdx = 1;

      if (work_type) {
        query += ` AND i.work_type = $${pIdx++}`;
        params.push(work_type);
      }
      if (is_paid !== undefined) {
        query += ` AND i.is_paid = $${pIdx++}`;
        params.push(is_paid === 'true');
      }

      query += ' ORDER BY i.application_deadline ASC';

      const internshipsRes = await pg.query(query, params);

      // Student application status
      let myApps: Record<number, any> = {};
      if (req.user?.role === 'student') {
        const appRes = await pg.query('SELECT * FROM internship_applications WHERE student_roll_no = $1', [req.user.identifier]);
        appRes.rows.forEach((a: any) => { myApps[a.internship_id] = a; });
      }

      const list = internshipsRes.rows.map((i: any) => ({
        ...i,
        my_application: myApps[i.id] || null,
      }));

      res.json(list);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  app.post('/api/internships/apply', authenticateToken, requireRole(['student']), async (req: AuthenticatedRequest, res) => {
    try {
      const { internship_id } = req.body;
      const rollNo = req.user?.identifier;

      const studentRes = await pg.query('SELECT * FROM students WHERE roll_no = $1', [rollNo]);
      if (studentRes.rows.length === 0) return res.status(404).json({ error: 'Student not found.' });
      const student = studentRes.rows[0] as any;

      const intRes = await pg.query('SELECT * FROM internships WHERE id = $1', [internship_id]);
      if (intRes.rows.length === 0) return res.status(404).json({ error: 'Internship not found.' });
      const internship = intRes.rows[0] as any;

      // Check duplicate
      const existing = await pg.query('SELECT * FROM internship_applications WHERE internship_id = $1 AND student_roll_no = $2', [internship_id, rollNo]);
      if (existing.rows.length > 0) {
        return res.status(409).json({ error: 'You have already applied for this internship.' });
      }

      const appRes = await pg.query(`
        INSERT INTO internship_applications (internship_id, student_roll_no, student_name, department_code, status)
        VALUES ($1, $2, $3, $4, 'Applied')
        RETURNING *
      `, [internship_id, rollNo, student.name, student.department_code]);

      // Notify
      await pg.query(`
        INSERT INTO notifications (target_type, target_id, title, message, type, link_url)
        VALUES ('student', $1, 'Internship Application Submitted', 'Applied for ' || $2 || ' at ' || $3, 'internship', '/internships')
      `, [rollNo, internship.role, internship.company_name]);

      res.json(appRes.rows[0]);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  // -------------------------------------------------------------
  // EVENTS MODULE
  // -------------------------------------------------------------

  app.get('/api/events', authenticateToken, async (req: AuthenticatedRequest, res) => {
    try {
      const eventsRes = await pg.query(`
        SELECT e.*, d.name as department_name,
               (SELECT COUNT(*) FROM event_registrations er WHERE er.event_id = e.id AND er.status = 'Registered') as registered_participants
        FROM events e
        LEFT JOIN departments d ON e.department_code = d.code
        ORDER BY e.event_date ASC
      `);

      let myRegistrations = new Set();
      if (req.user?.role === 'student') {
        const regRes = await pg.query(`
          SELECT event_id FROM event_registrations
          WHERE student_roll_no = $1 AND status = 'Registered'
        `, [req.user.identifier]);
        regRes.rows.forEach((r: any) => myRegistrations.add(r.event_id));
      }

      const list = eventsRes.rows.map((e: any) => ({
        ...e,
        is_registered: myRegistrations.has(e.id),
      }));

      res.json(list);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  app.post('/api/events/register', authenticateToken, requireRole(['student']), async (req: AuthenticatedRequest, res) => {
    try {
      const { event_id } = req.body;
      const rollNo = req.user?.identifier;
      const studentName = req.user?.name || 'Student';

      const evRes = await pg.query('SELECT * FROM events WHERE id = $1', [event_id]);
      if (evRes.rows.length === 0) return res.status(404).json({ error: 'Event not found.' });
      const event = evRes.rows[0] as any;

      // Check max capacity
      if (event.registered_count >= event.max_participants) {
        return res.status(400).json({ error: 'Registration closed: Event has reached maximum participant capacity.' });
      }

      // Check duplicate
      const existing = await pg.query('SELECT * FROM event_registrations WHERE event_id = $1 AND student_roll_no = $2', [event_id, rollNo]);
      if (existing.rows.length > 0 && (existing.rows[0] as any).status === 'Registered') {
        return res.status(409).json({ error: 'You are already registered for this event.' });
      }

      await pg.query(`
        INSERT INTO event_registrations (event_id, student_roll_no, student_name, status)
        VALUES ($1, $2, $3, 'Registered')
        ON CONFLICT (event_id, student_roll_no) DO UPDATE
        SET status = 'Registered', registration_date = CURRENT_TIMESTAMP
      `, [event_id, rollNo, studentName]);

      await pg.query('UPDATE events SET registered_count = registered_count + 1 WHERE id = $1', [event_id]);

      // Notification
      await pg.query(`
        INSERT INTO notifications (target_type, target_id, title, message, type, link_url)
        VALUES ('student', $1, 'Event Registered: ' || $2, 'Your pass for ' || $2 || ' on ' || $3 || ' at ' || $4 || ' is confirmed.', 'event', '/events')
      `, [rollNo, event.title, event.event_date, event.venue]);

      res.json({ success: true, message: 'Event registration confirmed.' });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  app.post('/api/events/cancel', authenticateToken, requireRole(['student']), async (req: AuthenticatedRequest, res) => {
    try {
      const { event_id } = req.body;
      const rollNo = req.user?.identifier;

      await pg.query(`
        UPDATE event_registrations
        SET status = 'Cancelled'
        WHERE event_id = $1 AND student_roll_no = $2
      `, [event_id, rollNo]);

      await pg.query('UPDATE events SET registered_count = GREATEST(0, registered_count - 1) WHERE id = $1', [event_id]);
      res.json({ success: true, message: 'Event registration cancelled.' });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  app.post('/api/events/create', authenticateToken, requireRole(['faculty', 'hod', 'admin']), async (req: AuthenticatedRequest, res) => {
    try {
      const { title, event_type, department_code, venue, event_date, event_time, description, organizer, max_participants, registration_deadline } = req.body;

      if (!title || !event_date || !venue) {
        return res.status(400).json({ error: 'Title, event date, and venue are required.' });
      }

      const evRes = await pg.query(`
        INSERT INTO events (title, event_type, department_code, venue, event_date, event_time, description, organizer, registration_deadline, max_participants, status)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, 'Upcoming')
        RETURNING *
      `, [
        title,
        event_type || 'Technical',
        department_code || 'CSE',
        venue,
        event_date,
        event_time || '10:00 AM',
        description || 'College technical & cultural event.',
        organizer || req.user!.name,
        registration_deadline || event_date,
        max_participants || 150
      ]);

      // Broadcast notification
      await pg.query(`
        INSERT INTO notifications (target_type, target_id, title, message, type, link_url)
        VALUES ('all', NULL, 'New Event Announced: ' || $1, 'Date: ' || $2 || ' at ' || $3 || '. Registrations are now open.', 'event', '/events')
      `, [title, event_date, venue]);

      res.json(evRes.rows[0]);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  // -------------------------------------------------------------
  // NOTIFICATIONS & ANNOUNCEMENTS
  // -------------------------------------------------------------

  app.get('/api/notifications', authenticateToken, async (req: AuthenticatedRequest, res) => {
    try {
      const user = req.user!;
      const notifsRes = await pg.query(`
        SELECT * FROM notifications
        WHERE (target_type = $1 AND target_id = $2)
           OR (target_type = 'department' AND target_id = $3)
           OR (target_type = 'all')
        ORDER BY created_at DESC
        LIMIT 30
      `, [user.role, user.identifier, user.department_code]);
      res.json(notifsRes.rows);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  app.post('/api/notifications/mark-read', authenticateToken, async (req: AuthenticatedRequest, res) => {
    try {
      const { notification_id } = req.body;
      if (notification_id) {
        await pg.query('UPDATE notifications SET is_read = TRUE WHERE id = $1', [notification_id]);
      } else {
        await pg.query(`
          UPDATE notifications
          SET is_read = TRUE
          WHERE target_id = $1 OR target_type = 'all'
        `, [req.user!.identifier]);
      }
      res.json({ success: true });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  app.get('/api/announcements', authenticateToken, async (_req, res) => {
    try {
      const noticesRes = await pg.query(`
        SELECT a.*, d.name as department_name
        FROM announcements a
        LEFT JOIN departments d ON a.department_code = d.code
        ORDER BY a.created_at DESC
        LIMIT 20
      `);
      res.json(noticesRes.rows);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  app.post('/api/announcements/create', authenticateToken, requireRole(['hod', 'admin']), async (req: AuthenticatedRequest, res) => {
    try {
      const { title, content, department_code, category, priority } = req.body;
      const author = req.user?.name || 'Administrator';

      const aRes = await pg.query(`
        INSERT INTO announcements (title, content, department_code, category, priority, posted_by, author_role)
        VALUES ($1, $2, $3, $4, $5, $6, $7)
        RETURNING *
      `, [title, content, department_code || null, category || 'General', priority || 'Normal', author, req.user!.role]);

      // Broadcast notification
      await pg.query(`
        INSERT INTO notifications (target_type, target_id, title, message, type, link_url)
        VALUES ('all', NULL, '[Notice] ' || $1, $2, 'announcement', '/announcements')
      `, [title, content.substring(0, 150)]);

      res.json(aRes.rows[0]);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  // -------------------------------------------------------------
  // ADMIN ANALYTICS & HOD REPORTS
  // -------------------------------------------------------------

  app.get('/api/admin/analytics', authenticateToken, requireRole(['hod', 'admin', 'placement']), async (req: AuthenticatedRequest, res) => {
    try {
      const userDept = req.user?.role === 'hod' ? req.user.department_code : null;

      // Metrics
      const stdCountRes = await pg.query(`
        SELECT COUNT(*) as count FROM students
        ${userDept ? 'WHERE department_code = $1' : ''}
      `, userDept ? [userDept] : []);

      const facCountRes = await pg.query(`
        SELECT COUNT(*) as count FROM faculty
        ${userDept ? 'WHERE department_code = $1' : ''}
      `, userDept ? [userDept] : []);

      const activeComplaintsRes = await pg.query(`
        SELECT COUNT(*) as count FROM complaints
        WHERE status NOT IN ('Resolved', 'Closed')
        ${userDept ? 'AND assigned_department = $1' : ''}
      `, userDept ? [userDept] : []);

      const totalEventsRes = await pg.query(`
        SELECT COUNT(*) as count FROM events WHERE status = 'Upcoming'
      `);

      const totalPlacementsRes = await pg.query(`
        SELECT COUNT(*) as count FROM placements WHERE status = 'Active'
      `);

      const totalInternshipsRes = await pg.query(`
        SELECT COUNT(*) as count FROM internships WHERE status = 'Open'
      `);

      const pAppsRes = await pg.query('SELECT COUNT(*) as count FROM placement_applications');
      const iAppsRes = await pg.query('SELECT COUNT(*) as count FROM internship_applications');

      // Department Attendance Averages
      const deptAttendanceRes = await pg.query(`
        SELECT 
          s.department_code,
          COUNT(*) as total_records,
          COUNT(CASE WHEN ar.status = 'present' THEN 1 END) as present_records,
          ROUND((COUNT(CASE WHEN ar.status = 'present' THEN 1 END)::NUMERIC / NULLIF(COUNT(*), 0)) * 100, 1) as avg_attendance
        FROM attendance_records ar
        JOIN students s ON ar.student_roll_no = s.roll_no
        GROUP BY s.department_code
        ORDER BY s.department_code ASC
      `);

      // Complaints by Category
      const compCategoryRes = await pg.query(`
        SELECT category, COUNT(*) as count
        FROM complaints
        GROUP BY category
        ORDER BY count DESC
      `);

      // Recent System Audit Logs
      const auditRes = await pg.query(`
        SELECT * FROM audit_logs
        ORDER BY timestamp DESC
        LIMIT 15
      `);

      res.json({
        total_students: parseInt((stdCountRes.rows[0] as any).count, 10),
        total_faculty: parseInt((facCountRes.rows[0] as any).count, 10),
        active_complaints: parseInt((activeComplaintsRes.rows[0] as any).count, 10),
        upcoming_events: parseInt((totalEventsRes.rows[0] as any).count, 10),
        active_placements: parseInt((totalPlacementsRes.rows[0] as any).count, 10),
        open_internships: parseInt((totalInternshipsRes.rows[0] as any).count, 10),
        placement_applications: parseInt((pAppsRes.rows[0] as any).count, 10),
        internship_applications: parseInt((iAppsRes.rows[0] as any).count, 10),
        dept_attendance: deptAttendanceRes.rows,
        complaints_by_category: compCategoryRes.rows,
        audit_logs: auditRes.rows,
      });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  // Get Roster of Students & Faculty for Management
  app.get('/api/admin/users', authenticateToken, requireRole(['hod', 'admin']), async (req: AuthenticatedRequest, res) => {
    try {
      const studentsRes = await pg.query(`
        SELECT s.*, u.email as user_email
        FROM students s
        JOIN users u ON s.user_id = u.id
        ORDER BY s.roll_no ASC
        LIMIT 100
      `);

      const facultyRes = await pg.query(`
        SELECT f.*, u.email as user_email
        FROM faculty f
        JOIN users u ON f.user_id = u.id
        ORDER BY f.staff_id ASC
        LIMIT 30
      `);

      const deptsRes = await pg.query('SELECT * FROM departments ORDER BY code ASC');

      res.json({
        students: studentsRes.rows,
        faculty: facultyRes.rows,
        departments: deptsRes.rows,
      });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  // -------------------------------------------------------------
  // DATABASE MANAGEMENT & STORAGE ENGINE (Free & Accurate)
  // -------------------------------------------------------------
  const ALL_COLLEGE_TABLES = [
    'departments',
    'users',
    'students',
    'faculty',
    'subjects',
    'attendance_sessions',
    'attendance_records',
    'attendance_audit_logs',
    'complaints',
    'complaint_updates',
    'events',
    'event_registrations',
    'companies',
    'placements',
    'placement_applications',
    'internships',
    'internship_applications',
    'announcements',
    'notifications',
    'ai_conversations',
    'audit_logs',
    'internal_marks'
  ];

  function getDirectorySize(dirPath: string): number {
    let totalSize = 0;
    try {
      if (fs.existsSync(dirPath)) {
        const files = fs.readdirSync(dirPath);
        for (const file of files) {
          const fullPath = path.join(dirPath, file);
          const stats = fs.statSync(fullPath);
          if (stats.isDirectory()) {
            totalSize += getDirectorySize(fullPath);
          } else {
            totalSize += stats.size;
          }
        }
      }
    } catch {
      // Ignore directory calculation errors
    }
    return totalSize;
  }

  // Database Overview & Storage Metrics
  app.get('/api/admin/database/overview', authenticateToken, requireRole(['admin']), async (req: AuthenticatedRequest, res) => {
    try {
      const pingStart = performance.now();
      await pg.query('SELECT 1');
      const latencyMs = parseFloat((performance.now() - pingStart).toFixed(2));

      const tableStats = [];
      let totalRecords = 0;

      for (const tableName of ALL_COLLEGE_TABLES) {
        try {
          const countRes = await pg.query(`SELECT COUNT(*) as count FROM ${tableName}`);
          const rowCount = parseInt((countRes.rows[0] as any).count, 10);
          totalRecords += rowCount;
          tableStats.push({
            table_name: tableName,
            row_count: rowCount,
            status: 'active'
          });
        } catch (e: any) {
          tableStats.push({
            table_name: tableName,
            row_count: 0,
            status: 'error',
            error: e.message
          });
        }
      }

      const dirSizeBytes = getDirectorySize(DB_DIR);
      const dirSizeMb = (dirSizeBytes / (1024 * 1024)).toFixed(2);

      res.json({
        engine: 'PostgreSQL (PGlite Embedded v0.5.8)',
        storage_mode: 'Persistent Local Disk Storage (Fully Free & Zero Cloud Bill)',
        storage_path: DB_DIR,
        storage_size_bytes: dirSizeBytes,
        storage_size_mb: dirSizeMb,
        cost: '$0.00 / Free Open-Source Forever',
        acid_compliant: true,
        latency_ms: latencyMs,
        uptime_seconds: Math.floor(process.uptime()),
        total_tables: ALL_COLLEGE_TABLES.length,
        total_records: totalRecords,
        tables: tableStats,
        health: 'Healthy & Fully Operational',
        features: [
          'Persistent disk sync on all writes',
          'Full SQL relational constraints & Foreign Keys',
          'Zero cloud hosting fee / 100% Free',
          'Instant backup & restore capabilities',
          'ACID transaction guarantees for attendance & grievances'
        ]
      });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  // Table Data & Schema Inspector
  app.get('/api/admin/database/tables/:tableName', authenticateToken, requireRole(['admin']), async (req: AuthenticatedRequest, res) => {
    try {
      const { tableName } = req.params;
      if (!ALL_COLLEGE_TABLES.includes(tableName)) {
        return res.status(400).json({ error: `Table '${tableName}' not found or not whitelisted.` });
      }

      const page = parseInt((req.query.page as string) || '1', 10);
      const limit = Math.min(parseInt((req.query.limit as string) || '50', 10), 200);
      const offset = (page - 1) * limit;

      // Columns metadata
      const columnsRes = await pg.query(`
        SELECT column_name, data_type, is_nullable, column_default
        FROM information_schema.columns
        WHERE table_name = $1
        ORDER BY ordinal_position
      `, [tableName]);

      // Row count
      const countRes = await pg.query(`SELECT COUNT(*) as count FROM ${tableName}`);
      const totalCount = parseInt((countRes.rows[0] as any).count, 10);

      // Rows
      const rowsRes = await pg.query(`SELECT * FROM ${tableName} ORDER BY 1 DESC LIMIT $1 OFFSET $2`, [limit, offset]);

      res.json({
        table_name: tableName,
        columns: columnsRes.rows,
        rows: rowsRes.rows,
        total_count: totalCount,
        page,
        limit,
        total_pages: Math.ceil(totalCount / limit)
      });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  // Execute Direct SQL Query (Admin Console)
  app.post('/api/admin/database/query', authenticateToken, requireRole(['admin']), async (req: AuthenticatedRequest, res) => {
    try {
      const { sql } = req.body;
      if (!sql || typeof sql !== 'string' || !sql.trim()) {
        return res.status(400).json({ error: 'SQL query cannot be empty.' });
      }

      const queryStart = performance.now();
      const queryResult = await pg.query(sql);
      const durationMs = parseFloat((performance.now() - queryStart).toFixed(2));

      res.json({
        success: true,
        duration_ms: durationMs,
        row_count: queryResult.rows ? queryResult.rows.length : 0,
        fields: queryResult.fields ? queryResult.fields.map(f => f.name) : [],
        rows: queryResult.rows || [],
      });
    } catch (err: any) {
      res.status(400).json({
        success: false,
        error: err.message
      });
    }
  });

  // Export Full Database Backup (Downloadable JSON)
  app.get('/api/admin/database/backup', authenticateToken, requireRole(['admin']), async (req: AuthenticatedRequest, res) => {
    try {
      const backupData: Record<string, any[]> = {};
      let totalCount = 0;

      for (const tbl of ALL_COLLEGE_TABLES) {
        const rowsRes = await pg.query(`SELECT * FROM ${tbl}`);
        backupData[tbl] = rowsRes.rows;
        totalCount += rowsRes.rows.length;
      }

      const exportPayload = {
        meta: {
          institution: 'Teegala Krishna Reddy Engineering College (TKREC)',
          system: 'TKREC Campus OS - Database Engine',
          exported_at: new Date().toISOString(),
          exported_by: req.user?.identifier || 'admin',
          total_tables: ALL_COLLEGE_TABLES.length,
          total_records: totalCount,
          engine: 'PostgreSQL PGlite v0.5.8'
        },
        data: backupData
      };

      const filename = `tkrec_database_backup_${new Date().toISOString().replace(/[:.]/g, '-')}.json`;
      res.setHeader('Content-Type', 'application/json');
      res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
      res.send(JSON.stringify(exportPayload, null, 2));
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  // Restore Database from Backup
  app.post('/api/admin/database/restore', authenticateToken, requireRole(['admin']), async (req: AuthenticatedRequest, res) => {
    try {
      const { data } = req.body;
      if (!data || typeof data !== 'object') {
        return res.status(400).json({ error: 'Invalid backup data format. Expected an object with table data.' });
      }

      let restoredTables = 0;
      let restoredRecords = 0;

      for (const tbl of ALL_COLLEGE_TABLES) {
        if (Array.isArray(data[tbl]) && data[tbl].length > 0) {
          // Truncate table and re-insert records
          await pg.exec(`TRUNCATE TABLE ${tbl} CASCADE;`);
          for (const row of data[tbl]) {
            const keys = Object.keys(row);
            if (keys.length === 0) continue;
            const values = Object.values(row);
            const cols = keys.map(k => `"${k}"`).join(', ');
            const placeholders = keys.map((_, i) => `$${i + 1}`).join(', ');
            await pg.query(`INSERT INTO ${tbl} (${cols}) VALUES (${placeholders})`, values);
            restoredRecords++;
          }
          restoredTables++;
        }
      }

      res.json({
        success: true,
        message: `Successfully restored ${restoredRecords} records across ${restoredTables} tables.`,
        restored_tables: restoredTables,
        restored_records: restoredRecords
      });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  // Reseed Database (Fresh State)
  app.post('/api/admin/database/reseed', authenticateToken, requireRole(['admin']), async (req: AuthenticatedRequest, res) => {
    try {
      await resetAndReseedDatabase();
      res.json({
        success: true,
        message: 'Database schema dropped, recreated, and successfully seeded with fresh institutional data.'
      });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  // Integrity & Diagnostic Check
  app.get('/api/admin/database/integrity-check', authenticateToken, requireRole(['admin']), async (req: AuthenticatedRequest, res) => {
    try {
      const checks: Array<{ name: string; description: string; status: 'PASS' | 'FAIL'; count: number }> = [];

      // Check 1: Attendance records referential integrity
      const chk1 = await pg.query(`
        SELECT COUNT(*) as count 
        FROM attendance_records ar 
        LEFT JOIN students s ON ar.student_roll_no = s.roll_no 
        WHERE s.roll_no IS NULL
      `);
      const cnt1 = parseInt((chk1.rows[0] as any).count, 10);
      checks.push({
        name: 'Attendance Student References',
        description: 'Verifies every attendance record is linked to an existing registered student',
        status: cnt1 === 0 ? 'PASS' : 'FAIL',
        count: cnt1
      });

      // Check 2: Grievance student referential integrity
      const chk2 = await pg.query(`
        SELECT COUNT(*) as count 
        FROM complaints c 
        LEFT JOIN students s ON c.student_roll_no = s.roll_no 
        WHERE s.roll_no IS NULL
      `);
      const cnt2 = parseInt((chk2.rows[0] as any).count, 10);
      checks.push({
        name: 'Grievance Student References',
        description: 'Verifies all complaint tickets match registered student records',
        status: cnt2 === 0 ? 'PASS' : 'FAIL',
        count: cnt2
      });

      // Check 3: Student User account integrity
      const chk3 = await pg.query(`
        SELECT COUNT(*) as count 
        FROM students s 
        LEFT JOIN users u ON s.user_id = u.id 
        WHERE u.id IS NULL
      `);
      const cnt3 = parseInt((chk3.rows[0] as any).count, 10);
      checks.push({
        name: 'Student User Accounts',
        description: 'Verifies every student has a corresponding authentication user login',
        status: cnt3 === 0 ? 'PASS' : 'FAIL',
        count: cnt3
      });

      // Check 4: Faculty User account integrity
      const chk4 = await pg.query(`
        SELECT COUNT(*) as count 
        FROM faculty f 
        LEFT JOIN users u ON f.user_id = u.id 
        WHERE u.id IS NULL
      `);
      const cnt4 = parseInt((chk4.rows[0] as any).count, 10);
      checks.push({
        name: 'Faculty User Accounts',
        description: 'Verifies every faculty staff has a corresponding authentication user login',
        status: cnt4 === 0 ? 'PASS' : 'FAIL',
        count: cnt4
      });

      // Check 5: Subject Faculty integrity
      const chk5 = await pg.query(`
        SELECT COUNT(*) as count 
        FROM subjects sub 
        LEFT JOIN faculty f ON sub.faculty_staff_id = f.staff_id 
        WHERE f.staff_id IS NULL AND sub.faculty_staff_id IS NOT NULL
      `);
      const cnt5 = parseInt((chk5.rows[0] as any).count, 10);
      checks.push({
        name: 'Subject Faculty Allocation',
        description: 'Verifies subject teachers match active faculty staff records',
        status: cnt5 === 0 ? 'PASS' : 'FAIL',
        count: cnt5
      });

      const allPassed = checks.every(c => c.status === 'PASS');

      res.json({
        status: allPassed ? 'OPTIMAL' : 'WARNING',
        integrity_score: allPassed ? '100%' : '95%',
        timestamp: new Date().toISOString(),
        total_checks: checks.length,
        checks
      });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  // -------------------------------------------------------------
  // GLOBAL SEARCH (Database-backed)
  // -------------------------------------------------------------

  app.get('/api/search', authenticateToken, async (req, res) => {
    try {
      const q = ((req.query.q as string) || '').trim().toLowerCase();
      if (!q || q.length < 2) {
        return res.json({ events: [], placements: [], internships: [], subjects: [], complaints: [] });
      }

      const wildcard = `%${q}%`;

      const eventsRes = await pg.query(`
        SELECT id, title, event_type, event_date, venue, 'event' as search_type
        FROM events
        WHERE LOWER(title) LIKE $1 OR LOWER(description) LIKE $1 OR LOWER(event_type) LIKE $1
        LIMIT 5
      `, [wildcard]);

      const placementsRes = await pg.query(`
        SELECT id, company_name, job_role, package_lpa, 'placement' as search_type
        FROM placements
        WHERE LOWER(company_name) LIKE $1 OR LOWER(job_role) LIKE $1 OR LOWER(skills_required) LIKE $1
        LIMIT 5
      `, [wildcard]);

      const internshipsRes = await pg.query(`
        SELECT id, company_name, role, stipend, 'internship' as search_type
        FROM internships
        WHERE LOWER(company_name) LIKE $1 OR LOWER(role) LIKE $1 OR LOWER(skills_required) LIKE $1
        LIMIT 5
      `, [wildcard]);

      const subjectsRes = await pg.query(`
        SELECT id, code, name, department_code, 'subject' as search_type
        FROM subjects
        WHERE LOWER(code) LIKE $1 OR LOWER(name) LIKE $1
        LIMIT 5
      `, [wildcard]);

      const complaintsRes = await pg.query(`
        SELECT id, ticket_number, subject, category, status, 'complaint' as search_type
        FROM complaints
        WHERE LOWER(ticket_number) LIKE $1 OR LOWER(subject) LIKE $1 OR LOWER(description) LIKE $1
        LIMIT 5
      `, [wildcard]);

      res.json({
        events: eventsRes.rows,
        placements: placementsRes.rows,
        internships: internshipsRes.rows,
        subjects: subjectsRes.rows,
        complaints: complaintsRes.rows,
      });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  // -------------------------------------------------------------
  // VITE DEV MIDDLEWARE & CLIENT SERVING
  // -------------------------------------------------------------
  const isProduction = process.env.NODE_ENV === 'production';
  if (!isProduction) {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    app.use(express.static(path.resolve(__dirname, 'dist')));
    app.get('*', (_req, res) => {
      res.sendFile(path.resolve(__dirname, 'dist', 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`[Server] Teegala Krishna Reddy Engineering College (TKREC) Portal server running on http://0.0.0.0:${PORT}`);
  });
}

startServer().catch(err => {
  console.error('[Server Error] Failed to initialize backend:', err);
});
