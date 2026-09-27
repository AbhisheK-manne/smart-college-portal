import React, { useState } from 'react';
import {
  LayoutDashboard,
  QrCode,
  Calendar,
  Briefcase,
  Award,
  AlertCircle,
  Megaphone,
  BookOpen,
  Users,
  Shield,
  FileSpreadsheet,
  Building,
  Activity,
  Database,
  Key,
  Home,
  LogOut,
  X
} from 'lucide-react';
import { useAuth } from '../context/AuthContext.tsx';
import { CredentialDirectoryModal } from './CredentialDirectoryModal.tsx';

interface Props {
  activeTab: string;
  onSelectTab: (tab: string) => void;
  isOpen: boolean;
  onClose: () => void;
}

export const Sidebar: React.FC<Props> = ({ activeTab, onSelectTab, isOpen, onClose }) => {
  const { user, login, logout } = useAuth();
  const [showDirectoryModal, setShowDirectoryModal] = useState(false);
  const role = user?.role || 'student';

  const studentNav = [
    { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { id: 'attendance', label: 'Attendance & Classes', icon: QrCode },
    { id: 'academics', label: 'Academics & Marks', icon: BookOpen },
    { id: 'events', label: 'Events & Hackathons', icon: Calendar },
    { id: 'placements', label: 'Campus Placements', icon: Briefcase },
    { id: 'internships', label: 'Internships Hub', icon: Award },
    { id: 'complaints', label: 'Grievance / Complaints', icon: AlertCircle },
    { id: 'announcements', label: 'Notices & Circulars', icon: Megaphone },
  ];

  const facultyNav = [
    { id: 'attendance_scanner', label: 'Attendance Scanner', icon: QrCode },
    { id: 'attendance_records', label: 'Class Attendance Logs', icon: FileSpreadsheet },
    { id: 'complaints', label: 'Student Grievances', icon: AlertCircle },
    { id: 'events', label: 'College Events', icon: Calendar },
    { id: 'announcements', label: 'Announcements', icon: Megaphone },
  ];

  const hodNav = [
    { id: 'hod_dashboard', label: 'Department Analytics', icon: LayoutDashboard },
    { id: 'attendance_reports', label: 'Attendance Reports', icon: FileSpreadsheet },
    { id: 'complaints', label: 'Grievance Resolution', icon: AlertCircle },
    { id: 'faculty_directory', label: 'Faculty & Subjects', icon: Users },
    { id: 'placements', label: 'Department Placements', icon: Briefcase },
    { id: 'database_portal', label: 'Database & Storage', icon: Database },
    { id: 'announcements', label: 'Publish Circular', icon: Megaphone },
  ];

  const placementNav = [
    { id: 'placement_drives', label: 'Placement Drives', icon: Briefcase },
    { id: 'internships_market', label: 'Internships Portal', icon: Award },
    { id: 'companies_pool', label: 'Partner Companies', icon: Building },
    { id: 'announcements', label: 'Placement Notices', icon: Megaphone },
  ];

  const adminNav = [
    { id: 'admin_dashboard', label: 'System Analytics', icon: Activity },
    { id: 'database_portal', label: 'Database & Storage', icon: Database },
    { id: 'user_management', label: 'Students & Faculty', icon: Users },
    { id: 'attendance_audit', label: 'Attendance Audit Logs', icon: Shield },
    { id: 'all_complaints', label: 'Campus Grievances', icon: AlertCircle },
    { id: 'all_events', label: 'Event Master', icon: Calendar },
    { id: 'all_placements', label: 'Placement Master', icon: Briefcase },
    { id: 'announcements', label: 'Broadcast Circular', icon: Megaphone },
  ];

  let currentNav = studentNav;
  if (role === 'faculty') currentNav = facultyNav;
  if (role === 'hod') currentNav = hodNav;
  if (role === 'placement') currentNav = placementNav;
  if (role === 'admin') currentNav = adminNav;

  return (
    <>
      {/* Mobile Backdrop */}
      {isOpen && (
        <div
          onClick={onClose}
          className="fixed inset-0 z-40 bg-slate-900/50 backdrop-blur-xs lg:hidden"
        />
      )}

      {/* Sidebar Container */}
      <aside
        className={`fixed top-16 bottom-0 left-0 z-40 w-64 bg-slate-900 text-slate-300 flex flex-col border-r border-slate-800 transition-transform duration-200 ease-in-out lg:translate-x-0 ${
          isOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        {/* User Card */}
        <div className="p-4 border-b border-slate-800 flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-xl bg-blue-600/20 border border-blue-500/30 flex items-center justify-center text-blue-400 font-bold">
              {user?.department_code || 'TKREC'}
            </div>
            <div className="overflow-hidden">
              <div className="text-xs font-bold text-white truncate">{user?.name}</div>
              <div className="text-[11px] text-slate-400 font-mono uppercase tracking-wider">{user?.role}</div>
            </div>
          </div>
          <button onClick={onClose} className="p-1 rounded-lg text-slate-400 hover:text-white lg:hidden">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Navigation Links */}
        <nav className="flex-1 p-3 space-y-1 overflow-y-auto">
          {currentNav.map((item) => {
            const Icon = item.icon;
            const isActive = activeTab === item.id;
            return (
              <button
                key={item.id}
                onClick={() => {
                  onSelectTab(item.id);
                  onClose();
                }}
                className={`w-full flex items-center space-x-3 px-3.5 py-2.5 rounded-xl text-xs font-semibold transition ${
                  isActive
                    ? 'bg-blue-600 text-white shadow-xs'
                    : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
                }`}
              >
                <Icon className={`w-4 h-4 ${isActive ? 'text-white' : 'text-slate-400'}`} />
                <span>{item.label}</span>
              </button>
            );
          })}
        </nav>

        {/* College Home Website & Credential Directory Launcher */}
        <div className="px-3 pb-2 pt-1 border-t border-slate-800/80 space-y-1.5">
          <button
            onClick={() => {
              logout();
              onClose();
            }}
            className="w-full flex items-center justify-between px-3 py-2 rounded-xl bg-slate-800/60 hover:bg-slate-800 text-blue-300 text-xs font-semibold border border-blue-500/20 transition group"
            title="Return to TKREC College Home with Student & Staff Login"
          >
            <div className="flex items-center space-x-2">
              <Home className="w-3.5 h-3.5 text-blue-400 group-hover:scale-110 transition" />
              <span>College Home Website</span>
            </div>
            <span className="text-[10px] text-slate-400">Exit</span>
          </button>

          <button
            onClick={() => setShowDirectoryModal(true)}
            className="w-full flex items-center justify-between px-3 py-2 rounded-xl bg-slate-800/80 hover:bg-slate-800 text-amber-300 text-xs font-semibold border border-amber-500/20 transition group"
            title="Browse all 100 student roll numbers and 20 faculty staff IDs"
          >
            <div className="flex items-center space-x-2">
              <Key className="w-3.5 h-3.5 text-amber-400 group-hover:scale-110 transition" />
              <span>Roll Nos & IDs</span>
            </div>
            <span className="text-[10px] px-1.5 py-0.2 rounded bg-amber-400/20 text-amber-200 font-mono">123</span>
          </button>
        </div>

        {/* Bottom Status Tag */}
        <div className="p-4 border-t border-slate-800 text-[11px] text-slate-500 flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
            <span className="text-slate-400">PostgreSQL Cloud</span>
          </div>
          <span className="font-mono text-[10px] text-slate-400">v2.4 (Prod)</span>
        </div>
      </aside>

      {/* Credential Directory Modal */}
      <CredentialDirectoryModal
        isOpen={showDirectoryModal}
        onClose={() => setShowDirectoryModal(false)}
        onSelectAccount={(identifier, pw) => {
          login(identifier, pw || 'college123');
          setShowDirectoryModal(false);
          onClose();
        }}
      />
    </>
  );
};
