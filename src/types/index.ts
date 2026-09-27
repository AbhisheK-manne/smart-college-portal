export type UserRole = 'student' | 'faculty' | 'hod' | 'placement' | 'admin';

export interface User {
  id: number;
  identifier: string;
  roll_no?: string;
  staff_id?: string;
  name: string;
  email: string;
  role: UserRole;
  department_code: string | null;
  avatar_url?: string;
  cgpa?: number;
  year?: number;
  semester?: number;
  section?: string;
  active_backlogs?: number;
  qr_code_token?: string;
  designation?: string;
}

export interface StudentDashboardData {
  student: {
    id: number;
    roll_no: string;
    name: string;
    email: string;
    department_code: string;
    department_name: string;
    hod_name: string;
    hod_email: string;
    year: number;
    semester: number;
    section: string;
    cgpa: number;
    active_backlogs: number;
    batch: string;
    phone: string;
    qr_code_token: string;
  };
  attendance: {
    overall_percentage: number;
    total_conducted: number;
    present_count: number;
    absent_count: number;
    is_warning: boolean;
    warning_message: string | null;
    subjects: {
      subject_code: string;
      subject_name: string;
      total_credits: number;
      faculty_name: string;
      total_conducted: number;
      present_count: number;
      absent_count: number;
      percentage: number;
    }[];
    recent_records: {
      id: number;
      subject_code: string;
      subject_name: string;
      faculty_name: string;
      date: string;
      time_slot: string;
      status: 'present' | 'absent' | 'late' | 'excused';
      method: string;
    }[];
    heatmap?: AttendanceHeatmapData;
  };
  internal_marks: {
    id: number;
    subject_code: string;
    subject_name: string;
    assessment_name: string;
    marks_obtained: number;
    max_marks: number;
    semester: number;
  }[];
  notifications: NotificationItem[];
  metrics: {
    placement_applications: number;
    internship_applications: number;
    complaints: number;
  };
}

export interface AttendanceSession {
  id: number;
  session_code: string;
  subject_code: string;
  subject_name?: string;
  faculty_staff_id: string;
  faculty_name?: string;
  department_code: string;
  section: string;
  semester: number;
  date: string;
  time_slot: string;
  status: 'open' | 'completed' | 'cancelled';
  total_present: number;
  total_absent: number;
}

export interface RosterStudent {
  roll_no: string;
  name: string;
  email: string;
  qr_code_token: string;
  status: 'present' | 'absent' | 'unmarked';
  recorded_at: string | null;
  method: string | null;
}

export interface Complaint {
  id: number;
  ticket_number: string;
  student_roll_no: string;
  student_name: string;
  category: string;
  subject: string;
  description: string;
  assigned_department: string;
  department_name?: string;
  priority: 'Low' | 'Medium' | 'High' | 'Urgent';
  status: 'Submitted' | 'Assigned' | 'In Progress' | 'Waiting for Information' | 'Resolved' | 'Closed';
  assigned_to_staff?: string;
  ai_category_confidence?: number;
  ai_summary?: string;
  created_at: string;
  updated_at: string;
  updates?: ComplaintUpdate[];
}

export interface ComplaintUpdate {
  id: number;
  complaint_id: number;
  updated_by: string;
  updater_role: string;
  old_status?: string;
  new_status?: string;
  message: string;
  created_at: string;
}

export interface CollegeEvent {
  id: number;
  title: string;
  event_type: string;
  department_code: string;
  department_name?: string;
  venue: string;
  event_date: string;
  event_time: string;
  description: string;
  organizer: string;
  registration_deadline: string;
  max_participants: number;
  registered_count: number;
  status: 'Upcoming' | 'Today' | 'Completed' | 'Cancelled';
  is_registered?: boolean;
}

export interface PlacementDrive {
  id: number;
  company_id: number;
  company_name: string;
  logo_url?: string;
  industry?: string;
  job_role: string;
  package_lpa: number;
  location: string;
  min_cgpa: number;
  max_backlogs: number;
  eligible_departments: string;
  graduation_year: number;
  skills_required: string;
  selection_process: string;
  description: string;
  application_deadline: string;
  status: string;
  applicant_count?: number;
  is_eligible?: boolean;
  eligibility_explanation?: string;
  my_application?: {
    id: number;
    status: string;
    applied_at: string;
    notes?: string;
  } | null;
}

export interface Internship {
  id: number;
  company_id: number;
  company_name: string;
  logo_url?: string;
  role: string;
  skills_required: string;
  duration: string;
  stipend: string;
  is_paid: boolean;
  location: string;
  work_type: 'Remote' | 'Onsite' | 'Hybrid';
  eligible_departments: string;
  min_cgpa: number;
  start_date: string;
  application_deadline: string;
  application_link?: string;
  description: string;
  status: string;
  applicant_count?: number;
  my_application?: {
    id: number;
    status: string;
    applied_at: string;
  } | null;
}

export interface NotificationItem {
  id: number;
  target_type: string;
  target_id: string | null;
  title: string;
  message: string;
  type: 'absence' | 'low_attendance' | 'event' | 'placement' | 'internship' | 'complaint' | 'announcement';
  link_url?: string;
  is_read: boolean;
  created_at: string;
}

export interface AnnouncementItem {
  id: number;
  title: string;
  content: string;
  department_code: string | null;
  department_name?: string;
  category: string;
  priority: 'Normal' | 'High' | 'Urgent';
  posted_by: string;
  author_role: string;
  created_at: string;
}

export interface AdminAnalytics {
  total_students: number;
  total_faculty: number;
  active_complaints: number;
  upcoming_events: number;
  active_placements: number;
  open_internships: number;
  placement_applications: number;
  internship_applications: number;
  dept_attendance: {
    department_code: string;
    total_records: number;
    present_records: number;
    avg_attendance: number;
  }[];
  complaints_by_category: {
    category: string;
    count: number;
  }[];
  audit_logs: {
    id: number;
    actor_id: string;
    actor_role: string;
    action: string;
    entity_type: string;
    entity_id: string;
    details: string;
    timestamp: string;
  }[];
}

export interface DailyAttendanceSession {
  id: number;
  subject_code: string;
  subject_name: string;
  time_slot: string;
  status: 'present' | 'absent' | 'late' | 'excused';
  faculty_name?: string;
  method: string;
}

export interface AttendanceDayInfo {
  date: string; // 'YYYY-MM-DD'
  day_of_week: number; // 0=Sun, 1=Mon, ..., 6=Sat
  day_name: string; // 'Mon', 'Tue', etc.
  formatted_date: string; // 'Aug 3, 2026'
  total_conducted: number;
  present_count: number;
  absent_count: number;
  percentage: number;
  status: 'full' | 'partial' | 'absent' | 'holiday' | 'none' | 'upcoming';
  is_today: boolean;
  is_weekend: boolean;
  is_holiday?: boolean;
  holiday_name?: string;
  sessions: DailyAttendanceSession[];
}

export interface AttendanceHeatmapData {
  start_date: string;
  end_date: string;
  semester_label: string;
  current_streak: number;
  best_streak: number;
  total_academic_days: number;
  full_present_days: number;
  partial_days: number;
  absent_days: number;
  overall_percentage: number;
  days: AttendanceDayInfo[];
}

