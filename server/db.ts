import { PGlite } from '@electric-sql/pglite';
import bcrypt from 'bcryptjs';
import path from 'path';
import fs from 'fs';

// Free, reliable persistent PostgreSQL instance in Node.js
const DB_DATA_DIR = process.env.DATABASE_DIR || path.join(process.cwd(), '.data', 'postgres_db');
if (!fs.existsSync(DB_DATA_DIR)) {
  fs.mkdirSync(DB_DATA_DIR, { recursive: true });
}

export const pg = new PGlite(DB_DATA_DIR);
export const DB_DIR = DB_DATA_DIR;

export async function resetAndReseedDatabase() {
  console.log('[Database] Resetting and reseeding database from schema...');
  await pg.exec(`
    DROP SCHEMA public CASCADE;
    CREATE SCHEMA public;
    GRANT ALL ON SCHEMA public TO PUBLIC;
  `);
  await initDatabase();
  console.log('[Database] Reset and reseed complete.');
}

export async function initDatabase() {
  console.log('[Database] Initializing PostgreSQL tables...');

  // Create tables with primary keys, foreign keys, constraints, and indexes
  await pg.exec(`
    -- Departments
    CREATE TABLE IF NOT EXISTS departments (
      id SERIAL PRIMARY KEY,
      code VARCHAR(10) UNIQUE NOT NULL,
      name VARCHAR(100) NOT NULL,
      hod_name VARCHAR(100) NOT NULL,
      hod_email VARCHAR(100) NOT NULL,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );

    -- Users (Role based: student, faculty, hod, placement, admin)
    CREATE TABLE IF NOT EXISTS users (
      id SERIAL PRIMARY KEY,
      identifier VARCHAR(50) UNIQUE NOT NULL, -- roll_no or staff_id or username
      email VARCHAR(100) UNIQUE NOT NULL,
      password_hash VARCHAR(255) NOT NULL,
      role VARCHAR(20) NOT NULL CHECK (role IN ('student', 'faculty', 'hod', 'placement', 'admin')),
      name VARCHAR(100) NOT NULL,
      department_code VARCHAR(10) REFERENCES departments(code),
      avatar_url TEXT,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );

    -- Students Details
    CREATE TABLE IF NOT EXISTS students (
      id SERIAL PRIMARY KEY,
      user_id INT UNIQUE REFERENCES users(id) ON DELETE CASCADE,
      roll_no VARCHAR(50) UNIQUE NOT NULL,
      name VARCHAR(100) NOT NULL,
      email VARCHAR(100) NOT NULL,
      department_code VARCHAR(10) REFERENCES departments(code),
      year INT NOT NULL CHECK (year BETWEEN 1 AND 4),
      semester INT NOT NULL CHECK (semester BETWEEN 1 AND 8),
      section VARCHAR(5) NOT NULL,
      cgpa NUMERIC(4, 2) NOT NULL DEFAULT 0.00,
      active_backlogs INT NOT NULL DEFAULT 0,
      batch VARCHAR(20) NOT NULL,
      phone VARCHAR(20),
      qr_code_token VARCHAR(100) UNIQUE NOT NULL,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );

    -- Faculty Details
    CREATE TABLE IF NOT EXISTS faculty (
      id SERIAL PRIMARY KEY,
      user_id INT UNIQUE REFERENCES users(id) ON DELETE CASCADE,
      staff_id VARCHAR(50) UNIQUE NOT NULL,
      name VARCHAR(100) NOT NULL,
      email VARCHAR(100) NOT NULL,
      department_code VARCHAR(10) REFERENCES departments(code),
      designation VARCHAR(100) NOT NULL,
      phone VARCHAR(20),
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );

    -- Subjects
    CREATE TABLE IF NOT EXISTS subjects (
      id SERIAL PRIMARY KEY,
      code VARCHAR(20) UNIQUE NOT NULL,
      name VARCHAR(100) NOT NULL,
      department_code VARCHAR(10) REFERENCES departments(code),
      semester INT NOT NULL,
      faculty_staff_id VARCHAR(50) REFERENCES faculty(staff_id),
      total_credits INT NOT NULL DEFAULT 3,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );

    -- Attendance Sessions (Created by faculty when starting attendance)
    CREATE TABLE IF NOT EXISTS attendance_sessions (
      id SERIAL PRIMARY KEY,
      session_code VARCHAR(50) UNIQUE NOT NULL,
      subject_code VARCHAR(20) REFERENCES subjects(code),
      faculty_staff_id VARCHAR(50) REFERENCES faculty(staff_id),
      department_code VARCHAR(10) REFERENCES departments(code),
      section VARCHAR(5) NOT NULL,
      semester INT NOT NULL,
      date DATE NOT NULL DEFAULT CURRENT_DATE,
      time_slot VARCHAR(50) NOT NULL,
      status VARCHAR(20) NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'completed', 'cancelled')),
      total_present INT NOT NULL DEFAULT 0,
      total_absent INT NOT NULL DEFAULT 0,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );

    -- Attendance Records (One record per student per session, anti-fraud unique constraint)
    CREATE TABLE IF NOT EXISTS attendance_records (
      id SERIAL PRIMARY KEY,
      session_id INT REFERENCES attendance_sessions(id) ON DELETE CASCADE,
      student_roll_no VARCHAR(50) REFERENCES students(roll_no),
      subject_code VARCHAR(20) REFERENCES subjects(code),
      faculty_staff_id VARCHAR(50) REFERENCES faculty(staff_id),
      date DATE NOT NULL,
      time_slot VARCHAR(50) NOT NULL,
      status VARCHAR(10) NOT NULL CHECK (status IN ('present', 'absent', 'late', 'excused')),
      method VARCHAR(30) NOT NULL DEFAULT 'qr_scan' CHECK (method IN ('qr_scan', 'manual', 'admin_override', 'scanner_absent', 'paper_slip', 'smart_auto_absent', 'smart_bulk_present', 'smart_list_absent', 'smart_list_present')),
      device_session_id VARCHAR(100),
      ip_address VARCHAR(50),
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      CONSTRAINT unique_student_session UNIQUE (session_id, student_roll_no)
    );

    -- Attendance Audit Logs
    CREATE TABLE IF NOT EXISTS attendance_audit_logs (
      id SERIAL PRIMARY KEY,
      attendance_record_id INT,
      student_roll_no VARCHAR(50) NOT NULL,
      session_id INT NOT NULL,
      subject_code VARCHAR(20) NOT NULL,
      modified_by_id VARCHAR(50) NOT NULL, -- staff_id or admin username
      modifier_role VARCHAR(20) NOT NULL,
      old_status VARCHAR(10),
      new_status VARCHAR(10) NOT NULL,
      reason TEXT NOT NULL,
      timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );

    -- Complaints / Grievances
    CREATE TABLE IF NOT EXISTS complaints (
      id SERIAL PRIMARY KEY,
      ticket_number VARCHAR(50) UNIQUE NOT NULL,
      student_roll_no VARCHAR(50) REFERENCES students(roll_no),
      student_name VARCHAR(100) NOT NULL,
      category VARCHAR(50) NOT NULL,
      subject VARCHAR(150) NOT NULL,
      description TEXT NOT NULL,
      assigned_department VARCHAR(10) REFERENCES departments(code),
      priority VARCHAR(20) NOT NULL DEFAULT 'Medium' CHECK (priority IN ('Low', 'Medium', 'High', 'Urgent')),
      status VARCHAR(30) NOT NULL DEFAULT 'Submitted' CHECK (status IN ('Submitted', 'Assigned', 'In Progress', 'Waiting for Information', 'Resolved', 'Closed')),
      assigned_to_staff VARCHAR(100),
      ai_category_confidence NUMERIC(3, 2),
      ai_summary TEXT,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );

    -- Complaint Updates / History
    CREATE TABLE IF NOT EXISTS complaint_updates (
      id SERIAL PRIMARY KEY,
      complaint_id INT REFERENCES complaints(id) ON DELETE CASCADE,
      updated_by VARCHAR(100) NOT NULL,
      updater_role VARCHAR(20) NOT NULL,
      old_status VARCHAR(30),
      new_status VARCHAR(30),
      message TEXT NOT NULL,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );

    -- College Events
    CREATE TABLE IF NOT EXISTS events (
      id SERIAL PRIMARY KEY,
      title VARCHAR(150) NOT NULL,
      event_type VARCHAR(50) NOT NULL, -- Technical, Workshop, Hackathon, Cultural, Sports
      department_code VARCHAR(10) REFERENCES departments(code),
      venue VARCHAR(100) NOT NULL,
      event_date DATE NOT NULL,
      event_time VARCHAR(50) NOT NULL,
      description TEXT NOT NULL,
      organizer VARCHAR(100) NOT NULL,
      registration_deadline DATE NOT NULL,
      max_participants INT NOT NULL DEFAULT 100,
      registered_count INT NOT NULL DEFAULT 0,
      image_url TEXT,
      status VARCHAR(20) NOT NULL DEFAULT 'Upcoming' CHECK (status IN ('Upcoming', 'Today', 'Completed', 'Cancelled')),
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );

    -- Event Registrations
    CREATE TABLE IF NOT EXISTS event_registrations (
      id SERIAL PRIMARY KEY,
      event_id INT REFERENCES events(id) ON DELETE CASCADE,
      student_roll_no VARCHAR(50) REFERENCES students(roll_no),
      student_name VARCHAR(100) NOT NULL,
      registration_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      status VARCHAR(20) NOT NULL DEFAULT 'Registered' CHECK (status IN ('Registered', 'Attended', 'Cancelled')),
      CONSTRAINT unique_event_student UNIQUE (event_id, student_roll_no)
    );

    -- Companies (Recruiters)
    CREATE TABLE IF NOT EXISTS companies (
      id SERIAL PRIMARY KEY,
      name VARCHAR(100) UNIQUE NOT NULL,
      website VARCHAR(150),
      logo_url TEXT,
      industry VARCHAR(50) NOT NULL,
      location VARCHAR(100) NOT NULL,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );

    -- Placements
    CREATE TABLE IF NOT EXISTS placements (
      id SERIAL PRIMARY KEY,
      company_id INT REFERENCES companies(id) ON DELETE CASCADE,
      company_name VARCHAR(100) NOT NULL,
      job_role VARCHAR(100) NOT NULL,
      package_lpa NUMERIC(5, 2) NOT NULL, -- e.g. 12.50 LPA
      location VARCHAR(100) NOT NULL,
      min_cgpa NUMERIC(4, 2) NOT NULL DEFAULT 6.00,
      max_backlogs INT NOT NULL DEFAULT 0,
      eligible_departments TEXT NOT NULL, -- JSON array string, e.g. ["CSE", "ECE", "IT"]
      graduation_year INT NOT NULL,
      skills_required TEXT NOT NULL,
      selection_process TEXT NOT NULL,
      description TEXT NOT NULL,
      application_deadline DATE NOT NULL,
      status VARCHAR(20) NOT NULL DEFAULT 'Active' CHECK (status IN ('Active', 'Closed', 'In Progress')),
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );

    -- Placement Applications
    CREATE TABLE IF NOT EXISTS placement_applications (
      id SERIAL PRIMARY KEY,
      placement_id INT REFERENCES placements(id) ON DELETE CASCADE,
      student_roll_no VARCHAR(50) REFERENCES students(roll_no),
      student_name VARCHAR(100) NOT NULL,
      student_cgpa NUMERIC(4, 2) NOT NULL,
      department_code VARCHAR(10) NOT NULL,
      status VARCHAR(30) NOT NULL DEFAULT 'Applied' CHECK (status IN ('Applied', 'Under Review', 'Shortlisted', 'Interview', 'Selected', 'Rejected')),
      notes TEXT,
      applied_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      CONSTRAINT unique_placement_student UNIQUE (placement_id, student_roll_no)
    );

    -- Internships Marketplace
    CREATE TABLE IF NOT EXISTS internships (
      id SERIAL PRIMARY KEY,
      company_id INT REFERENCES companies(id) ON DELETE CASCADE,
      company_name VARCHAR(100) NOT NULL,
      role VARCHAR(100) NOT NULL,
      skills_required TEXT NOT NULL,
      duration VARCHAR(50) NOT NULL, -- e.g. "3 Months", "6 Months"
      stipend VARCHAR(50) NOT NULL, -- e.g. "₹25,000 / month" or "Unpaid"
      is_paid BOOLEAN NOT NULL DEFAULT TRUE,
      location VARCHAR(100) NOT NULL,
      work_type VARCHAR(20) NOT NULL CHECK (work_type IN ('Remote', 'Onsite', 'Hybrid')),
      eligible_departments TEXT NOT NULL, -- JSON string
      min_cgpa NUMERIC(4, 2) NOT NULL DEFAULT 6.00,
      start_date DATE NOT NULL,
      application_deadline DATE NOT NULL,
      application_link TEXT,
      description TEXT NOT NULL,
      status VARCHAR(20) NOT NULL DEFAULT 'Open' CHECK (status IN ('Open', 'Closed')),
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );

    -- Internship Applications
    CREATE TABLE IF NOT EXISTS internship_applications (
      id SERIAL PRIMARY KEY,
      internship_id INT REFERENCES internships(id) ON DELETE CASCADE,
      student_roll_no VARCHAR(50) REFERENCES students(roll_no),
      student_name VARCHAR(100) NOT NULL,
      department_code VARCHAR(10) NOT NULL,
      status VARCHAR(30) NOT NULL DEFAULT 'Applied' CHECK (status IN ('Applied', 'Under Review', 'Shortlisted', 'Interview', 'Selected', 'Rejected')),
      applied_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      CONSTRAINT unique_internship_student UNIQUE (internship_id, student_roll_no)
    );

    -- Notifications
    CREATE TABLE IF NOT EXISTS notifications (
      id SERIAL PRIMARY KEY,
      target_type VARCHAR(20) NOT NULL CHECK (target_type IN ('student', 'faculty', 'all', 'department')),
      target_id VARCHAR(50), -- roll_no or staff_id or department_code
      title VARCHAR(150) NOT NULL,
      message TEXT NOT NULL,
      type VARCHAR(30) NOT NULL CHECK (type IN ('absence', 'low_attendance', 'event', 'placement', 'internship', 'complaint', 'announcement')),
      link_url TEXT,
      is_read BOOLEAN NOT NULL DEFAULT FALSE,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );

    -- Announcements
    CREATE TABLE IF NOT EXISTS announcements (
      id SERIAL PRIMARY KEY,
      title VARCHAR(150) NOT NULL,
      content TEXT NOT NULL,
      department_code VARCHAR(10), -- NULL for college-wide
      category VARCHAR(50) NOT NULL, -- Examination, Academic, General, Placement
      priority VARCHAR(20) NOT NULL DEFAULT 'Normal' CHECK (priority IN ('Normal', 'High', 'Urgent')),
      posted_by VARCHAR(100) NOT NULL,
      author_role VARCHAR(20) NOT NULL,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );

    -- AI Conversations
    CREATE TABLE IF NOT EXISTS ai_conversations (
      id SERIAL PRIMARY KEY,
      user_identifier VARCHAR(50) NOT NULL,
      role VARCHAR(20) NOT NULL,
      user_message TEXT NOT NULL,
      ai_response TEXT NOT NULL,
      sources_used TEXT,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );

    -- System Audit Logs
    CREATE TABLE IF NOT EXISTS audit_logs (
      id SERIAL PRIMARY KEY,
      actor_id VARCHAR(50) NOT NULL,
      actor_role VARCHAR(20) NOT NULL,
      action VARCHAR(100) NOT NULL,
      entity_type VARCHAR(50) NOT NULL,
      entity_id VARCHAR(50) NOT NULL,
      details TEXT,
      ip_address VARCHAR(50),
      timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );

    -- Academic internal marks & timetables
    CREATE TABLE IF NOT EXISTS internal_marks (
      id SERIAL PRIMARY KEY,
      student_roll_no VARCHAR(50) REFERENCES students(roll_no),
      subject_code VARCHAR(20) REFERENCES subjects(code),
      assessment_name VARCHAR(50) NOT NULL, -- Mid-1, Mid-2, Assignment, Lab
      marks_obtained NUMERIC(5, 2) NOT NULL,
      max_marks NUMERIC(5, 2) NOT NULL DEFAULT 30.00,
      semester INT NOT NULL
    );

    -- Indexes for high performance
    CREATE INDEX IF NOT EXISTS idx_students_roll ON students(roll_no);
    CREATE INDEX IF NOT EXISTS idx_attendance_records_student ON attendance_records(student_roll_no);
    CREATE INDEX IF NOT EXISTS idx_attendance_records_session ON attendance_records(session_id);
    CREATE INDEX IF NOT EXISTS idx_complaints_student ON complaints(student_roll_no);
    CREATE INDEX IF NOT EXISTS idx_notifications_target ON notifications(target_id, target_type);
  `);

  console.log('[Database] Tables created successfully.');
  await seedDatabaseIfEmpty();
}

