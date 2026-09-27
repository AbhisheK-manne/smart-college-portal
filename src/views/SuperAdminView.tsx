import React, { useState, useEffect } from 'react';
import {
  Activity,
  Users,
  Building,
  Calendar,
  Briefcase,
  Award,
  AlertCircle,
  Shield,
  Search,
  CheckCircle2,
  TrendingUp,
  FileSpreadsheet,
  Database
} from 'lucide-react';
import { useAuth } from '../context/AuthContext.tsx';
import { DatabasePortalView } from './DatabasePortalView.tsx';

export const SuperAdminView: React.FC = () => {
  const { token } = useAuth();
  const [analytics, setAnalytics] = useState<any>(null);
  const [usersData, setUsersData] = useState<{ students: any[]; faculty: any[]; departments: any[] }>({
    students: [],
    faculty: [],
    departments: [],
  });
  const [loading, setLoading] = useState(true);
  const [subTab, setSubTab] = useState<'analytics' | 'students' | 'faculty' | 'database' | 'audit'>('analytics');
  const [searchUser, setSearchUser] = useState('');
  const [filterDept, setFilterDept] = useState('');

  const fetchData = async () => {
    try {
      setLoading(true);
      const [anRes, uRes] = await Promise.all([
        fetch('/api/admin/analytics', { headers: { Authorization: `Bearer ${token}` } }),
        fetch('/api/admin/users', { headers: { Authorization: `Bearer ${token}` } }),
      ]);

      if (anRes.ok) setAnalytics(await anRes.json());
      if (uRes.ok) setUsersData(await uRes.json());
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (token) fetchData();
  }, [token]);

  if (loading && !analytics) {
    return (
      <div className="flex items-center justify-center min-h-[50vh]">
        <div className="w-8 h-8 border-4 border-rose-600 border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  const filteredStudents = usersData.students.filter((s) => {
    const matchSearch = s.name.toLowerCase().includes(searchUser.toLowerCase()) || s.roll_no.toLowerCase().includes(searchUser.toLowerCase());
    const matchDept = !filterDept || s.department_code === filterDept;
    return matchSearch && matchDept;
  });

  const filteredFaculty = usersData.faculty.filter((f) => {
    const matchSearch = f.name.toLowerCase().includes(searchUser.toLowerCase()) || f.staff_id.toLowerCase().includes(searchUser.toLowerCase());
    const matchDept = !filterDept || f.department_code === filterDept;
    return matchSearch && matchDept;
  });

  return (
    <div className="p-4 sm:p-6 lg:p-8 space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="bg-gradient-to-r from-slate-900 via-rose-950 to-slate-900 text-white rounded-3xl p-6 shadow-md flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center space-x-4">
          <div className="w-12 h-12 rounded-2xl bg-rose-500/20 text-rose-300 border border-rose-400/30 flex items-center justify-center font-bold">
            <Shield className="w-6 h-6" />
          </div>
          <div>
            <div className="flex items-center space-x-2">
              <h2 className="text-xl font-bold">TKREC Institutional Command Center</h2>
              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-rose-500/20 text-rose-300 border border-rose-400/30">
                Super Admin
              </span>
            </div>
            <p className="text-xs text-rose-200/80 mt-0.5">
              Full-spectrum governance over departments, 100 student records, 20 faculty members, and institutional compliance
            </p>
          </div>
        </div>

        {/* Sub-nav switcher */}
        <div className="flex flex-wrap gap-1.5 bg-white/10 p-1.5 rounded-2xl backdrop-blur-md self-start md:self-auto text-xs font-semibold">
          <button
            onClick={() => setSubTab('analytics')}
            className={`px-3 py-1.5 rounded-xl transition ${subTab === 'analytics' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-200 hover:text-white'}`}
          >
            Analytics & KPIs
          </button>
          <button
            onClick={() => setSubTab('students')}
            className={`px-3 py-1.5 rounded-xl transition ${subTab === 'students' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-200 hover:text-white'}`}
          >
            Students ({usersData.students.length})
          </button>
          <button
            onClick={() => setSubTab('faculty')}
            className={`px-3 py-1.5 rounded-xl transition ${subTab === 'faculty' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-200 hover:text-white'}`}
          >
            Faculty ({usersData.faculty.length})
          </button>
          <button
            onClick={() => setSubTab('database')}
            className={`px-3 py-1.5 rounded-xl transition flex items-center gap-1.5 ${subTab === 'database' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-200 hover:text-white'}`}
          >
            <Database className="w-3.5 h-3.5" /> Database & Storage
          </button>
          <button
            onClick={() => setSubTab('audit')}
            className={`px-3 py-1.5 rounded-xl transition ${subTab === 'audit' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-200 hover:text-white'}`}
          >
            System Audit
          </button>
        </div>
      </div>

      {/* SUB-TAB 1: ANALYTICS & KPIS */}
      {subTab === 'analytics' && (
        <div className="space-y-6">
          {/* KPI Cards Grid */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="bg-white p-5 rounded-3xl border border-slate-200 shadow-xs">
              <span className="text-xs font-bold text-slate-400 uppercase tracking-wider block">Total Students</span>
              <div className="mt-2 text-3xl font-extrabold text-slate-900">{analytics?.total_students}</div>
              <p className="mt-1 text-[11px] text-slate-500">Across 5 engineering branches</p>
            </div>
            <div className="bg-white p-5 rounded-3xl border border-slate-200 shadow-xs">
              <span className="text-xs font-bold text-slate-400 uppercase tracking-wider block">Total Faculty</span>
              <div className="mt-2 text-3xl font-extrabold text-slate-900">{analytics?.total_faculty}</div>
              <p className="mt-1 text-[11px] text-slate-500">Professors & Associate staff</p>
            </div>
            <div className="bg-white p-5 rounded-3xl border border-slate-200 shadow-xs">
              <span className="text-xs font-bold text-slate-400 uppercase tracking-wider block">Active Grievances</span>
              <div className="mt-2 text-3xl font-extrabold text-amber-600">{analytics?.active_complaints}</div>
              <p className="mt-1 text-[11px] text-slate-500">In Progress or Assigned</p>
            </div>
            <div className="bg-white p-5 rounded-3xl border border-slate-200 shadow-xs">
              <span className="text-xs font-bold text-slate-400 uppercase tracking-wider block">Active Placements</span>
              <div className="mt-2 text-3xl font-extrabold text-emerald-600">{analytics?.active_placements}</div>
              <p className="mt-1 text-[11px] text-slate-500">{analytics?.placement_applications} total applications</p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Department Attendance Compliance */}
            <div className="bg-white rounded-3xl p-6 border border-slate-200 shadow-xs space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="font-bold text-base text-slate-900">Departmental Attendance Rates</h3>
                  <p className="text-xs text-slate-500">Calculated database average per branch</p>
                </div>
                <TrendingUp className="w-5 h-5 text-blue-600" />
              </div>

              <div className="space-y-3">
                {analytics?.dept_attendance?.map((dept: any) => (
                  <div key={dept.department_code} className="p-3 bg-slate-50 rounded-2xl border border-slate-200">
                    <div className="flex justify-between items-center text-xs mb-1.5">
                      <span className="font-bold text-slate-800">{dept.department_code} Engineering</span>
                      <span className="font-extrabold text-slate-900">{dept.avg_attendance}%</span>
                    </div>
                    <div className="w-full bg-slate-200 h-2 rounded-full overflow-hidden">
                      <div
                        className={`h-full rounded-full ${dept.avg_attendance >= 75 ? 'bg-emerald-500' : 'bg-rose-500'}`}
                        style={{ width: `${Math.min(100, dept.avg_attendance)}%` }}
                      ></div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Complaints by Category */}
            <div className="bg-white rounded-3xl p-6 border border-slate-200 shadow-xs space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="font-bold text-base text-slate-900">Campus Grievance Distribution</h3>
                  <p className="text-xs text-slate-500">Breakdown of student complaints by domain</p>
                </div>
                <AlertCircle className="w-5 h-5 text-amber-600" />
              </div>

              <div className="space-y-2.5">
                {analytics?.complaints_by_category?.map((c: any) => (
                  <div key={c.category} className="flex items-center justify-between text-xs p-2.5 bg-slate-50 rounded-xl">
                    <span className="font-semibold text-slate-700">{c.category}</span>
                    <span className="font-bold text-slate-900 bg-white px-2.5 py-0.5 rounded-full border border-slate-200 shadow-2xs">
                      {c.count} tickets
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* SUB-TAB 2: STUDENTS DIRECTORY (100 Students) */}
      {subTab === 'students' && (
        <div className="bg-white rounded-3xl p-6 border border-slate-200 shadow-xs space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <h3 className="font-bold text-base text-slate-900">Verified Student Master Roster (100 Records)</h3>
              <p className="text-xs text-slate-500">Live student registry with CGPA, department, and active status</p>
            </div>

            <div className="flex items-center space-x-2 text-xs">
              <select
                value={filterDept}
                onChange={(e) => setFilterDept(e.target.value)}
                className="bg-slate-50 border border-slate-200 px-3 py-1.5 rounded-xl text-slate-700"
              >
                <option value="">All Departments</option>
                <option value="CSE">CSE</option>
                <option value="ECE">ECE</option>
                <option value="MECH">MECH</option>
                <option value="CIVIL">CIVIL</option>
                <option value="IT">IT</option>
              </select>

              <div className="relative">
                <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-2.5" />
                <input
                  type="text"
                  placeholder="Search student..."
                  value={searchUser}
                  onChange={(e) => setSearchUser(e.target.value)}
                  className="bg-slate-50 border border-slate-200 pl-8 pr-3 py-1.5 rounded-xl text-xs"
                />
              </div>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-xs text-left">
              <thead className="bg-slate-50 text-slate-500 border-b border-slate-200">
                <tr>
                  <th className="p-3">Roll Number</th>
                  <th className="p-3">Student Name</th>
                  <th className="p-3">Department</th>
                  <th className="p-3">Year / Sem</th>
                  <th className="p-3">Section</th>
                  <th className="p-3">CGPA</th>
                  <th className="p-3">Backlogs</th>
                  <th className="p-3">Official Email</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredStudents.slice(0, 30).map((st) => (
                  <tr key={st.roll_no} className="hover:bg-slate-50">
                    <td className="p-3 font-mono font-bold text-blue-700">{st.roll_no}</td>
                    <td className="p-3 font-semibold text-slate-900">{st.name}</td>
                    <td className="p-3 text-slate-700">{st.department_code}</td>
                    <td className="p-3 text-slate-500">Year {st.year} (Sem {st.semester})</td>
                    <td className="p-3 text-slate-700">{st.section}</td>
                    <td className="p-3 font-bold text-emerald-600">{st.cgpa}</td>
                    <td className="p-3">
                      <span className={`px-2 py-0.5 rounded font-bold ${st.active_backlogs > 0 ? 'bg-rose-100 text-rose-800' : 'bg-slate-100 text-slate-600'}`}>
                        {st.active_backlogs}
                      </span>
                    </td>
                    <td className="p-3 font-mono text-[11px] text-slate-400">{st.email}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* SUB-TAB 3: FACULTY DIRECTORY (20 Faculty) */}
      {subTab === 'faculty' && (
        <div className="bg-white rounded-3xl p-6 border border-slate-200 shadow-xs space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <h3 className="font-bold text-base text-slate-900">Faculty & Staff Directory (20 Members)</h3>
              <p className="text-xs text-slate-500">Academic staff across all 5 engineering departments</p>
            </div>

            <div className="relative">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-2.5" />
              <input
                type="text"
                placeholder="Search staff ID or name..."
                value={searchUser}
                onChange={(e) => setSearchUser(e.target.value)}
                className="bg-slate-50 border border-slate-200 pl-8 pr-3 py-1.5 rounded-xl text-xs"
              />
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-xs text-left">
              <thead className="bg-slate-50 text-slate-500 border-b border-slate-200">
                <tr>
                  <th className="p-3">Staff ID</th>
                  <th className="p-3">Faculty Name</th>
                  <th className="p-3">Department</th>
                  <th className="p-3">Designation</th>
                  <th className="p-3">Official Email</th>
                  <th className="p-3">Contact Phone</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredFaculty.map((f) => (
                  <tr key={f.staff_id} className="hover:bg-slate-50">
                    <td className="p-3 font-mono font-bold text-indigo-700">{f.staff_id}</td>
                    <td className="p-3 font-semibold text-slate-900">{f.name}</td>
                    <td className="p-3 text-slate-700">{f.department_code}</td>
                    <td className="p-3 text-slate-600">{f.designation}</td>
                    <td className="p-3 font-mono text-[11px] text-slate-400">{f.email}</td>
                    <td className="p-3 text-slate-500">{f.phone}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* SUB-TAB 4: SYSTEM AUDIT LOGS */}
      {subTab === 'audit' && (
        <div className="bg-white rounded-3xl p-6 border border-slate-200 shadow-xs space-y-4">
          <div>
            <h3 className="font-bold text-base text-slate-900">System Security & Audit Trail</h3>
            <p className="text-xs text-slate-500">Immutable chronological log of authentication, attendance updates, and role modifications</p>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-xs text-left">
              <thead className="bg-slate-50 text-slate-500 border-b border-slate-200">
                <tr>
                  <th className="p-3">Timestamp</th>
                  <th className="p-3">Actor ID</th>
                  <th className="p-3">Actor Role</th>
                  <th className="p-3">Action</th>
                  <th className="p-3">Entity Type</th>
                  <th className="p-3">Details</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {analytics?.audit_logs?.map((a: any) => (
                  <tr key={a.id} className="hover:bg-slate-50">
                    <td className="p-3 text-slate-400 whitespace-nowrap">{new Date(a.timestamp).toLocaleString()}</td>
                    <td className="p-3 font-mono font-bold text-slate-900">{a.actor_id}</td>
                    <td className="p-3 uppercase text-[10px] font-bold text-slate-600">{a.actor_role}</td>
                    <td className="p-3 font-semibold text-blue-700">{a.action}</td>
                    <td className="p-3 text-slate-500">{a.entity_type}</td>
                    <td className="p-3 text-slate-600 max-w-sm truncate">{a.details}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* SUB-TAB: DATABASE & STORAGE ENGINE */}
      {subTab === 'database' && (
        <DatabasePortalView />
      )}
    </div>
  );
};
