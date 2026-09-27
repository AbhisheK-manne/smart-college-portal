import React, { useState, useEffect, useMemo } from 'react';
import {
  X,
  Search,
  Copy,
  Check,
  GraduationCap,
  Users,
  Shield,
  Briefcase,
  Key,
  ExternalLink,
  Info,
  CheckCircle2,
  Sparkles,
  ArrowRight,
  Filter
} from 'lucide-react';

export interface DirectoryStudent {
  roll_no: string;
  name: string;
  department_code: string;
  year?: number;
  semester?: number;
  section?: string;
  cgpa?: number | string;
  active_backlogs?: number;
  email?: string;
  password?: string;
}

export interface DirectoryFaculty {
  staff_id: string;
  name: string;
  department_code: string;
  designation: string;
  email?: string;
  phone?: string;
  password?: string;
  role?: string;
}

export interface DirectoryOfficer {
  identifier: string;
  name: string;
  role: string;
  designation: string;
  dept: string;
  email: string;
  password?: string;
}

interface Props {
  isOpen: boolean;
  onClose: () => void;
  onSelectAccount?: (identifier: string, password?: string) => void;
}

// Fallback seed lists so modal works instantly offline or before network response
const FALLBACK_STUDENTS: DirectoryStudent[] = [
  // CSE
  { roll_no: '22TKRECCSE001', name: 'Aarav Sharma', department_code: 'CSE', year: 3, semester: 6, cgpa: 8.85, active_backlogs: 0 },
  { roll_no: '22TKRECCSE002', name: 'Vivaan Verma', department_code: 'CSE', year: 3, semester: 6, cgpa: 6.20, active_backlogs: 2 },
  { roll_no: '22TKRECCSE003', name: 'Aditya Patel', department_code: 'CSE', year: 3, semester: 6, cgpa: 7.90, active_backlogs: 0 },
  { roll_no: '22TKRECCSE004', name: 'Vihaan Reddy', department_code: 'CSE', year: 3, semester: 6, cgpa: 8.15, active_backlogs: 0 },
  { roll_no: '22TKRECCSE005', name: 'Arjun Rao', department_code: 'CSE', year: 3, semester: 6, cgpa: 7.45, active_backlogs: 0 },
  { roll_no: '22TKRECCSE006', name: 'Sai Iyer', department_code: 'CSE', year: 3, semester: 6, cgpa: 8.50, active_backlogs: 0 },
  { roll_no: '22TKRECCSE007', name: 'Reyansh Menon', department_code: 'CSE', year: 3, semester: 6, cgpa: 6.80, active_backlogs: 1 },
  { roll_no: '22TKRECCSE008', name: 'Ayaan Nair', department_code: 'CSE', year: 3, semester: 6, cgpa: 7.95, active_backlogs: 0 },
  { roll_no: '22TKRECCSE009', name: 'Krishna Kulkarni', department_code: 'CSE', year: 3, semester: 6, cgpa: 8.30, active_backlogs: 0 },
  { roll_no: '22TKRECCSE010', name: 'Ishaan Deshmukh', department_code: 'CSE', year: 3, semester: 6, cgpa: 7.60, active_backlogs: 0 },
  { roll_no: '22TKRECCSE011', name: 'Diya Gupta', department_code: 'CSE', year: 3, semester: 6, cgpa: 8.75, active_backlogs: 0 },
  { roll_no: '22TKRECCSE012', name: 'Saanvi Singh', department_code: 'CSE', year: 3, semester: 6, cgpa: 8.10, active_backlogs: 0 },
  { roll_no: '22TKRECCSE013', name: 'Ananya Chatterjee', department_code: 'CSE', year: 3, semester: 6, cgpa: 7.35, active_backlogs: 0 },
  { roll_no: '22TKRECCSE014', name: 'Aadhya Bose', department_code: 'CSE', year: 3, semester: 6, cgpa: 6.90, active_backlogs: 1 },
  { roll_no: '22TKRECCSE015', name: 'Pari Pillai', department_code: 'CSE', year: 3, semester: 6, cgpa: 8.40, active_backlogs: 0 },
  { roll_no: '22TKRECCSE016', name: 'Anushka Sharma', department_code: 'CSE', year: 3, semester: 6, cgpa: 7.70, active_backlogs: 0 },
  { roll_no: '22TKRECCSE017', name: 'Navya Verma', department_code: 'CSE', year: 3, semester: 6, cgpa: 8.25, active_backlogs: 0 },
  { roll_no: '22TKRECCSE018', name: 'Sneha Patel', department_code: 'CSE', year: 3, semester: 6, cgpa: 7.55, active_backlogs: 0 },
  { roll_no: '22TKRECCSE019', name: 'Tanvi Reddy', department_code: 'CSE', year: 3, semester: 6, cgpa: 8.65, active_backlogs: 0 },
  { roll_no: '22TKRECCSE020', name: 'Rhea Rao', department_code: 'CSE', year: 3, semester: 6, cgpa: 7.80, active_backlogs: 0 },
  // ECE
  { roll_no: '22TKRECECE001', name: 'Sai Reddy', department_code: 'ECE', year: 3, semester: 6, cgpa: 8.40, active_backlogs: 0 },
  { roll_no: '22TKRECECE002', name: 'Reyansh Menon', department_code: 'ECE', year: 3, semester: 6, cgpa: 7.50, active_backlogs: 0 },
  { roll_no: '22TKRECECE003', name: 'Ayaan Nair', department_code: 'ECE', year: 3, semester: 6, cgpa: 8.20, active_backlogs: 0 },
  { roll_no: '22TKRECECE004', name: 'Krishna Kulkarni', department_code: 'ECE', year: 3, semester: 6, cgpa: 6.95, active_backlogs: 1 },
  { roll_no: '22TKRECECE005', name: 'Ishaan Deshmukh', department_code: 'ECE', year: 3, semester: 6, cgpa: 7.85, active_backlogs: 0 },
  // MECH
  { roll_no: '22TKRECMECH001', name: 'Arjun Rao', department_code: 'MECH', year: 3, semester: 6, cgpa: 7.80, active_backlogs: 0 },
  { roll_no: '22TKRECMECH002', name: 'Vihaan Reddy', department_code: 'MECH', year: 3, semester: 6, cgpa: 8.10, active_backlogs: 0 },
  { roll_no: '22TKRECMECH003', name: 'Aditya Patel', department_code: 'MECH', year: 3, semester: 6, cgpa: 6.70, active_backlogs: 1 },
  // CIVIL
  { roll_no: '22TKRECCIVIL001', name: 'Aarav Sharma', department_code: 'CIVIL', year: 3, semester: 6, cgpa: 8.15, active_backlogs: 0 },
  { roll_no: '22TKRECCIVIL002', name: 'Vivaan Verma', department_code: 'CIVIL', year: 3, semester: 6, cgpa: 7.40, active_backlogs: 0 },
  // IT
  { roll_no: '22TKRECIT001', name: 'Krishna Deshmukh', department_code: 'IT', year: 3, semester: 6, cgpa: 8.60, active_backlogs: 0 },
  { roll_no: '22TKRECIT002', name: 'Ishaan Gupta', department_code: 'IT', year: 3, semester: 6, cgpa: 7.90, active_backlogs: 0 },
];