async function seedDatabaseIfEmpty() {
  const existingDept = await pg.query('SELECT COUNT(*) as count FROM departments');
  if (parseInt((existingDept.rows[0] as any).count, 10) > 0) {
    console.log('[Database] Database already seeded. Ready.');
    return;
  }

  console.log('[Database] Seeding realistic college database...');
  const passwordHash = await bcrypt.hash('college123', 10);

  // 1. Seed 5 Departments
  const departments = [
    { code: 'CSE', name: 'Computer Science and Engineering', hod: 'Dr. Ramesh Sharma', email: 'hod.cse@tkrec.ac.in' },
    { code: 'ECE', name: 'Electronics and Communication Engineering', hod: 'Dr. Sunita Verma', email: 'hod.ece@tkrec.ac.in' },
    { code: 'MECH', name: 'Mechanical Engineering', hod: 'Dr. Anand Kulkarni', email: 'hod.mech@tkrec.ac.in' },
    { code: 'CIVIL', name: 'Civil Engineering', hod: 'Dr. Meera Nambiar', email: 'hod.civil@tkrec.ac.in' },
    { code: 'IT', name: 'Information Technology', hod: 'Dr. Rajesh Patel', email: 'hod.it@tkrec.ac.in' },
  ];

  for (const d of departments) {
    await pg.query(
      'INSERT INTO departments (code, name, hod_name, hod_email) VALUES ($1, $2, $3, $4)',
      [d.code, d.name, d.hod, d.email]
    );
  }

  // 2. Seed Default Administrative Users
  // Super Admin
  const adminUser = await pg.query(`
    INSERT INTO users (identifier, email, password_hash, role, name, department_code, avatar_url)
    VALUES ('admin', 'admin@tkrec.ac.in', $1, 'admin', 'Dr. V. K. Ramaswamy (Principal & Super Admin)', NULL, 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150')
    RETURNING id
  `, [passwordHash]);

  // Placement Cell Head
  await pg.query(`
    INSERT INTO users (identifier, email, password_hash, role, name, department_code, avatar_url)
    VALUES ('placement_head', 'placement@tkrec.ac.in', $1, 'placement', 'Prof. Arvind Subramaniam (Placement Director)', 'CSE', 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=150')
  `, [passwordHash]);

  // HOD CSE
  await pg.query(`
    INSERT INTO users (identifier, email, password_hash, role, name, department_code, avatar_url)
    VALUES ('hod_cse', 'hod.cse@tkrec.ac.in', $1, 'hod', 'Dr. Ramesh Sharma (HOD CSE)', 'CSE', 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=150')
  `, [passwordHash]);

  // 3. Seed 20 Faculty Members (4 per department)
  const facultyList = [
    { staff_id: 'FAC-CSE-01', name: 'Dr. Ramesh Sharma', dept: 'CSE', designation: 'Professor & HOD', email: 'ramesh.sharma@tkrec.ac.in' },
    { staff_id: 'FAC-CSE-02', name: 'Dr. Priya Swaminathan', dept: 'CSE', designation: 'Associate Professor', email: 'priya.s@tkrec.ac.in' },
    { staff_id: 'FAC-CSE-03', name: 'Prof. Vikram Hegde', dept: 'CSE', designation: 'Assistant Professor', email: 'vikram.h@tkrec.ac.in' },
    { staff_id: 'FAC-CSE-04', name: 'Prof. Ananya Sen', dept: 'CSE', designation: 'Assistant Professor', email: 'ananya.s@tkrec.ac.in' },

    { staff_id: 'FAC-ECE-01', name: 'Dr. Sunita Verma', dept: 'ECE', designation: 'Professor & HOD', email: 'sunita.verma@tkrec.ac.in' },
    { staff_id: 'FAC-ECE-02', name: 'Dr. Suresh Nair', dept: 'ECE', designation: 'Associate Professor', email: 'suresh.n@tkrec.ac.in' },
    { staff_id: 'FAC-ECE-03', name: 'Prof. Kavita Rao', dept: 'ECE', designation: 'Assistant Professor', email: 'kavita.r@tkrec.ac.in' },
    { staff_id: 'FAC-ECE-04', name: 'Prof. Manoj Pillai', dept: 'ECE', designation: 'Assistant Professor', email: 'manoj.p@tkrec.ac.in' },

    { staff_id: 'FAC-MECH-01', name: 'Dr. Anand Kulkarni', dept: 'MECH', designation: 'Professor & HOD', email: 'anand.kulkarni@tkrec.ac.in' },
    { staff_id: 'FAC-MECH-02', name: 'Dr. Balaji Iyengar', dept: 'MECH', designation: 'Associate Professor', email: 'balaji.i@tkrec.ac.in' },
    { staff_id: 'FAC-MECH-03', name: 'Prof. Chetan Deshmukh', dept: 'MECH', designation: 'Assistant Professor', email: 'chetan.d@tkrec.ac.in' },
    { staff_id: 'FAC-MECH-04', name: 'Prof. Deepa Joseph', dept: 'MECH', designation: 'Assistant Professor', email: 'deepa.j@tkrec.ac.in' },

    { staff_id: 'FAC-CIVIL-01', name: 'Dr. Meera Nambiar', dept: 'CIVIL', designation: 'Professor & HOD', email: 'meera.nambiar@tkrec.ac.in' },
    { staff_id: 'FAC-CIVIL-02', name: 'Dr. Eashwar Murthy', dept: 'CIVIL', designation: 'Associate Professor', email: 'eashwar.m@tkrec.ac.in' },
    { staff_id: 'FAC-CIVIL-03', name: 'Prof. Farhan Khan', dept: 'CIVIL', designation: 'Assistant Professor', email: 'farhan.k@tkrec.ac.in' },
    { staff_id: 'FAC-CIVIL-04', name: 'Prof. Geetha Paul', dept: 'CIVIL', designation: 'Assistant Professor', email: 'geetha.p@tkrec.ac.in' },

    { staff_id: 'FAC-IT-01', name: 'Dr. Rajesh Patel', dept: 'IT', designation: 'Professor & HOD', email: 'rajesh.patel@tkrec.ac.in' },
    { staff_id: 'FAC-IT-02', name: 'Dr. Harini Krishnan', dept: 'IT', designation: 'Associate Professor', email: 'harini.k@tkrec.ac.in' },
    { staff_id: 'FAC-IT-03', name: 'Prof. Inderjit Singh', dept: 'IT', designation: 'Assistant Professor', email: 'inderjit.s@tkrec.ac.in' },
    { staff_id: 'FAC-IT-04', name: 'Prof. Jyoti Mishra', dept: 'IT', designation: 'Assistant Professor', email: 'jyoti.m@tkrec.ac.in' },
  ];

  for (const f of facultyList) {
    const userRes = await pg.query(`
      INSERT INTO users (identifier, email, password_hash, role, name, department_code, avatar_url)
      VALUES ($1, $2, $3, 'faculty', $4, $5, 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150')
      ON CONFLICT (identifier) DO NOTHING
      RETURNING id
    `, [f.staff_id, f.email, passwordHash, f.name, f.dept]);

    const uId = (userRes.rows[0] as any)?.id || 1;
    await pg.query(`
      INSERT INTO faculty (user_id, staff_id, name, email, department_code, designation, phone)
      VALUES ($1, $2, $3, $4, $5, $6, '+91 98450 ' || LPAD((RANDOM()*90000)::INT::TEXT, 5, '0'))
      ON CONFLICT (staff_id) DO NOTHING
    `, [uId, f.staff_id, f.name, f.email, f.dept, f.designation]);
  }

  // 4. Seed 10 Subjects
  const subjects = [
    { code: 'CS601', name: 'Distributed Cloud Systems', dept: 'CSE', sem: 6, staff: 'FAC-CSE-02', credits: 4 },
    { code: 'CS602', name: 'Artificial Intelligence & Machine Learning', dept: 'CSE', sem: 6, staff: 'FAC-CSE-03', credits: 4 },
    { code: 'CS603', name: 'Compiler Design', dept: 'CSE', sem: 6, staff: 'FAC-CSE-04', credits: 3 },
    { code: 'CS604', name: 'Full-Stack Web Engineering', dept: 'CSE', sem: 6, staff: 'FAC-CSE-01', credits: 3 },
    { code: 'EC601', name: 'VLSI Design & Embedded Systems', dept: 'ECE', sem: 6, staff: 'FAC-ECE-02', credits: 4 },
    { code: 'EC602', name: 'Digital Signal Processing', dept: 'ECE', sem: 6, staff: 'FAC-ECE-03', credits: 3 },
    { code: 'ME601', name: 'Thermodynamics & Heat Transfer', dept: 'MECH', sem: 6, staff: 'FAC-MECH-02', credits: 4 },
    { code: 'ME602', name: 'Robotics & Automation', dept: 'MECH', sem: 6, staff: 'FAC-MECH-03', credits: 3 },
    { code: 'CV601', name: 'Structural Analysis & Design', dept: 'CIVIL', sem: 6, staff: 'FAC-CIVIL-02', credits: 4 },
    { code: 'IT601', name: 'Cybersecurity & Cryptography', dept: 'IT', sem: 6, staff: 'FAC-IT-02', credits: 4 },
  ];

  for (const s of subjects) {
    await pg.query(`
      INSERT INTO subjects (code, name, department_code, semester, faculty_staff_id, total_credits)
      VALUES ($1, $2, $3, $4, $5, $6)
    `, [s.code, s.name, s.dept, s.sem, s.staff, s.credits]);
  }

  // 5. Seed 100 Students (20 per department, 3rd year / 6th sem mostly, mix of CGPAs and backlogs)
  console.log('[Database] Generating 100 student records across 5 departments...');
  const firstNames = ['Aarav', 'Vivaan', 'Aditya', 'Vihaan', 'Arjun', 'Sai', 'Reyansh', 'Ayaan', 'Krishna', 'Ishaan', 'Diya', 'Saanvi', 'Ananya', 'Aadhya', 'Pari', 'Anushka', 'Navya', 'Sneha', 'Tanvi', 'Rhea'];
  const lastNames = ['Sharma', 'Verma', 'Patel', 'Reddy', 'Rao', 'Iyer', 'Menon', 'Nair', 'Kulkarni', 'Deshmukh', 'Gupta', 'Singh', 'Chatterjee', 'Bose', 'Pillai'];

  const depts = ['CSE', 'ECE', 'MECH', 'CIVIL', 'IT'];
  let studentIdx = 1;

  for (const dept of depts) {
    for (let i = 1; i <= 20; i++) {
      const rollNo = `22TKREC${dept}${String(i).padStart(3, '0')}`;
      const fName = firstNames[(studentIdx * 7) % firstNames.length];
      const lName = lastNames[(studentIdx * 11) % lastNames.length];
      let fullName = `${fName} ${lName}`;
      if (rollNo === '22TKRECCSE001') fullName = 'Aarav Sharma';
      if (rollNo === '22TKRECCSE002') fullName = 'Vivaan Verma';
      const email = `${rollNo.toLowerCase()}@tkrec.ac.in`;
      
      // Make student 1 (22TKRECCSE001) a standout test student:
      let cgpa = Number((6.5 + ((studentIdx * 13) % 35) / 10).toFixed(2));
      let backlogs = (studentIdx % 7 === 0) ? 1 : 0;
      if (rollNo === '22TKRECCSE001') {
        cgpa = 8.85;
        backlogs = 0;
      } else if (rollNo === '22TKRECCSE002') {
        cgpa = 6.20;
        backlogs = 2; // low attendance / backlog student for warnings testing
      }

      const qrToken = `TKREC-SECURE-QR-${rollNo}-${1000 + studentIdx}`;

      const uRes = await pg.query(`
        INSERT INTO users (identifier, email, password_hash, role, name, department_code, avatar_url)
        VALUES ($1, $2, $3, 'student', $4, $5, 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=150')
        RETURNING id
      `, [rollNo, email, passwordHash, fullName, dept]);

      const userId = (uRes.rows[0] as any).id;

      await pg.query(`
        INSERT INTO students (user_id, roll_no, name, email, department_code, year, semester, section, cgpa, active_backlogs, batch, phone, qr_code_token)
        VALUES ($1, $2, $3, $4, $5, 3, 6, 'A', $6, $7, '2022-2026', '+91 91234 ' || LPAD($8::TEXT, 5, '0'), $9)
      `, [userId, rollNo, fullName, email, dept, cgpa, backlogs, studentIdx * 137, qrToken]);

      // Seed internal marks for subjects for this student
      await pg.query(`
        INSERT INTO internal_marks (student_roll_no, subject_code, assessment_name, marks_obtained, max_marks, semester)
        VALUES 
          ($1, 'CS601', 'Mid-Term 1', $2, 30.00, 6),
          ($1, 'CS602', 'Mid-Term 1', $3, 30.00, 6),
          ($1, 'CS604', 'Continuous Evaluation', $4, 25.00, 6)
      `, [rollNo, Math.min(30, Number((cgpa * 3.2).toFixed(1))), Math.min(30, Number((cgpa * 3.1).toFixed(1))), Math.min(25, Number((cgpa * 2.7).toFixed(1)))]);

      studentIdx++;
    }
  }

  // 6. Seed Realistic Attendance Sessions & Attendance Records
  console.log('[Database] Generating semester attendance sessions and authentic database records...');
  // Generate all weekdays (Monday-Friday) from August 3, 2026 to September 25, 2026 (Semester span)
  const pastDates: string[] = [];
  const startD = new Date('2026-08-03T00:00:00Z');
  const endD = new Date('2026-09-25T00:00:00Z');
  for (let d = new Date(startD); d <= endD; d.setUTCDate(d.getUTCDate() + 1)) {
    const day = d.getUTCDay();
    if (day >= 1 && day <= 5) {
      // Mon-Fri
      const y = d.getUTCFullYear();
      const m = String(d.getUTCMonth() + 1).padStart(2, '0');
      const dt = String(d.getUTCDate()).padStart(2, '0');
      pastDates.push(`${y}-${m}-${dt}`);
    }
  }

  // Create conducted sessions for CSE subjects across the semester
  let sessionCounter = 1;
  const cseSubjects = ['CS601', 'CS602', 'CS603', 'CS604'];
  const timeSlots = ['09:00 AM - 10:00 AM', '10:00 AM - 11:00 AM', '11:15 AM - 12:15 PM', '02:00 PM - 03:00 PM'];

  for (let dIdx = 0; dIdx < pastDates.length; dIdx++) {
    const dateStr = pastDates[dIdx];
    // 2 sessions per academic day
    for (let sIdx = 0; sIdx < 2; sIdx++) {
      const sub = cseSubjects[(dIdx + sIdx) % cseSubjects.length];
      const slot = timeSlots[sIdx];
      const sessionCode = `SESS-2026-${sessionCounter.toString().padStart(4, '0')}`;
      
      const sessRes = await pg.query(`
        INSERT INTO attendance_sessions (session_code, subject_code, faculty_staff_id, department_code, section, semester, date, time_slot, status, total_present, total_absent)
        VALUES ($1, $2, 'FAC-CSE-02', 'CSE', 'A', 6, $3, $4, 'completed', 18, 2)
        RETURNING id
      `, [sessionCode, sub, dateStr, slot]);

      const sessId = (sessRes.rows[0] as any).id;

      // Seed records for 20 CSE students in a single batch insert
      const recordTuples: string[] = [];
      const recordParams: any[] = [];
      let pIdx = 1;

      for (let s = 1; s <= 20; s++) {
        const roll = `22TKRECCSE${String(s).padStart(3, '0')}`;
        // Student 1 (Aarav): High attendance (~96%) - absent only on Aug 18 session 1 and Sep 10 session 2
        // Student 2 (Vivaan): At-risk attendance (~58%) - frequent absences triggering <75% warning
        let isPresent = true;
        if (roll === '22TKRECCSE001') {
          if ((dateStr === '2026-08-18' && sIdx === 0) || (dateStr === '2026-09-10' && sIdx === 1)) {
            isPresent = false;
          } else {
            isPresent = true;
          }
        } else if (roll === '22TKRECCSE002') {
          if (dIdx % 5 === 0 || (dIdx >= 15 && dIdx <= 19) || (dIdx % 4 === 1 && sIdx === 1)) {
            isPresent = false;
          } else {
            isPresent = true;
          }
        } else {
          isPresent = !((dIdx * 3 + s + sIdx) % 11 === 0);
        }

        const status = isPresent ? 'present' : 'absent';
        recordTuples.push(`($${pIdx++}, $${pIdx++}, $${pIdx++}, 'FAC-CSE-02', $${pIdx++}, $${pIdx++}, $${pIdx++}, 'qr_scan', 'DEV-FAC-TERMINAL-01')`);
        recordParams.push(sessId, roll, sub, dateStr, slot, status);
      }

      await pg.query(`
        INSERT INTO attendance_records (session_id, student_roll_no, subject_code, faculty_staff_id, date, time_slot, status, method, device_session_id)
        VALUES ${recordTuples.join(', ')}
        ON CONFLICT (session_id, student_roll_no) DO NOTHING
      `, recordParams);

      sessionCounter++;
    }
  }

  // 7. Seed 10 Companies
  console.log('[Database] Seeding 10 placement companies...');
  const companies = [
    { name: 'Google', industry: 'Cloud & AI Software', location: 'Bengaluru / Hyderabad', website: 'https://careers.google.com', logo: 'https://images.unsplash.com/photo-1573804633927-bfcbcd909acd?w=150' },
    { name: 'Microsoft', industry: 'Enterprise Platforms', location: 'Bengaluru / Noida', website: 'https://careers.microsoft.com', logo: 'https://images.unsplash.com/photo-1642132652859-3ef5a1048fd1?w=150' },
    { name: 'Amazon AWS', industry: 'Cloud Infrastructure', location: 'Hyderabad / Chennai', website: 'https://amazon.jobs', logo: 'https://images.unsplash.com/photo-1523474253246-608b47ef2d17?w=150' },
    { name: 'Qualcomm', industry: 'Semiconductors & 5G', location: 'Bengaluru', website: 'https://qualcomm.com', logo: 'https://images.unsplash.com/photo-1518770660439-4636190af475?w=150' },
    { name: 'Tata Consultancy Services (TCS Digital)', industry: 'IT & Digital Solutions', location: 'Pan India', website: 'https://tcs.com', logo: 'https://images.unsplash.com/photo-1486406146926-c627a92ad1ab?w=150' },
    { name: 'Larsen & Toubro (L&T)', industry: 'Engineering & Construction', location: 'Mumbai / Chennai', website: 'https://larsentoubro.com', logo: 'https://images.unsplash.com/photo-1541888946425-d0fbb186f5f7?w=150' },
    { name: 'Bosch Global', industry: 'Mobility & Embedded IoT', location: 'Bengaluru / Coimbatore', website: 'https://bosch.in', logo: 'https://images.unsplash.com/photo-1581092160607-ee22621dd758?w=150' },
    { name: 'Cisco Systems', industry: 'Networking & Cybersecurity', location: 'Bengaluru', website: 'https://cisco.com', logo: 'https://images.unsplash.com/photo-1451187580459-43490279c0fa?w=150' },
    { name: 'Infosys Wingspan', industry: 'Enterprise Digital', location: 'Bengaluru / Pune', website: 'https://infosys.com', logo: 'https://images.unsplash.com/photo-1497366216548-37526070297c?w=150' },
    { name: 'Schneider Electric', industry: 'Energy Automation', location: 'Bengaluru', website: 'https://se.com', logo: 'https://images.unsplash.com/photo-1497215728101-856f4ea42174?w=150' },
  ];

  const companyMap: Record<string, number> = {};
  for (const c of companies) {
    const cRes = await pg.query(`
      INSERT INTO companies (name, industry, location, website, logo_url)
      VALUES ($1, $2, $3, $4, $5)
      RETURNING id
    `, [c.name, c.industry, c.location, c.website, c.logo]);
    companyMap[c.name] = (cRes.rows[0] as any).id;
  }

  // 8. Seed Placements (10 placement drives)
  console.log('[Database] Seeding 10 placement drives...');
  const placementDrives = [
    { company: 'Google', role: 'Software Engineer (SWE I)', package: 28.5, min_cgpa: 8.0, backlogs: 0, depts: '["CSE", "IT"]', year: 2026, skills: 'Algorithms, Data Structures, Go / C++ / Java, Distributed Systems', date: '2026-10-15', process: 'Online Coding -> Technical Interview I -> Technical Interview II -> Googliness round' },
    { company: 'Microsoft', role: 'Associate Software Engineer', package: 24.0, min_cgpa: 7.5, backlogs: 0, depts: '["CSE", "ECE", "IT"]', year: 2026, skills: 'DSA, System Design, C# / TypeScript / Python', date: '2026-10-20', process: 'Codility Assessment -> 3 Technical Rounds -> Hiring Manager' },
    { company: 'Amazon AWS', role: 'Cloud Support Associate', package: 16.5, min_cgpa: 7.0, backlogs: 0, depts: '["CSE", "ECE", "MECH", "IT"]', year: 2026, skills: 'Linux, Networking (TCP/IP), Cloud Fundamentals, Scripting', date: '2026-10-25', process: 'Aptitude & Technical OA -> 2 Technical Rounds' },
    { company: 'Qualcomm', role: 'Hardware & Embedded Firmware Engineer', package: 19.5, min_cgpa: 7.8, backlogs: 0, depts: '["ECE"]', year: 2026, skills: 'Verilog, C/C++, Embedded RTOS, Digital Electronics', date: '2026-10-30', process: 'Core Electronics Test -> 2 Deep Technical Rounds' },
    { company: 'Cisco Systems', role: 'Network Software Engineer', package: 17.0, min_cgpa: 7.2, backlogs: 0, depts: '["CSE", "ECE", "IT"]', year: 2026, skills: 'Networking Protocols, Python, C++, Automation', date: '2026-11-05', process: 'HackerRank Test -> Technical Round -> Management Round' },
    { company: 'Bosch Global', role: 'Automotive Software Engineer', package: 12.0, min_cgpa: 6.8, backlogs: 1, depts: '["MECH", "ECE", "CSE"]', year: 2026, skills: 'MATLAB/Simulink, Embedded C, Control Systems', date: '2026-11-10', process: 'Aptitude & Technical Test -> Technical Interview' },
    { company: 'Larsen & Toubro (L&T)', role: 'Graduate Engineer Trainee (Core)', package: 9.5, min_cgpa: 6.5, backlogs: 1, depts: '["CIVIL", "MECH"]', year: 2026, skills: 'AutoCAD, Structural Engineering, Project Estimation, Surveying', date: '2026-11-15', process: 'Written Test -> Technical Panel -> HR Discussion' },
    { company: 'Tata Consultancy Services (TCS Digital)', role: 'Digital Software Developer', package: 8.5, min_cgpa: 6.5, backlogs: 1, depts: '["CSE", "ECE", "MECH", "CIVIL", "IT"]', year: 2026, skills: 'Java / Python, SQL, Web Technologies, Problem Solving', date: '2026-11-20', process: 'TCS NQT National Test -> Technical Interview' },
    { company: 'Infosys Wingspan', role: 'Specialist Programmer', package: 9.5, min_cgpa: 6.5, backlogs: 0, depts: '["CSE", "IT", "ECE"]', year: 2026, skills: 'Advanced Data Structures, Full-Stack, Cloud Basics', date: '2026-11-25', process: 'HackWithInfy Contest -> Technical Interview' },
    { company: 'Schneider Electric', role: 'Energy Automation Engineer', package: 10.5, min_cgpa: 6.8, backlogs: 0, depts: '["ECE", "MECH"]', year: 2026, skills: 'PLC/SCADA, Power Systems, Industrial IoT', date: '2026-12-01', process: 'Aptitude Test -> Technical Presentation -> HR Interview' },
  ];

  for (const p of placementDrives) {
    const cId = companyMap[p.company];
    const pRes = await pg.query(`
      INSERT INTO placements (company_id, company_name, job_role, package_lpa, location, min_cgpa, max_backlogs, eligible_departments, graduation_year, skills_required, selection_process, description, application_deadline, status)
      VALUES ($1, $2, $3, $4, 'Bengaluru / Hyderabad', $5, $6, $7, $8, $9, $10, 'Full-time campus hiring drive for 2026 batch graduating engineering students.', $11, 'Active')
      RETURNING id
    `, [cId, p.company, p.role, p.package, p.min_cgpa, p.backlogs, p.depts, p.year, p.skills, p.process, p.date]);

    // Seed test application for Student 1 (22TKRECCSE001) for Google
    if (p.company === 'Google') {
      await pg.query(`
        INSERT INTO placement_applications (placement_id, student_roll_no, student_name, student_cgpa, department_code, status, notes)
        VALUES ($1, '22TKRECCSE001', 'Aarav Sharma', 8.85, 'CSE', 'Shortlisted', 'Cleared round 1 online assessment with score 98%')
      `, [(pRes.rows[0] as any).id]);
    }
  }

  // 9. Seed 20 Internships
  console.log('[Database] Seeding 20 internship opportunities...');
  const internshipRoles = [
    { title: 'Generative AI Research Intern', comp: 'Google', dur: '6 Months', stip: '₹75,000 / month', paid: true, loc: 'Bengaluru', type: 'Hybrid', depts: '["CSE", "IT"]', cgpa: 8.0, skills: 'PyTorch, Transformers, LLMs, Python' },
    { title: 'Backend Cloud Engineering Intern', comp: 'Amazon AWS', dur: '3 Months', stip: '₹60,000 / month', paid: true, loc: 'Hyderabad', type: 'Onsite', depts: '["CSE", "IT"]', cgpa: 7.5, skills: 'Java, DynamoDB, Microservices, REST APIs' },
    { title: 'Edge AI & Firmware Intern', comp: 'Qualcomm', dur: '6 Months', stip: '₹55,000 / month', paid: true, loc: 'Bengaluru', type: 'Onsite', depts: '["ECE"]', cgpa: 7.5, skills: 'C++, TinyML, RTOS, ARM Architecture' },
    { title: 'Frontend Developer Intern', comp: 'Microsoft', dur: '3 Months', stip: '₹65,000 / month', paid: true, loc: 'Remote', type: 'Remote', depts: '["CSE", "IT"]', cgpa: 7.2, skills: 'React, TypeScript, TailwindCSS, Next.js' },
    { title: 'Robotics & Control Systems Intern', comp: 'Bosch Global', dur: '6 Months', stip: '₹35,000 / month', paid: true, loc: 'Bengaluru', type: 'Onsite', depts: '["MECH", "ECE"]', cgpa: 6.8, skills: 'ROS 2, Python, C++, Kinematics' },
    { title: 'Smart Infrastructure & BIM Intern', comp: 'Larsen & Toubro (L&T)', dur: '3 Months', stip: '₹25,000 / month', paid: true, loc: 'Chennai', type: 'Onsite', depts: '["CIVIL"]', cgpa: 6.5, skills: 'Revit, BIM 360, AutoCAD, Structural Modeling' },
    { title: 'Cybersecurity Threat Analyst Intern', comp: 'Cisco Systems', dur: '6 Months', stip: '₹45,000 / month', paid: true, loc: 'Remote', type: 'Remote', depts: '["CSE", "IT"]', cgpa: 7.0, skills: 'Wireshark, SIEM, Network Security, Python' },
    { title: 'Data Analytics & BI Intern', comp: 'Tata Consultancy Services (TCS Digital)', dur: '3 Months', stip: '₹30,000 / month', paid: true, loc: 'Hyderabad', type: 'Hybrid', depts: '["CSE", "IT", "ECE"]', cgpa: 6.5, skills: 'SQL, PowerBI, Python, Data Modeling' },
    { title: 'Smart Grid Automation Intern', comp: 'Schneider Electric', dur: '6 Months', stip: '₹32,000 / month', paid: true, loc: 'Bengaluru', type: 'Onsite', depts: '["ECE", "MECH"]', cgpa: 6.8, skills: 'SCADA, PLC Ladder Logic, Power Systems' },
    { title: 'Machine Learning Engineering Intern', comp: 'Google', dur: '3 Months', stip: '₹70,000 / month', paid: true, loc: 'Bengaluru', type: 'Hybrid', depts: '["CSE", "IT"]', cgpa: 8.0, skills: 'TensorFlow, Pandas, Scikit-Learn, MLOps' },
    { title: 'Automotive Thermal Analysis Intern', comp: 'Bosch Global', dur: '4 Months', stip: '₹28,000 / month', paid: true, loc: 'Pune', type: 'Onsite', depts: '["MECH"]', cgpa: 6.5, skills: 'ANSYS Fluent, Thermodynamics, SolidWorks' },
    { title: 'Geotechnical Soil Testing Intern', comp: 'Larsen & Toubro (L&T)', dur: '3 Months', stip: '₹22,000 / month', paid: true, loc: 'Mumbai', type: 'Onsite', depts: '["CIVIL"]', cgpa: 6.5, skills: 'Soil Mechanics, GIS Mapping, Site Surveys' },
    { title: 'DevOps & CI/CD Pipeline Intern', comp: 'Amazon AWS', dur: '3 Months', stip: '₹50,000 / month', paid: true, loc: 'Remote', type: 'Remote', depts: '["CSE", "IT"]', cgpa: 7.0, skills: 'Docker, Kubernetes, GitHub Actions, Terraform' },
    { title: 'Embedded IoT Firmware Intern', comp: 'Schneider Electric', dur: '6 Months', stip: '₹30,000 / month', paid: true, loc: 'Bengaluru', type: 'Onsite', depts: '["ECE", "CSE"]', cgpa: 6.8, skills: 'ESP32, MQTT, Embedded C, Sensor Interfacing' },
    { title: 'Digital Signal Processing Intern', comp: 'Qualcomm', dur: '6 Months', stip: '₹50,000 / month', paid: true, loc: 'Hyderabad', type: 'Onsite', depts: '["ECE"]', cgpa: 7.5, skills: 'MATLAB, Filter Design, 5G NR PHY layer' },
    { title: 'Full Stack Web Developer Intern', comp: 'Infosys Wingspan', dur: '3 Months', stip: '₹28,000 / month', paid: true, loc: 'Bengaluru', type: 'Hybrid', depts: '["CSE", "IT", "ECE"]', cgpa: 6.5, skills: 'Node.js, Express, PostgreSQL, React' },
    { title: 'HVAC & Fluid Flow Design Intern', comp: 'Bosch Global', dur: '3 Months', stip: '₹26,000 / month', paid: true, loc: 'Coimbatore', type: 'Onsite', depts: '["MECH"]', cgpa: 6.5, skills: 'Fluid Dynamics, AutoCAD, Heat Exchangers' },
    { title: 'Surveying & Highway Design Intern', comp: 'Larsen & Toubro (L&T)', dur: '3 Months', stip: '₹24,000 / month', paid: true, loc: 'Delhi NCR', type: 'Onsite', depts: '["CIVIL"]', cgpa: 6.5, skills: 'Total Station, Highway Engineering, MX Road' },
    { title: 'Cloud Infrastructure & SRE Intern', comp: 'Microsoft', dur: '6 Months', stip: '₹65,000 / month', paid: true, loc: 'Bengaluru', type: 'Hybrid', depts: '["CSE", "IT"]', cgpa: 7.5, skills: 'Azure Cloud, Prometheus, Python, Linux' },
    { title: 'Open-Source Academic Research Intern', comp: 'Google', dur: '3 Months', stip: '₹40,000 / month', paid: true, loc: 'Remote', type: 'Remote', depts: '["CSE", "IT", "ECE", "MECH", "CIVIL"]', cgpa: 6.5, skills: 'Git, Technical Writing, Open Source Contributions' },
  ];

  for (let i = 0; i < internshipRoles.length; i++) {
    const ir = internshipRoles[i];
    const cId = companyMap[ir.comp] || 1;
    const deadline = new Date(Date.now() + (15 + i * 2) * 86400000).toISOString().split('T')[0];
    const startD = new Date(Date.now() + (45 + i * 2) * 86400000).toISOString().split('T')[0];

    const intRes = await pg.query(`
      INSERT INTO internships (company_id, company_name, role, skills_required, duration, stipend, is_paid, location, work_type, eligible_departments, min_cgpa, start_date, application_deadline, application_link, description, status)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, 'https://careers.tkrec.ac.in/internships', 'Prestigious industrial internship program with pre-placement interview (PPI) opportunity.', 'Open')
      RETURNING id
    `, [cId, ir.comp, ir.title, ir.skills, ir.dur, ir.stip, ir.paid, ir.loc, ir.type, ir.depts, ir.cgpa, startD, deadline]);

    // Seed test application for Student 1 for first internship
    if (i === 0) {
      await pg.query(`
        INSERT INTO internship_applications (internship_id, student_roll_no, student_name, department_code, status)
        VALUES ($1, '22TKRECCSE001', 'Aarav Sharma', 'CSE', 'Under Review')
      `, [(intRes.rows[0] as any).id]);
    }
  }

  // 10. Seed 20 College Events
  console.log('[Database] Seeding 20 college events...');
  const events = [
    { title: 'TKREC Hackathon 2026 (36-Hour National Hack)', type: 'Hackathon', dept: 'CSE', venue: 'Campus Innovation Center, Block A', date: '2026-10-12', time: '09:00 AM', org: 'ACM Student Chapter', max: 250, count: 182, desc: '36-hour intense hackathon focusing on Generative AI, Web3, Smart Cities, and CleanTech. Prizes worth ₹3 Lakhs!' },
    { title: 'Generative AI & LLMs in Production Workshop', type: 'Workshop', dept: 'CSE', venue: 'Auditorium 2 & Online', date: '2026-10-05', time: '10:00 AM - 04:00 PM', org: 'AI Research Lab', max: 150, count: 120, desc: 'Hands-on masterclass building production RAG applications with Google Gemini SDK, embeddings, and vector databases.' },
    { title: 'National Conference on VLSI & 5G Architectures', type: 'Technical', dept: 'ECE', venue: 'Main Auditorium', date: '2026-10-18', time: '09:30 AM', org: 'IEEE ECE Society', max: 300, count: 210, desc: 'Keynote speeches by semiconductor leaders from Qualcomm and Intel on next-gen chip architectures.' },
    { title: 'RoboWars & Drone Racing Grand Prix', type: 'Technical', dept: 'MECH', venue: 'Sports Ground Arena', date: '2026-10-24', time: '11:00 AM', org: 'Robotics Club', max: 500, count: 420, desc: 'Combat robotics tournament featuring 15kg and 30kg battlebots plus high-speed FPV drone obstacle courses.' },
    { title: 'Sustainable Infrastructure & Green Buildings Expo', type: 'Technical', dept: 'CIVIL', venue: 'Civil Concourse Hall', date: '2026-10-28', time: '10:00 AM', org: 'ASCE Student Forum', max: 200, count: 95, desc: 'Exhibition of carbon-neutral concrete, earthquake-resistant structural models, and rainwater harvesting designs.' },
    { title: 'CyberShield 2026: Campus CTF Competition', type: 'Hackathon', dept: 'IT', venue: 'Systems Lab 4', date: '2026-10-08', time: '02:00 PM - 08:00 PM', org: 'TKREC CyberSec Guild', max: 100, count: 85, desc: 'Capture The Flag competition covering cryptography, reverse engineering, web exploitation, and binary analysis.' },
    { title: 'TKREC Utsav 2026: Annual Cultural Extravaganza', type: 'Cultural', dept: 'CSE', venue: 'Open Air Amphitheatre', date: '2026-11-06', time: '05:00 PM - 11:00 PM', org: 'Student Council', max: 2000, count: 1450, desc: 'Inter-college dance, battle of the bands, pro-nites featuring celebrated indie music bands.' },
    { title: 'Automotive Electric Vehicle (EV) Powertrain Workshop', type: 'Workshop', dept: 'MECH', venue: 'Automobile Engineering Lab', date: '2026-10-14', time: '09:00 AM', org: 'SAE Collegiate Club', max: 80, count: 76, desc: 'Live teardown and assembly of lithium-ion battery management systems (BMS) and BLDC motor controllers.' },
    { title: 'FPGA Acceleration with Xilinx Vivado Masterclass', type: 'Workshop', dept: 'ECE', venue: 'Digital Electronics Lab', date: '2026-10-22', time: '02:00 PM', org: 'Dept of ECE', max: 60, count: 58, desc: 'Implementing deep neural network inference accelerators on Artix-7 FPGA boards.' },
    { title: 'Smart Concrete Testing & Non-Destructive Evaluation', type: 'Workshop', dept: 'CIVIL', venue: 'Concrete Tech Lab', date: '2026-10-16', time: '10:00 AM', org: 'Dept of Civil Engineering', max: 70, count: 45, desc: 'Ultrasonic pulse velocity and rebound hammer testing for assessing bridge and building integrity.' },
    { title: 'Full-Stack Modern Web Engineering with React & Node', type: 'Workshop', dept: 'IT', venue: 'Virtual Meet', date: '2026-10-09', time: '04:00 PM', org: 'Developer Student Club', max: 200, count: 190, desc: 'End-to-end full stack web architecture workshop with real deployments and auth.' },
    { title: 'TKREC Sports Fest 2026: Inter-Departmental Cup', type: 'Sports', dept: 'MECH', venue: 'College Sports Complex', date: '2026-11-12', time: '07:30 AM', org: 'Physical Education Dept', max: 800, count: 620, desc: 'Cricket, Football, Basketball, Badminton, and Track & Field tournaments across all 5 engineering branches.' },
    { title: 'Resume Building & Technical Mock Interview Clinic', type: 'Workshop', dept: 'CSE', venue: 'Placement Seminar Hall', date: '2026-10-02', time: '03:00 PM', org: 'Placement & Career Cell', max: 200, count: 195, desc: 'Direct 1-on-1 resume reviews and mock technical interviews with alumni working at Google, Microsoft, and Amazon.' },
    { title: 'Design Thinking & Startup Pitchathon', type: 'Technical', dept: 'IT', venue: 'TKREC Incubation Center', date: '2026-10-31', time: '10:00 AM', org: 'TKREC E-Cell', max: 150, count: 88, desc: 'Pitch your deep-tech startup idea to angel investors and venture capitalists. Seed grant of ₹5 Lakhs for winner.' },
    { title: 'Digital Signal Processing in Audio Engineering', type: 'Technical', dept: 'ECE', venue: 'Seminar Hall 3', date: '2026-11-02', time: '11:00 AM', org: 'IEEE Signal Processing Chapter', max: 120, count: 65, desc: 'Real-time noise cancellation, spatial audio, and acoustic echo cancellation algorithms.' },
    { title: 'Modern Surveying with Drones & LiDAR', type: 'Workshop', dept: 'CIVIL', venue: 'Campus Grounds & GIS Lab', date: '2026-11-04', time: '09:00 AM', org: 'Civil Surveying Unit', max: 75, count: 70, desc: 'Aerial drone mapping and LiDAR point-cloud generation for accurate topographical modeling.' },
    { title: 'Cloud Native Microservices with Docker & Kubernetes', type: 'Workshop', dept: 'CSE', venue: 'Cloud Computing Lab', date: '2026-11-08', time: '01:30 PM', org: 'Cloud Study Jam', max: 100, count: 92, desc: 'Containerizing monolithic apps and managing clusters with Helm charts and service meshes.' },
    { title: 'Solar Energy & Photovoltaic Panel Design Seminar', type: 'Technical', dept: 'MECH', venue: 'Mechanical Seminar Hall', date: '2026-11-14', time: '10:30 AM', org: 'Renewable Energy Forum', max: 110, count: 54, desc: 'Thermal efficiency optimization in concentrated solar power plants.' },
    { title: 'Alumni Mentorship Connect & Networking Evening', type: 'Cultural', dept: 'CSE', venue: 'Central Lawn & Banquet', date: '2026-11-20', time: '06:00 PM', org: 'Alumni Relations Office', max: 400, count: 310, desc: 'Connect with 100+ distinguished alumni across software, hardware, entrepreneurship, and public service.' },
    { title: 'Smart Mobility & Autonomous Vehicles Summit', type: 'Technical', dept: 'MECH', venue: 'Main Auditorium', date: '2026-11-25', time: '09:30 AM', org: 'TKREC Mobility Alliance', max: 350, count: 180, desc: 'Level-4 autonomous driving demonstrations and ADAS sensor fusion technologies.' },
  ];

  for (let i = 0; i < events.length; i++) {
    const ev = events[i];
    const deadline = new Date(new Date(ev.date).getTime() - 2 * 86400000).toISOString().split('T')[0];
    const evRes = await pg.query(`
      INSERT INTO events (title, event_type, department_code, venue, event_date, event_time, description, organizer, registration_deadline, max_participants, registered_count, status)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, 'Upcoming')
      RETURNING id
    `, [ev.title, ev.type, ev.dept, ev.venue, ev.date, ev.time, ev.desc, ev.org, deadline, ev.max, ev.count]);

    // Register Student 1 for the first 2 events
    if (i < 2) {
      await pg.query(`
        INSERT INTO event_registrations (event_id, student_roll_no, student_name, status)
        VALUES ($1, '22TKRECCSE001', 'Aarav Sharma', 'Registered')
      `, [(evRes.rows[0] as any).id]);
    }
  }

  // 11. Seed 30 Complaints
  console.log('[Database] Seeding 30 student complaints across categories...');
  const complaintsData = [
    { cat: 'Attendance', sub: 'Discrepancy in CS601 Cloud Systems attendance on Sept 18', desc: 'I was present in the class and answered the mid-hour quiz, but my attendance portal shows Absent. Please review session logs.', dept: 'CSE', pri: 'High', status: 'In Progress' },
    { cat: 'Hostel', sub: 'Water purifier maintenance in Block B 3rd Floor', desc: 'The RO drinking water unit on the 3rd floor is leaking and water flow is extremely slow since yesterday.', dept: 'CIVIL', pri: 'Urgent', status: 'Assigned' },
    { cat: 'Academics', sub: 'Elective course CS604 Full-Stack schedule overlap with Lab', desc: 'The Thursday afternoon session overlaps with Distributed Cloud Lab session 2. Need alternate batch allocation.', dept: 'CSE', pri: 'Medium', status: 'Submitted' },
    { cat: 'Infrastructure', sub: 'Projector flickering in Room 304 Block C', desc: 'The HDMI projector display cuts out every 2 minutes during lectures making presentation slides unreadable.', dept: 'IT', pri: 'Medium', status: 'Resolved' },
    { cat: 'Library', sub: 'Access to IEEE Xplore digital library from campus Wi-Fi', desc: 'Institutional subscription gives proxy timeout error when accessing IEEE journals from hostel Wi-Fi.', dept: 'IT', pri: 'High', status: 'In Progress' },
    { cat: 'Transport', sub: 'College Bus Route 14 morning arrival delay', desc: 'Route 14 bus regularly arrives at campus at 08:55 AM, causing students to be late for 09:00 AM class attendance.', dept: 'MECH', pri: 'Medium', status: 'Waiting for Information' },
    { cat: 'Examination', sub: 'Correction in Mid-1 Marks entry for Compiler Design', desc: 'My physical evaluated answer script shows 27/30, but the portal displays 17/30. Script copy submitted to department.', dept: 'CSE', pri: 'Urgent', status: 'Assigned' },
    { cat: 'Fees', sub: 'Hostel mess rebate receipt not reflected in fee portal', desc: 'Paid hostel mess fee on Sept 10 via UPI; transaction succeeded but portal displays pending balance.', dept: 'CSE', pri: 'High', status: 'Submitted' },
    { cat: 'IT/Portal', sub: 'Password reset OTP delivery delay on college portal', desc: 'SMS OTP takes more than 10 minutes to arrive during peak morning hours.', dept: 'IT', pri: 'Medium', status: 'Closed' },
    { cat: 'Hostel', sub: 'Mess food quality feedback for Wednesday dinner', desc: 'Food was served cold and variety was limited. Requesting mess committee inspection.', dept: 'CIVIL', pri: 'Medium', status: 'Resolved' },
    { cat: 'Attendance', sub: 'Medical leave certificate submitted for Sept 21-22', desc: 'Suffering from viral fever, attached doctor prescription and medical certificate for absence regularization.', dept: 'CSE', pri: 'High', status: 'In Progress' },
    { cat: 'Academics', sub: 'Request for additional doubt clearing hours in VLSI Design', desc: 'Several topics in CMOS fabrication require extra guidance before mid-term 2 exams.', dept: 'ECE', pri: 'Low', status: 'Submitted' },
    { cat: 'Infrastructure', sub: 'Air conditioning not functioning in Main Auditorium', desc: 'AC units in the east wing of the auditorium produce loud rattling noise.', dept: 'MECH', pri: 'Medium', status: 'Submitted' },
    { cat: 'IT/Portal', sub: 'Digital College ID QR code scanner unable to read in low light', desc: 'Camera scanner in evening lab sessions takes multiple tries to scan the ID card QR code.', dept: 'IT', pri: 'Low', status: 'Assigned' },
    { cat: 'Transport', sub: 'Request for additional bus stop near Metro Station', desc: 'Many day-scholar students use the new metro line; adding a designated 08:20 AM pickup would save 30 minutes commute.', dept: 'CIVIL', pri: 'Medium', status: 'Submitted' },
    { cat: 'Library', sub: 'Demand for more copies of "Computer Networks" by Tanenbaum', desc: 'Only 3 copies in reference section, all issued out. Need additional reference copies for 6th sem.', dept: 'IT', pri: 'Low', status: 'Resolved' },
    { cat: 'Examination', sub: 'Re-evaluation status enquiry for Semester 5 External Lab', desc: 'Applied for re-totaling 3 weeks ago; awaiting official notification.', dept: 'ECE', pri: 'Medium', status: 'Assigned' },
    { cat: 'Hostel', sub: 'Wi-Fi signal dead zone in Block A Room 210-218', desc: 'The access point on the 2nd floor has blinking amber light and disconnects frequently.', dept: 'IT', pri: 'High', status: 'In Progress' },
    { cat: 'Attendance', sub: 'Sports participation on Sept 19 marked as unexcused absent', desc: 'Represented college in Inter-University Football Tournament with official permission letter from Dean of Sports.', dept: 'MECH', pri: 'Urgent', status: 'Assigned' },
    { cat: 'Infrastructure', sub: 'Laboratory PC number 14 in CSE Lab 2 blue-screens', desc: 'System crashes with memory error when compiling C++ code. Needs RAM module replacement.', dept: 'CSE', pri: 'Medium', status: 'Resolved' },
    { cat: 'Academics', sub: 'Assignment submission portal closed 30 mins before deadline', desc: 'The submission window for AI Assignment 2 locked at 11:30 PM instead of 11:59 PM.', dept: 'CSE', pri: 'High', status: 'Resolved' },
    { cat: 'Fees', sub: 'Duplicate deduction during online semester fee payment', desc: 'Bank account was debited twice due to gateway glitch. Bank reference numbers provided.', dept: 'CSE', pri: 'Urgent', status: 'In Progress' },
    { cat: 'Transport', sub: 'Bus driver overspeeding on outer ring road', desc: 'Bus number 8 was observed speeding dangerously this morning. Please advise transport coordinator.', dept: 'MECH', pri: 'Urgent', status: 'Assigned' },
    { cat: 'Hostel', sub: 'Gym equipment maintenance in boys hostel', desc: 'Treadmill belt slipping and cable on multi-station gym is frayed. Poses safety hazard.', dept: 'MECH', pri: 'High', status: 'Submitted' },
    { cat: 'Library', sub: 'Noise disturbance in 2nd floor silent study zone', desc: 'Group discussions happening in designated silent reading cubicles without staff intervention.', dept: 'IT', pri: 'Low', status: 'Closed' },
    { cat: 'Infrastructure', sub: 'Water cooler filter change in Mechanical Block', desc: 'Filter replacement indicator is blinking red since Monday.', dept: 'MECH', pri: 'Medium', status: 'Resolved' },
    { cat: 'Attendance', sub: 'Subject code error in attendance portal for Open Elective', desc: 'Enrolled in Robotics ME602 but attendance is mapped to Structural Analysis CV601.', dept: 'MECH', pri: 'Urgent', status: 'In Progress' },
    { cat: 'Examination', sub: 'Hall ticket photo mismatch on portal printout', desc: 'Student photo appears stretched and blurred on downloadable exam hall ticket PDF.', dept: 'IT', pri: 'High', status: 'Assigned' },
    { cat: 'IT/Portal', sub: 'Placement portal resume upload size limit is too low', desc: '2MB limit causes portfolio PDFs with project screenshots to be rejected.', dept: 'IT', pri: 'Medium', status: 'Resolved' },
    { cat: 'Other', sub: 'Lost campus ID card near Canteen on Sept 24', desc: 'Lost my physical college ID card near cafeteria around 01:30 PM. Please notify security helpdesk.', dept: 'CSE', pri: 'Low', status: 'Submitted' },
  ];

  for (let i = 0; i < complaintsData.length; i++) {
    const cd = complaintsData[i];
    const ticketNo = `TKT-2026-${(1001 + i).toString()}`;
    const studentIdx = (i % 20) + 1;
    const roll = `22TKREC${cd.dept}${String(studentIdx).padStart(3, '0')}`;
    const sName = (roll === '22TKRECCSE001') ? 'Aarav Sharma' : `Student ${roll}`;

    const staffInCharge = `Prof. In-Charge ${cd.dept}`;
    const aiSummary = `Automated AI classification matched to ${cd.cat} department for immediate grievance resolution.`;

    const cRes = await pg.query(`
      INSERT INTO complaints (ticket_number, student_roll_no, student_name, category, subject, description, assigned_department, priority, status, assigned_to_staff, ai_category_confidence, ai_summary)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, 0.94, $11)
      RETURNING id
    `, [ticketNo, roll, sName, cd.cat, cd.sub, cd.desc, cd.dept, cd.pri, cd.status, staffInCharge, aiSummary]);

    const updateMsg = `Grievance ticket created, categorized as ${cd.cat}, assigned priority ${cd.pri} and dispatched to ${cd.dept} department.`;

    // Initial update note
    await pg.query(`
      INSERT INTO complaint_updates (complaint_id, updated_by, updater_role, old_status, new_status, message)
      VALUES ($1, 'AI Complaint Triage Engine', 'system', 'Submitted', $2, $3)
    `, [(cRes.rows[0] as any).id, cd.status, updateMsg]);
  }

  // 12. Seed College Announcements
  console.log('[Database] Seeding official college announcements...');
  const announcements = [
    { title: 'Mid-Term Examination Schedule Announced (Fall 2026)', content: 'The comprehensive timetable for 6th Semester Mid-Term Examinations commencing October 20, 2026 is published. Students can view room allocations and subject schedules on the portal.', cat: 'Examination', pri: 'Urgent', dept: null, author: 'Controller of Examinations' },
    { title: 'Campus Placement Season 2026-27 Commencing Next Month', content: 'Pre-placement talks by Google, Microsoft, Qualcomm, and Amazon will commence on October 10. All registered final and pre-final year students must verify their CGPA and backlogs.', cat: 'Placement', pri: 'High', dept: 'CSE', author: 'Placement Cell Director' },
    { title: 'Mandatory 75% Attendance Requirement Notification', content: 'As per University Academic Regulations, students must maintain a minimum of 75% attendance in each course to be eligible to sit for semester examinations. Attendance warnings have been dispatched.', cat: 'Academic', pri: 'High', dept: null, author: 'Dean of Academic Affairs' },
    { title: 'TKREC Hackathon 2026 Registration Opened', content: 'Registrations are now live for the 36-hour National Hackathon. Inter-disciplinary teams of 3 to 4 students can register with cash awards totaling ₹3,00,000.', cat: 'General', pri: 'Normal', dept: 'CSE', author: 'TKREC Innovation Cell' },
  ];

  for (const a of announcements) {
    await pg.query(`
      INSERT INTO announcements (title, content, department_code, category, priority, posted_by, author_role)
      VALUES ($1, $2, $3, $4, $5, $6, 'Administrator')
    `, [a.title, a.content, a.dept, a.cat, a.pri, a.author]);
  }

  console.log('[Database] Seeding complete! 100 students, 20 faculty, 5 depts, 10 subjects, 20 events, 10 placement drives, 20 internships, 30 complaints seeded.');
}
