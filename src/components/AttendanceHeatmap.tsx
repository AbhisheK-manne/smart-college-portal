import React, { useState, useMemo } from 'react';
import {
  Calendar as CalendarIcon,
  Flame,
  Trophy,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  Clock,
  Filter,
  Info,
  ChevronRight,
  TrendingUp,
  BookOpen,
  CalendarCheck,
  Award
} from 'lucide-react';
import { AttendanceHeatmapData, AttendanceDayInfo, DailyAttendanceSession } from '../types/index.ts';

interface Props {
  heatmapData?: AttendanceHeatmapData;
  availableSubjects?: { subject_code: string; subject_name: string }[];
  onSelectComplaint?: () => void;
}

export const AttendanceHeatmap: React.FC<Props> = ({
  heatmapData,
  availableSubjects = [],
  onSelectComplaint
}) => {
  const [selectedSubject, setSelectedSubject] = useState<string>('All');
  const [monthFilter, setMonthFilter] = useState<string>('All');
  const [hoveredDay, setHoveredDay] = useState<AttendanceDayInfo | null>(null);
  const [tooltipPos, setTooltipPos] = useState<{ x: number; y: number } | null>(null);
  
  // Selected day for persistent inspection drawer
  const [selectedDay, setSelectedDay] = useState<AttendanceDayInfo | null>(() => {
    if (!heatmapData?.days) return null;
    // Default to today or the last active academic day
    const today = heatmapData.days.find((d) => d.is_today);
    if (today) return today;
    const pastAcademic = [...heatmapData.days].reverse().find((d) => d.total_conducted > 0);
    return pastAcademic || heatmapData.days[heatmapData.days.length - 1] || null;
  });

  // Calculate filtered heatmap days based on selected subject and month
  const { filteredDays, stats, weekColumns, monthLabels } = useMemo(() => {
    if (!heatmapData || !heatmapData.days) {
      return { filteredDays: [], stats: null, weekColumns: [], monthLabels: [] };
    }

    // 1. Filter sessions by subject if requested
    const daysWithSubjectFilter = heatmapData.days.map((day) => {
      if (selectedSubject === 'All') return day;

      const subjectSessions = day.sessions.filter(
        (s) => s.subject_code === selectedSubject
      );
      const total = subjectSessions.length;
      const present = subjectSessions.filter((s) => s.status === 'present').length;
      const absent = subjectSessions.filter((s) => s.status === 'absent').length;
      const pct = total > 0 ? Math.round((present / total) * 100) : 0;

      let status: AttendanceDayInfo['status'] = 'none';
      if (day.status === 'upcoming') {
        status = 'upcoming';
      } else if (total === 0) {
        status = 'none';
      } else if (present === total) {
        status = 'full';
      } else if (present === 0) {
        status = 'absent';
      } else {
        status = 'partial';
      }

      return {
        ...day,
        sessions: subjectSessions,
        total_conducted: total,
        present_count: present,
        absent_count: absent,
        percentage: pct,
        status
      };
    });

    // 2. Filter by month if requested
    const activeDays = daysWithSubjectFilter.filter((d) => {
      if (monthFilter === 'All') return true;
      if (monthFilter === 'Aug') return d.date.startsWith('2026-08');
      if (monthFilter === 'Sep') return d.date.startsWith('2026-09');
      return true;
    });

    // 3. Compute KPI stats for current view
    let fullDays = 0;
    let partialDays = 0;
    let absentDays = 0;
    let academicDays = 0;
    let runningStreak = 0;
    let bestStreak = 0;
    let currentStreak = 0;
    let totalClassesAttended = 0;
    let totalClassesConducted = 0;

    activeDays.forEach((d) => {
      if (d.status === 'upcoming') return;
      if (d.total_conducted > 0) {
        academicDays++;
        totalClassesAttended += d.present_count;
        totalClassesConducted += d.total_conducted;

        if (d.status === 'full') {
          fullDays++;
          runningStreak++;
          if (runningStreak > bestStreak) bestStreak = runningStreak;
        } else if (d.status === 'absent') {
          absentDays++;
          runningStreak = 0;
        } else if (d.status === 'partial') {
          partialDays++;
          runningStreak = 0;
        }
        currentStreak = runningStreak;
      }
    });

    const overallPct =
      totalClassesConducted > 0
        ? Number(((totalClassesAttended / totalClassesConducted) * 100).toFixed(1))
        : 100;

    // 4. Organize into week columns for SVG rendering
    // We group by week based on Monday-Sunday or week index
    const weeks: AttendanceDayInfo[][] = [];
    let currentWeek: AttendanceDayInfo[] = [];

    activeDays.forEach((day, index) => {
      currentWeek.push(day);
      // Monday = 1, Sunday = 0
      if (day.day_of_week === 0 || index === activeDays.length - 1) {
        // Pad beginning of first week if needed
        if (weeks.length === 0 && currentWeek.length < 7) {
          // If first day is not Monday (day_of_week 1)
          const firstDay = currentWeek[0].day_of_week;
          // Days in JS: 0=Sun, 1=Mon, 2=Tue, 3=Wed, 4=Thu, 5=Fri, 6=Sat
          // If Monday-first: Mon=0, Tue=1, ..., Sun=6
        }
        weeks.push(currentWeek);
        currentWeek = [];
      }
    });

    // 5. Month labels position calculation
    const monthsMap: { name: string; colIndex: number }[] = [];
    let lastMonth = '';
    weeks.forEach((w, wIdx) => {
      const firstValidDay = w[0];
      if (firstValidDay) {
        const monthName = firstValidDay.formatted_date.split(' ')[0]; // e.g. "Aug" or "Sep"
        if (monthName !== lastMonth) {
          monthsMap.push({ name: monthName, colIndex: wIdx });
          lastMonth = monthName;
        }
      }
    });

    return {
      filteredDays: activeDays,
      stats: {
        overallPercentage: overallPct,
        totalClassesAttended,
        totalClassesConducted,
        fullDays,
        partialDays,
        absentDays,
        academicDays,
        currentStreak,
        bestStreak
      },
      weekColumns: weeks,
      monthLabels: monthsMap
    };
  }, [heatmapData, selectedSubject, monthFilter]);

  const currentSelectedDayInfo = useMemo(() => {
    if (!selectedDay) return null;
    return filteredDays.find((d) => d.date === selectedDay.date) || selectedDay;
  }, [selectedDay, filteredDays]);

  if (!heatmapData || !heatmapData.days || heatmapData.days.length === 0) {
    return (
      <div className="bg-white rounded-2xl border border-slate-200/80 p-8 text-center">
        <CalendarCheck className="w-10 h-10 text-slate-300 mx-auto mb-3" />
        <h4 className="text-base font-semibold text-slate-800">Attendance Heatmap Generating</h4>
        <p className="text-xs text-slate-500 max-w-md mx-auto mt-1">
          Attendance records for current semester are being compiled from verified classroom terminals.
        </p>
      </div>
    );
  }

  // SVG grid sizing configuration
  const cellSize = 22;
  const cellGap = 5;
  const colStep = cellSize + cellGap;
  const rowStep = cellSize + cellGap;
  const leftMargin = 38;
  const topMargin = 28;

  // Day order (Monday to Sunday)
  // Day of week: 1=Mon, 2=Tue, 3=Wed, 4=Thu, 5=Fri, 6=Sat, 0=Sun
  const dayRowIndex = (dow: number) => (dow === 0 ? 6 : dow - 1);
  const dayLabels = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

  const svgWidth = Math.max(520, leftMargin + weekColumns.length * colStep + 20);
  const svgHeight = topMargin + 7 * rowStep + 10;

  // Color mapper based on attendance status
  const getCellFill = (day: AttendanceDayInfo) => {
    if (day.status === 'upcoming') return '#f8fafc';
    if (day.total_conducted === 0) {
      return day.is_weekend ? '#f1f5f9' : '#f1f5f9';
    }
    if (day.status === 'full') return '#10b981'; // Emerald 500
    if (day.status === 'partial') return '#f59e0b'; // Amber 500
    if (day.status === 'absent') return '#ef4444'; // Rose 500
    return '#f1f5f9';
  };

  const getCellStroke = (day: AttendanceDayInfo, isSelected: boolean) => {
    if (isSelected) return '#2563eb'; // Blue highlight ring
    if (day.is_today) return '#3b82f6';
    if (day.status === 'upcoming') return '#cbd5e1';
    if (day.status === 'full') return '#059669';
    if (day.status === 'partial') return '#d97706';
    if (day.status === 'absent') return '#dc2626';
    return '#e2e8f0';
  };

  return (
    <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden transition-all">
      {/* Header & Controls Bar */}
      <div className="p-4 sm:p-5 border-b border-slate-200/80 bg-gradient-to-r from-slate-50 via-white to-slate-50 flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <div className="flex items-center space-x-2">
            <span className="p-1.5 rounded-lg bg-blue-100 text-blue-700">
              <CalendarIcon className="w-4 h-4" />
            </span>
            <h3 className="font-bold text-base text-slate-900 tracking-tight">
              Semester Attendance Heatmap
            </h3>
            <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-blue-50 text-blue-700 border border-blue-200">
              Fall 2026
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            SVG-rendered daily attendance patterns across all lecture sessions with anti-fraud QR verification logs
          </p>
        </div>

        {/* Filters */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Subject Filter */}
          <div className="flex items-center space-x-1.5 bg-slate-100/90 rounded-xl px-2.5 py-1.5 border border-slate-200 text-xs">
            <Filter className="w-3.5 h-3.5 text-slate-500" />
            <select
              value={selectedSubject}
              onChange={(e) => setSelectedSubject(e.target.value)}
              className="bg-transparent text-slate-800 font-semibold focus:outline-none cursor-pointer pr-1 text-xs"
              aria-label="Filter attendance by subject"
            >
              <option value="All">All Subjects (Combined)</option>
              {availableSubjects.map((sub) => (
                <option key={sub.subject_code} value={sub.subject_code}>
                  {sub.subject_code} — {sub.subject_name}
                </option>
              ))}
            </select>
          </div>

          {/* Month Filter */}
          <div className="inline-flex rounded-xl bg-slate-100 p-0.5 text-xs font-semibold text-slate-600 border border-slate-200">
            <button
              onClick={() => setMonthFilter('All')}
              className={`px-2.5 py-1 rounded-lg transition ${
                monthFilter === 'All' ? 'bg-white text-blue-700 shadow-xs' : 'hover:text-slate-900'
              }`}
            >
              Full Term
            </button>
            <button
              onClick={() => setMonthFilter('Aug')}
              className={`px-2.5 py-1 rounded-lg transition ${
                monthFilter === 'Aug' ? 'bg-white text-blue-700 shadow-xs' : 'hover:text-slate-900'
              }`}
            >
              August
            </button>
            <button
              onClick={() => setMonthFilter('Sep')}
              className={`px-2.5 py-1 rounded-lg transition ${
                monthFilter === 'Sep' ? 'bg-white text-blue-700 shadow-xs' : 'hover:text-slate-900'
              }`}
            >
              September
            </button>
          </div>
        </div>
      </div>

      {/* KPI Stats Bar */}
      <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-6 gap-3 p-4 bg-slate-50/60 border-b border-slate-100 text-xs">
        {/* Streak */}
        <div className="bg-white p-3 rounded-xl border border-slate-200/70 shadow-xs">
          <div className="flex items-center justify-between text-slate-500">
            <span className="text-[11px] font-medium">Current Streak</span>
            <Flame className="w-3.5 h-3.5 text-amber-500 fill-amber-500" />
          </div>
          <div className="mt-1 flex items-baseline space-x-1">
            <span className="text-xl font-extrabold text-slate-900">{stats?.currentStreak || 0}</span>
            <span className="text-[10px] text-slate-400 font-medium">consecutive days</span>
          </div>
        </div>

        {/* Best Streak */}
        <div className="bg-white p-3 rounded-xl border border-slate-200/70 shadow-xs">
          <div className="flex items-center justify-between text-slate-500">
            <span className="text-[11px] font-medium">Term Record</span>
            <Trophy className="w-3.5 h-3.5 text-yellow-500" />
          </div>
          <div className="mt-1 flex items-baseline space-x-1">
            <span className="text-xl font-extrabold text-slate-900">{stats?.bestStreak || 0}</span>
            <span className="text-[10px] text-slate-400 font-medium">best streak</span>
          </div>
        </div>

        {/* Term Attendance Rate */}
        <div className="bg-white p-3 rounded-xl border border-slate-200/70 shadow-xs">
          <div className="flex items-center justify-between text-slate-500">
            <span className="text-[11px] font-medium">Attendance Rate</span>
            <TrendingUp className="w-3.5 h-3.5 text-emerald-600" />
          </div>
          <div className="mt-1 flex items-baseline space-x-1">
            <span className={`text-xl font-extrabold ${(stats?.overallPercentage || 0) >= 75 ? 'text-emerald-700' : 'text-rose-600'}`}>
              {stats?.overallPercentage || 0}%
            </span>
            <span className="text-[10px] text-slate-400 font-medium">
              ({stats?.totalClassesAttended} / {stats?.totalClassesConducted})
            </span>
          </div>
        </div>

        {/* Full Days */}
        <div className="bg-white p-3 rounded-xl border border-slate-200/70 shadow-xs">
          <div className="flex items-center justify-between text-slate-500">
            <span className="text-[11px] font-medium">100% Present</span>
            <div className="w-2.5 h-2.5 rounded-full bg-emerald-500" />
          </div>
          <div className="mt-1 flex items-baseline space-x-1">
            <span className="text-xl font-extrabold text-emerald-700">{stats?.fullDays || 0}</span>
            <span className="text-[10px] text-slate-400 font-medium">academic days</span>
          </div>
        </div>

        {/* Partial Days */}
        <div className="bg-white p-3 rounded-xl border border-slate-200/70 shadow-xs">
          <div className="flex items-center justify-between text-slate-500">
            <span className="text-[11px] font-medium">Partial Days</span>
            <div className="w-2.5 h-2.5 rounded-full bg-amber-500" />
          </div>
          <div className="mt-1 flex items-baseline space-x-1">
            <span className="text-xl font-extrabold text-amber-700">{stats?.partialDays || 0}</span>
            <span className="text-[10px] text-slate-400 font-medium">days</span>
          </div>
        </div>

        {/* Full Absent Days */}
        <div className="bg-white p-3 rounded-xl border border-slate-200/70 shadow-xs">
          <div className="flex items-center justify-between text-slate-500">
            <span className="text-[11px] font-medium">Full Absences</span>
            <div className="w-2.5 h-2.5 rounded-full bg-rose-500" />
          </div>
          <div className="mt-1 flex items-baseline space-x-1">
            <span className="text-xl font-extrabold text-rose-700">{stats?.absentDays || 0}</span>
            <span className="text-[10px] text-slate-400 font-medium">missed days</span>
          </div>
        </div>
      </div>

      {/* Main Heatmap Visualization & Day Detail Grid */}
      <div className="p-4 sm:p-6 grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left Column: Interactive SVG Grid (8 Cols on desktop) */}
        <div className="lg:col-span-8 flex flex-col items-center sm:items-start overflow-x-auto pb-2">
          <div className="relative">
            <svg
              width={svgWidth}
              height={svgHeight}
              className="select-none overflow-visible"
              role="img"
              aria-label="Attendance pattern heatmap grid"
            >
              {/* Month Labels */}
              {monthLabels.map((m, idx) => {
                const xPos = leftMargin + m.colIndex * colStep;
                return (
                  <text
                    key={`month-${idx}`}
                    x={xPos}
                    y={16}
                    className="text-[11px] font-bold fill-slate-500 uppercase tracking-wider"
                  >
                    {m.name} 2026
                  </text>
                );
              })}

              {/* Day of Week Labels */}
              {dayLabels.map((label, rIdx) => {
                const yPos = topMargin + rIdx * rowStep + 15;
                // Render labels for Mon, Wed, Fri, Sun to keep UI airy
                const shouldShow = rIdx % 2 === 0 || rIdx === 6;
                return (
                  <text
                    key={`dow-${rIdx}`}
                    x={leftMargin - 8}
                    y={yPos}
                    textAnchor="end"
                    className={`text-[10px] font-medium ${
                      shouldShow ? 'fill-slate-400' : 'fill-transparent'
                    }`}
                  >
                    {label}
                  </text>
                );
              })}

              {/* Week Columns & Day Cells */}
              {weekColumns.map((week, colIdx) => {
                const xPos = leftMargin + colIdx * colStep;
                return (
                  <g key={`week-${colIdx}`}>
                    {week.map((day) => {
                      const rowIdx = dayRowIndex(day.day_of_week);
                      const yPos = topMargin + rowIdx * rowStep;
                      const isSelected = selectedDay?.date === day.date;
                      const fill = getCellFill(day);
                      const stroke = getCellStroke(day, isSelected);

                      return (
                        <g
                          key={day.date}
                          className="cursor-pointer group"
                          onClick={() => setSelectedDay(day)}
                          onMouseEnter={(e) => {
                            setHoveredDay(day);
                            const rect = e.currentTarget.getBoundingClientRect();
                            setTooltipPos({ x: rect.left + rect.width / 2, y: rect.top });
                          }}
                          onMouseLeave={() => setHoveredDay(null)}
                        >
                          {/* Main cell rectangle */}
                          <rect
                            x={xPos}
                            y={yPos}
                            width={cellSize}
                            height={cellSize}
                            rx={5}
                            ry={5}
                            fill={fill}
                            stroke={stroke}
                            strokeWidth={isSelected ? 2.5 : day.is_today ? 2 : 1}
                            strokeDasharray={day.status === 'upcoming' ? '2 2' : undefined}
                            className="transition-all duration-150 group-hover:scale-110 transform origin-center"
                          />

                          {/* Today marker inner white dot */}
                          {day.is_today && (
                            <circle
                              cx={xPos + cellSize / 2}
                              cy={yPos + cellSize / 2}
                              r={2.5}
                              fill="#ffffff"
                              className="pointer-events-none"
                            />
                          )}
                        </g>
                      );
                    })}
                  </g>
                );
              })}
            </svg>

            {/* Hover Tooltip (Absolute float over active cell) */}
            {hoveredDay && tooltipPos && (
              <div
                className="fixed z-50 pointer-events-none transform -translate-x-1/2 -translate-y-full mb-2 bg-slate-900 text-white rounded-xl shadow-xl px-3 py-2 text-xs border border-slate-700 animate-in fade-in duration-100"
                style={{
                  left: `${tooltipPos.x}px`,
                  top: `${tooltipPos.y - 8}px`,
                }}
              >
                <div className="font-bold flex items-center space-x-1.5">
                  <span>{hoveredDay.formatted_date}</span>
                  {hoveredDay.is_today && (
                    <span className="px-1.5 py-0.2 bg-blue-500 text-[9px] rounded font-bold">TODAY</span>
                  )}
                </div>
                <div className="text-[11px] text-slate-300 mt-0.5">
                  {hoveredDay.status === 'upcoming' && 'Scheduled future class day'}
                  {hoveredDay.total_conducted === 0 && !hoveredDay.status.includes('upcoming') && (
                    hoveredDay.is_weekend ? 'Weekend / No lectures' : 'Academic Recess / Holiday'
                  )}
                  {hoveredDay.total_conducted > 0 && (
                    <div className="flex items-center space-x-1">
                      <span className="font-semibold text-emerald-400">
                        {hoveredDay.present_count} / {hoveredDay.total_conducted} attended
                      </span>
                      <span>({hoveredDay.percentage}%)</span>
                    </div>
                  )}
                </div>
                {/* Micro tooltip arrow */}
                <div className="absolute top-full left-1/2 -translate-x-1/2 border-4 border-transparent border-t-slate-900" />
              </div>
            )}
          </div>

          {/* Color Scale Legend */}
          <div className="mt-4 pt-3 border-t border-slate-100 w-full flex flex-wrap items-center justify-between gap-3 text-[11px] text-slate-500">
            <div className="flex items-center space-x-1.5">
              <span className="font-medium text-slate-600">Cell Color Key:</span>
            </div>
            <div className="flex flex-wrap items-center gap-3">
              <div className="flex items-center space-x-1.5">
                <span className="w-3.5 h-3.5 rounded bg-slate-100 border border-slate-300" />
                <span>No Class / Weekend</span>
              </div>
              <div className="flex items-center space-x-1.5">
                <span className="w-3.5 h-3.5 rounded bg-rose-500 border border-rose-600" />
                <span>Full Absence (0%)</span>
              </div>
              <div className="flex items-center space-x-1.5">
                <span className="w-3.5 h-3.5 rounded bg-amber-500 border border-amber-600" />
                <span>Partial (1-99%)</span>
              </div>
              <div className="flex items-center space-x-1.5">
                <span className="w-3.5 h-3.5 rounded bg-emerald-500 border border-emerald-600" />
                <span>Full Attendance (100%)</span>
              </div>
              <div className="flex items-center space-x-1.5">
                <span className="w-3.5 h-3.5 rounded bg-emerald-500 border-2 border-blue-500" />
                <span>Today</span>
              </div>
            </div>
          </div>
        </div>

        {/* Right Column: Selected Day Inspector Card (4 Cols on desktop) */}
        <div className="lg:col-span-4 bg-slate-50 rounded-2xl p-4 sm:p-5 border border-slate-200/80 space-y-4">
          <div className="flex items-start justify-between">
            <div>
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                Selected Day Audit
              </span>
              <h4 className="font-bold text-slate-900 text-sm mt-0.5">
                {currentSelectedDayInfo ? currentSelectedDayInfo.formatted_date : 'Select a date on grid'}
              </h4>
              <p className="text-[11px] text-slate-500">
                {currentSelectedDayInfo?.day_name}
                {currentSelectedDayInfo?.is_today ? ' • Today' : ''}
              </p>
            </div>

            {currentSelectedDayInfo && (
              <span
                className={`px-2.5 py-1 rounded-xl text-xs font-bold ${
                  currentSelectedDayInfo.status === 'full'
                    ? 'bg-emerald-100 text-emerald-800 border border-emerald-200'
                    : currentSelectedDayInfo.status === 'partial'
                    ? 'bg-amber-100 text-amber-800 border border-amber-200'
                    : currentSelectedDayInfo.status === 'absent'
                    ? 'bg-rose-100 text-rose-800 border border-rose-200'
                    : 'bg-slate-200 text-slate-700'
                }`}
              >
                {currentSelectedDayInfo.status === 'full' && '100% Present'}
                {currentSelectedDayInfo.status === 'partial' && `${currentSelectedDayInfo.percentage}% Partial`}
                {currentSelectedDayInfo.status === 'absent' && 'Marked Absent'}
                {currentSelectedDayInfo.status === 'none' && (currentSelectedDayInfo.is_weekend ? 'Weekend' : 'No Classes')}
                {currentSelectedDayInfo.status === 'upcoming' && 'Scheduled'}
              </span>
            )}
          </div>

          {/* Session Cards for the Selected Day */}
          {currentSelectedDayInfo && currentSelectedDayInfo.sessions.length > 0 ? (
            <div className="space-y-2.5">
              <span className="text-[11px] font-semibold text-slate-600 block">
                Classroom Sessions ({currentSelectedDayInfo.sessions.length})
              </span>
              <div className="space-y-2">
                {currentSelectedDayInfo.sessions.map((sess) => {
                  const isPresent = sess.status === 'present';
                  return (
                    <div
                      key={sess.id}
                      className="bg-white rounded-xl p-3 border border-slate-200/80 shadow-2xs hover:border-slate-300 transition"
                    >
                      <div className="flex items-start justify-between">
                        <div>
                          <div className="flex items-center space-x-1.5">
                            <span className="text-[10px] font-mono font-bold px-1.5 py-0.5 rounded bg-blue-50 text-blue-700 border border-blue-100">
                              {sess.subject_code}
                            </span>
                            <span className="font-semibold text-xs text-slate-900 truncate max-w-[170px]">
                              {sess.subject_name}
                            </span>
                          </div>
                          <div className="mt-1 flex items-center space-x-1 text-[11px] text-slate-400">
                            <Clock className="w-3 h-3" />
                            <span>{sess.time_slot}</span>
                          </div>
                          <div className="text-[10px] text-slate-400 mt-0.5">
                            Faculty: {sess.faculty_name || 'Department Faculty'}
                          </div>
                        </div>

                        <span
                          className={`px-2 py-0.5 rounded-full text-[10px] font-bold flex items-center space-x-1 ${
                            isPresent
                              ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                              : 'bg-rose-50 text-rose-700 border border-rose-200'
                          }`}
                        >
                          {isPresent ? (
                            <>
                              <CheckCircle2 className="w-3 h-3" />
                              <span>Present</span>
                            </>
                          ) : (
                            <>
                              <XCircle className="w-3 h-3" />
                              <span>Absent</span>
                            </>
                          )}
                        </span>
                      </div>
                      <div className="mt-2 pt-2 border-t border-slate-100 flex items-center justify-between text-[10px] text-slate-400">
                        <span>Method: {sess.method === 'qr_scan' ? 'Camera QR Scan' : 'Faculty Manual'}</span>
                        <span className="font-mono text-emerald-600 font-semibold">Verified</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          ) : (
            <div className="bg-white rounded-xl p-6 border border-slate-200/70 text-center space-y-2">
              <CalendarCheck className="w-8 h-8 text-slate-300 mx-auto" />
              <p className="text-xs text-slate-600 font-medium">
                {currentSelectedDayInfo?.is_weekend
                  ? 'Official Weekend (No lectures scheduled)'
                  : currentSelectedDayInfo?.status === 'upcoming'
                  ? 'Future semester class day'
                  : 'No scheduled lectures on this date'}
              </p>
              <p className="text-[11px] text-slate-400">
                Click any colored square on the SVG calendar to view session logs and verified QR timestamps.
              </p>
            </div>
          )}

          {/* Action Trigger for Leave or Dispute if absent */}
          {currentSelectedDayInfo && currentSelectedDayInfo.absent_count > 0 && onSelectComplaint && (
            <div className="pt-2 border-t border-slate-200">
              <button
                onClick={onSelectComplaint}
                className="w-full py-2 px-3 bg-amber-50 hover:bg-amber-100 border border-amber-200 text-amber-900 rounded-xl text-xs font-semibold flex items-center justify-center space-x-1.5 transition"
              >
                <AlertTriangle className="w-3.5 h-3.5 text-amber-600" />
                <span>Submit Grievance for this Absence</span>
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
