import React, { useState, useEffect } from 'react';
import {
  Briefcase,
  Building,
  Plus,
  CheckCircle2,
  XCircle,
  Clock,
  Filter,
  Users,
  Award,
  ChevronRight,
  MapPin,
  ExternalLink
} from 'lucide-react';
import { useAuth } from '../context/AuthContext.tsx';
import { PlacementDrive } from '../types/index.ts';

export const PlacementCellView: React.FC = () => {
  const { token, user } = useAuth();
  const [drives, setDrives] = useState<PlacementDrive[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);

  // New Drive Form
  const [companyName, setCompanyName] = useState('');
  const [jobRole, setJobRole] = useState('');
  const [packageLpa, setPackageLpa] = useState<number>(12.0);
  const [minCgpa, setMinCgpa] = useState<number>(7.0);
  const [maxBacklogs, setMaxBacklogs] = useState<number>(0);
  const [eligibleDepts, setEligibleDepts] = useState<string[]>(['CSE', 'ECE', 'IT']);
  const [skillsRequired, setSkillsRequired] = useState('');
  const [deadline, setDeadline] = useState('');
  const [description, setDescription] = useState('');
  const [submitting, setSubmitting] = useState(false);

  // View Applicants state
  const [selectedDrive, setSelectedDrive] = useState<PlacementDrive | null>(null);

  const fetchDrives = async () => {
    try {
      setLoading(true);
      const res = await fetch('/api/placements', {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) setDrives(await res.json());
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (token) fetchDrives();
  }, [token]);

  const handleCreateDrive = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!companyName.trim() || !jobRole.trim() || !deadline) return;

    setSubmitting(true);
    try {
      const res = await fetch('/api/placements/create', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          company_name: companyName,
          job_role: jobRole,
          package_lpa: packageLpa,
          min_cgpa: minCgpa,
          max_backlogs: maxBacklogs,
          eligible_departments: eligibleDepts,
          graduation_year: 2026,
          skills_required: skillsRequired || 'Algorithms, System Design, Communication',
          selection_process: 'Online Test -> Technical Rounds -> HR Round',
          description: description || 'Campus recruitment drive.',
          application_deadline: deadline,
        }),
      });

      if (res.ok) {
        setShowCreateModal(false);
        setCompanyName('');
        setJobRole('');
        setDescription('');
        await fetchDrives();
      }
    } catch (err) {
      console.error(err);
    } finally {
      setSubmitting(false);
    }
  };

  const toggleDept = (dept: string) => {
    if (eligibleDepts.includes(dept)) {
      setEligibleDepts(eligibleDepts.filter((d) => d !== dept));
    } else {
      setEligibleDepts([...eligibleDepts, dept]);
    }
  };

  return (
    <div className="p-4 sm:p-6 lg:p-8 space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="bg-gradient-to-r from-slate-900 via-blue-950 to-indigo-950 text-white rounded-3xl p-6 shadow-md flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center space-x-4">
          <div className="w-12 h-12 rounded-2xl bg-amber-500/20 text-amber-300 border border-amber-400/30 flex items-center justify-center font-bold">
            <Briefcase className="w-6 h-6" />
          </div>
          <div>
            <h2 className="text-xl font-bold">Campus Placement & Corporate Relations Suite</h2>
            <p className="text-xs text-blue-200/80 mt-0.5">
              Manage corporate recruitment drives, automated eligibility filtering, and student hiring pipelines
            </p>
          </div>
        </div>

        <button
          onClick={() => setShowCreateModal(true)}
          className="px-4 py-2.5 bg-amber-500 hover:bg-amber-600 text-slate-950 rounded-xl font-bold text-xs flex items-center space-x-1.5 transition shadow-xs self-start md:self-auto"
        >
          <Plus className="w-4 h-4" />
          <span>Post New Placement Drive</span>
        </button>
      </div>

      {/* Drives Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
        {drives.map((d) => (
          <div
            key={d.id}
            className="bg-white rounded-3xl p-5 border border-slate-200/80 shadow-xs flex flex-col justify-between hover:shadow-md transition"
          >
            <div>
              <div className="flex items-start justify-between">
                <div className="flex items-center space-x-3">
                  <img
                    src={d.logo_url || 'https://images.unsplash.com/photo-1516321318423-f06f85e504b3?w=100'}
                    alt={d.company_name}
                    className="w-12 h-12 rounded-2xl object-cover border border-slate-200"
                  />
                  <div>
                    <h4 className="font-bold text-base text-slate-900 leading-tight">{d.job_role}</h4>
                    <p className="text-xs font-semibold text-blue-700">{d.company_name}</p>
                  </div>
                </div>
                <span className="text-sm font-extrabold text-emerald-600 bg-emerald-50 px-2.5 py-1 rounded-xl border border-emerald-200">
                  ₹{d.package_lpa} LPA
                </span>
              </div>

              <div className="mt-4 grid grid-cols-2 gap-2 text-xs text-slate-600 bg-slate-50 p-3 rounded-2xl border border-slate-100">
                <div>
                  <span className="text-slate-400 block font-medium">Min CGPA:</span>
                  <span className="font-bold text-slate-800">{d.min_cgpa} / 10.0</span>
                </div>
                <div>
                  <span className="text-slate-400 block font-medium">Max Backlogs:</span>
                  <span className="font-bold text-slate-800">{d.max_backlogs}</span>
                </div>
                <div>
                  <span className="text-slate-400 block font-medium">Graduation:</span>
                  <span className="font-bold text-slate-800">{d.graduation_year}</span>
                </div>
                <div>
                  <span className="text-slate-400 block font-medium">Total Applicants:</span>
                  <span className="font-bold text-blue-700">{d.applicant_count || 0}</span>
                </div>
              </div>

              <div className="mt-3 text-xs text-slate-600 line-clamp-2">
                {d.description}
              </div>

              <div className="mt-2 text-[11px] text-slate-400">
                Eligible Branches: <strong className="text-slate-700">{d.eligible_departments}</strong>
              </div>
            </div>

            <div className="mt-5 pt-3 border-t border-slate-100 flex items-center justify-between text-xs">
              <span className="text-slate-400 font-medium">Deadline: {d.application_deadline}</span>
              <span className="px-2.5 py-1 rounded-full font-bold uppercase text-[10px] bg-emerald-100 text-emerald-800">
                {d.status}
              </span>
            </div>
          </div>
        ))}
      </div>

      {/* Create Drive Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in">
          <div className="bg-white rounded-3xl shadow-2xl max-w-xl w-full p-6 border border-slate-200 overflow-y-auto max-h-[90vh]">
            <div className="flex justify-between items-center pb-3 border-b border-slate-100">
              <h3 className="font-bold text-base text-slate-900">Post New Campus Placement Drive</h3>
              <button onClick={() => setShowCreateModal(false)} className="text-slate-400 hover:text-slate-600">
                <XCircle className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateDrive} className="mt-4 space-y-4 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Company Name</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Adobe, Oracle, Nvidia"
                    value={companyName}
                    onChange={(e) => setCompanyName(e.target.value)}
                    className="w-full p-2.5 bg-slate-50 border border-slate-300 rounded-xl"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Job Role</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Software Engineer, SRE"
                    value={jobRole}
                    onChange={(e) => setJobRole(e.target.value)}
                    className="w-full p-2.5 bg-slate-50 border border-slate-300 rounded-xl"
                  />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Package (LPA)</label>
                  <input
                    type="number"
                    step="0.5"
                    value={packageLpa}
                    onChange={(e) => setPackageLpa(parseFloat(e.target.value))}
                    className="w-full p-2.5 bg-slate-50 border border-slate-300 rounded-xl"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Min CGPA</label>
                  <input
                    type="number"
                    step="0.1"
                    value={minCgpa}
                    onChange={(e) => setMinCgpa(parseFloat(e.target.value))}
                    className="w-full p-2.5 bg-slate-50 border border-slate-300 rounded-xl"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Max Backlogs</label>
                  <input
                    type="number"
                    value={maxBacklogs}
                    onChange={(e) => setMaxBacklogs(parseInt(e.target.value, 10))}
                    className="w-full p-2.5 bg-slate-50 border border-slate-300 rounded-xl"
                  />
                </div>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1.5">Eligible Departments</label>
                <div className="flex flex-wrap gap-2">
                  {['CSE', 'ECE', 'MECH', 'CIVIL', 'IT'].map((dept) => {
                    const isChecked = eligibleDepts.includes(dept);
                    return (
                      <button
                        key={dept}
                        type="button"
                        onClick={() => toggleDept(dept)}
                        className={`px-3 py-1 rounded-xl font-bold border transition ${
                          isChecked
                            ? 'bg-blue-600 text-white border-blue-600'
                            : 'bg-slate-50 text-slate-700 border-slate-200'
                        }`}
                      >
                        {dept}
                      </button>
                    );
                  })}
                </div>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Application Deadline</label>
                <input
                  type="date"
                  required
                  value={deadline}
                  onChange={(e) => setDeadline(e.target.value)}
                  className="w-full p-2.5 bg-slate-50 border border-slate-300 rounded-xl"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Job Description & Rounds</label>
                <textarea
                  rows={3}
                  placeholder="Outline eligibility criteria, selection process, and company details..."
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  className="w-full p-2.5 bg-slate-50 border border-slate-300 rounded-xl"
                ></textarea>
              </div>

              <div className="pt-2 flex justify-end space-x-2">
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className="px-4 py-2 text-slate-600 hover:bg-slate-100 rounded-xl"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-5 py-2.5 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white font-bold rounded-xl shadow-xs transition"
                >
                  {submitting ? 'Publishing...' : 'Publish Placement Drive'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
