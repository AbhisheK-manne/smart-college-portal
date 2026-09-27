import React, { useState, useEffect } from 'react';
import {
  QrCode,
  Calendar,
  Briefcase,
  Award,
  AlertCircle,
  CheckCircle2,
  XCircle,
  Clock,
  ArrowRight,
  TrendingUp,
  AlertTriangle,
  Building,
  MapPin,
  ExternalLink,
  ChevronRight,
  Check,
  Plus
} from 'lucide-react';
import { useAuth } from '../context/AuthContext.tsx';
import { StudentDashboardData, PlacementDrive, Internship, CollegeEvent, Complaint } from '../types/index.ts';
import { AttendanceHeatmap } from '../components/AttendanceHeatmap.tsx';

interface Props {
  activeTab: string;
  onOpenIdCard: () => void;
  onOpenComplaintModal: () => void;
  onNavigateTab: (tab: string) => void;
}

export const StudentDashboard: React.FC<Props> = ({
  activeTab,
  onOpenIdCard,
  onOpenComplaintModal,
  onNavigateTab,
}) => {
  const { token, user } = useAuth();
  const [data, setData] = useState<StudentDashboardData | null>(null);
  const [placements, setPlacements] = useState<PlacementDrive[]>([]);
  const [internships, setInternships] = useState<Internship[]>([]);
  const [events, setEvents] = useState<CollegeEvent[]>([]);
  const [complaints, setComplaints] = useState<Complaint[]>([]);
  const [loading, setLoading] = useState(true);

  // Filter states
  const [internshipFilter, setInternshipFilter] = useState({ work_type: '', is_paid: '' });
  const [eventCategory, setEventCategory] = useState<string>('All');
  const [applyingId, setApplyingId] = useState<number | null>(null);

  const fetchStudentData = async () => {
    try {
      setLoading(true);
      const [dashRes, pRes, iRes, eRes, cRes] = await Promise.all([
        fetch('/api/student/dashboard', { headers: { Authorization: `Bearer ${token}` } }),
        fetch('/api/placements', { headers: { Authorization: `Bearer ${token}` } }),
        fetch('/api/internships', { headers: { Authorization: `Bearer ${token}` } }),
        fetch('/api/events', { headers: { Authorization: `Bearer ${token}` } }),
        fetch('/api/complaints', { headers: { Authorization: `Bearer ${token}` } }),
      ]);

      if (dashRes.ok) setData(await dashRes.json());
      if (pRes.ok) setPlacements(await pRes.json());
      if (iRes.ok) setInternships(await iRes.json());
      if (eRes.ok) setEvents(await eRes.json());
      if (cRes.ok) setComplaints(await cRes.json());
    } catch (err) {
      console.error('Failed to load student data:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (token) fetchStudentData();
  }, [token]);

  // Handle Event Register
  const handleRegisterEvent = async (eventId: number) => {
    try {
      const res = await fetch('/api/events/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ event_id: eventId }),
      });
      if (res.ok) {
        setEvents((prev) =>
          prev.map((e) => (e.id === eventId ? { ...e, is_registered: true, registered_count: e.registered_count + 1 } : e))
        );
      }
    } catch (err) {
      console.error(err);
    }
  };

  // Handle Event Cancel
  const handleCancelEvent = async (eventId: number) => {
    try {
      const res = await fetch('/api/events/cancel', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ event_id: eventId }),
      });
      if (res.ok) {
        setEvents((prev) =>
          prev.map((e) => (e.id === eventId ? { ...e, is_registered: false, registered_count: Math.max(0, e.registered_count - 1) } : e))
        );
      }
    } catch (err) {
      console.error(err);
    }
  };

  // Handle Apply Placement
  const handleApplyPlacement = async (placementId: number) => {
    try {
      setApplyingId(placementId);
      const res = await fetch('/api/placements/apply', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ placement_id: placementId }),
      });
      if (res.ok) {
        const app = await res.json();
        setPlacements((prev) =>
          prev.map((p) => (p.id === placementId ? { ...p, my_application: app } : p))
        );
      }
    } catch (err) {
      console.error(err);
    } finally {
      setApplyingId(null);
    }
  };

  // Handle Apply Internship
  const handleApplyInternship = async (internshipId: number) => {
    try {
      setApplyingId(internshipId);
      const res = await fetch('/api/internships/apply', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ internship_id: internshipId }),
      });
      if (res.ok) {
        const app = await res.json();
        setInternships((prev) =>
          prev.map((i) => (i.id === internshipId ? { ...i, my_application: app } : i))
        );
      }
    } catch (err) {
      console.error(err);
    } finally {
      setApplyingId(null);
    }
  };

  if (loading && !data) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="text-center space-y-3">
          <div className="w-10 h-10 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto"></div>
          <p className="text-sm text-slate-500 font-medium">Synchronizing student records with database...</p>
        </div>
      </div>
    );
  }

  const att = data?.attendance;
  const student = data?.student;

  return (
    <div className="p-4 sm:p-6 lg:p-8 space-y-6 max-w-7xl mx-auto">
      {/* Attendance Warning Banner if < 75% */}
      {att?.is_warning && (
        <div className="p-4 rounded-2xl bg-amber-500/10 border-2 border-amber-500/30 text-amber-900 flex items-start space-x-3 shadow-xs animate-in fade-in">
          <AlertTriangle className="w-6 h-6 text-amber-600 shrink-0 mt-0.5" />
          <div className="flex-1">
            <h4 className="font-bold text-sm text-amber-950">Mandatory Attendance Regulation Notice</h4>
            <p className="text-xs text-amber-900/90 mt-0.5 leading-relaxed">
              Your overall attendance is strictly calculated as <strong>{att.overall_percentage}%</strong> ({att.present_count} attended / {att.total_conducted} conducted classes). 
              University regulations require a minimum of 75% attendance for examination eligibility. Please consult your Department HOD.
            </p>
          </div>
          <button
            onClick={onOpenComplaintModal}
            className="px-3 py-1.5 bg-amber-600 hover:bg-amber-700 text-white rounded-xl text-xs font-semibold shrink-0 transition"
          >
            Submit Leave / Grievance
          </button>
        </div>
      )}

      {/* Profile & KPI Top Row (Shown on Dashboard tab) */}
      {(activeTab === 'dashboard' || activeTab === 'attendance') && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {/* Card 1: Overall Attendance */}
          <div className="bg-white rounded-2xl p-5 border border-slate-200/80 shadow-xs relative overflow-hidden">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Overall Attendance</span>
              <span
                className={`px-2 py-0.5 rounded-full text-xs font-bold ${
                  (att?.overall_percentage || 0) >= 75
                    ? 'bg-emerald-100 text-emerald-800'
                    : 'bg-rose-100 text-rose-800'
                }`}
              >
                {(att?.overall_percentage || 0) >= 75 ? 'Good' : 'Critical'}
              </span>
            </div>
            <div className="mt-3 flex items-baseline space-x-2">
              <span className="text-3xl font-extrabold text-slate-900">{att?.overall_percentage}%</span>
              <span className="text-xs text-slate-500">
                ({att?.present_count} / {att?.total_conducted} lectures)
              </span>
            </div>
            {/* Progress bar */}
            <div className="mt-3 w-full bg-slate-100 h-2 rounded-full overflow-hidden">
              <div
                className={`h-full rounded-full transition-all duration-500 ${
                  (att?.overall_percentage || 0) >= 75 ? 'bg-emerald-500' : 'bg-rose-500'
                }`}
                style={{ width: `${Math.min(100, att?.overall_percentage || 0)}%` }}
              ></div>
            </div>
            <p className="mt-2 text-[11px] text-slate-500">75% mandatory threshold</p>
          </div>

          {/* Card 2: Student CGPA */}
          <div className="bg-white rounded-2xl p-5 border border-slate-200/80 shadow-xs">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Cumulative CGPA</span>
              <span className="p-1 rounded-lg bg-blue-50 text-blue-600">
                <TrendingUp className="w-4 h-4" />
              </span>
            </div>
            <div className="mt-3 flex items-baseline space-x-2">
              <span className="text-3xl font-extrabold text-slate-900">{student?.cgpa || '8.85'}</span>
              <span className="text-xs text-slate-500">/ 10.0</span>
            </div>
            <p className="mt-2 text-[11px] text-slate-500">Active Backlogs: <strong className="text-slate-800">{student?.active_backlogs || 0}</strong></p>
          </div>

          {/* Card 3: Placements & Internships */}
          <div className="bg-white rounded-2xl p-5 border border-slate-200/80 shadow-xs">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Active Applications</span>
              <span className="p-1 rounded-lg bg-indigo-50 text-indigo-600">
                <Briefcase className="w-4 h-4" />
              </span>
            </div>
            <div className="mt-3 flex items-baseline space-x-3">
              <div>
                <span className="text-2xl font-bold text-slate-900">{data?.metrics.placement_applications || 0}</span>
                <span className="text-[10px] text-slate-400 block font-medium">Placements</span>
              </div>
              <div className="border-l border-slate-200 pl-3">
                <span className="text-2xl font-bold text-slate-900">{data?.metrics.internship_applications || 0}</span>
                <span className="text-[10px] text-slate-400 block font-medium">Internships</span>
              </div>
            </div>
            <button
              onClick={() => onNavigateTab('placements')}
              className="mt-3 text-xs text-blue-600 hover:text-blue-800 font-semibold flex items-center space-x-1"
            >
              <span>Explore Drives</span>
              <ChevronRight className="w-3.5 h-3.5" />
            </button>
          </div>

          {/* Card 4: Digital Smart ID Access */}
          <div className="bg-gradient-to-br from-blue-700 via-indigo-700 to-indigo-800 rounded-2xl p-5 text-white shadow-xs flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-blue-200 uppercase tracking-wider">Smart Campus ID</span>
                <QrCode className="w-4 h-4 text-blue-200" />
              </div>
              <div className="mt-2">
                <div className="text-sm font-bold truncate">{student?.name}</div>
                <div className="text-xs text-blue-200 font-mono">{student?.roll_no}</div>
              </div>
            </div>
            <button
              onClick={onOpenIdCard}
              className="mt-3 w-full py-2 bg-white/10 hover:bg-white/20 border border-white/20 rounded-xl text-xs font-semibold transition backdrop-blur-md flex items-center justify-center space-x-1.5"
            >
              <QrCode className="w-3.5 h-3.5" />
              <span>Show QR Pass</span>
            </button>
          </div>
        </div>
      )}

      {/* TAB 1: ATTENDANCE & SUBJECT BREAKDOWN */}
      {(activeTab === 'dashboard' || activeTab === 'attendance') && (
        <div className="space-y-6">
          {/* SVG-based Semester Attendance Heatmap Grid */}
          {att?.heatmap && (
            <AttendanceHeatmap
              heatmapData={att.heatmap}
              availableSubjects={att.subjects.map((s) => ({
                subject_code: s.subject_code,
                subject_name: s.subject_name
              }))}
              onSelectComplaint={onOpenComplaintModal}
            />
          )}

          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-base font-bold text-slate-900">Subject-wise Attendance Breakdown</h3>
              <p className="text-xs text-slate-500">Calculated directly from database session records: (Present / Total) × 100</p>
            </div>
            <button
              onClick={onOpenIdCard}
              className="text-xs font-semibold text-blue-600 hover:text-blue-800 flex items-center space-x-1"
            >
              <QrCode className="w-3.5 h-3.5" />
              <span>Present QR for Attendance</span>
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {att?.subjects.map((sub) => {
              const isBelow = sub.percentage < 75;
              return (
                <div
                  key={sub.subject_code}
                  className="bg-white rounded-2xl p-4 border border-slate-200/80 shadow-xs hover:border-slate-300 transition"
                >
                  <div className="flex items-start justify-between">
                    <div>
                      <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-slate-100 text-slate-700">
                        {sub.subject_code}
                      </span>
                      <h4 className="font-bold text-sm text-slate-900 mt-1 leading-snug">{sub.subject_name}</h4>
                      <p className="text-xs text-slate-400 mt-0.5">Faculty: {sub.faculty_name || 'Department Faculty'}</p>
                    </div>
                    <span
                      className={`text-base font-extrabold px-2.5 py-1 rounded-xl ${
                        isBelow ? 'bg-rose-50 text-rose-700 border border-rose-200' : 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                      }`}
                    >
                      {sub.percentage}%
                    </span>
                  </div>

                  <div className="mt-4 flex items-center justify-between text-xs text-slate-500">
                    <span>Present: <strong className="text-emerald-600">{sub.present_count}</strong></span>
                    <span>Absent: <strong className="text-rose-600">{sub.absent_count}</strong></span>
                    <span>Conducted: <strong className="text-slate-800">{sub.total_conducted}</strong></span>
                  </div>

                  <div className="mt-2 w-full bg-slate-100 h-1.5 rounded-full overflow-hidden">
                    <div
                      className={`h-full rounded-full ${isBelow ? 'bg-rose-500' : 'bg-emerald-500'}`}
                      style={{ width: `${Math.min(100, sub.percentage)}%` }}
                    ></div>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Recent Attendance Session Logs */}
          <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden mt-6">
            <div className="p-4 border-b border-slate-200 bg-slate-50 flex items-center justify-between">
              <div>
                <h4 className="font-bold text-xs uppercase tracking-wider text-slate-700">Recent Attendance Audit Logs</h4>
                <p className="text-xs text-slate-400">Timestamped verification logs for current semester</p>
              </div>
            </div>
            <div className="divide-y divide-slate-100 text-xs">
              {att?.recent_records.slice(0, 6).map((r) => (
                <div key={r.id} className="p-3.5 flex items-center justify-between hover:bg-slate-50 transition">
                  <div className="flex items-center space-x-3">
                    <div
                      className={`w-7 h-7 rounded-lg flex items-center justify-center ${
                        r.status === 'present' ? 'bg-emerald-100 text-emerald-700' : 'bg-rose-100 text-rose-700'
                      }`}
                    >
                      {r.status === 'present' ? <CheckCircle2 className="w-4 h-4" /> : <XCircle className="w-4 h-4" />}
                    </div>
                    <div>
                      <div className="font-bold text-slate-900">{r.subject_code} — {r.subject_name}</div>
                      <div className="text-slate-400 text-[11px]">{r.date} • {r.time_slot} • Verified via {r.method}</div>
                    </div>
                  </div>
                  <span
                    className={`px-2.5 py-1 rounded-full font-bold uppercase text-[10px] tracking-wider ${
                      r.status === 'present' ? 'bg-emerald-100 text-emerald-800' : 'bg-rose-100 text-rose-800'
                    }`}
                  >
                    {r.status}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: ACADEMICS & INTERNAL MARKS */}
      {activeTab === 'academics' && (
        <div className="space-y-6">
          <div>
            <h3 className="text-base font-bold text-slate-900">Academic Records & Internal Assessment</h3>
            <p className="text-xs text-slate-500">Mid-term evaluation scores, laboratory continuous assessments, and university credit progress</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {data?.internal_marks.map((m) => (
              <div key={m.id} className="bg-white rounded-2xl p-4 border border-slate-200/80 shadow-xs">
                <span className="text-[10px] font-mono font-bold px-2 py-0.5 bg-slate-100 text-slate-700 rounded">
                  {m.subject_code}
                </span>
                <h4 className="font-bold text-sm text-slate-900 mt-1">{m.subject_name}</h4>
                <p className="text-xs text-slate-400">{m.assessment_name}</p>

                <div className="mt-3 flex items-baseline justify-between pt-2 border-t border-slate-100">
                  <span className="text-xs text-slate-500">Marks Secured:</span>
                  <span className="text-lg font-extrabold text-blue-700">{m.marks_obtained} <span className="text-xs text-slate-400 font-normal">/ {m.max_marks}</span></span>
                </div>
              </div>
            ))}
          </div>

          {/* Exam Timetable Card */}
          <div className="bg-white rounded-2xl p-5 border border-slate-200/80 shadow-xs">
            <h4 className="font-bold text-sm text-slate-900 mb-3">6th Semester Final Exam Schedule (Fall 2026)</h4>
            <div className="overflow-x-auto">
              <table className="w-full text-xs text-left">
                <thead className="bg-slate-50 text-slate-500 font-semibold border-b border-slate-200">
                  <tr>
                    <th className="p-3">Date</th>
                    <th className="p-3">Time</th>
                    <th className="p-3">Subject Code</th>
                    <th className="p-3">Course Name</th>
                    <th className="p-3">Exam Hall</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  <tr>
                    <td className="p-3 font-semibold text-slate-800">Oct 20, 2026</td>
                    <td className="p-3 text-slate-600">10:00 AM - 01:00 PM</td>
                    <td className="p-3 font-mono font-bold text-blue-700">CS601</td>
                    <td className="p-3 text-slate-800">Distributed Cloud Systems</td>
                    <td className="p-3 text-slate-600">LH-301 Block A</td>
                  </tr>
                  <tr>
                    <td className="p-3 font-semibold text-slate-800">Oct 22, 2026</td>
                    <td className="p-3 text-slate-600">10:00 AM - 01:00 PM</td>
                    <td className="p-3 font-mono font-bold text-blue-700">CS602</td>
                    <td className="p-3 text-slate-800">Artificial Intelligence & Machine Learning</td>
                    <td className="p-3 text-slate-600">LH-302 Block A</td>
                  </tr>
                  <tr>
                    <td className="p-3 font-semibold text-slate-800">Oct 24, 2026</td>
                    <td className="p-3 text-slate-600">10:00 AM - 01:00 PM</td>
                    <td className="p-3 font-mono font-bold text-blue-700">CS603</td>
                    <td className="p-3 text-slate-800">Compiler Design</td>
                    <td className="p-3 text-slate-600">LH-301 Block A</td>
                  </tr>
                  <tr>
                    <td className="p-3 font-semibold text-slate-800">Oct 27, 2026</td>
                    <td className="p-3 text-slate-600">10:00 AM - 01:00 PM</td>
                    <td className="p-3 font-mono font-bold text-blue-700">CS604</td>
                    <td className="p-3 text-slate-800">Full-Stack Web Engineering</td>
                    <td className="p-3 text-slate-600">Systems Lab 2</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* TAB 3: CAMPUS PLACEMENTS WITH AUTOMATIC ELIGIBILITY REASONING */}
      {activeTab === 'placements' && (
        <div className="space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <div>
              <h3 className="text-base font-bold text-slate-900">Campus Placement Drives (2026 Batch)</h3>
              <p className="text-xs text-slate-500">Automated eligibility evaluation based on student CGPA, backlogs, and graduation department</p>
            </div>
            <div className="text-xs bg-blue-50 text-blue-800 px-3 py-1.5 rounded-xl border border-blue-200">
              Your Profile: <strong>CGPA {student?.cgpa || '8.85'}</strong> • Backlogs: <strong>{student?.active_backlogs || 0}</strong> • Dept: <strong>{student?.department_code || 'CSE'}</strong>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {placements.map((drive) => {
              const isApplied = !!drive.my_application;
              return (
                <div
                  key={drive.id}
                  className="bg-white rounded-2xl p-5 border border-slate-200/80 shadow-xs flex flex-col justify-between hover:shadow-md transition"
                >
                  <div>
                    <div className="flex items-start justify-between">
                      <div className="flex items-center space-x-3">
                        <img
                          src={drive.logo_url || 'https://images.unsplash.com/photo-1516321318423-f06f85e504b3?w=100'}
                          alt={drive.company_name}
                          className="w-11 h-11 rounded-xl object-cover border border-slate-200"
                        />
                        <div>
                          <h4 className="font-bold text-base text-slate-900 leading-tight">{drive.job_role}</h4>
                          <p className="text-xs font-semibold text-blue-700">{drive.company_name}</p>
                        </div>
                      </div>
                      <span className="text-base font-extrabold text-emerald-600 bg-emerald-50 px-2.5 py-1 rounded-xl border border-emerald-200">
                        ₹{drive.package_lpa} LPA
                      </span>
                    </div>

                    <div className="mt-3 flex flex-wrap gap-2 text-xs text-slate-600">
                      <span className="flex items-center space-x-1 bg-slate-100 px-2 py-0.5 rounded-md">
                        <MapPin className="w-3 h-3 text-slate-400" />
                        <span>{drive.location}</span>
                      </span>
                      <span className="bg-slate-100 px-2 py-0.5 rounded-md">
                        Min CGPA: <strong>{drive.min_cgpa}</strong>
                      </span>
                      <span className="bg-slate-100 px-2 py-0.5 rounded-md">
                        Max Backlogs: <strong>{drive.max_backlogs}</strong>
                      </span>
                    </div>

                    <p className="mt-3 text-xs text-slate-600 line-clamp-2 leading-relaxed">
                      {drive.description}
                    </p>

                    <div className="mt-3 text-[11px] text-slate-500">
                      <span className="font-semibold text-slate-700">Required Skills:</span> {drive.skills_required}
                    </div>

                    {/* Automatic Eligibility Reason Box */}
                    <div
                      className={`mt-3 p-2.5 rounded-xl text-xs flex items-start space-x-2 border ${
                        drive.is_eligible
                          ? 'bg-emerald-50 text-emerald-900 border-emerald-200'
                          : 'bg-rose-50 text-rose-900 border-rose-200'
                      }`}
                    >
                      {drive.is_eligible ? (
                        <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                      ) : (
                        <XCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
                      )}
                      <div>
                        <span className="font-bold">{drive.is_eligible ? 'Eligible to Apply: ' : 'Ineligible: '}</span>
                        <span>{drive.eligibility_explanation}</span>
                      </div>
                    </div>
                  </div>

                  {/* Footer with application status or Apply button */}
                  <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-xs">
                    <span className="text-slate-400">
                      Deadline: <strong className="text-slate-700">{drive.application_deadline}</strong>
                    </span>

                    {isApplied ? (
                      <span className="px-3 py-1.5 rounded-xl font-bold bg-blue-100 text-blue-800 flex items-center space-x-1">
                        <Check className="w-3.5 h-3.5" />
                        <span>Status: {drive.my_application?.status || 'Applied'}</span>
                      </span>
                    ) : (
                      <button
                        onClick={() => handleApplyPlacement(drive.id)}
                        disabled={!drive.is_eligible || applyingId === drive.id}
                        className="px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white rounded-xl font-semibold shadow-xs transition"
                      >
                        {applyingId === drive.id ? 'Applying...' : 'Apply Now'}
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* TAB 4: INTERNSHIPS MARKETPLACE */}
      {activeTab === 'internships' && (
        <div className="space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <h3 className="text-base font-bold text-slate-900">Campus Internship Marketplace</h3>
              <p className="text-xs text-slate-500">Discover paid industrial research & engineering internships with PPI opportunities</p>
            </div>
            {/* Filters */}
            <div className="flex items-center space-x-2 text-xs">
              <select
                value={internshipFilter.work_type}
                onChange={(e) => setInternshipFilter({ ...internshipFilter, work_type: e.target.value })}
                className="bg-white border border-slate-200 px-3 py-1.5 rounded-xl text-slate-700 focus:outline-hidden"
              >
                <option value="">All Work Types</option>
                <option value="Remote">Remote</option>
                <option value="Onsite">Onsite</option>
                <option value="Hybrid">Hybrid</option>
              </select>
              <select
                value={internshipFilter.is_paid}
                onChange={(e) => setInternshipFilter({ ...internshipFilter, is_paid: e.target.value })}
                className="bg-white border border-slate-200 px-3 py-1.5 rounded-xl text-slate-700 focus:outline-hidden"
              >
                <option value="">Paid & Unpaid</option>
                <option value="true">Paid Only</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {internships
              .filter((i) => (!internshipFilter.work_type || i.work_type === internshipFilter.work_type))
              .map((item) => {
                const isApplied = !!item.my_application;
                return (
                  <div
                    key={item.id}
                    className="bg-white rounded-2xl p-5 border border-slate-200/80 shadow-xs flex flex-col justify-between hover:border-slate-300 transition"
                  >
                    <div>
                      <div className="flex items-start justify-between">
                        <div>
                          <span className="text-[10px] font-bold uppercase tracking-wider text-blue-700 bg-blue-50 px-2 py-0.5 rounded">
                            {item.work_type}
                          </span>
                          <h4 className="font-bold text-sm text-slate-900 mt-1 leading-snug">{item.role}</h4>
                          <p className="text-xs text-slate-500 font-semibold">{item.company_name}</p>
                        </div>
                        <span className="text-xs font-bold px-2 py-1 rounded-lg bg-emerald-50 text-emerald-700 border border-emerald-200">
                          {item.stipend}
                        </span>
                      </div>

                      <div className="mt-3 text-xs text-slate-600 space-y-1">
                        <div>Duration: <strong className="text-slate-800">{item.duration}</strong></div>
                        <div>Skills: <span className="text-slate-500">{item.skills_required}</span></div>
                        <div>Location: <span className="text-slate-500">{item.location}</span></div>
                      </div>
                    </div>

                    <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-xs">
                      <span className="text-slate-400 text-[11px]">By {item.application_deadline}</span>

                      {isApplied ? (
                        <span className="px-3 py-1 rounded-lg font-bold bg-indigo-50 text-indigo-700 text-xs">
                          {item.my_application?.status || 'Applied'}
                        </span>
                      ) : (
                        <button
                          onClick={() => handleApplyInternship(item.id)}
                          disabled={applyingId === item.id}
                          className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-semibold shadow-xs transition"
                        >
                          {applyingId === item.id ? 'Applying...' : 'Apply'}
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
          </div>
        </div>
      )}

      {/* TAB 5: EVENTS & HACKATHONS */}
      {activeTab === 'events' && (
        <div className="space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <h3 className="text-base font-bold text-slate-900">Campus Events, Workshops & Hackathons</h3>
              <p className="text-xs text-slate-500">Register for tech symposiums, coding competitions, robotics arenas, and cultural festivals</p>
            </div>
            <div className="flex flex-wrap gap-1.5 text-xs">
              {['All', 'Hackathon', 'Workshop', 'Technical', 'Cultural', 'Sports'].map((cat) => (
                <button
                  key={cat}
                  onClick={() => setEventCategory(cat)}
                  className={`px-3 py-1 rounded-xl font-medium transition ${
                    eventCategory === cat
                      ? 'bg-blue-600 text-white shadow-xs'
                      : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-50'
                  }`}
                >
                  {cat}
                </button>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {events
              .filter((e) => (eventCategory === 'All' ? true : e.event_type === eventCategory))
              .map((ev) => {
                const isFull = ev.registered_count >= ev.max_participants;
                return (
                  <div
                    key={ev.id}
                    className="bg-white rounded-2xl p-5 border border-slate-200/80 shadow-xs flex flex-col justify-between hover:shadow-md transition"
                  >
                    <div>
                      <div className="flex items-center justify-between">
                        <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded bg-indigo-50 text-indigo-700">
                          {ev.event_type}
                        </span>
                        <span className="text-xs text-slate-500 font-medium">{ev.event_date}</span>
                      </div>

                      <h4 className="font-bold text-base text-slate-900 mt-2 leading-snug">{ev.title}</h4>
                      <p className="text-xs text-slate-500 mt-1 line-clamp-2">{ev.description}</p>

                      <div className="mt-4 space-y-1 text-xs text-slate-600 bg-slate-50 p-2.5 rounded-xl border border-slate-100">
                        <div>Time: <strong>{ev.event_time}</strong></div>
                        <div>Venue: <strong>{ev.venue}</strong></div>
                        <div>Organizer: <strong>{ev.organizer}</strong></div>
                      </div>

                      {/* Capacity progress */}
                      <div className="mt-3">
                        <div className="flex justify-between text-[11px] text-slate-500 mb-1">
                          <span>Seats Filled: {ev.registered_count} / {ev.max_participants}</span>
                          <span className="font-semibold">{Math.round((ev.registered_count / ev.max_participants) * 100)}%</span>
                        </div>
                        <div className="w-full bg-slate-100 h-1.5 rounded-full overflow-hidden">
                          <div
                            className={`h-full rounded-full ${isFull ? 'bg-rose-500' : 'bg-blue-600'}`}
                            style={{ width: `${Math.min(100, (ev.registered_count / ev.max_participants) * 100)}%` }}
                          ></div>
                        </div>
                      </div>
                    </div>

                    <div className="mt-5 pt-3 border-t border-slate-100 flex items-center justify-between">
                      {ev.is_registered ? (
                        <div className="flex items-center justify-between w-full">
                          <span className="text-xs font-bold text-emerald-700 flex items-center space-x-1">
                            <CheckCircle2 className="w-4 h-4" />
                            <span>Registered</span>
                          </span>
                          <button
                            onClick={() => handleCancelEvent(ev.id)}
                            className="text-xs text-rose-600 hover:text-rose-800 font-medium"
                          >
                            Cancel Pass
                          </button>
                        </div>
                      ) : (
                        <button
                          onClick={() => handleRegisterEvent(ev.id)}
                          disabled={isFull}
                          className="w-full py-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white rounded-xl text-xs font-semibold shadow-xs transition"
                        >
                          {isFull ? 'Sold Out' : 'Register Now (Free)'}
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
          </div>
        </div>
      )}

      {/* TAB 6: COMPLAINTS / GRIEVANCE TRACKER */}
      {activeTab === 'complaints' && (
        <div className="space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <h3 className="text-base font-bold text-slate-900">Student Grievance & Complaint Tracker</h3>
              <p className="text-xs text-slate-500">Track resolution status and updates across attendance, hostel, examinations, and academics</p>
            </div>
            <button
              onClick={onOpenComplaintModal}
              className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-semibold shadow-xs flex items-center space-x-1.5 self-start sm:self-auto transition"
            >
              <Plus className="w-4 h-4" />
              <span>Submit New Grievance</span>
            </button>
          </div>

          <div className="space-y-3">
            {complaints.length === 0 ? (
              <div className="bg-white rounded-2xl p-8 border border-slate-200 text-center text-slate-500 text-sm">
                No active complaints filed. Click &quot;Submit New Grievance&quot; to report any issue.
              </div>
            ) : (
              complaints.map((c) => (
                <div
                  key={c.id}
                  className="bg-white rounded-2xl p-5 border border-slate-200/80 shadow-xs space-y-3"
                >
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                    <div className="flex items-center space-x-2.5">
                      <span className="font-mono font-bold text-xs bg-slate-100 text-blue-700 px-2 py-0.5 rounded">
                        {c.ticket_number}
                      </span>
                      <span className="text-xs px-2 py-0.5 bg-slate-100 text-slate-700 font-semibold rounded">
                        {c.category}
                      </span>
                      <span className="text-xs text-slate-400">Assigned: <strong>{c.assigned_department}</strong></span>
                    </div>

                    <div className="flex items-center space-x-2">
                      <span className="text-xs font-semibold text-amber-700 bg-amber-50 px-2 py-0.5 rounded border border-amber-200">
                        {c.priority} Priority
                      </span>
                      <span
                        className={`text-xs font-bold px-2.5 py-1 rounded-full ${
                          c.status === 'Resolved'
                            ? 'bg-emerald-100 text-emerald-800'
                            : c.status === 'In Progress'
                            ? 'bg-blue-100 text-blue-800'
                            : 'bg-amber-100 text-amber-800'
                        }`}
                      >
                        {c.status}
                      </span>
                    </div>
                  </div>

                  <div>
                    <h4 className="font-bold text-sm text-slate-900">{c.subject}</h4>
                    <p className="text-xs text-slate-600 mt-1 leading-relaxed">{c.description}</p>
                  </div>

                  {/* Updates History */}
                  {c.updates && c.updates.length > 0 && (
                    <div className="bg-slate-50 rounded-xl p-3 border border-slate-100 space-y-2 mt-2">
                      <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                        Resolution Timeline
                      </div>
                      {c.updates.map((u, idx) => (
                        <div key={idx} className="text-xs text-slate-700 flex items-start space-x-2">
                          <Clock className="w-3.5 h-3.5 text-slate-400 mt-0.5 shrink-0" />
                          <div>
                            <span className="font-semibold text-slate-900">{u.updated_by}: </span>
                            <span>{u.message}</span>
                            <span className="text-[10px] text-slate-400 ml-2">
                              {new Date(u.created_at).toLocaleDateString()}
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {/* TAB 7: ANNOUNCEMENTS */}
      {activeTab === 'announcements' && (
        <div className="space-y-4">
          <div>
            <h3 className="text-base font-bold text-slate-900">Official College Circulars & Notifications</h3>
            <p className="text-xs text-slate-500">Notices published by Controller of Examinations, Dean of Academics, and Department Heads</p>
          </div>

          <div className="space-y-3">
            {data?.notifications.map((n) => (
              <div key={n.id} className="bg-white rounded-2xl p-4 border border-slate-200/80 shadow-xs flex items-start space-x-3">
                <div className="w-8 h-8 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center shrink-0 mt-0.5">
                  <AlertCircle className="w-4 h-4" />
                </div>
                <div className="flex-1">
                  <div className="flex items-center justify-between">
                    <h4 className="font-bold text-sm text-slate-900">{n.title}</h4>
                    <span className="text-[10px] text-slate-400">
                      {new Date(n.created_at).toLocaleDateString()}
                    </span>
                  </div>
                  <p className="text-xs text-slate-600 mt-1 leading-normal">{n.message}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
