import React, { useState, useEffect } from 'react';
import {
  Shield,
  Users,
  AlertCircle,
  FileSpreadsheet,
  CheckCircle2,
  XCircle,
  Clock,
  TrendingUp,
  Building,
  Megaphone,
  Briefcase
} from 'lucide-react';
import { useAuth } from '../context/AuthContext.tsx';
import { Complaint } from '../types/index.ts';

export const HodAdminDashboard: React.FC = () => {
  const { token, user } = useAuth();
  const [analytics, setAnalytics] = useState<any>(null);
  const [complaints, setComplaints] = useState<Complaint[]>([]);
  const [loading, setLoading] = useState(true);

  // Status update state for grievance modal
  const [selectedComplaint, setSelectedComplaint] = useState<Complaint | null>(null);
  const [updateStatus, setUpdateStatus] = useState('In Progress');
  const [updateRemarks, setUpdateRemarks] = useState('');
  const [updating, setUpdating] = useState(false);

  // New circular state
  const [noticeTitle, setNoticeTitle] = useState('');
  const [noticeContent, setNoticeContent] = useState('');
  const [noticePriority, setNoticePriority] = useState('Normal');
  const [postingNotice, setPostingNotice] = useState(false);
  const [noticeSuccess, setNoticeSuccess] = useState(false);

  const fetchData = async () => {
    try {
      setLoading(true);
      const [anRes, cRes] = await Promise.all([
        fetch('/api/admin/analytics', { headers: { Authorization: `Bearer ${token}` } }),
        fetch('/api/complaints', { headers: { Authorization: `Bearer ${token}` } }),
      ]);

      if (anRes.ok) setAnalytics(await anRes.json());
      if (cRes.ok) setComplaints(await cRes.json());
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (token) fetchData();
  }, [token]);

  const handleUpdateComplaintStatus = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedComplaint || !updateRemarks.trim()) return;

    setUpdating(true);
    try {
      const res = await fetch('/api/complaints/update-status', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          complaint_id: selectedComplaint.id,
          new_status: updateStatus,
          message: updateRemarks,
          assigned_to_staff: user?.name,
        }),
      });

      if (res.ok) {
        setSelectedComplaint(null);
        setUpdateRemarks('');
        await fetchData();
      }
    } catch (err) {
      console.error(err);
    } finally {
      setUpdating(false);
    }
  };

  const handlePostNotice = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!noticeTitle.trim() || !noticeContent.trim()) return;

    setPostingNotice(true);
    try {
      const res = await fetch('/api/announcements/create', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          title: noticeTitle,
          content: noticeContent,
          department_code: user?.department_code || 'CSE',
          category: 'Academic',
          priority: noticePriority,
        }),
      });

      if (res.ok) {
        setNoticeTitle('');
        setNoticeContent('');
        setNoticeSuccess(true);
        setTimeout(() => setNoticeSuccess(false), 3000);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setPostingNotice(false);
    }
  };

  if (loading && !analytics) {
    return (
      <div className="flex items-center justify-center min-h-[50vh]">
        <div className="w-8 h-8 border-4 border-purple-600 border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  const deptCode = user?.department_code || 'CSE';

  return (
    <div className="p-4 sm:p-6 lg:p-8 space-y-6 max-w-7xl mx-auto">
      {/* Top Department Banner */}
      <div className="bg-gradient-to-r from-purple-900 via-indigo-900 to-slate-900 text-white rounded-3xl p-6 shadow-md flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center space-x-4">
          <div className="w-14 h-14 rounded-2xl bg-purple-500/20 text-purple-300 border border-purple-400/30 flex items-center justify-center font-bold text-xl">
            {deptCode}
          </div>
          <div>
            <div className="flex items-center space-x-2">
              <h2 className="text-xl font-bold">Department of {deptCode} Administrative Cockpit</h2>
              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-purple-500/20 text-purple-300 border border-purple-400/30">
                HOD Level
              </span>
            </div>
            <p className="text-xs text-purple-200/80 mt-1">
              Overseeing student academic progression, faculty attendance verification, and departmental grievances
            </p>
          </div>
        </div>

        <div className="flex items-center space-x-3 text-center">
          <div className="bg-white/10 px-4 py-2 rounded-2xl backdrop-blur-md">
            <span className="text-[11px] text-purple-200 block">Enrolled Students</span>
            <span className="text-lg font-bold">{analytics?.total_students || 100}</span>
          </div>
          <div className="bg-white/10 px-4 py-2 rounded-2xl backdrop-blur-md">
            <span className="text-[11px] text-purple-200 block">Active Faculty</span>
            <span className="text-lg font-bold">{analytics?.total_faculty || 20}</span>
          </div>
          <div className="bg-white/10 px-4 py-2 rounded-2xl backdrop-blur-md">
            <span className="text-[11px] text-purple-200 block">Open Grievances</span>
            <span className="text-lg font-bold text-amber-300">{complaints.filter(c => c.status !== 'Resolved' && c.status !== 'Closed').length}</span>
          </div>
        </div>
      </div>

      {/* Attendance & Department Metrics Row */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Attendance Rates by Department */}
        <div className="bg-white rounded-3xl p-6 border border-slate-200 shadow-xs space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="font-bold text-base text-slate-900">Departmental Attendance Trends</h3>
              <p className="text-xs text-slate-500">Live attendance percentage across 5 branches</p>
            </div>
            <TrendingUp className="w-5 h-5 text-purple-600" />
          </div>

          <div className="space-y-3">
            {analytics?.dept_attendance?.map((dept: any) => {
              const isSelected = dept.department_code === deptCode;
              return (
                <div
                  key={dept.department_code}
                  className={`p-3 rounded-2xl border transition ${
                    isSelected ? 'bg-purple-50/60 border-purple-200' : 'bg-slate-50 border-slate-200'
                  }`}
                >
                  <div className="flex justify-between items-center text-xs mb-1.5">
                    <span className="font-bold text-slate-800">
                      {dept.department_code} Department {isSelected && '(Your Department)'}
                    </span>
                    <span className="font-extrabold text-slate-900">{dept.avg_attendance}%</span>
                  </div>
                  <div className="w-full bg-slate-200 h-2 rounded-full overflow-hidden">
                    <div
                      className={`h-full rounded-full ${
                        dept.avg_attendance >= 75 ? 'bg-emerald-500' : 'bg-rose-500'
                      }`}
                      style={{ width: `${Math.min(100, dept.avg_attendance)}%` }}
                    ></div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Publish Department Notice */}
        <div className="bg-white rounded-3xl p-6 border border-slate-200 shadow-xs space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="font-bold text-base text-slate-900">Broadcast Department Circular</h3>
              <p className="text-xs text-slate-500">Post official instructions to student and faculty dashboards</p>
            </div>
            <Megaphone className="w-5 h-5 text-indigo-600" />
          </div>

          {noticeSuccess && (
            <div className="p-3 bg-emerald-50 text-emerald-800 text-xs rounded-xl flex items-center space-x-2 border border-emerald-200">
              <CheckCircle2 className="w-4 h-4 text-emerald-600" />
              <span>Notice broadcasted successfully to all departmental students!</span>
            </div>
          )}

          <form onSubmit={handlePostNotice} className="space-y-3">
            <div>
              <input
                type="text"
                placeholder="Notice Subject (e.g. Schedule for Lab External Submissions)"
                value={noticeTitle}
                onChange={(e) => setNoticeTitle(e.target.value)}
                className="w-full px-3.5 py-2 text-xs bg-slate-50 border border-slate-300 rounded-xl focus:outline-hidden"
              />
            </div>
            <div>
              <textarea
                rows={3}
                placeholder="Detailed instructions or circular guidelines..."
                value={noticeContent}
                onChange={(e) => setNoticeContent(e.target.value)}
                className="w-full px-3.5 py-2 text-xs bg-slate-50 border border-slate-300 rounded-xl focus:outline-hidden"
              ></textarea>
            </div>
            <div className="flex items-center justify-between">
              <select
                value={noticePriority}
                onChange={(e) => setNoticePriority(e.target.value)}
                className="px-3 py-1.5 text-xs bg-slate-50 border border-slate-300 rounded-xl"
              >
                <option value="Normal">Normal Priority</option>
                <option value="High">High Priority</option>
                <option value="Urgent">Urgent Circular</option>
              </select>

              <button
                type="submit"
                disabled={postingNotice || !noticeTitle.trim()}
                className="px-4 py-2 bg-purple-600 hover:bg-purple-700 disabled:opacity-50 text-white rounded-xl text-xs font-bold transition shadow-xs"
              >
                {postingNotice ? 'Publishing...' : 'Publish Notice'}
              </button>
            </div>
          </form>
        </div>
      </div>

      {/* Department Grievance Queue */}
      <div className="bg-white rounded-3xl p-6 border border-slate-200 shadow-xs space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="font-bold text-base text-slate-900">Department Student Grievances & Appeals</h3>
            <p className="text-xs text-slate-500">
              AI-triaged tickets requiring HOD approval, attendance review, or faculty assignment
            </p>
          </div>
          <span className="text-xs font-bold px-2.5 py-1 rounded-full bg-slate-100 text-slate-700">
            {complaints.length} Total Tickets
          </span>
        </div>

        <div className="divide-y divide-slate-100 text-xs">
          {complaints.map((c) => (
            <div key={c.id} className="py-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 hover:bg-slate-50 p-2 rounded-2xl transition">
              <div className="space-y-1">
                <div className="flex items-center space-x-2">
                  <span className="font-mono font-bold text-purple-700 bg-purple-50 px-2 py-0.5 rounded">
                    {c.ticket_number}
                  </span>
                  <span className="font-semibold text-slate-700 bg-slate-100 px-2 py-0.5 rounded">
                    {c.category}
                  </span>
                  <span className="text-slate-400">Student: <strong>{c.student_name}</strong> ({c.student_roll_no})</span>
                </div>
                <div className="font-bold text-slate-900 text-sm">{c.subject}</div>
                <p className="text-slate-600 line-clamp-1">{c.description}</p>
              </div>

              <div className="flex items-center space-x-2 shrink-0 self-end sm:self-center">
                <span
                  className={`px-2.5 py-1 rounded-full font-bold uppercase text-[10px] ${
                    c.status === 'Resolved'
                      ? 'bg-emerald-100 text-emerald-800'
                      : c.status === 'In Progress'
                      ? 'bg-blue-100 text-blue-800'
                      : 'bg-amber-100 text-amber-800'
                  }`}
                >
                  {c.status}
                </span>

                <button
                  onClick={() => {
                    setSelectedComplaint(c);
                    setUpdateStatus(c.status);
                    setUpdateRemarks('');
                  }}
                  className="px-3 py-1.5 bg-purple-600 hover:bg-purple-700 text-white rounded-xl font-semibold transition"
                >
                  Action Ticket
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Action Ticket Modal */}
      {selectedComplaint && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in">
          <div className="bg-white rounded-3xl shadow-2xl max-w-lg w-full p-6 border border-slate-200 space-y-4">
            <div className="flex justify-between items-start">
              <div>
                <span className="text-xs font-mono font-bold text-purple-700">{selectedComplaint.ticket_number}</span>
                <h3 className="font-bold text-base text-slate-900">{selectedComplaint.subject}</h3>
                <p className="text-xs text-slate-500">Student: {selectedComplaint.student_name} ({selectedComplaint.student_roll_no})</p>
              </div>
              <button onClick={() => setSelectedComplaint(null)} className="p-1 rounded-lg text-slate-400 hover:text-slate-600">
                <XCircle className="w-5 h-5" />
              </button>
            </div>

            <div className="bg-slate-50 p-3 rounded-xl border border-slate-200 text-xs text-slate-700">
              {selectedComplaint.description}
            </div>

            <form onSubmit={handleUpdateComplaintStatus} className="space-y-3 text-xs">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">Update Status</label>
                <select
                  value={updateStatus}
                  onChange={(e) => setUpdateStatus(e.target.value)}
                  className="w-full p-2 bg-slate-50 border border-slate-300 rounded-xl"
                >
                  <option value="Assigned">Assigned</option>
                  <option value="In Progress">In Progress</option>
                  <option value="Waiting for Information">Waiting for Information</option>
                  <option value="Resolved">Resolved</option>
                  <option value="Closed">Closed</option>
                </select>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Official Resolution Remarks</label>
                <textarea
                  rows={3}
                  placeholder="State the resolution steps or feedback to be dispatched to student..."
                  value={updateRemarks}
                  onChange={(e) => setUpdateRemarks(e.target.value)}
                  className="w-full p-2 bg-slate-50 border border-slate-300 rounded-xl focus:outline-hidden"
                ></textarea>
              </div>

              <div className="pt-2 flex justify-end space-x-2">
                <button
                  type="button"
                  onClick={() => setSelectedComplaint(null)}
                  className="px-4 py-2 text-slate-600 hover:bg-slate-100 rounded-xl"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={updating || !updateRemarks.trim()}
                  className="px-5 py-2 bg-purple-600 hover:bg-purple-700 disabled:opacity-50 text-white rounded-xl font-bold transition shadow-xs"
                >
                  {updating ? 'Saving...' : 'Update & Notify Student'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
