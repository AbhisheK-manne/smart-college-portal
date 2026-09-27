import React, { useState } from 'react';
import {
  GraduationCap,
  Users,
  Shield,
  Briefcase,
  Lock,
  User,
  ArrowRight,
  Sparkles,
  CheckCircle2,
  AlertCircle,
  Key,
  BookOpen,
  Copy,
  Check,
  Eye,
  EyeOff,
  Phone,
  Mail,
  MapPin,
  Calendar,
  Award,
  Bell,
  CheckCircle,
  ExternalLink,
  ChevronRight,
  FileText,
  Clock
} from 'lucide-react';
import { useAuth } from '../context/AuthContext.tsx';
import { UserRole } from '../types/index.ts';
import { CredentialDirectoryModal } from '../components/CredentialDirectoryModal.tsx';
import campusHeroImg from '../assets/images/tkrec_campus_hero_1790491846329.jpg';

export const LoginView: React.FC = () => {
  const { login, quickSwitch } = useAuth();

  // Student Login Form State
  const [studentRollNo, setStudentRollNo] = useState('22TKRECCSE001');
  const [studentPassword, setStudentPassword] = useState('college123');
  const [showStudentPw, setShowStudentPw] = useState(false);
  const [studentLoading, setStudentLoading] = useState(false);
  const [studentError, setStudentError] = useState<string | null>(null);

  // Staff / Faculty Login Form State
  const [staffId, setStaffId] = useState('FAC-CSE-02');
  const [staffPassword, setStaffPassword] = useState('college123');
  const [showStaffPw, setShowStaffPw] = useState(false);
  const [staffLoading, setStaffLoading] = useState(false);
  const [staffError, setStaffError] = useState<string | null>(null);

  // Directory Modal & Password Copy
  const [showDirectoryModal, setShowDirectoryModal] = useState(false);
  const [copiedUniversalPw, setCopiedUniversalPw] = useState(false);

  // Active home tab for mobile quick-scroll
  const [activeLoginTab, setActiveLoginTab] = useState<'both' | 'student' | 'staff'>('both');

  const copyPassword = (text: string = 'college123') => {
    navigator.clipboard.writeText(text);
    setCopiedUniversalPw(true);
    setTimeout(() => setCopiedUniversalPw(false), 2000);
  };

  const handleStudentSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!studentRollNo.trim()) {
      setStudentError('Please enter your Student Roll Number (e.g. 22TKRECCSE001).');
      return;
    }
    setStudentLoading(true);
    setStudentError(null);
    const success = await login(studentRollNo.trim(), studentPassword);
    if (!success) {
      setStudentError('Authentication failed. Check your Roll Number and Password (default: college123).');
    }
    setStudentLoading(false);
  };

  const handleStaffSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!staffId.trim()) {
      setStaffError('Please enter your Staff ID or Username (e.g. FAC-CSE-02, hod_cse, admin).');
      return;
    }
    setStaffLoading(true);
    setStaffError(null);
    const success = await login(staffId.trim(), staffPassword);
    if (!success) {
      setStaffError('Authentication failed. Check your Staff ID and Password (default: college123).');
    }
    setStaffLoading(false);
  };

  const handleSelectFromDirectory = async (selectedId: string, selectedPw = 'college123') => {
    if (selectedId.startsWith('FAC-') || selectedId.startsWith('hod_') || selectedId === 'admin' || selectedId === 'placement_head') {
      setStaffId(selectedId);
      setStaffPassword(selectedPw);
      setStaffLoading(true);
      await login(selectedId, selectedPw);
      setStaffLoading(false);
    } else {
      setStudentRollNo(selectedId);
      setStudentPassword(selectedPw);
      setStudentLoading(true);
      await login(selectedId, selectedPw);
      setStudentLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-900 text-slate-100 flex flex-col font-sans antialiased selection:bg-blue-600 selection:text-white">
      {/* Top Institutional Bar */}
      <div className="bg-slate-950 border-b border-slate-800 text-xs py-2 px-4 sm:px-8 text-slate-400">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between gap-2">
          <div className="flex flex-wrap items-center justify-center md:justify-start gap-x-4 gap-y-1 text-[11px] sm:text-xs">
            <span className="flex items-center text-amber-400 font-semibold">
              <Award className="w-3.5 h-3.5 mr-1 text-amber-400" />
              Autonomous Institution | Accredited NAAC 'A' Grade
            </span>
            <span className="hidden sm:inline text-slate-600">•</span>
            <span>Affiliated to JNTUH, Approved by AICTE</span>
            <span className="hidden sm:inline text-slate-600">•</span>
            <span className="font-mono text-slate-300">College Code: TKREC</span>
          </div>

          <div className="flex items-center space-x-4 text-[11px] sm:text-xs">
            <a href="tel:04065814555" className="flex items-center hover:text-blue-400 transition">
              <Phone className="w-3 h-3 mr-1 text-blue-400" />
              <span>040-65814555</span>
            </a>
            <span className="text-slate-700">|</span>
            <a href="mailto:admissions@tkrec.ac.in" className="flex items-center hover:text-blue-400 transition">
              <Mail className="w-3 h-3 mr-1 text-blue-400" />
              <span>info@tkrec.ac.in</span>
            </a>
          </div>
        </div>
      </div>

      {/* Main College Header & Navigation */}
      <header className="bg-slate-900/95 backdrop-blur-md border-b border-slate-800 sticky top-0 z-30 shadow-lg">
        <div className="max-w-7xl mx-auto px-4 sm:px-8 py-3.5 flex items-center justify-between">
          {/* Brand Logo & College Title */}
          <div className="flex items-center space-x-3.5">
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-blue-700 via-indigo-600 to-amber-500 p-0.5 shadow-md shrink-0">
              <div className="w-full h-full bg-slate-950 rounded-[14px] flex items-center justify-center text-amber-400 font-black">
                <GraduationCap className="w-6 h-6 text-blue-400" />
              </div>
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <span className="text-lg sm:text-xl font-black text-white tracking-tight leading-tight">
                  TKREC CAMPUS PORTAL
                </span>
                <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-amber-500/20 text-amber-300 border border-amber-500/30 uppercase tracking-wider hidden sm:inline-block">
                  Autonomous
                </span>
              </div>
              <p className="text-xs text-slate-400 hidden sm:block">
                Teegala Krishna Reddy Engineering College • Hyderabad
              </p>
            </div>
          </div>

          {/* Header Action CTAs */}
          <div className="flex items-center space-x-2 sm:space-x-3">
            <button
              type="button"
              onClick={() => setShowDirectoryModal(true)}
              className="px-3 py-2 bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-200 rounded-xl text-xs font-semibold flex items-center space-x-1.5 transition shadow-xs"
            >
              <Key className="w-3.5 h-3.5 text-amber-400" />
              <span className="hidden sm:inline">Roll Nos & Staff IDs</span>
              <span className="sm:hidden">Directory</span>
              <span className="px-1.5 py-0.2 bg-blue-500/20 text-blue-300 text-[10px] rounded font-mono font-bold">
                120+
              </span>
            </button>

            <a
              href="#login-section"
              className="px-3.5 py-2 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white rounded-xl text-xs font-bold transition shadow-md flex items-center space-x-1.5"
            >
              <span>Portals</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </a>
          </div>
        </div>
      </header>

      {/* Live Notice Ticker */}
      <div className="bg-gradient-to-r from-blue-950 via-slate-900 to-indigo-950 border-b border-blue-900/40 py-2 px-4 text-xs">
        <div className="max-w-7xl mx-auto flex items-center space-x-3 overflow-hidden">
          <div className="flex items-center space-x-1.5 px-2.5 py-0.5 rounded-full bg-blue-500/20 border border-blue-400/30 text-blue-300 font-bold uppercase tracking-wider text-[10px] shrink-0">
            <Bell className="w-3 h-3 text-blue-400 animate-pulse" />
            <span>Campus Notice</span>
          </div>
          <div className="text-slate-300 truncate text-[11px] sm:text-xs">
            <span className="text-amber-300 font-bold mr-2">Default Password for All Accounts:</span>
            <code className="bg-slate-800 text-amber-200 px-1.5 py-0.5 rounded font-mono font-bold border border-slate-700">
              college123
            </code>
            <span className="mx-3 text-slate-600">•</span>
            <span>B.Tech II, III & IV Year Regular Mid-Term Examinations Scheduled • RFID & QR Attendance Active</span>
          </div>
        </div>
      </div>

      {/* Hero Campus Showcase */}
      <section className="relative overflow-hidden border-b border-slate-800">
        <div className="absolute inset-0 z-0">
          <img
            src={campusHeroImg}
            alt="Teegala Krishna Reddy Engineering College Campus Building"
            className="w-full h-full object-cover object-center opacity-30 filter contrast-125 brightness-90"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-slate-900 via-slate-900/80 to-transparent"></div>
          <div className="absolute inset-0 bg-gradient-to-r from-slate-900 via-slate-900/70 to-slate-900/40"></div>
        </div>

        <div className="max-w-7xl mx-auto px-4 sm:px-8 py-10 sm:py-16 relative z-10">
          <div className="max-w-3xl space-y-4">
            <div className="inline-flex items-center space-x-2 px-3 py-1 rounded-full bg-blue-500/20 border border-blue-400/30 text-blue-300 text-xs font-semibold backdrop-blur-xs">
              <Sparkles className="w-3.5 h-3.5 text-amber-400" />
              <span>Official Institutional Gateway • Meerpet, Hyderabad</span>
            </div>

            <h1 className="text-3xl sm:text-5xl font-black text-white tracking-tight leading-tight">
              Teegala Krishna Reddy <br />
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-400 via-indigo-300 to-amber-300">
                Engineering College
              </span>
            </h1>

            <p className="text-sm sm:text-base text-slate-300 leading-relaxed font-normal max-w-2xl">
              Welcome to the official TKREC campus portal. Direct access for <strong>students</strong> to view attendance heatmaps, RFID digital identity cards, academic records, and placements, and for <strong>faculty & staff</strong> to manage attendance terminals and departmental governance.
            </p>

            {/* Quick credentials callout banner */}
            <div className="pt-2 flex flex-wrap items-center gap-3">
              <div className="bg-slate-900/90 border border-slate-700/80 rounded-xl px-3.5 py-2 flex items-center space-x-2 text-xs">
                <span className="text-slate-400">Universal Password:</span>
                <span className="font-mono font-bold text-amber-300 text-sm">college123</span>
                <button
                  type="button"
                  onClick={() => copyPassword('college123')}
                  className="p-1 hover:bg-slate-800 text-slate-400 hover:text-white rounded transition"
                  title="Copy password"
                >
                  {copiedUniversalPw ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                </button>
              </div>

              <button
                type="button"
                onClick={() => setShowDirectoryModal(true)}
                className="px-4 py-2 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 text-slate-950 font-bold rounded-xl text-xs flex items-center space-x-1.5 shadow-md transition"
              >
                <BookOpen className="w-3.5 h-3.5" />
                <span>Search 100 Students & 20 Faculty Roll Numbers</span>
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* CORE SECTION: STUDENT LOGIN AND STAFF LOGIN ON HOME PAGE */}
      <section id="login-section" className="py-10 sm:py-14 px-4 sm:px-8 max-w-7xl mx-auto w-full flex-1">
        <div className="text-center space-y-2 mb-8">
          <div className="inline-flex items-center space-x-1.5 px-3 py-1 rounded-full bg-slate-800 border border-slate-700 text-slate-300 text-xs font-semibold">
            <Lock className="w-3 h-3 text-blue-400" />
            <span>Select Your Campus Role to Sign In</span>
          </div>
          <h2 className="text-2xl sm:text-3xl font-extrabold text-white">
            Student Login & Staff Login
          </h2>
          <p className="text-xs sm:text-sm text-slate-400 max-w-xl mx-auto">
            Choose your portal below to sign in using your roll number or staff ID with default password <code className="text-amber-300 font-mono font-bold">college123</code>.
          </p>
        </div>

        {/* Dual Login Grid (Student Portal & Staff Portal Side-by-Side) */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-start">
          
          {/* ===================== CARD 1: STUDENT LOGIN ===================== */}
          <div className="bg-slate-800/90 backdrop-blur-md rounded-3xl border-2 border-blue-500/40 p-6 sm:p-8 shadow-2xl relative overflow-hidden transition hover:border-blue-500/70">
            {/* Top accent badge */}
            <div className="absolute top-0 right-0 bg-gradient-to-l from-blue-600 to-indigo-600 text-white text-[11px] font-bold px-4 py-1 rounded-bl-2xl uppercase tracking-wider shadow-xs">
              Student Portal
            </div>

            <div className="flex items-center space-x-3.5 mb-6">
              <div className="w-12 h-12 rounded-2xl bg-blue-600/20 border border-blue-500/30 text-blue-400 flex items-center justify-center shrink-0 shadow-inner">
                <GraduationCap className="w-7 h-7" />
              </div>
              <div>
                <h3 className="text-xl font-bold text-white flex items-center space-x-2">
                  <span>Student Login</span>
                </h3>
                <p className="text-xs text-blue-300">
                  Login with University Roll Number (100 Active Students)
                </p>
              </div>
            </div>

            {studentError && (
              <div className="mb-4 p-3 bg-rose-500/10 border border-rose-500/30 rounded-xl text-xs text-rose-300 flex items-center space-x-2">
                <AlertCircle className="w-4 h-4 shrink-0 text-rose-400" />
                <span>{studentError}</span>
              </div>
            )}

            <form onSubmit={handleStudentSubmit} className="space-y-4">
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="text-xs font-semibold text-slate-300 uppercase tracking-wider">
                    Student Roll Number
                  </label>
                  <button
                    type="button"
                    onClick={() => setShowDirectoryModal(true)}
                    className="text-[11px] text-blue-400 hover:text-blue-300 font-medium underline underline-offset-2"
                  >
                    Directory of 100 Roll Nos
                  </button>
                </div>

                <div className="relative">
                  <User className="w-4 h-4 text-slate-400 absolute left-3.5 top-3.5" />
                  <input
                    type="text"
                    required
                    value={studentRollNo}
                    onChange={(e) => setStudentRollNo(e.target.value)}
                    placeholder="e.g. 22TKRECCSE001"
                    className="w-full pl-10 pr-4 py-3 bg-slate-900 border border-slate-700 rounded-xl text-sm font-mono text-white placeholder-slate-500 focus:outline-hidden focus:ring-2 focus:ring-blue-500 focus:border-transparent transition"
                  />
                </div>

                {/* Quick Branch Roll Number Selector */}
                <div className="mt-2.5">
                  <div className="flex items-center justify-between text-[11px] text-slate-400 mb-1">
                    <span>Quick Fill by Department:</span>
                    <span className="text-[10px] text-slate-500">20 students per dept</span>
                  </div>
                  <div className="flex flex-wrap gap-1.5">
                    {[
                      { dept: 'CSE', roll: '22TKRECCSE001' },
                      { dept: 'ECE', roll: '22TKRECECE001' },
                      { dept: 'MECH', roll: '22TKRECMECH001' },
                      { dept: 'CIVIL', roll: '22TKRECCIVIL001' },
                      { dept: 'IT', roll: '22TKRECIT001' },
                    ].map((item) => (
                      <button
                        key={item.dept}
                        type="button"
                        onClick={() => setStudentRollNo(item.roll)}
                        className={`px-2.5 py-1 rounded-lg text-xs font-mono font-medium transition ${
                          studentRollNo === item.roll
                            ? 'bg-blue-600 text-white font-bold shadow-xs'
                            : 'bg-slate-900 hover:bg-slate-700 text-slate-300 border border-slate-700'
                        }`}
                      >
                        {item.dept} ({item.roll.slice(-3)})
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="text-xs font-semibold text-slate-300 uppercase tracking-wider">
                    Password
                  </label>
                  <div className="flex items-center space-x-1.5 text-[11px]">
                    <span className="text-slate-400">Default:</span>
                    <code className="bg-amber-400/20 text-amber-300 px-1.5 py-0.5 rounded font-mono font-bold border border-amber-400/30">
                      college123
                    </code>
                    <button
                      type="button"
                      onClick={() => setStudentPassword('college123')}
                      className="text-blue-400 hover:text-blue-300 font-semibold text-[11px] underline underline-offset-2 ml-1"
                    >
                      Fill
                    </button>
                  </div>
                </div>

                <div className="relative">
                  <Lock className="w-4 h-4 text-slate-400 absolute left-3.5 top-3.5" />
                  <input
                    type={showStudentPw ? 'text' : 'password'}
                    required
                    value={studentPassword}
                    onChange={(e) => setStudentPassword(e.target.value)}
                    className="w-full pl-10 pr-10 py-3 bg-slate-900 border border-slate-700 rounded-xl text-sm font-mono text-white focus:outline-hidden focus:ring-2 focus:ring-blue-500 focus:border-transparent transition"
                  />
                  <button
                    type="button"
                    onClick={() => setShowStudentPw(!showStudentPw)}
                    className="absolute right-3.5 top-3.5 text-slate-400 hover:text-slate-200"
                    title={showStudentPw ? 'Hide password' : 'Show password'}
                  >
                    {showStudentPw ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <button
                type="submit"
                disabled={studentLoading}
                className="w-full py-3.5 bg-gradient-to-r from-blue-600 via-indigo-600 to-blue-700 hover:from-blue-500 hover:to-indigo-600 disabled:opacity-50 text-white rounded-xl font-bold text-sm shadow-lg flex items-center justify-center space-x-2 transition cursor-pointer"
              >
                <span>{studentLoading ? 'Signing In...' : 'Sign In as Student'}</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </form>

            {/* Instant Student Demo Logins */}
            <div className="mt-6 pt-5 border-t border-slate-700/60 space-y-2.5">
              <div className="flex items-center justify-between text-[11px] font-bold uppercase tracking-wider text-slate-400">
                <span>Instant 1-Click Student Logins:</span>
                <span className="text-blue-400">No typing needed</span>
              </div>

              <div className="grid grid-cols-2 gap-2 text-xs">
                <button
                  type="button"
                  onClick={() => quickSwitch('student', '22TKRECCSE001')}
                  className="p-2.5 bg-slate-900/90 hover:bg-blue-900/30 border border-slate-700 hover:border-blue-500/50 rounded-xl text-left transition group"
                >
                  <div className="font-bold text-slate-200 group-hover:text-blue-300 truncate">
                    Aarav Sharma
                  </div>
                  <div className="text-[10px] text-emerald-400 flex items-center space-x-1 font-mono">
                    <span>95% Att • High CGPA</span>
                  </div>
                  <div className="text-[10px] text-slate-500 font-mono">22TKRECCSE001</div>
                </button>

                <button
                  type="button"
                  onClick={() => quickSwitch('student', '22TKRECCSE002')}
                  className="p-2.5 bg-slate-900/90 hover:bg-blue-900/30 border border-slate-700 hover:border-blue-500/50 rounded-xl text-left transition group"
                >
                  <div className="font-bold text-slate-200 group-hover:text-blue-300 truncate">
                    Vivaan Verma
                  </div>
                  <div className="text-[10px] text-rose-400 flex items-center space-x-1 font-mono">
                    <span>50% Att • Shortage Warning</span>
                  </div>
                  <div className="text-[10px] text-slate-500 font-mono">22TKRECCSE002</div>
                </button>
              </div>

              {/* Student Features Badge List */}
              <div className="pt-2 flex flex-wrap gap-2 text-[10px] text-slate-400">
                <span className="flex items-center">
                  <CheckCircle className="w-3 h-3 text-blue-400 mr-1" />
                  Attendance Heatmap
                </span>
                <span className="flex items-center">
                  <CheckCircle className="w-3 h-3 text-blue-400 mr-1" />
                  Digital RFID Card
                </span>
                <span className="flex items-center">
                  <CheckCircle className="w-3 h-3 text-blue-400 mr-1" />
                  Placements & Drives
                </span>
                <span className="flex items-center">
                  <CheckCircle className="w-3 h-3 text-blue-400 mr-1" />
                  AI Grievance Assistant
                </span>
              </div>
            </div>
          </div>

          {/* ===================== CARD 2: STAFF & FACULTY LOGIN ===================== */}
          <div className="bg-slate-800/90 backdrop-blur-md rounded-3xl border-2 border-emerald-500/40 p-6 sm:p-8 shadow-2xl relative overflow-hidden transition hover:border-emerald-500/70">
            {/* Top accent badge */}
            <div className="absolute top-0 right-0 bg-gradient-to-l from-emerald-600 to-teal-600 text-white text-[11px] font-bold px-4 py-1 rounded-bl-2xl uppercase tracking-wider shadow-xs">
              Faculty & Staff
            </div>

            <div className="flex items-center space-x-3.5 mb-6">
              <div className="w-12 h-12 rounded-2xl bg-emerald-600/20 border border-emerald-500/30 text-emerald-400 flex items-center justify-center shrink-0 shadow-inner">
                <Users className="w-7 h-7" />
              </div>
              <div>
                <h3 className="text-xl font-bold text-white flex items-center space-x-2">
                  <span>Staff & Faculty Login</span>
                </h3>
                <p className="text-xs text-emerald-300">
                  Login with Staff ID / HOD Username (20 Faculty + Officers)
                </p>
              </div>
            </div>

            {staffError && (
              <div className="mb-4 p-3 bg-rose-500/10 border border-rose-500/30 rounded-xl text-xs text-rose-300 flex items-center space-x-2">
                <AlertCircle className="w-4 h-4 shrink-0 text-rose-400" />
                <span>{staffError}</span>
              </div>
            )}

            <form onSubmit={handleStaffSubmit} className="space-y-4">
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="text-xs font-semibold text-slate-300 uppercase tracking-wider">
                    Staff ID / Username
                  </label>
                  <button
                    type="button"
                    onClick={() => setShowDirectoryModal(true)}
                    className="text-[11px] text-emerald-400 hover:text-emerald-300 font-medium underline underline-offset-2"
                  >
                    Directory of 20 Staff IDs
                  </button>
                </div>

                <div className="relative">
                  <User className="w-4 h-4 text-slate-400 absolute left-3.5 top-3.5" />
                  <input
                    type="text"
                    required
                    value={staffId}
                    onChange={(e) => setStaffId(e.target.value)}
                    placeholder="e.g. FAC-CSE-02, hod_cse, admin"
                    className="w-full pl-10 pr-4 py-3 bg-slate-900 border border-slate-700 rounded-xl text-sm font-mono text-white placeholder-slate-500 focus:outline-hidden focus:ring-2 focus:ring-emerald-500 focus:border-transparent transition"
                  />
                </div>

                {/* Quick Department Faculty Selector */}
                <div className="mt-2.5">
                  <div className="flex items-center justify-between text-[11px] text-slate-400 mb-1">
                    <span>Faculty by Department:</span>
                    <span className="text-[10px] text-slate-500">4 faculty per dept</span>
                  </div>
                  <div className="flex flex-wrap gap-1.5">
                    {[
                      { dept: 'CSE Prof', id: 'FAC-CSE-02' },
                      { dept: 'ECE Prof', id: 'FAC-ECE-02' },
                      { dept: 'MECH Prof', id: 'FAC-MECH-02' },
                      { dept: 'CIVIL Prof', id: 'FAC-CIVIL-02' },
                      { dept: 'IT Prof', id: 'FAC-IT-02' },
                    ].map((item) => (
                      <button
                        key={item.dept}
                        type="button"
                        onClick={() => setStaffId(item.id)}
                        className={`px-2.5 py-1 rounded-lg text-xs font-mono font-medium transition ${
                          staffId === item.id
                            ? 'bg-emerald-600 text-white font-bold shadow-xs'
                            : 'bg-slate-900 hover:bg-slate-700 text-slate-300 border border-slate-700'
                        }`}
                      >
                        {item.dept}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="text-xs font-semibold text-slate-300 uppercase tracking-wider">
                    Password
                  </label>
                  <div className="flex items-center space-x-1.5 text-[11px]">
                    <span className="text-slate-400">Default:</span>
                    <code className="bg-amber-400/20 text-amber-300 px-1.5 py-0.5 rounded font-mono font-bold border border-amber-400/30">
                      college123
                    </code>
                    <button
                      type="button"
                      onClick={() => setStaffPassword('college123')}
                      className="text-emerald-400 hover:text-emerald-300 font-semibold text-[11px] underline underline-offset-2 ml-1"
                    >
                      Fill
                    </button>
                  </div>
                </div>

                <div className="relative">
                  <Lock className="w-4 h-4 text-slate-400 absolute left-3.5 top-3.5" />
                  <input
                    type={showStaffPw ? 'text' : 'password'}
                    required
                    value={staffPassword}
                    onChange={(e) => setStaffPassword(e.target.value)}
                    className="w-full pl-10 pr-10 py-3 bg-slate-900 border border-slate-700 rounded-xl text-sm font-mono text-white focus:outline-hidden focus:ring-2 focus:ring-emerald-500 focus:border-transparent transition"
                  />
                  <button
                    type="button"
                    onClick={() => setShowStaffPw(!showStaffPw)}
                    className="absolute right-3.5 top-3.5 text-slate-400 hover:text-slate-200"
                    title={showStaffPw ? 'Hide password' : 'Show password'}
                  >
                    {showStaffPw ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <button
                type="submit"
                disabled={staffLoading}
                className="w-full py-3.5 bg-gradient-to-r from-emerald-600 via-teal-600 to-emerald-700 hover:from-emerald-500 hover:to-teal-600 disabled:opacity-50 text-white rounded-xl font-bold text-sm shadow-lg flex items-center justify-center space-x-2 transition cursor-pointer"
              >
                <span>{staffLoading ? 'Signing In...' : 'Sign In as Faculty / Staff'}</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </form>

            {/* Instant Staff Demo Logins */}
            <div className="mt-6 pt-5 border-t border-slate-700/60 space-y-2.5">
              <div className="flex items-center justify-between text-[11px] font-bold uppercase tracking-wider text-slate-400">
                <span>Instant 1-Click Staff Roles:</span>
                <span className="text-emerald-400">Direct Terminal Access</span>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
                <button
                  type="button"
                  onClick={() => quickSwitch('faculty', 'FAC-CSE-02')}
                  className="p-2 bg-slate-900/90 hover:bg-emerald-900/30 border border-slate-700 hover:border-emerald-500/50 rounded-xl text-left transition group"
                >
                  <div className="font-bold text-slate-200 group-hover:text-emerald-300 truncate">
                    Faculty Scanner
                  </div>
                  <div className="text-[10px] text-slate-500 font-mono">FAC-CSE-02</div>
                </button>

                <button
                  type="button"
                  onClick={() => quickSwitch('hod', 'hod_cse')}
                  className="p-2 bg-slate-900/90 hover:bg-purple-900/30 border border-slate-700 hover:border-purple-500/50 rounded-xl text-left transition group"
                >
                  <div className="font-bold text-slate-200 group-hover:text-purple-300 truncate">
                    HOD CSE
                  </div>
                  <div className="text-[10px] text-slate-500 font-mono">hod_cse</div>
                </button>

                <button
                  type="button"
                  onClick={() => quickSwitch('placement', 'placement_head')}
                  className="p-2 bg-slate-900/90 hover:bg-amber-900/30 border border-slate-700 hover:border-amber-500/50 rounded-xl text-left transition group"
                >
                  <div className="font-bold text-slate-200 group-hover:text-amber-300 truncate">
                    Placement Cell
                  </div>
                  <div className="text-[10px] text-slate-500 font-mono">placement_head</div>
                </button>

                <button
                  type="button"
                  onClick={() => quickSwitch('admin', 'admin')}
                  className="p-2 bg-slate-900/90 hover:bg-rose-900/30 border border-slate-700 hover:border-rose-500/50 rounded-xl text-left transition group"
                >
                  <div className="font-bold text-slate-200 group-hover:text-rose-300 truncate">
                    Super Admin
                  </div>
                  <div className="text-[10px] text-slate-500 font-mono">admin</div>
                </button>
              </div>

              {/* Staff Features Badge List */}
              <div className="pt-2 flex flex-wrap gap-2 text-[10px] text-slate-400">
                <span className="flex items-center">
                  <CheckCircle className="w-3 h-3 text-emerald-400 mr-1" />
                  RFID & Camera Scanner Terminal
                </span>
                <span className="flex items-center">
                  <CheckCircle className="w-3 h-3 text-emerald-400 mr-1" />
                  Live Attendance Sync
                </span>
                <span className="flex items-center">
                  <CheckCircle className="w-3 h-3 text-emerald-400 mr-1" />
                  Grievance Triage
                </span>
                <span className="flex items-center">
                  <CheckCircle className="w-3 h-3 text-emerald-400 mr-1" />
                  Official Circulars
                </span>
              </div>
            </div>
          </div>

        </div>

        {/* Universal Roll Number & Password Directory Banner */}
        <div className="mt-10 bg-gradient-to-r from-blue-900/40 via-indigo-900/40 to-purple-900/40 border border-blue-500/30 rounded-3xl p-6 sm:p-8 flex flex-col md:flex-row items-center justify-between gap-6 shadow-xl">
          <div className="flex items-center space-x-4">
            <div className="w-14 h-14 rounded-2xl bg-blue-500/20 border border-blue-400/30 flex items-center justify-center text-blue-300 shrink-0">
              <Key className="w-7 h-7 text-amber-400" />
            </div>
            <div>
              <h4 className="text-base sm:text-lg font-bold text-white flex items-center space-x-2">
                <span>Looking for all Student Roll Numbers and Faculty Passwords?</span>
              </h4>
              <p className="text-xs sm:text-sm text-slate-300 mt-1">
                Complete database directory: 100 B.Tech students across 5 engineering branches (CSE, ECE, MECH, CIVIL, IT) and 20 faculty staff members. Universal password: <strong className="text-amber-300 font-mono">college123</strong>.
              </p>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row items-center gap-3 shrink-0 w-full md:w-auto">
            <button
              type="button"
              onClick={() => copyPassword('college123')}
              className="w-full sm:w-auto px-4 py-2.5 bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-200 rounded-xl text-xs font-semibold flex items-center justify-center space-x-2 transition"
            >
              {copiedUniversalPw ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4 text-slate-400" />}
              <span>Copy Password (college123)</span>
            </button>

            <button
              type="button"
              onClick={() => setShowDirectoryModal(true)}
              className="w-full sm:w-auto px-5 py-2.5 bg-gradient-to-r from-blue-600 via-indigo-600 to-amber-500 hover:from-blue-500 hover:to-amber-400 text-white rounded-xl text-xs font-bold shadow-md flex items-center justify-center space-x-2 transition"
            >
              <BookOpen className="w-4 h-4" />
              <span>Browse All 123 Accounts</span>
            </button>
          </div>
        </div>

        {/* Academic Departments Quick Overview */}
        <div className="mt-14 space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-lg font-bold text-white">Engineering Departments at TKREC</h3>
              <p className="text-xs text-slate-400">Autonomous curriculum affiliated to Jawaharlal Nehru Technological University Hyderabad (JNTUH)</p>
            </div>
            <span className="text-xs text-blue-400 font-medium hidden sm:inline-block">5 Core Branches</span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
            {[
              {
                code: 'CSE',
                name: 'Computer Science & Engineering',
                students: '20 Students (Roll: 001-020)',
                faculty: '4 Faculty Members',
                sample: '22TKRECCSE001',
              },
              {
                code: 'ECE',
                name: 'Electronics & Communication',
                students: '20 Students (Roll: 001-020)',
                faculty: '4 Faculty Members',
                sample: '22TKRECECE001',
              },
              {
                code: 'MECH',
                name: 'Mechanical Engineering',
                students: '20 Students (Roll: 001-020)',
                faculty: '4 Faculty Members',
                sample: '22TKRECMECH001',
              },
              {
                code: 'CIVIL',
                name: 'Civil Engineering',
                students: '20 Students (Roll: 001-020)',
                faculty: '4 Faculty Members',
                sample: '22TKRECCIVIL001',
              },
              {
                code: 'IT',
                name: 'Information Technology',
                students: '20 Students (Roll: 001-020)',
                faculty: '4 Faculty Members',
                sample: '22TKRECIT001',
              },
            ].map((dept) => (
              <div
                key={dept.code}
                className="bg-slate-800/60 border border-slate-700/80 rounded-2xl p-4 space-y-2 hover:border-slate-600 transition"
              >
                <div className="flex items-center justify-between">
                  <span className="text-sm font-black text-amber-400">{dept.code}</span>
                  <span className="text-[10px] text-slate-500 font-mono">B.Tech</span>
                </div>
                <h5 className="text-xs font-semibold text-slate-200 line-clamp-1">{dept.name}</h5>
                <div className="text-[11px] text-slate-400 space-y-0.5 pt-1 border-t border-slate-700/50">
                  <p>{dept.students}</p>
                  <p>{dept.faculty}</p>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setStudentRollNo(dept.sample);
                    const el = document.getElementById('login-section');
                    el?.scrollIntoView({ behavior: 'smooth' });
                  }}
                  className="w-full mt-2 py-1.5 bg-slate-900 hover:bg-slate-700 text-blue-300 text-[11px] font-mono rounded-lg transition"
                >
                  Use {dept.sample}
                </button>
              </div>
            ))}
          </div>
        </div>

        {/* Campus Facilities & Digital Services */}
        <div className="mt-14 grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="bg-slate-800/40 border border-slate-800 rounded-2xl p-5 space-y-2">
            <div className="w-9 h-9 rounded-xl bg-blue-500/10 text-blue-400 flex items-center justify-center">
              <Calendar className="w-5 h-5" />
            </div>
            <h4 className="text-sm font-bold text-white">Visual Attendance Heatmap</h4>
            <p className="text-xs text-slate-400">
              Color-coded daily attendance tracking with automated 75% condonation and detention warnings in real-time.
            </p>
          </div>

          <div className="bg-slate-800/40 border border-slate-800 rounded-2xl p-5 space-y-2">
            <div className="w-9 h-9 rounded-xl bg-emerald-500/10 text-emerald-400 flex items-center justify-center">
              <Users className="w-5 h-5" />
            </div>
            <h4 className="text-sm font-bold text-white">Faculty Attendance Terminal</h4>
            <p className="text-xs text-slate-400">
              Camera QR code scanner and RFID badge keyboard terminal for instant, error-free classroom check-ins.
            </p>
          </div>

          <div className="bg-slate-800/40 border border-slate-800 rounded-2xl p-5 space-y-2">
            <div className="w-9 h-9 rounded-xl bg-purple-500/10 text-purple-400 flex items-center justify-center">
              <Briefcase className="w-5 h-5" />
            </div>
            <h4 className="text-sm font-bold text-white">Placement & Training Cell</h4>
            <p className="text-xs text-slate-400">
              Eligibility filtering for top recruiters (TCS, Infosys, Wipro, Cognizant) with one-click drive registration.
            </p>
          </div>
        </div>
      </section>

      {/* College Footer */}
      <footer className="bg-slate-950 border-t border-slate-800 py-10 px-4 sm:px-8 mt-auto text-xs text-slate-400">
        <div className="max-w-7xl mx-auto grid grid-cols-1 md:grid-cols-4 gap-8 mb-8">
          <div className="space-y-3">
            <div className="flex items-center space-x-2">
              <div className="w-7 h-7 rounded-lg bg-blue-600 flex items-center justify-center text-white font-bold text-xs">
                T
              </div>
              <span className="font-bold text-sm text-white">TKREC Hyderabad</span>
            </div>
            <p className="text-slate-400 text-xs leading-relaxed">
              Teegala Krishna Reddy Engineering College is an autonomous institution established to provide world-class engineering education and research.
            </p>
            <div className="text-[11px] text-amber-400 font-medium">
              EAMCET / ECET / ICET Code: TKRE
            </div>
          </div>

          <div className="space-y-2">
            <h5 className="font-bold text-white text-xs uppercase tracking-wider">Campus Address</h5>
            <div className="space-y-1.5 text-slate-400">
              <p className="flex items-start">
                <MapPin className="w-3.5 h-3.5 mr-1.5 text-slate-500 shrink-0 mt-0.5" />
                <span>Medbowli, Meerpet, Saroornagar, Hyderabad, Telangana - 500097</span>
              </p>
              <p className="flex items-center">
                <Phone className="w-3.5 h-3.5 mr-1.5 text-slate-500 shrink-0" />
                <span>040-65814555, 9849012345</span>
              </p>
              <p className="flex items-center">
                <Mail className="w-3.5 h-3.5 mr-1.5 text-slate-500 shrink-0" />
                <span>info@tkrec.ac.in</span>
              </p>
            </div>
          </div>

          <div className="space-y-2">
            <h5 className="font-bold text-white text-xs uppercase tracking-wider">Quick Portals</h5>
            <ul className="space-y-1.5">
              <li>
                <a href="#login-section" className="hover:text-blue-400 transition">
                  • Student Portal Login (Roll No)
                </a>
              </li>
              <li>
                <a href="#login-section" className="hover:text-blue-400 transition">
                  • Faculty & Staff Login (Staff ID)
                </a>
              </li>
              <li>
                <button
                  type="button"
                  onClick={() => setShowDirectoryModal(true)}
                  className="hover:text-amber-400 transition text-left"
                >
                  • Credential Directory (100 Roll Nos)
                </button>
              </li>
              <li>
                <a href="#login-section" className="hover:text-blue-400 transition">
                  • Examination Branch & Results
                </a>
              </li>
              <li>
                <a href="#login-section" className="hover:text-blue-400 transition">
                  • Placement Cell & Recruitment
                </a>
              </li>
            </ul>
          </div>

          <div className="space-y-2">
            <h5 className="font-bold text-white text-xs uppercase tracking-wider">Account Access Guide</h5>
            <div className="bg-slate-900 p-3 rounded-xl border border-slate-800 space-y-1 text-[11px]">
              <p className="text-slate-300">
                <strong>Student Format:</strong> <code className="text-blue-300 font-mono">22TKREC[DEPT][001-020]</code>
              </p>
              <p className="text-slate-300">
                <strong>Faculty Format:</strong> <code className="text-emerald-300 font-mono">FAC-[DEPT]-[01-04]</code>
              </p>
              <p className="text-amber-300 pt-1 border-t border-slate-800">
                <strong>Password:</strong> <code className="font-mono">college123</code>
              </p>
            </div>
          </div>
        </div>

        <div className="border-t border-slate-900 pt-6 text-center text-slate-500 text-[11px]">
          © {new Date().getFullYear()} Teegala Krishna Reddy Engineering College (TKREC). All Rights Reserved. • Affiliated to JNTUH & Approved by AICTE.
        </div>
      </footer>

      {/* Credential & Roll Number Directory Modal */}
      <CredentialDirectoryModal
        isOpen={showDirectoryModal}
        onClose={() => setShowDirectoryModal(false)}
        onSelectAccount={handleSelectFromDirectory}
      />
    </div>
  );
};
