import React, { useState, useEffect, useMemo } from 'react';
import {
  QrCode,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  Users,
  Clock,
  Play,
  Check,
  ShieldAlert,
  Camera,
  RotateCcw,
  Sparkles,
  Search,
  FileSpreadsheet,
  FileText,
  Zap,
  CheckCheck,
  UserX,
  UserCheck,
  Send,
  SlidersHorizontal,
  ChevronRight,
  Info
} from 'lucide-react';
import { useAuth } from '../context/AuthContext.tsx';
import { AttendanceSession, RosterStudent } from '../types/index.ts';

export const FacultyAttendanceScanner: React.FC = () => {
  const { token, user } = useAuth();

  // Session configuration states
  const [subjects, setSubjects] = useState<any[]>([]);
  const [selectedSubject, setSelectedSubject] = useState('CS601');
  const [selectedSection, setSelectedSection] = useState('A');
  const [selectedSemester, setSelectedSemester] = useState(6);
  const [selectedTimeSlot, setSelectedTimeSlot] = useState('09:00 AM - 10:00 AM');

  // Active Session states
  const [activeSession, setActiveSession] = useState<AttendanceSession | null>(null);
  const [roster, setRoster] = useState<RosterStudent[]>([]);
  const [loading, setLoading] = useState(false);
  const [scannedResult, setScannedResult] = useState<any>(null);
  const [duplicateAlert, setDuplicateAlert] = useState<any>(null);
  const [fraudAlert, setFraudAlert] = useState<string | null>(null);

  // Scanner Mode: 'present' (Default) vs 'absent' (Scanner Absent Mode)
  const [scannerMode, setScannerMode] = useState<'present' | 'absent'>('present');

  // Left panel view tab: 'scanner' (Live Camera/Terminal) or 'paper' (Write in Paper Absentee Slip)
  const [activeTerminalTab, setActiveTerminalTab] = useState<'scanner' | 'paper'>('scanner');

  // "Write in Paper" states
  const [paperNotes, setPaperNotes] = useState('');
  const [selectedQuickPaperRolls, setSelectedQuickPaperRolls] = useState<string[]>([]);
  const [paperFeedback, setPaperFeedback] = useState<{ type: 'success' | 'error'; message: string; count?: number } | null>(null);
  const [paperLoading, setPaperLoading] = useState(false);

  // Class Roster List multi-selection & smart list process
  const [selectedRosterRolls, setSelectedRosterRolls] = useState<string[]>([]);
  const [smartFeedback, setSmartFeedback] = useState<{ type: 'success' | 'info'; message: string } | null>(null);

  // Manual input / token simulation
  const [manualInput, setManualInput] = useState('');
  const [searchRoster, setSearchRoster] = useState('');
  const [filterRosterStatus, setFilterRosterStatus] = useState<'all' | 'present' | 'absent' | 'unmarked'>('all');
  const [smartProcessLoading, setSmartProcessLoading] = useState(false);
  const [auditLogs, setAuditLogs] = useState<any[]>([]);
  const [showAuditLogs, setShowAuditLogs] = useState(false);

  // Load available subjects
  useEffect(() => {
    if (token) {
      fetch('/api/attendance/faculty-subjects', {
        headers: { Authorization: `Bearer ${token}` },
      })
        .then((r) => r.json())
        .then((data) => {
          if (Array.isArray(data)) {
            setSubjects(data);
            if (data.length > 0) setSelectedSubject(data[0].code);
          }
        });
      loadAuditLogs();
    }
  }, [token]);

  const loadAuditLogs = async () => {
    try {
      const res = await fetch('/api/attendance/audit-logs', {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) setAuditLogs(await res.json());
    } catch (err) {
      console.error(err);
    }
  };

  // Start new attendance session
  const handleStartSession = async () => {
    try {
      setLoading(true);
      setScannedResult(null);
      setDuplicateAlert(null);
      setFraudAlert(null);
      setPaperFeedback(null);
      setPaperNotes('');
      setSelectedQuickPaperRolls([]);

      const res = await fetch('/api/attendance/start-session', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          subject_code: selectedSubject,
          section: selectedSection,
          semester: selectedSemester,
          time_slot: selectedTimeSlot,
        }),
      });

      if (!res.ok) {
        const err = await res.json();
        alert(err.error || 'Failed to start session');
        return;
      }

      const session = await res.json();
      setActiveSession(session);
      await fetchSessionRoster(session.id);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  // Fetch session roster
  const fetchSessionRoster = async (sessionId: number) => {
    try {
      const res = await fetch(`/api/attendance/session/${sessionId}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const data = await res.json();
        setRoster(data.roster || []);
        setActiveSession(data.session);
      }
    } catch (err) {
      console.error(err);
    }
  };

  // Scan QR Code or Roll Number (supports both Present and Scanner Absent mode)
  const handleProcessScan = async (studentIdentifierOrToken: string, modeOverride?: 'present' | 'absent') => {
    if (!activeSession) return;

    setScannedResult(null);
    setDuplicateAlert(null);
    setFraudAlert(null);

    const effectiveMode = modeOverride || scannerMode;

    try {
      const isToken = studentIdentifierOrToken.includes('-SECURE-QR');
      const body = {
        session_id: activeSession.id,
        qr_code_token: isToken ? studentIdentifierOrToken : undefined,
        roll_no: !isToken ? studentIdentifierOrToken : undefined,
        device_session_id: effectiveMode === 'absent' ? 'FACULTY-SCANNER-ABSENT-01' : 'FACULTY-WEB-TERMINAL-01',
        scan_action: effectiveMode,
      };

      const res = await fetch('/api/attendance/scan', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(body),
      });

      const data = await res.json();

      // Duplicate Scan Alert
      if (res.status === 409) {
        setDuplicateAlert(data);
        return;
      }

      // Enrollment Mismatch or Invalid ID Alert
      if (!res.ok) {
        setFraudAlert(data.error || 'Attendance verification failed');
        return;
      }

      // Success
      setScannedResult({
        ...data.student,
        status: effectiveMode,
        timestamp: new Date().toLocaleTimeString(),
        message: data.message
      });
      setManualInput('');
      await fetchSessionRoster(activeSession.id);
      loadAuditLogs();
    } catch (err: any) {
      setFraudAlert(err.message || 'Network error scanning attendance');
    }
  };

  // Live Identified Students from "Write in Paper" Input
  const identifiedPaperStudents = useMemo(() => {
    if (!roster || roster.length === 0) return [];

    const tokens = new Set<string>();

    // From typed paper notes
    if (paperNotes.trim()) {
      const parts = paperNotes.split(/[\s,;:\n\r]+/);
      parts.forEach((p) => {
        const clean = p.trim().toUpperCase();
        if (clean) tokens.add(clean);
      });
    }

    // From quick paper number chips
    selectedQuickPaperRolls.forEach((r) => tokens.add(r.toUpperCase()));

    const matched: RosterStudent[] = [];
    const matchedRolls = new Set<string>();

    tokens.forEach((t) => {
      // 1. Direct roll match
      const exact = roster.find((s) => s.roll_no.toUpperCase() === t || s.roll_no.toUpperCase().replace('22TKREC', '22APEX') === t);
      if (exact && !matchedRolls.has(exact.roll_no)) {
        matchedRolls.add(exact.roll_no);
        matched.push(exact);
        return;
      }

      // 2. Short number written on paper (e.g. "2" or "02" or "18")
      if (/^\d{1,3}$/.test(t)) {
        const padded = t.padStart(3, '0');
        const found = roster.find((s) => s.roll_no.endsWith(padded));
        if (found && !matchedRolls.has(found.roll_no)) {
          matchedRolls.add(found.roll_no);
          matched.push(found);
          return;
        }
      }

      // 3. Partial name or roll match
      const partial = roster.find(
        (s) => s.roll_no.toUpperCase().includes(t) || s.name.toUpperCase().includes(t)
      );
      if (partial && !matchedRolls.has(partial.roll_no)) {
        matchedRolls.add(partial.roll_no);
        matched.push(partial);
      }
    });

    return matched;
  }, [paperNotes, selectedQuickPaperRolls, roster]);

  // Handle "Write in Paper" direct absent insertion
  const handlePaperAbsentInsert = async () => {
    if (!activeSession) return;
    if (identifiedPaperStudents.length === 0 && !paperNotes.trim()) {
      setPaperFeedback({ type: 'error', message: 'Please enter roll numbers or click numbers from the paper sheet.' });
      return;
    }

    try {
      setPaperLoading(true);
      setPaperFeedback(null);

      const rollList = identifiedPaperStudents.map((s) => s.roll_no);

      const res = await fetch('/api/attendance/paper-absent-insert', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          session_id: activeSession.id,
          raw_paper_notes: paperNotes,
          roll_numbers: rollList,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        setPaperFeedback({ type: 'error', message: data.error || 'Failed to insert paper absentees.' });
        return;
      }

      setPaperFeedback({
        type: 'success',
        message: data.message,
        count: data.marked_count
      });
      setPaperNotes('');
      setSelectedQuickPaperRolls([]);
      await fetchSessionRoster(activeSession.id);
      loadAuditLogs();
    } catch (err: any) {
      setPaperFeedback({ type: 'error', message: err.message || 'Error processing paper absentee list.' });
    } finally {
      setPaperLoading(false);
    }
  };

  // Toggle roll number from interactive paper number grid
  const togglePaperRoll = (rollNo: string) => {
    setSelectedQuickPaperRolls((prev) =>
      prev.includes(rollNo) ? prev.filter((r) => r !== rollNo) : [...prev, rollNo]
    );
  };

  // Smart Roster Action: Auto-Absent Unscanned or Auto-Present Remaining
  const handleSmartRosterAction = async (action: 'auto_absent_unmarked' | 'auto_present_remaining') => {
    if (!activeSession) return;

    const actionText = action === 'auto_absent_unmarked'
      ? 'Directly mark all remaining unscanned students in the class list as ABSENT?'
      : 'Directly mark all remaining non-absent students in the class list as PRESENT?';

    if (!confirm(actionText)) return;

    try {
      setSmartProcessLoading(true);
      const res = await fetch('/api/attendance/smart-roster-action', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          session_id: activeSession.id,
          action,
        }),
      });

      const data = await res.json();
      if (res.ok) {
        await fetchSessionRoster(activeSession.id);
        loadAuditLogs();
      } else {
        alert(data.error || 'Failed to execute smart action');
      }
    } catch (err: any) {
      alert(err.message || 'Error executing smart roster action');
    } finally {
      setSmartProcessLoading(false);
    }
  };

  // Mark Individual Student
  const handleDirectStatusChange = async (rollNo: string, newStatus: 'present' | 'absent') => {
    if (!activeSession) return;
    await handleProcessScan(rollNo, newStatus);
  };

  // Direct Batch Status Change for Students Selected in the List (Smart Process)
  const handleBulkStatusChange = async (targetStatus: 'absent' | 'present') => {
    if (!activeSession || selectedRosterRolls.length === 0) return;

    try {
      setSmartProcessLoading(true);
      setSmartFeedback(null);
      const res = await fetch('/api/attendance/bulk-mark-status', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          session_id: activeSession.id,
          roll_numbers: selectedRosterRolls,
          status: targetStatus,
          method: targetStatus === 'absent'
            ? (scannerMode === 'absent' ? 'scanner_absent' : 'smart_auto_absent')
            : 'smart_bulk_present',
          reason: targetStatus === 'absent'
            ? `Directly inserted ${selectedRosterRolls.length} students as ABSENT from list (Smart Process)`
            : `Directly marked ${selectedRosterRolls.length} students as PRESENT from list (Smart Process)`,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        alert(data.error || 'Failed to update attendance status.');
        return;
      }

      setSmartFeedback({
        type: 'success',
        message: `Smart Process: Directly marked ${selectedRosterRolls.length} student(s) as ${targetStatus.toUpperCase()}.`
      });
      setSelectedRosterRolls([]);
      await fetchSessionRoster(activeSession.id);
      loadAuditLogs();
    } catch (err: any) {
      alert(err.message || 'Error updating attendance status');
    } finally {
      setSmartProcessLoading(false);
    }
  };

  const toggleRosterStudentSelection = (rollNo: string) => {
    setSelectedRosterRolls((prev) =>
      prev.includes(rollNo) ? prev.filter((r) => r !== rollNo) : [...prev, rollNo]
    );
  };

  const handleSelectAllUnmarked = () => {
    const unmarked = roster.filter((r) => r.status === 'unmarked').map((r) => r.roll_no);
    setSelectedRosterRolls(unmarked);
  };

  const handleSelectAllRoster = () => {
    setSelectedRosterRolls(roster.map((r) => r.roll_no));
  };

  const handleClearRosterSelection = () => {
    setSelectedRosterRolls([]);
  };

  const presentCount = roster.filter((r) => r.status === 'present').length;
  const absentCount = roster.filter((r) => r.status === 'absent').length;
  const unmarkedCount = roster.filter((r) => r.status === 'unmarked').length;

  const filteredRoster = roster.filter((st) => {
    const matchesSearch =
      st.name.toLowerCase().includes(searchRoster.toLowerCase()) ||
      st.roll_no.toLowerCase().includes(searchRoster.toLowerCase());

    if (!matchesSearch) return false;
    if (filterRosterStatus === 'all') return true;
    return st.status === filterRosterStatus;
  });

  return (
    <div className="p-4 sm:p-6 lg:p-8 space-y-6 max-w-7xl mx-auto">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <div className="flex items-center space-x-2">
            <h2 className="text-xl font-bold text-slate-900">Faculty & Staff Smart Attendance Terminal</h2>
            <span className="px-2 py-0.5 rounded-md text-[10px] font-bold uppercase tracking-wider bg-blue-100 text-blue-800 border border-blue-200">
              TKREC Smart Process
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-0.5">
            Integrated dual-mode QR Scanner, "Write in Paper" absentee sheet insertion, and 1-click roster smart sync
          </p>
        </div>
        <button
          onClick={() => setShowAuditLogs(!showAuditLogs)}
          className="text-xs font-semibold px-3.5 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl flex items-center space-x-1.5 transition self-start sm:self-auto border border-slate-200"
        >
          <FileSpreadsheet className="w-3.5 h-3.5 text-slate-500" />
          <span>{showAuditLogs ? 'Hide Audit Logs' : 'View Audit Trail'}</span>
        </button>
      </div>

      {/* Start Session / Active Session Config */}
      {!activeSession ? (
        <div className="bg-white rounded-3xl p-6 sm:p-8 border border-slate-200 shadow-xs max-w-3xl">
          <div className="flex items-center space-x-3 mb-6">
            <div className="w-12 h-12 rounded-2xl bg-blue-50 text-blue-600 flex items-center justify-center border border-blue-200 shadow-2xs">
              <Play className="w-6 h-6" />
            </div>
            <div>
              <h3 className="font-bold text-base text-slate-900">Initialize Lecture Attendance Session</h3>
              <p className="text-xs text-slate-500">
                Choose course, section, and time slot. Supports both live QR scanning and paper absentee insertion.
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-600 uppercase tracking-wider mb-1">
                Subject / Course
              </label>
              <select
                value={selectedSubject}
                onChange={(e) => setSelectedSubject(e.target.value)}
                className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3.5 py-2.5 text-sm font-medium focus:ring-2 focus:ring-blue-500/20"
              >
                {subjects.map((s) => (
                  <option key={s.code} value={s.code}>
                    {s.code} - {s.name} ({s.department_code})
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-600 uppercase tracking-wider mb-1">
                Class Section
              </label>
              <select
                value={selectedSection}
                onChange={(e) => setSelectedSection(e.target.value)}
                className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3.5 py-2.5 text-sm font-medium focus:ring-2 focus:ring-blue-500/20"
              >
                <option value="A">Section A (20 Students)</option>
                <option value="B">Section B (20 Students)</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-600 uppercase tracking-wider mb-1">
                Lecture Time Slot
              </label>
              <select
                value={selectedTimeSlot}
                onChange={(e) => setSelectedTimeSlot(e.target.value)}
                className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3.5 py-2.5 text-sm font-medium focus:ring-2 focus:ring-blue-500/20"
              >
                <option value="09:00 AM - 10:00 AM">09:00 AM - 10:00 AM</option>
                <option value="10:00 AM - 11:00 AM">10:00 AM - 11:00 AM</option>
                <option value="11:15 AM - 12:15 PM">11:15 AM - 12:15 PM</option>
                <option value="02:00 PM - 03:00 PM">02:00 PM - 03:00 PM</option>
                <option value="03:00 PM - 04:00 PM">03:00 PM - 04:00 PM</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-600 uppercase tracking-wider mb-1">
                Academic Semester
              </label>
              <input
                type="number"
                value={selectedSemester}
                onChange={(e) => setSelectedSemester(parseInt(e.target.value, 10))}
                className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3.5 py-2.5 text-sm font-medium"
              />
            </div>
          </div>

          <div className="mt-6 pt-5 border-t border-slate-100 flex items-center justify-between">
            <div className="text-xs text-slate-500 flex items-center space-x-1.5">
              <Sparkles className="w-4 h-4 text-blue-600" />
              <span>Includes Paper Slip note input and Scanner Absent modes</span>
            </div>
            <button
              onClick={handleStartSession}
              disabled={loading}
              className="px-6 py-2.5 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white rounded-xl font-bold text-sm shadow-md flex items-center space-x-2 transition"
            >
              <Play className="w-4 h-4" />
              <span>{loading ? 'Initializing Session...' : 'Start Session & Open Terminal'}</span>
            </button>
          </div>
        </div>
      ) : (
        /* Active Session Screen */
        <div className="space-y-6">
          {/* Active Session Status Bar */}
          <div className="bg-slate-900 text-white rounded-3xl p-5 shadow-lg flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="flex items-center space-x-4">
              <div className="w-12 h-12 rounded-2xl bg-blue-500/20 text-blue-400 border border-blue-400/30 flex items-center justify-center font-mono font-bold text-lg">
                {activeSession.subject_code}
              </div>
              <div>
                <div className="flex items-center space-x-2">
                  <span className="font-bold text-base">{activeSession.subject_code} Lecture Session</span>
                  <span className="w-2 h-2 rounded-full bg-emerald-500 animate-ping"></span>
                  <span className="text-[10px] font-bold uppercase tracking-wider bg-emerald-500/20 text-emerald-300 px-2 py-0.5 rounded border border-emerald-400/30">
                    Live Session
                  </span>
                </div>
                <p className="text-xs text-slate-400 mt-0.5">
                  Section {activeSession.section} • {activeSession.time_slot} • Session Code: <span className="font-mono text-blue-300">{activeSession.session_code}</span>
                </p>
              </div>
            </div>

            {/* Counters */}
            <div className="flex items-center space-x-3 text-center">
              <div className="bg-slate-800/80 px-3.5 py-2 rounded-2xl border border-slate-700 min-w-18">
                <span className="text-[10px] text-slate-400 font-semibold uppercase tracking-wider block">Present</span>
                <span className="text-lg font-bold text-emerald-400">{presentCount}</span>
              </div>
              <div className="bg-slate-800/80 px-3.5 py-2 rounded-2xl border border-slate-700 min-w-18">
                <span className="text-[10px] text-slate-400 font-semibold uppercase tracking-wider block">Absent</span>
                <span className="text-lg font-bold text-rose-400">{absentCount}</span>
              </div>
              <div className="bg-slate-800/80 px-3.5 py-2 rounded-2xl border border-slate-700 min-w-18">
                <span className="text-[10px] text-slate-400 font-semibold uppercase tracking-wider block">Unmarked</span>
                <span className="text-lg font-bold text-amber-400">{unmarkedCount}</span>
              </div>
              <button
                onClick={() => setActiveSession(null)}
                className="px-3.5 py-2 bg-slate-800 hover:bg-slate-700 text-xs font-semibold rounded-2xl text-slate-300 transition"
              >
                Close Session
              </button>
            </div>
          </div>

          {/* Main Grid: Left side Terminal (Scanner & Write in Paper) / Right side Class Roster & Smart Actions */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            
            {/* LEFT 6 COLS: ATTENDANCE INPUT TERMINAL */}
            <div className="lg:col-span-6 space-y-4">
              
              {/* Terminal View Switcher Tabs */}
              <div className="bg-slate-100 p-1 rounded-2xl flex items-center space-x-1 border border-slate-200">
                <button
                  onClick={() => setActiveTerminalTab('scanner')}
                  className={`flex-1 py-2 px-3 rounded-xl text-xs font-bold transition flex items-center justify-center space-x-2 ${
                    activeTerminalTab === 'scanner'
                      ? 'bg-white text-slate-900 shadow-xs'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  <Camera className="w-3.5 h-3.5 text-blue-600" />
                  <span>Real-Time Scanner</span>
                  {scannerMode === 'absent' && (
                    <span className="w-2 h-2 rounded-full bg-rose-500 animate-pulse"></span>
                  )}
                </button>
                <button
                  onClick={() => setActiveTerminalTab('paper')}
                  className={`flex-1 py-2 px-3 rounded-xl text-xs font-bold transition flex items-center justify-center space-x-2 ${
                    activeTerminalTab === 'paper'
                      ? 'bg-white text-slate-900 shadow-xs'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  <FileText className="w-3.5 h-3.5 text-amber-600" />
                  <span>Write in Paper (Slip Entry)</span>
                  {identifiedPaperStudents.length > 0 && (
                    <span className="px-1.5 py-0.2 bg-amber-100 text-amber-800 rounded-full text-[10px]">
                      {identifiedPaperStudents.length}
                    </span>
                  )}
                </button>
              </div>

              {/* TAB 1: SCANNER TERMINAL (With Scanner Absent Mode Toggle) */}
              {activeTerminalTab === 'scanner' && (
                <div className="bg-white rounded-3xl p-5 border border-slate-200 shadow-xs space-y-4">
                  {/* Header & Mode Switcher */}
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-slate-100">
                    <div>
                      <h3 className="font-bold text-sm text-slate-900 flex items-center space-x-2">
                        <Camera className="w-4 h-4 text-blue-600" />
                        <span>Attendance QR/Barcode Terminal</span>
                      </h3>
                      <p className="text-[11px] text-slate-400">
                        {scannerMode === 'present' ? 'Standard mode: Scanned ID marked Present' : 'Absent mode: Scanned ID directly marked ABSENT'}
                      </p>
                    </div>

                    {/* Scanner Mode Toggle Pill */}
                    <div className="inline-flex p-1 bg-slate-100 rounded-xl border border-slate-200 text-xs font-bold self-start sm:self-auto">
                      <button
                        onClick={() => setScannerMode('present')}
                        className={`px-3 py-1 rounded-lg transition flex items-center space-x-1.5 ${
                          scannerMode === 'present'
                            ? 'bg-emerald-600 text-white shadow-xs'
                            : 'text-slate-600 hover:text-slate-900'
                        }`}
                      >
                        <UserCheck className="w-3.5 h-3.5" />
                        <span>Scan Present</span>
                      </button>
                      <button
                        onClick={() => setScannerMode('absent')}
                        className={`px-3 py-1 rounded-lg transition flex items-center space-x-1.5 ${
                          scannerMode === 'absent'
                            ? 'bg-rose-600 text-white shadow-xs'
                            : 'text-slate-600 hover:text-slate-900'
                        }`}
                      >
                        <UserX className="w-3.5 h-3.5" />
                        <span>Scanner Absent</span>
                      </button>
                    </div>
                  </div>

                  {/* Mode Warning Alert when in Scanner Absent mode */}
                  {scannerMode === 'absent' && (
                    <div className="p-3 bg-rose-50 border border-rose-300 rounded-2xl flex items-center space-x-2.5 text-xs text-rose-900 animate-in fade-in">
                      <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0" />
                      <div>
                        <span className="font-bold">SCANNER ABSENT MODE ACTIVE: </span>
                        <span>Any scanned QR pass or roll number will be directly recorded as <strong>ABSENT</strong> in the official database.</span>
                      </div>
                    </div>
                  )}

                  {/* Viewfinder Frame with Dynamic Styling based on Mode */}
                  <div className={`relative bg-slate-950 rounded-2xl overflow-hidden aspect-video flex flex-col items-center justify-center text-white border-2 shadow-inner transition-colors duration-200 ${
                    scannerMode === 'absent' ? 'border-rose-600/80 shadow-rose-950/20' : 'border-slate-800'
                  }`}>
                    {/* Scanner overlay corners */}
                    <div className="absolute inset-8 pointer-events-none flex items-center justify-center">
                      <div className={`w-44 h-44 border-2 border-dashed rounded-xl relative animate-pulse ${
                        scannerMode === 'absent' ? 'border-rose-400' : 'border-blue-400'
                      }`}>
                        <div className={`absolute top-0 left-0 w-4 h-4 border-t-2 border-l-2 ${scannerMode === 'absent' ? 'border-rose-400' : 'border-blue-400'}`}></div>
                        <div className={`absolute top-0 right-0 w-4 h-4 border-t-2 border-r-2 ${scannerMode === 'absent' ? 'border-rose-400' : 'border-blue-400'}`}></div>
                        <div className={`absolute bottom-0 left-0 w-4 h-4 border-b-2 border-l-2 ${scannerMode === 'absent' ? 'border-rose-400' : 'border-blue-400'}`}></div>
                        <div className={`absolute bottom-0 right-0 w-4 h-4 border-b-2 border-r-2 ${scannerMode === 'absent' ? 'border-rose-400' : 'border-blue-400'}`}></div>
                      </div>
                    </div>

                    <QrCode className={`w-12 h-12 mb-2 animate-bounce ${
                      scannerMode === 'absent' ? 'text-rose-400/90' : 'text-blue-400/80'
                    }`} />
                    <p className="text-xs text-slate-300 font-medium">Align student smart pass QR or barcode inside frame</p>
                    <p className="text-[10px] text-slate-400 mt-1 font-mono">
                      {scannerMode === 'absent' ? '🎯 Scanning target: Directly Mark ABSENT' : '✓ Scanning target: Mark PRESENT'}
                    </p>
                  </div>

                  {/* Duplicate Scan Alert */}
                  {duplicateAlert && (
                    <div className="p-4 rounded-2xl bg-amber-50 border-2 border-amber-300 text-amber-950 space-y-1.5 animate-in fade-in">
                      <div className="flex items-center space-x-2 font-bold text-xs text-amber-900">
                        <ShieldAlert className="w-4 h-4 text-amber-700" />
                        <span>{duplicateAlert.error}</span>
                      </div>
                      <p className="text-[11px] text-amber-800">
                        Student <strong>{duplicateAlert.student?.name}</strong> ({duplicateAlert.student?.roll_no}) is already recorded as <strong>{duplicateAlert.previous_status?.toUpperCase()}</strong> for this session.
                      </p>
                    </div>
                  )}

                  {/* Fraud / Mismatch Alert */}
                  {fraudAlert && (
                    <div className="p-3.5 rounded-2xl bg-rose-50 border border-rose-300 text-rose-900 flex items-center space-x-2 text-xs">
                      <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0" />
                      <span>{fraudAlert}</span>
                    </div>
                  )}

                  {/* Scanned Student Result Preview */}
                  {scannedResult && (
                    <div className={`p-4 rounded-2xl border flex items-center space-x-4 animate-in zoom-in-95 duration-200 ${
                      scannedResult.status === 'absent'
                        ? 'bg-rose-50 border-rose-300'
                        : 'bg-emerald-50 border-emerald-300'
                    }`}>
                      <img
                        src={scannedResult.avatar_url || 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=100'}
                        alt={scannedResult.name}
                        className="w-13 h-13 rounded-2xl object-cover border-2 border-white shadow-2xs"
                      />
                      <div className="flex-1">
                        <div className="flex items-center space-x-1.5">
                          <span className="font-bold text-sm text-slate-900">{scannedResult.name}</span>
                          {scannedResult.status === 'absent' ? (
                            <XCircle className="w-4 h-4 text-rose-600" />
                          ) : (
                            <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                          )}
                        </div>
                        <div className={`text-xs font-mono font-bold ${scannedResult.status === 'absent' ? 'text-rose-700' : 'text-blue-700'}`}>
                          {scannedResult.roll_no}
                        </div>
                        <div className="text-[10px] text-slate-500">
                          {scannedResult.department_code} • Section {scannedResult.section} • {scannedResult.timestamp}
                        </div>
                      </div>
                      <div className="text-right">
                        <span className={`px-2.5 py-1 rounded-full text-xs font-bold ${
                          scannedResult.status === 'absent'
                            ? 'bg-rose-600 text-white'
                            : 'bg-emerald-600 text-white'
                        }`}>
                          {scannedResult.status === 'absent' ? 'Marked Absent' : 'Present'}
                        </span>
                      </div>
                    </div>
                  )}

                  {/* Quick-Scan Buttons for Demo Testing */}
                  <div>
                    <div className="text-xs font-semibold text-slate-600 uppercase tracking-wider mb-2 flex items-center justify-between">
                      <span>1-Click Test Scanners</span>
                      <span className="text-[10px] text-slate-400">
                        {scannerMode === 'absent' ? 'Test Scanner Absent mode' : 'Test Present mode'}
                      </span>
                    </div>
                    <div className="grid grid-cols-2 gap-2 text-xs">
                      <button
                        onClick={() => handleProcessScan('22TKRECCSE001')}
                        className={`p-2.5 rounded-xl text-left font-medium transition border ${
                          scannerMode === 'absent'
                            ? 'bg-rose-50 hover:bg-rose-100 text-rose-900 border-rose-200'
                            : 'bg-blue-50 hover:bg-blue-100 text-blue-900 border-blue-200'
                        }`}
                      >
                        <div className="font-bold flex items-center justify-between">
                          <span>Aarav Sharma</span>
                          <span className={`text-[10px] px-1.5 py-0.2 rounded font-bold ${
                            scannerMode === 'absent' ? 'bg-rose-200 text-rose-800' : 'bg-blue-200 text-blue-800'
                          }`}>
                            {scannerMode === 'absent' ? 'Mark Absent' : 'Mark Present'}
                          </span>
                        </div>
                        <div className="text-[10px] opacity-75 font-mono">22TKRECCSE001</div>
                      </button>
                      <button
                        onClick={() => handleProcessScan('22TKRECCSE002')}
                        className={`p-2.5 rounded-xl text-left font-medium transition border ${
                          scannerMode === 'absent'
                            ? 'bg-rose-50 hover:bg-rose-100 text-rose-900 border-rose-200'
                            : 'bg-slate-50 hover:bg-slate-100 text-slate-800 border-slate-200'
                        }`}
                      >
                        <div className="font-bold flex items-center justify-between">
                          <span>Vivaan Verma</span>
                          <span className={`text-[10px] px-1.5 py-0.2 rounded font-bold ${
                            scannerMode === 'absent' ? 'bg-rose-200 text-rose-800' : 'bg-slate-200 text-slate-800'
                          }`}>
                            {scannerMode === 'absent' ? 'Mark Absent' : 'Mark Present'}
                          </span>
                        </div>
                        <div className="text-[10px] opacity-75 font-mono">22TKRECCSE002</div>
                      </button>
                    </div>
                  </div>

                  {/* Manual Student ID / QR Code Token Entry */}
                  <div className="flex items-center space-x-2 pt-2 border-t border-slate-100">
                    <input
                      type="text"
                      placeholder={
                        scannerMode === 'absent'
                          ? 'Enter Roll No to mark ABSENT (e.g. 02, 22TKRECCSE002)...'
                          : 'Enter Roll No to mark PRESENT (e.g. 01, 22TKRECCSE001)...'
                      }
                      value={manualInput}
                      onChange={(e) => setManualInput(e.target.value)}
                      onKeyDown={(e) => e.key === 'Enter' && handleProcessScan(manualInput)}
                      className={`flex-1 bg-slate-50 border rounded-xl px-3.5 py-2.5 text-xs font-mono focus:outline-hidden focus:ring-2 ${
                        scannerMode === 'absent'
                          ? 'border-rose-300 focus:ring-rose-500/20 focus:border-rose-600'
                          : 'border-slate-300 focus:ring-blue-500/20 focus:border-blue-600'
                      }`}
                    />
                    <button
                      onClick={() => handleProcessScan(manualInput)}
                      disabled={!manualInput.trim()}
                      className={`px-4 py-2.5 text-white rounded-xl text-xs font-bold transition flex items-center space-x-1.5 disabled:opacity-50 ${
                        scannerMode === 'absent'
                          ? 'bg-rose-600 hover:bg-rose-700'
                          : 'bg-blue-600 hover:bg-blue-700'
                      }`}
                    >
                      {scannerMode === 'absent' ? <UserX className="w-3.5 h-3.5" /> : <UserCheck className="w-3.5 h-3.5" />}
                      <span>{scannerMode === 'absent' ? 'Mark Absent' : 'Mark Present'}</span>
                    </button>
                  </div>
                </div>
              )}

              {/* TAB 2: "WRITE IN PAPER" ABSENTEE SHEET (Slip Note Entry) */}
              {activeTerminalTab === 'paper' && (
                <div className="bg-amber-50/40 rounded-3xl p-5 border-2 border-amber-200/80 shadow-xs space-y-4">
                  <div className="flex items-center justify-between pb-3 border-b border-amber-200/60">
                    <div className="flex items-center space-x-2.5">
                      <div className="w-9 h-9 rounded-xl bg-amber-100 text-amber-800 flex items-center justify-center border border-amber-300 shadow-2xs font-bold">
                        <FileText className="w-5 h-5 text-amber-700" />
                      </div>
                      <div>
                        <h3 className="font-bold text-sm text-slate-900">Paper Slip Absentee Sheet</h3>
                        <p className="text-[11px] text-slate-500">
                          Faculty note: enter roll numbers written on physical paper during roll call
                        </p>
                      </div>
                    </div>
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-amber-200/60 text-amber-900 border border-amber-300">
                      Smart Roll Matching
                    </span>
                  </div>

                  {/* Feedback Message */}
                  {paperFeedback && (
                    <div className={`p-3 rounded-2xl text-xs flex items-center space-x-2 animate-in fade-in ${
                      paperFeedback.type === 'success'
                        ? 'bg-emerald-100 text-emerald-900 border border-emerald-300'
                        : 'bg-rose-100 text-rose-900 border border-rose-300'
                    }`}>
                      {paperFeedback.type === 'success' ? (
                        <CheckCircle2 className="w-4 h-4 text-emerald-700 shrink-0" />
                      ) : (
                        <AlertTriangle className="w-4 h-4 text-rose-700 shrink-0" />
                      )}
                      <span>{paperFeedback.message}</span>
                    </div>
                  )}

                  {/* Paper Notes Text Input */}
                  <div>
                    <div className="flex items-center justify-between mb-1.5">
                      <label className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                        Roll Numbers Written on Paper:
                      </label>
                      <span className="text-[11px] text-slate-500">
                        Supports comma, space, or short digits (e.g. 02, 05, 12)
                      </span>
                    </div>
                    <textarea
                      rows={3}
                      value={paperNotes}
                      onChange={(e) => setPaperNotes(e.target.value)}
                      placeholder="e.g. 02, 05, 12, 18 or 22TKRECCSE002, 22TKRECCSE005..."
                      className="w-full bg-white border border-amber-300 rounded-2xl p-3 text-xs font-mono focus:outline-hidden focus:ring-2 focus:ring-amber-500/20 focus:border-amber-600 shadow-inner"
                    />

                    {/* Quick Presets for Testing Paper Absentee Slip */}
                    <div className="flex flex-wrap items-center gap-1.5 pt-1.5 text-[11px]">
                      <span className="text-slate-500 font-medium">Quick Presets:</span>
                      <button
                        type="button"
                        onClick={() => setPaperNotes('02, 05, 12, 18')}
                        className="px-2 py-0.5 bg-amber-100 hover:bg-amber-200 text-amber-900 rounded-md font-mono text-[10px] font-semibold transition"
                      >
                        02, 05, 12, 18
                      </button>
                      <button
                        type="button"
                        onClick={() => setPaperNotes('03, 07, 14, 19')}
                        className="px-2 py-0.5 bg-amber-100 hover:bg-amber-200 text-amber-900 rounded-md font-mono text-[10px] font-semibold transition"
                      >
                        03, 07, 14, 19
                      </button>
                      <button
                        type="button"
                        onClick={() => setPaperNotes('22TKRECCSE002, 22TKRECCSE006')}
                        className="px-2 py-0.5 bg-amber-100 hover:bg-amber-200 text-amber-900 rounded-md font-mono text-[10px] font-semibold transition"
                      >
                        Full Roll Nos
                      </button>
                      {paperNotes && (
                        <button
                          type="button"
                          onClick={() => setPaperNotes('')}
                          className="px-2 py-0.5 text-slate-500 hover:text-rose-700 text-[10px] underline ml-auto"
                        >
                          Clear Text
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Interactive Quick-Tap Paper Matrix (Tapping numbers to add to paper list) */}
                  <div className="bg-white/80 rounded-2xl p-3 border border-amber-200/70 space-y-2">
                    <div className="flex items-center justify-between text-[11px] text-slate-600">
                      <span className="font-semibold uppercase tracking-wider">
                        Quick-Tap Paper Roster Matrix:
                      </span>
                      <span className="text-[10px] text-slate-400">Click roll number to mark absent</span>
                    </div>
                    <div className="grid grid-cols-5 sm:grid-cols-10 gap-1.5 text-xs font-mono">
                      {roster.map((st) => {
                        const rollDigit = st.roll_no.slice(-2);
                        const isSelectedInPaper =
                          selectedQuickPaperRolls.includes(st.roll_no) ||
                          paperNotes.includes(st.roll_no) ||
                          paperNotes.split(/[\s,;]+/).includes(rollDigit) ||
                          paperNotes.split(/[\s,;]+/).includes(String(parseInt(rollDigit, 10)));
                        const isAlreadyAbsent = st.status === 'absent';
                        const isAlreadyPresent = st.status === 'present';

                        return (
                          <button
                            key={st.roll_no}
                            type="button"
                            onClick={() => togglePaperRoll(st.roll_no)}
                            title={`${st.name} (${st.roll_no}) - Current: ${st.status}`}
                            className={`py-1.5 px-1 rounded-lg text-center font-bold text-[11px] transition border ${
                              isSelectedInPaper
                                ? 'bg-rose-600 text-white border-rose-700 shadow-2xs scale-105'
                                : isAlreadyAbsent
                                ? 'bg-rose-100 text-rose-800 border-rose-300'
                                : isAlreadyPresent
                                ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                                : 'bg-slate-50 text-slate-700 hover:bg-amber-100 border-slate-200'
                            }`}
                          >
                            {rollDigit}
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  {/* Identified Students Preview */}
                  {identifiedPaperStudents.length > 0 && (
                    <div className="space-y-1.5">
                      <div className="flex items-center justify-between text-xs">
                        <span className="font-bold text-slate-700">
                          Students Identified for Direct Absence ({identifiedPaperStudents.length}):
                        </span>
                        <button
                          type="button"
                          onClick={() => {
                            setPaperNotes('');
                            setSelectedQuickPaperRolls([]);
                          }}
                          className="text-[10px] text-slate-500 hover:text-slate-800 underline"
                        >
                          Clear Slip
                        </button>
                      </div>
                      <div className="flex flex-wrap gap-1.5 max-h-28 overflow-y-auto p-1">
                        {identifiedPaperStudents.map((st) => (
                          <span
                            key={st.roll_no}
                            className="inline-flex items-center space-x-1 px-2.5 py-1 rounded-lg text-xs font-semibold bg-rose-100 text-rose-900 border border-rose-300 shadow-2xs"
                          >
                            <span className="font-mono text-[11px] font-bold text-rose-800">{st.roll_no.slice(-3)}</span>
                            <span className="truncate max-w-28">{st.name}</span>
                          </span>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Direct Insertion Action Button */}
                  <div className="pt-2">
                    <button
                      type="button"
                      onClick={handlePaperAbsentInsert}
                      disabled={paperLoading || (identifiedPaperStudents.length === 0 && !paperNotes.trim())}
                      className="w-full py-3 bg-gradient-to-r from-rose-600 to-amber-600 hover:from-rose-700 hover:to-amber-700 disabled:opacity-50 text-white rounded-2xl font-bold text-xs shadow-md flex items-center justify-center space-x-2 transition"
                    >
                      <UserX className="w-4 h-4" />
                      <span>
                        {paperLoading
                          ? 'Recording Absentees in Database...'
                          : `Directly Insert ${identifiedPaperStudents.length > 0 ? identifiedPaperStudents.length : ''} Absentee(s) from Paper Slip`}
                      </span>
                    </button>
                  </div>

                  {/* Smart Invert Suggestion for Paper Workflow */}
                  {absentCount > 0 && unmarkedCount > 0 && (
                    <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-2xl flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs">
                      <div className="flex items-center space-x-2 text-emerald-900">
                        <CheckCheck className="w-4 h-4 text-emerald-600 shrink-0" />
                        <span>
                          <strong>Smart Process Tip:</strong> Absentees entered! Mark all {unmarkedCount} remaining enrolled students in list as <strong>PRESENT</strong>?
                        </span>
                      </div>
                      <button
                        type="button"
                        onClick={() => handleSmartRosterAction('auto_present_remaining')}
                        disabled={smartProcessLoading}
                        className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl shrink-0 transition text-xs flex items-center justify-center space-x-1"
                      >
                        <Zap className="w-3.5 h-3.5" />
                        <span>Smart Mark Others Present</span>
                      </button>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* RIGHT 6 COLS: ENROLLED STUDENT ROSTER & SMART PROCESS */}
            <div className="lg:col-span-6 space-y-4">
              <div className="bg-white rounded-3xl p-5 border border-slate-200 shadow-xs flex flex-col h-[620px]">
                {/* Roster Header */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-slate-100">
                  <div>
                    <div className="flex items-center space-x-2">
                      <h3 className="font-bold text-sm text-slate-900">Class Roster List ({roster.length} Enrolled)</h3>
                      {scannerMode === 'absent' && (
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-rose-100 text-rose-800 border border-rose-300 animate-pulse">
                          Scanner Absent Active
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-slate-400">
                      {activeSession.subject_code} • Section {activeSession.section} • {activeSession.time_slot}
                    </p>
                  </div>

                  {/* SMART PROCESS BUTTONS */}
                  <div className="flex items-center space-x-1.5">
                    {unmarkedCount > 0 && (
                      <button
                        onClick={() => handleSmartRosterAction('auto_absent_unmarked')}
                        disabled={smartProcessLoading}
                        className="px-2.5 py-1.5 bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-300 rounded-xl text-xs font-bold transition flex items-center space-x-1"
                        title="Smart Process: Automatically mark all unscanned students in this section as Absent"
                      >
                        <Zap className="w-3.5 h-3.5 text-rose-600" />
                        <span>Auto-Absent Unscanned ({unmarkedCount})</span>
                      </button>
                    )}
                    {absentCount > 0 && unmarkedCount > 0 && (
                      <button
                        onClick={() => handleSmartRosterAction('auto_present_remaining')}
                        disabled={smartProcessLoading}
                        className="px-2.5 py-1.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-300 rounded-xl text-xs font-bold transition flex items-center space-x-1"
                        title="Smart Invert: Since you marked the absentees from paper or scanner, mark all other students as Present"
                      >
                        <CheckCheck className="w-3.5 h-3.5 text-emerald-600" />
                        <span>Smart Mark Others Present</span>
                      </button>
                    )}
                  </div>
                </div>

                {/* Scanner Absent Mode Alert Banner over List */}
                {scannerMode === 'absent' && (
                  <div className="my-2 p-2.5 bg-rose-50 border border-rose-300 rounded-xl text-xs text-rose-900 flex items-center justify-between animate-in fade-in">
                    <div className="flex items-center space-x-2">
                      <UserX className="w-4 h-4 text-rose-600 shrink-0" />
                      <span>
                        <strong>SCANNER ABSENT MODE ACTIVE:</strong> Select or click any student in the list to directly insert them as <strong>ABSENT</strong>.
                      </span>
                    </div>
                    <span className="text-[10px] font-bold px-2 py-0.5 bg-rose-200 text-rose-900 rounded shrink-0">
                      1-Click Absent
                    </span>
                  </div>
                )}

                {/* Multi-Selection Control Bar */}
                <div className="flex flex-wrap items-center justify-between gap-1.5 py-2 px-1 bg-slate-50 border-b border-slate-100 text-[11px] rounded-xl">
                  <div className="flex items-center space-x-2">
                    <input
                      type="checkbox"
                      checked={selectedRosterRolls.length === roster.length && roster.length > 0}
                      onChange={(e) => (e.target.checked ? handleSelectAllRoster() : handleClearRosterSelection())}
                      className="rounded border-slate-300 text-blue-600 focus:ring-blue-500 w-3.5 h-3.5 cursor-pointer"
                      title="Select / Deselect All Students"
                    />
                    <span className="font-semibold text-slate-700">
                      {selectedRosterRolls.length > 0
                        ? `${selectedRosterRolls.length} Selected in List`
                        : 'Smart Multi-Select:'}
                    </span>
                  </div>

                  <div className="flex items-center space-x-1.5 text-[10px]">
                    <button
                      onClick={handleSelectAllUnmarked}
                      className="px-2 py-0.5 bg-white hover:bg-slate-100 border border-slate-200 text-slate-700 rounded transition font-medium"
                    >
                      Select Unmarked ({unmarkedCount})
                    </button>
                    <button
                      onClick={handleSelectAllRoster}
                      className="px-2 py-0.5 bg-white hover:bg-slate-100 border border-slate-200 text-slate-700 rounded transition font-medium"
                    >
                      Select All ({roster.length})
                    </button>
                    {selectedRosterRolls.length > 0 && (
                      <button
                        onClick={handleClearRosterSelection}
                        className="px-2 py-0.5 text-rose-600 hover:text-rose-800 font-medium"
                      >
                        Clear
                      </button>
                    )}
                  </div>
                </div>

                {/* Active Multi-Select Smart Action Banner */}
                {selectedRosterRolls.length > 0 && (
                  <div className="my-2 p-2.5 bg-gradient-to-r from-rose-50 via-amber-50 to-emerald-50 border border-amber-300 rounded-2xl flex flex-col sm:flex-row sm:items-center justify-between gap-2 animate-in fade-in">
                    <div className="flex items-center space-x-2 text-xs">
                      <Sparkles className="w-4 h-4 text-amber-600 shrink-0" />
                      <span className="font-bold text-slate-900">
                        Smart Process: {selectedRosterRolls.length} student(s) selected
                      </span>
                    </div>
                    <div className="flex items-center space-x-2">
                      <button
                        onClick={() => handleBulkStatusChange('absent')}
                        disabled={smartProcessLoading}
                        className="px-3 py-1.5 bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs rounded-xl shadow-xs transition flex items-center space-x-1"
                      >
                        <UserX className="w-3.5 h-3.5" />
                        <span>Directly Insert Absent</span>
                      </button>
                      <button
                        onClick={() => handleBulkStatusChange('present')}
                        disabled={smartProcessLoading}
                        className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-xl shadow-xs transition flex items-center space-x-1"
                      >
                        <UserCheck className="w-3.5 h-3.5" />
                        <span>Mark Present</span>
                      </button>
                    </div>
                  </div>
                )}

                {/* Smart Process Feedback */}
                {smartFeedback && (
                  <div className="my-1.5 p-2 bg-emerald-100 border border-emerald-300 rounded-xl text-xs text-emerald-900 flex items-center space-x-2 animate-in fade-in">
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-700 shrink-0" />
                    <span>{smartFeedback.message}</span>
                  </div>
                )}

                {/* Filter and Search Bar */}
                <div className="py-2.5 space-y-2 border-b border-slate-100">
                  <div className="relative">
                    <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-2.5" />
                    <input
                      type="text"
                      placeholder="Search by student name or roll number..."
                      value={searchRoster}
                      onChange={(e) => setSearchRoster(e.target.value)}
                      className="w-full bg-slate-50 border border-slate-200 pl-8 pr-3 py-1.5 rounded-xl text-xs focus:outline-hidden"
                    />
                  </div>

                  {/* Filter Pills */}
                  <div className="flex items-center space-x-1 text-[11px] font-bold">
                    <button
                      onClick={() => setFilterRosterStatus('all')}
                      className={`px-2.5 py-1 rounded-lg transition ${
                        filterRosterStatus === 'all'
                          ? 'bg-slate-900 text-white'
                          : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                      }`}
                    >
                      All ({roster.length})
                    </button>
                    <button
                      onClick={() => setFilterRosterStatus('present')}
                      className={`px-2.5 py-1 rounded-lg transition ${
                        filterRosterStatus === 'present'
                          ? 'bg-emerald-600 text-white'
                          : 'bg-emerald-50 text-emerald-700 hover:bg-emerald-100'
                      }`}
                    >
                      Present ({presentCount})
                    </button>
                    <button
                      onClick={() => setFilterRosterStatus('absent')}
                      className={`px-2.5 py-1 rounded-lg transition ${
                        filterRosterStatus === 'absent'
                          ? 'bg-rose-600 text-white'
                          : 'bg-rose-50 text-rose-700 hover:bg-rose-100'
                      }`}
                    >
                      Absent ({absentCount})
                    </button>
                    <button
                      onClick={() => setFilterRosterStatus('unmarked')}
                      className={`px-2.5 py-1 rounded-lg transition ${
                        filterRosterStatus === 'unmarked'
                          ? 'bg-amber-600 text-white'
                          : 'bg-amber-50 text-amber-700 hover:bg-amber-100'
                      }`}
                    >
                      Unmarked ({unmarkedCount})
                    </button>
                  </div>
                </div>

                {/* Enrolled Student List Rows */}
                <div className="flex-1 overflow-y-auto divide-y divide-slate-100 text-xs">
                  {filteredRoster.map((st) => (
                    <div
                      key={st.roll_no}
                      onClick={() => {
                        if (scannerMode === 'absent') {
                          handleDirectStatusChange(st.roll_no, 'absent');
                        }
                      }}
                      className={`py-2.5 px-2 flex items-center justify-between rounded-xl transition ${
                        scannerMode === 'absent'
                          ? 'hover:bg-rose-50/70 cursor-pointer'
                          : 'hover:bg-slate-50/80'
                      }`}
                    >
                      <div className="flex items-center space-x-2.5">
                        <input
                          type="checkbox"
                          checked={selectedRosterRolls.includes(st.roll_no)}
                          onChange={() => toggleRosterStudentSelection(st.roll_no)}
                          onClick={(e) => e.stopPropagation()}
                          className="rounded border-slate-300 text-blue-600 focus:ring-blue-500 w-3.5 h-3.5 cursor-pointer"
                        />
                        <div
                          className={`w-7 h-7 rounded-lg flex items-center justify-center font-bold text-[10px] ${
                            st.status === 'present'
                              ? 'bg-emerald-100 text-emerald-700'
                              : st.status === 'absent'
                              ? 'bg-rose-100 text-rose-700'
                              : 'bg-slate-100 text-slate-500'
                          }`}
                        >
                          {st.status === 'present' ? 'P' : st.status === 'absent' ? 'A' : '?'}
                        </div>
                        <div>
                          <div className="font-bold text-slate-900 flex items-center space-x-1.5">
                            <span>{st.name}</span>
                            {scannerMode === 'absent' && (
                              <span className="text-[9px] text-rose-600 font-normal">
                                (click to mark absent)
                              </span>
                            )}
                          </div>
                          <div className="text-[10px] text-slate-400 font-mono">{st.roll_no}</div>
                        </div>
                      </div>

                      <div className="flex items-center space-x-1.5" onClick={(e) => e.stopPropagation()}>
                        {/* Status Badge */}
                        {st.status === 'present' ? (
                          <div className="flex items-center space-x-1">
                            <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
                              Present {st.method === 'smart_bulk_present' ? '⚡' : '✓'}
                            </span>
                            <button
                              onClick={() => handleDirectStatusChange(st.roll_no, 'absent')}
                              className="px-2 py-0.5 text-[10px] font-medium text-slate-500 hover:text-rose-700 hover:bg-rose-50 rounded transition"
                              title="Switch to Absent"
                            >
                              Make Absent
                            </button>
                          </div>
                        ) : st.status === 'absent' ? (
                          <div className="flex items-center space-x-1">
                            <span className="text-[10px] font-bold text-rose-700 bg-rose-50 px-2 py-0.5 rounded-full border border-rose-200">
                              Absent {st.method === 'paper_slip' ? '📝' : st.method === 'scanner_absent' ? '🔴' : '✗'}
                            </span>
                            <button
                              onClick={() => handleDirectStatusChange(st.roll_no, 'present')}
                              className="px-2 py-0.5 text-[10px] font-medium text-slate-500 hover:text-emerald-700 hover:bg-emerald-50 rounded transition"
                              title="Switch to Present"
                            >
                              Make Present
                            </button>
                          </div>
                        ) : (
                          <div className="flex items-center space-x-1">
                            <button
                              onClick={() => handleDirectStatusChange(st.roll_no, 'present')}
                              className="px-2 py-1 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-[10px] font-bold transition flex items-center space-x-0.5"
                            >
                              <Check className="w-3 h-3" />
                              <span>Present</span>
                            </button>
                            <button
                              onClick={() => handleDirectStatusChange(st.roll_no, 'absent')}
                              className="px-2 py-1 bg-rose-50 hover:bg-rose-100 text-rose-700 rounded-lg text-[10px] font-bold border border-rose-200 transition flex items-center space-x-0.5"
                            >
                              <UserX className="w-3 h-3 text-rose-600" />
                              <span>Absent</span>
                            </button>
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                  {filteredRoster.length === 0 && (
                    <div className="p-8 text-center text-xs text-slate-400">
                      No students found matching current filter or search query.
                    </div>
                  )}
                </div>

                {/* Bottom Smart Process Bar */}
                <div className="pt-3 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
                  <div className="flex items-center space-x-2">
                    <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
                    <span>Class Section {activeSession.section} Database Sync Active</span>
                  </div>
                  <span className="font-mono text-[10px] text-slate-400">Auto-Audited</span>
                </div>
              </div>
            </div>

          </div>
        </div>
      )}

      {/* Audit Trail Drawer / Table */}
      {showAuditLogs && (
        <div className="bg-white rounded-3xl p-6 border border-slate-200 shadow-sm space-y-4 animate-in fade-in">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="font-bold text-base text-slate-900">Attendance Immutable Audit Trail</h3>
              <p className="text-xs text-slate-500">Record of who marked or updated attendance, timestamp, reason, and previous status</p>
            </div>
            <button
              onClick={loadAuditLogs}
              className="text-xs font-semibold text-blue-600 hover:text-blue-800"
            >
              Refresh Logs
            </button>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-xs text-left">
              <thead className="bg-slate-50 text-slate-500 border-b border-slate-200">
                <tr>
                  <th className="p-3">Timestamp</th>
                  <th className="p-3">Student Roll No</th>
                  <th className="p-3">Subject</th>
                  <th className="p-3">Old Status</th>
                  <th className="p-3">New Status</th>
                  <th className="p-3">Modified By</th>
                  <th className="p-3">Authorization Reason</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {auditLogs.slice(0, 15).map((log) => (
                  <tr key={log.id} className="hover:bg-slate-50">
                    <td className="p-3 text-slate-400 whitespace-nowrap">
                      {new Date(log.timestamp).toLocaleString()}
                    </td>
                    <td className="p-3 font-mono font-bold text-slate-900">{log.student_roll_no}</td>
                    <td className="p-3 text-slate-700">{log.subject_code}</td>
                    <td className="p-3 text-slate-400">{log.old_status || 'Unmarked'}</td>
                    <td className="p-3">
                      <span
                        className={`font-bold px-2 py-0.5 rounded text-[10px] uppercase ${
                          log.new_status === 'present'
                            ? 'bg-emerald-100 text-emerald-800'
                            : 'bg-rose-100 text-rose-800'
                        }`}
                      >
                        {log.new_status}
                      </span>
                    </td>
                    <td className="p-3 text-slate-700 font-mono text-[11px]">{log.modified_by_id} ({log.modifier_role})</td>
                    <td className="p-3 text-slate-600 max-w-xs truncate">{log.reason}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};