const FALLBACK_FACULTY: DirectoryFaculty[] = [
  { staff_id: 'FAC-CSE-01', name: 'Dr. Ramesh Sharma', department_code: 'CSE', designation: 'Professor & HOD' },
  { staff_id: 'FAC-CSE-02', name: 'Dr. Priya Swaminathan', department_code: 'CSE', designation: 'Associate Professor & Scanner Officer' },
  { staff_id: 'FAC-CSE-03', name: 'Prof. Vikram Hegde', department_code: 'CSE', designation: 'Assistant Professor' },
  { staff_id: 'FAC-CSE-04', name: 'Prof. Ananya Sen', department_code: 'CSE', designation: 'Assistant Professor' },

  { staff_id: 'FAC-ECE-01', name: 'Dr. Sunita Verma', department_code: 'ECE', designation: 'Professor & HOD' },
  { staff_id: 'FAC-ECE-02', name: 'Dr. Suresh Nair', department_code: 'ECE', designation: 'Associate Professor' },
  { staff_id: 'FAC-ECE-03', name: 'Prof. Kavita Rao', department_code: 'ECE', designation: 'Assistant Professor' },
  { staff_id: 'FAC-ECE-04', name: 'Prof. Manoj Pillai', department_code: 'ECE', designation: 'Assistant Professor' },

  { staff_id: 'FAC-MECH-01', name: 'Dr. Anand Kulkarni', department_code: 'MECH', designation: 'Professor & HOD' },
  { staff_id: 'FAC-MECH-02', name: 'Dr. Balaji Iyengar', department_code: 'MECH', designation: 'Associate Professor' },
  { staff_id: 'FAC-MECH-03', name: 'Prof. Chetan Deshmukh', department_code: 'MECH', designation: 'Assistant Professor' },
  { staff_id: 'FAC-MECH-04', name: 'Prof. Deepa Joseph', department_code: 'MECH', designation: 'Assistant Professor' },

  { staff_id: 'FAC-CIVIL-01', name: 'Dr. Meera Nambiar', department_code: 'CIVIL', designation: 'Professor & HOD' },
  { staff_id: 'FAC-CIVIL-02', name: 'Dr. Eashwar Murthy', department_code: 'CIVIL', designation: 'Associate Professor' },
  { staff_id: 'FAC-CIVIL-03', name: 'Prof. Farhan Khan', department_code: 'CIVIL', designation: 'Assistant Professor' },
  { staff_id: 'FAC-CIVIL-04', name: 'Prof. Geetha Paul', department_code: 'CIVIL', designation: 'Assistant Professor' },

  { staff_id: 'FAC-IT-01', name: 'Dr. Rajesh Patel', department_code: 'IT', designation: 'Professor & HOD' },
  { staff_id: 'FAC-IT-02', name: 'Dr. Harini Krishnan', department_code: 'IT', designation: 'Associate Professor' },
  { staff_id: 'FAC-IT-03', name: 'Prof. Inderjit Singh', department_code: 'IT', designation: 'Assistant Professor' },
  { staff_id: 'FAC-IT-04', name: 'Prof. Jyoti Mishra', department_code: 'IT', designation: 'Assistant Professor' },
];

const FALLBACK_OFFICERS: DirectoryOfficer[] = [
  { identifier: 'admin', name: 'Dr. V. K. Ramaswamy', role: 'admin', designation: 'Principal & Super Admin', dept: 'Campus-wide', email: 'admin@tkrec.ac.in' },
  { identifier: 'hod_cse', name: 'Dr. Ramesh Sharma', role: 'hod', designation: 'HOD Computer Science & Engineering', dept: 'CSE', email: 'hod.cse@tkrec.ac.in' },
  { identifier: 'placement_head', name: 'Prof. Arvind Subramaniam', role: 'placement', designation: 'Director of Placements & Internships', dept: 'Campus-wide', email: 'placement@tkrec.ac.in' },
];

export const CredentialDirectoryModal: React.FC<Props> = ({ isOpen, onClose, onSelectAccount }) => {
  const [activeTab, setActiveTab] = useState<'students' | 'faculty' | 'formula'>('students');
  const [selectedDept, setSelectedDept] = useState<string>('ALL');
  const [searchQuery, setSearchQuery] = useState('');
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  const [students, setStudents] = useState<DirectoryStudent[]>(FALLBACK_STUDENTS);
  const [faculty, setFaculty] = useState<DirectoryFaculty[]>(FALLBACK_FACULTY);
  const [officers, setOfficers] = useState<DirectoryOfficer[]>(FALLBACK_OFFICERS);
  const [defaultPassword, setDefaultPassword] = useState('college123');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!isOpen) return;

    setLoading(true);
    fetch('/api/auth/directory')
      .then((res) => res.json())
      .then((data) => {
        if (data.students && data.students.length > 0) {
          setStudents(data.students);
        }
        if (data.faculty && data.faculty.length > 0) {
          setFaculty(data.faculty);
        }
        if (data.officers && data.officers.length > 0) {
          setOfficers(data.officers);
        }
        if (data.defaultPassword) {
          setDefaultPassword(data.defaultPassword);
        }
      })
      .catch((err) => {
        console.warn('Could not fetch directory from server, using built-in registry:', err);
      })
      .finally(() => {
        setLoading(false);
      });
  }, [isOpen]);

  const copyToClipboard = (text: string, key: string) => {
    navigator.clipboard.writeText(text);
    setCopiedKey(key);
    setTimeout(() => {
      setCopiedKey(null);
    }, 2000);
  };

  const filteredStudents = useMemo(() => {
    return students.filter((s) => {
      const matchDept = selectedDept === 'ALL' || s.department_code === selectedDept;
      if (!matchDept) return false;

      if (!searchQuery.trim()) return true;
      const q = searchQuery.toLowerCase().trim();
      return (
        s.roll_no.toLowerCase().includes(q) ||
        s.name.toLowerCase().includes(q) ||
        s.department_code.toLowerCase().includes(q)
      );
    });
  }, [students, selectedDept, searchQuery]);

  const filteredFaculty = useMemo(() => {
    return faculty.filter((f) => {
      const matchDept = selectedDept === 'ALL' || f.department_code === selectedDept;
      if (!matchDept) return false;

      if (!searchQuery.trim()) return true;
      const q = searchQuery.toLowerCase().trim();
      return (
        f.staff_id.toLowerCase().includes(q) ||
        f.name.toLowerCase().includes(q) ||
        f.department_code.toLowerCase().includes(q) ||
        f.designation.toLowerCase().includes(q)
      );
    });
  }, [faculty, selectedDept, searchQuery]);

  const filteredOfficers = useMemo(() => {
    if (!searchQuery.trim()) return officers;
    const q = searchQuery.toLowerCase().trim();
    return officers.filter(
      (o) =>
        o.identifier.toLowerCase().includes(q) ||
        o.name.toLowerCase().includes(q) ||
        o.role.toLowerCase().includes(q) ||
        o.designation.toLowerCase().includes(q)
    );
  }, [officers, searchQuery]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/80 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-white rounded-3xl shadow-2xl border border-slate-200 w-full max-w-4xl max-h-[90vh] flex flex-col overflow-hidden">
        {/* Header */}
        <div className="p-5 sm:p-6 bg-gradient-to-r from-slate-900 via-slate-800 to-indigo-950 text-white flex items-start justify-between relative shrink-0">
          <div className="space-y-1 pr-6">
            <div className="inline-flex items-center space-x-2 px-2.5 py-0.5 rounded-full bg-blue-500/20 border border-blue-400/30 text-blue-300 text-[11px] font-semibold">
              <Sparkles className="w-3 h-3" />
              <span>TKREC Autonomous Campus Portal Registry</span>
            </div>
            <h2 className="text-xl sm:text-2xl font-black tracking-tight text-white flex items-center space-x-2">
              <span>Student Roll Numbers & Faculty Logins</span>
            </h2>
            <p className="text-xs text-slate-300 leading-relaxed">
              Official institutional credentials for all students, professors, department heads, and portal administrators.
            </p>
          </div>

          <button
            onClick={onClose}
            className="p-2 rounded-xl bg-white/10 hover:bg-white/20 text-slate-300 hover:text-white transition shrink-0"
            title="Close Directory"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Universal Password Banner */}
        <div className="bg-amber-50 border-b border-amber-200 px-5 py-3 flex flex-wrap items-center justify-between gap-3 text-xs shrink-0">
          <div className="flex items-center space-x-2 text-amber-900">
            <Key className="w-4 h-4 text-amber-600 shrink-0" />
            <span>
              <strong>Universal Login Password</strong> for <em>all</em> students, faculty, and administrators:
            </span>
            <code className="px-2 py-0.5 bg-amber-100 border border-amber-300 rounded font-mono font-bold text-amber-950 text-xs">
              {defaultPassword}
            </code>
          </div>

          <div className="flex items-center space-x-2">
            <button
              onClick={() => copyToClipboard(defaultPassword, 'universal-pw')}
              className="inline-flex items-center space-x-1.5 px-3 py-1 bg-amber-200 hover:bg-amber-300 text-amber-900 rounded-lg font-semibold transition"
            >
              {copiedKey === 'universal-pw' ? (
                <>
                  <Check className="w-3.5 h-3.5 text-emerald-600" />
                  <span className="text-emerald-800">Copied!</span>
                </>
              ) : (
                <>
                  <Copy className="w-3.5 h-3.5 text-amber-800" />
                  <span>Copy Password</span>
                </>
              )}
            </button>
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="p-4 bg-slate-50 border-b border-slate-200 space-y-3 shrink-0">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="inline-flex bg-slate-200/80 p-1 rounded-2xl">
              <button
                type="button"
                onClick={() => setActiveTab('students')}
                className={`flex items-center space-x-2 px-3.5 py-1.5 rounded-xl text-xs font-bold transition ${
                  activeTab === 'students'
                    ? 'bg-blue-600 text-white shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <GraduationCap className="w-3.5 h-3.5" />
                <span>All Students ({students.length || 100})</span>
              </button>

              <button
                type="button"
                onClick={() => setActiveTab('faculty')}
                className={`flex items-center space-x-2 px-3.5 py-1.5 rounded-xl text-xs font-bold transition ${
                  activeTab === 'faculty'
                    ? 'bg-blue-600 text-white shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <Users className="w-3.5 h-3.5" />
                <span>Faculty & Staff ({faculty.length + officers.length})</span>
              </button>

              <button
                type="button"
                onClick={() => setActiveTab('formula')}
                className={`flex items-center space-x-2 px-3.5 py-1.5 rounded-xl text-xs font-bold transition ${
                  activeTab === 'formula'
                    ? 'bg-blue-600 text-white shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <Info className="w-3.5 h-3.5" />
                <span>Format Formula Guide</span>
              </button>
            </div>

            {/* Live Search Input */}
            {activeTab !== 'formula' && (
              <div className="relative flex-1 max-w-xs">
                <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                <input
                  type="text"
                  placeholder={activeTab === 'students' ? 'Search roll no or student name...' : 'Search staff ID, name, or role...'}
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-9 pr-3 py-1.5 bg-white border border-slate-300 rounded-xl text-xs text-slate-800 focus:outline-hidden focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600"
                />
                {searchQuery && (
                  <button
                    onClick={() => setSearchQuery('')}
                    className="absolute right-2.5 top-2 text-slate-400 hover:text-slate-600"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
            )}
          </div>

          {/* Department Filter Pills */}
          {activeTab !== 'formula' && (
            <div className="flex items-center space-x-1.5 overflow-x-auto text-[11px] font-semibold text-slate-500 pb-1">
              <span className="flex items-center space-x-1 text-slate-400 mr-1">
                <Filter className="w-3 h-3" />
                <span>Department:</span>
              </span>
              {['ALL', 'CSE', 'ECE', 'MECH', 'CIVIL', 'IT'].map((dept) => (
                <button
                  key={dept}
                  onClick={() => setSelectedDept(dept)}
                  className={`px-2.5 py-1 rounded-lg transition ${
                    selectedDept === dept
                      ? 'bg-blue-600 text-white font-bold'
                      : 'bg-white border border-slate-200 text-slate-700 hover:bg-slate-100'
                  }`}
                >
                  {dept}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Tab Content */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-4">
          {/* TAB 1: STUDENTS */}
          {activeTab === 'students' && (
            <div className="space-y-3">
              <div className="flex items-center justify-between text-xs text-slate-500 px-1">
                <span>
                  Showing <strong>{filteredStudents.length}</strong> of {students.length} registered students
                </span>
                <span className="text-[11px] text-slate-400">
                  Click <strong>&quot;Sign In&quot;</strong> to instantly login as that student
                </span>
              </div>

              {filteredStudents.length === 0 ? (
                <div className="p-8 text-center bg-slate-50 border border-dashed border-slate-300 rounded-2xl text-slate-500 text-xs">
                  No students matched your search criteria (&quot;{searchQuery}&quot;). Try searching by department or roll number format like &quot;22TKRECCSE001&quot;.
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {filteredStudents.map((s) => {
                    const isStandout = s.roll_no === '22TKRECCSE001';
                    const isAtRisk = s.roll_no === '22TKRECCSE002' || (s.active_backlogs && s.active_backlogs > 0);
                    return (
                      <div
                        key={s.roll_no}
                        className={`p-3.5 rounded-2xl border transition hover:shadow-md flex flex-col justify-between ${
                          isStandout
                            ? 'bg-emerald-50/40 border-emerald-300/70'
                            : isAtRisk
                            ? 'bg-amber-50/40 border-amber-300/70'
                            : 'bg-white border-slate-200'
                        }`}
                      >
                        <div className="flex items-start justify-between gap-2">
                          <div className="space-y-1">
                            <div className="flex items-center space-x-2">
                              <span className="font-mono font-bold text-xs sm:text-sm text-blue-900 bg-blue-50 px-2 py-0.5 rounded-md border border-blue-200">
                                {s.roll_no}
                              </span>
                              <button
                                onClick={() => copyToClipboard(s.roll_no, `roll-${s.roll_no}`)}
                                className="text-slate-400 hover:text-blue-600 transition"
                                title="Copy Roll Number"
                              >
                                {copiedKey === `roll-${s.roll_no}` ? (
                                  <Check className="w-3.5 h-3.5 text-emerald-600" />
                                ) : (
                                  <Copy className="w-3.5 h-3.5" />
                                )}
                              </button>
                              <span className="px-1.5 py-0.2 text-[10px] font-bold rounded bg-slate-100 text-slate-700">
                                {s.department_code}
                              </span>
                            </div>
                            <h4 className="font-bold text-slate-900 text-sm">{s.name}</h4>
                          </div>

                          {/* Quick login action */}
                          {onSelectAccount && (
                            <button
                              onClick={() => {
                                onSelectAccount(s.roll_no, defaultPassword);
                                onClose();
                              }}
                              className="px-2.5 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold shadow-xs flex items-center space-x-1 shrink-0 transition"
                            >
                              <span>Sign In</span>
                              <ArrowRight className="w-3 h-3" />
                            </button>
                          )}
                        </div>

                        {/* Student details pill footer */}
                        <div className="mt-3 pt-2 border-t border-slate-100 flex flex-wrap items-center justify-between gap-2 text-[11px] text-slate-600">
                          <div className="flex items-center space-x-2">
                            <span>CGPA: <strong>{s.cgpa || '8.00'}</strong></span>
                            <span>•</span>
                            <span>Sem {s.semester || 6}</span>
                            {s.active_backlogs !== undefined && (
                              <>
                                <span>•</span>
                                <span
                                  className={`px-1.5 py-0.2 rounded font-semibold ${
                                    s.active_backlogs > 0
                                      ? 'bg-amber-100 text-amber-800'
                                      : 'bg-emerald-100 text-emerald-800'
                                  }`}
                                >
                                  {s.active_backlogs > 0 ? `${s.active_backlogs} Backlog` : 'All Clear'}
                                </span>
                              </>
                            )}
                          </div>

                          <div className="flex items-center space-x-1 text-slate-400">
                            <span>PW:</span>
                            <code className="text-slate-700 font-mono font-semibold">{defaultPassword}</code>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {/* TAB 2: FACULTY & LEADERSHIP */}
          {activeTab === 'faculty' && (
            <div className="space-y-6">
              {/* Institutional Leadership */}
              <div className="space-y-3">
                <div className="flex items-center space-x-2 text-xs font-bold text-slate-700 uppercase tracking-wider">
                  <Shield className="w-4 h-4 text-purple-600" />
                  <span>Institutional Leadership & Academic Administration (3 Accounts)</span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  {filteredOfficers.map((o) => (
                    <div
                      key={o.identifier}
                      className="p-3.5 bg-purple-50/60 border border-purple-200 rounded-2xl flex flex-col justify-between"
                    >
                      <div className="space-y-1">
                        <div className="flex items-center justify-between">
                          <span className="font-mono font-bold text-xs text-purple-900 bg-purple-100 px-2 py-0.5 rounded border border-purple-300">
                            {o.identifier}
                          </span>
                          <button
                            onClick={() => copyToClipboard(o.identifier, `id-${o.identifier}`)}
                            className="text-slate-400 hover:text-purple-600"
                            title="Copy Username"
                          >
                            {copiedKey === `id-${o.identifier}` ? (
                              <Check className="w-3.5 h-3.5 text-emerald-600" />
                            ) : (
                              <Copy className="w-3.5 h-3.5" />
                            )}
                          </button>
                        </div>
                        <h4 className="font-bold text-slate-900 text-xs sm:text-sm mt-1">{o.name}</h4>
                        <p className="text-[11px] text-purple-800 font-medium">{o.designation}</p>
                      </div>

                      <div className="mt-3 pt-2 border-t border-purple-200/60 flex items-center justify-between text-xs">
                        <span className="text-[11px] text-slate-500 font-mono">PW: {defaultPassword}</span>
                        {onSelectAccount && (
                          <button
                            onClick={() => {
                              onSelectAccount(o.identifier, defaultPassword);
                              onClose();
                            }}
                            className="px-2.5 py-1 bg-purple-600 hover:bg-purple-700 text-white rounded-lg text-xs font-bold flex items-center space-x-1"
                          >
                            <span>Sign In</span>
                            <ArrowRight className="w-3 h-3" />
                          </button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Department Faculty Members */}
              <div className="space-y-3">
                <div className="flex items-center justify-between text-xs text-slate-700">
                  <span className="font-bold uppercase tracking-wider flex items-center space-x-2">
                    <Users className="w-4 h-4 text-emerald-600" />
                    <span>Faculty & Attendance Officers ({filteredFaculty.length} of 20 Members)</span>
                  </span>
                  <span className="text-slate-400">4 Professors per department</span>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {filteredFaculty.map((f) => {
                    const isScannerOfficer = f.staff_id === 'FAC-CSE-02';
                    return (
                      <div
                        key={f.staff_id}
                        className={`p-3.5 rounded-2xl border transition hover:shadow-md flex flex-col justify-between ${
                          isScannerOfficer
                            ? 'bg-emerald-50/50 border-emerald-300'
                            : 'bg-white border-slate-200'
                        }`}
                      >
                        <div className="flex items-start justify-between gap-2">
                          <div className="space-y-1">
                            <div className="flex items-center space-x-2">
                              <span className="font-mono font-bold text-xs sm:text-sm text-emerald-900 bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-200">
                                {f.staff_id}
                              </span>
                              <button
                                onClick={() => copyToClipboard(f.staff_id, `fac-${f.staff_id}`)}
                                className="text-slate-400 hover:text-emerald-600 transition"
                                title="Copy Staff ID"
                              >
                                {copiedKey === `fac-${f.staff_id}` ? (
                                  <Check className="w-3.5 h-3.5 text-emerald-600" />
                                ) : (
                                  <Copy className="w-3.5 h-3.5" />
                                )}
                              </button>
                              <span className="px-1.5 py-0.2 text-[10px] font-bold rounded bg-slate-100 text-slate-700">
                                {f.department_code}
                              </span>
                              {isScannerOfficer && (
                                <span className="px-1.5 py-0.2 text-[10px] font-bold rounded bg-emerald-100 text-emerald-800">
                                  Scanner Terminal Officer
                                </span>
                              )}
                            </div>
                            <h4 className="font-bold text-slate-900 text-sm">{f.name}</h4>
                            <p className="text-xs text-slate-600">{f.designation}</p>
                          </div>

                          {onSelectAccount && (
                            <button
                              onClick={() => {
                                onSelectAccount(f.staff_id, defaultPassword);
                                onClose();
                              }}
                              className="px-2.5 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold shadow-xs flex items-center space-x-1 shrink-0 transition"
                            >
                              <span>Sign In</span>
                              <ArrowRight className="w-3 h-3" />
                            </button>
                          )}
                        </div>

                        <div className="mt-3 pt-2 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-500">
                          <span>Department: {f.department_code}</span>
                          <div className="flex items-center space-x-1">
                            <span>PW:</span>
                            <code className="text-slate-700 font-mono font-semibold">{defaultPassword}</code>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          )}

          {/* TAB 3: FORMULA & CHEAT SHEET */}
          {activeTab === 'formula' && (
            <div className="space-y-6">
              <div className="p-4 bg-blue-50 border border-blue-200 rounded-2xl text-xs text-blue-900 space-y-2">
                <div className="flex items-center space-x-2 font-bold text-sm text-blue-950">
                  <CheckCircle2 className="w-4 h-4 text-blue-600" />
                  <span>TKREC Institutional ID & Roll Number Nomenclature</span>
                </div>
                <p>
                  Every student and faculty member in the database follows a standardized, predictable identifier format.
                  You can use any of these roll numbers or staff IDs directly in the login portal.
                </p>
              </div>

              {/* Student Roll Number Formula */}
              <div className="bg-white border border-slate-200 rounded-2xl p-5 space-y-4">
                <div className="flex items-center space-x-2">
                  <GraduationCap className="w-5 h-5 text-blue-600" />
                  <h3 className="font-bold text-slate-900 text-base">Student Roll Number Pattern (100 Students)</h3>
                </div>

                <div className="p-4 bg-slate-900 text-white rounded-xl font-mono text-sm space-y-1">
                  <div className="text-slate-400 text-xs">Standard Syntax:</div>
                  <div className="text-emerald-400 font-bold text-base sm:text-lg">
                    22TKREC + [DEPT] + [001 to 020]
                  </div>
                  <div className="text-slate-400 text-xs pt-1">
                    Password for all 100 students: <span className="text-amber-300 font-bold">college123</span>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 text-xs">
                  <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl space-y-1">
                    <span className="font-bold text-slate-800">Computer Science (CSE)</span>
                    <div className="font-mono text-blue-700 font-semibold">22TKRECCSE001 to 22TKRECCSE020</div>
                    <div className="text-[11px] text-slate-500">20 Students • 3rd Year Sem-6</div>
                  </div>

                  <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl space-y-1">
                    <span className="font-bold text-slate-800">Electronics & Comm. (ECE)</span>
                    <div className="font-mono text-blue-700 font-semibold">22TKRECECE001 to 22TKRECECE020</div>
                    <div className="text-[11px] text-slate-500">20 Students • 3rd Year Sem-6</div>
                  </div>

                  <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl space-y-1">
                    <span className="font-bold text-slate-800">Mechanical Eng. (MECH)</span>
                    <div className="font-mono text-blue-700 font-semibold">22TKRECMECH001 to 22TKRECMECH020</div>
                    <div className="text-[11px] text-slate-500">20 Students • 3rd Year Sem-6</div>
                  </div>

                  <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl space-y-1">
                    <span className="font-bold text-slate-800">Civil Engineering (CIVIL)</span>
                    <div className="font-mono text-blue-700 font-semibold">22TKRECCIVIL001 to 22TKRECCIVIL020</div>
                    <div className="text-[11px] text-slate-500">20 Students • 3rd Year Sem-6</div>
                  </div>

                  <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl space-y-1">
                    <span className="font-bold text-slate-800">Information Tech (IT)</span>
                    <div className="font-mono text-blue-700 font-semibold">22TKRECIT001 to 22TKRECIT020</div>
                    <div className="text-[11px] text-slate-500">20 Students • 3rd Year Sem-6</div>
                  </div>
                </div>
              </div>

              {/* Faculty Staff ID Formula */}
              <div className="bg-white border border-slate-200 rounded-2xl p-5 space-y-4">
                <div className="flex items-center space-x-2">
                  <Users className="w-5 h-5 text-emerald-600" />
                  <h3 className="font-bold text-slate-900 text-base">Faculty Staff ID Pattern (20 Members)</h3>
                </div>

                <div className="p-4 bg-slate-900 text-white rounded-xl font-mono text-sm space-y-1">
                  <div className="text-slate-400 text-xs">Standard Syntax:</div>
                  <div className="text-emerald-400 font-bold text-base sm:text-lg">
                    FAC-[DEPT]-[01 to 04]
                  </div>
                  <div className="text-slate-400 text-xs pt-1">
                    Password for all 20 faculty: <span className="text-amber-300 font-bold">college123</span>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 text-xs">
                  <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl space-y-1">
                    <span className="font-bold text-slate-800">CSE Faculty</span>
                    <div className="font-mono text-emerald-700 font-semibold">FAC-CSE-01 to FAC-CSE-04</div>
                    <div className="text-[11px] text-slate-500">FAC-CSE-02: Attendance Scanner Officer</div>
                  </div>

                  <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl space-y-1">
                    <span className="font-bold text-slate-800">ECE Faculty</span>
                    <div className="font-mono text-emerald-700 font-semibold">FAC-ECE-01 to FAC-ECE-04</div>
                    <div className="text-[11px] text-slate-500">4 Teaching Staff Members</div>
                  </div>

                  <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl space-y-1">
                    <span className="font-bold text-slate-800">MECH Faculty</span>
                    <div className="font-mono text-emerald-700 font-semibold">FAC-MECH-01 to FAC-MECH-04</div>
                    <div className="text-[11px] text-slate-500">4 Teaching Staff Members</div>
                  </div>

                  <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl space-y-1">
                    <span className="font-bold text-slate-800">CIVIL Faculty</span>
                    <div className="font-mono text-emerald-700 font-semibold">FAC-CIVIL-01 to FAC-CIVIL-04</div>
                    <div className="text-[11px] text-slate-500">4 Teaching Staff Members</div>
                  </div>

                  <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl space-y-1">
                    <span className="font-bold text-slate-800">IT Faculty</span>
                    <div className="font-mono text-emerald-700 font-semibold">FAC-IT-01 to FAC-IT-04</div>
                    <div className="text-[11px] text-slate-500">4 Teaching Staff Members</div>
                  </div>
                </div>
              </div>

              {/* Administrative Officers */}
              <div className="bg-white border border-slate-200 rounded-2xl p-5 space-y-3">
                <div className="flex items-center space-x-2">
                  <Shield className="w-5 h-5 text-purple-600" />
                  <h3 className="font-bold text-slate-900 text-base">Portal Administrators & Academic Deans</h3>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
                  <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl space-y-1">
                    <span className="font-bold text-slate-800">Super Admin / Principal</span>
                    <div className="font-mono text-purple-700 font-bold">admin</div>
                    <div className="text-[11px] text-slate-500">Password: college123</div>
                  </div>
                  <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl space-y-1">
                    <span className="font-bold text-slate-800">HOD Computer Science</span>
                    <div className="font-mono text-purple-700 font-bold">hod_cse</div>
                    <div className="text-[11px] text-slate-500">Password: college123</div>
                  </div>
                  <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl space-y-1">
                    <span className="font-bold text-slate-800">Placement Cell Director</span>
                    <div className="font-mono text-purple-700 font-bold">placement_head</div>
                    <div className="text-[11px] text-slate-500">Password: college123</div>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 bg-slate-50 border-t border-slate-200 flex flex-wrap items-center justify-between gap-3 text-xs shrink-0">
          <div className="flex items-center space-x-2 text-slate-500">
            <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
            <span>All accounts verified and active in embedded PostgreSQL database</span>
          </div>

          <button
            onClick={onClose}
            className="px-4 py-2 bg-slate-200 hover:bg-slate-300 text-slate-800 rounded-xl font-bold transition"
          >
            Close Directory
          </button>
        </div>
      </div>
    </div>
  );
};
