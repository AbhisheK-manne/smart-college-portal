import React, { useState, useEffect } from 'react';
import {
  Bell,
  Search,
  Bot,
  QrCode,
  LogOut,
  ChevronDown,
  Shield,
  GraduationCap,
  Briefcase,
  Users,
  CheckCircle,
  Menu,
  Key,
  BookOpen,
  Home
} from 'lucide-react';
import { useAuth } from '../context/AuthContext.tsx';
import { UserRole } from '../types/index.ts';
import { CredentialDirectoryModal } from './CredentialDirectoryModal.tsx';

interface Props {
  onOpenSearch: () => void;
  onOpenAiAssistant: () => void;
  onOpenIdCard: () => void;
  onToggleSidebar: () => void;
}

export const Navbar: React.FC<Props> = ({
  onOpenSearch,
  onOpenAiAssistant,
  onOpenIdCard,
  onToggleSidebar,
}) => {
  const { user, token, logout, quickSwitch, login } = useAuth();
  const [notifications, setNotifications] = useState<any[]>([]);
  const [showNotifMenu, setShowNotifMenu] = useState(false);
  const [showRoleMenu, setShowRoleMenu] = useState(false);
  const [showDirectoryModal, setShowDirectoryModal] = useState(false);

  useEffect(() => {
    if (token) {
      fetch('/api/notifications', {
        headers: { Authorization: `Bearer ${token}` },
      })
        .then((res) => res.json())
        .then((data) => {
          if (Array.isArray(data)) setNotifications(data);
        })
        .catch((err) => console.error('Error fetching notifications:', err));
    }
  }, [token]);

  const unreadCount = notifications.filter((n) => !n.is_read).length;

  const markAllRead = async () => {
    try {
      await fetch('/api/notifications/mark-read', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({}),
      });
      setNotifications((prev) => prev.map((n) => ({ ...n, is_read: true })));
    } catch (err) {
      console.error(err);
    }
  };

  const roleConfig: Record<UserRole, { label: string; color: string; icon: any }> = {
    student: { label: 'Student', color: 'bg-blue-100 text-blue-800 border-blue-200', icon: GraduationCap },
    faculty: { label: 'Faculty / Staff', color: 'bg-emerald-100 text-emerald-800 border-emerald-200', icon: Users },
    hod: { label: 'HOD / Dept Admin', color: 'bg-purple-100 text-purple-800 border-purple-200', icon: Shield },
    placement: { label: 'Placement Cell', color: 'bg-amber-100 text-amber-800 border-amber-200', icon: Briefcase },
    admin: { label: 'Super Admin', color: 'bg-rose-100 text-rose-800 border-rose-200', icon: Shield },
  };

  const currentRole = user?.role || 'student';
  const CurrentRoleIcon = roleConfig[currentRole]?.icon || GraduationCap;

  return (
    <header className="sticky top-0 z-40 bg-white border-b border-slate-200 shadow-2xs">
      <div className="px-4 sm:px-6 flex items-center justify-between h-16">
        {/* Left branding */}
        <div className="flex items-center space-x-3">
          <button
            onClick={onToggleSidebar}
            className="p-2 -ml-2 text-slate-500 hover:text-slate-800 hover:bg-slate-100 rounded-lg lg:hidden transition"
          >
            <Menu className="w-5 h-5" />
          </button>

          <div className="flex items-center space-x-2.5">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-blue-700 to-indigo-600 flex items-center justify-center text-white shadow-xs">
              <GraduationCap className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center space-x-1.5">
                <span className="font-black text-slate-900 tracking-tight text-base sm:text-lg">TKREC</span>
                <span className="text-[10px] font-bold px-1.5 py-0.2 bg-blue-50 text-blue-700 rounded border border-blue-200">CAMPUS OS</span>
              </div>
              <p className="text-[10px] text-slate-500 hidden sm:block font-medium">Teegala Krishna Reddy Engineering College</p>
            </div>
          </div>
        </div>

        {/* Global Search Button */}
        <button
          onClick={onOpenSearch}
          className="hidden md:flex items-center space-x-3 px-3.5 py-2 bg-slate-100 hover:bg-slate-200/70 border border-slate-200 rounded-xl text-slate-500 text-xs w-64 lg:w-80 transition"
        >
          <Search className="w-4 h-4 text-slate-400" />
          <span className="flex-1 text-left">Search events, placements, subjects...</span>
          <kbd className="px-1.5 py-0.5 text-[10px] font-mono bg-white border border-slate-200 rounded shadow-2xs text-slate-400">Ctrl K</kbd>
        </button>

        {/* Right Actions */}
        <div className="flex items-center space-x-2 sm:space-x-3">
          {/* Quick Search on mobile */}
          <button
            onClick={onOpenSearch}
            className="md:hidden p-2 text-slate-500 hover:text-slate-700 hover:bg-slate-100 rounded-xl"
            title="Search"
          >
            <Search className="w-5 h-5" />
          </button>

          {/* Digital ID Card (Students only) */}
          {user?.role === 'student' && (
            <button
              onClick={onOpenIdCard}
              className="flex items-center space-x-1.5 px-3 py-1.5 bg-blue-50 hover:bg-blue-100 text-blue-700 border border-blue-200 rounded-xl text-xs font-semibold transition"
            >
              <QrCode className="w-4 h-4" />
              <span className="hidden sm:inline">My Smart ID</span>
            </button>
          )}

          {/* Roll Numbers & Passwords Directory Button */}
          <button
            onClick={() => setShowDirectoryModal(true)}
            className="flex items-center space-x-1.5 px-3 py-1.5 bg-amber-50 hover:bg-amber-100 text-amber-900 border border-amber-200 rounded-xl text-xs font-bold transition"
            title="View all 100 student roll numbers, faculty logins & default passwords"
          >
            <Key className="w-4 h-4 text-amber-600" />
            <span className="hidden sm:inline">Roll Nos & IDs</span>
          </button>

          {/* AI Assistant Button */}
          <button
            onClick={onOpenAiAssistant}
            className="flex items-center space-x-1.5 px-3 py-1.5 bg-gradient-to-r from-indigo-600 to-blue-600 hover:from-indigo-700 hover:to-blue-700 text-white rounded-xl text-xs font-semibold shadow-xs transition"
          >
            <Bot className="w-4 h-4" />
            <span className="hidden sm:inline">AI Assistant</span>
          </button>

          {/* Notifications Dropdown */}
          <div className="relative">
            <button
              onClick={() => {
                setShowNotifMenu(!showNotifMenu);
                setShowRoleMenu(false);
              }}
              className="relative p-2 text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-xl transition"
            >
              <Bell className="w-5 h-5" />
              {unreadCount > 0 && (
                <span className="absolute top-1 right-1 w-4 h-4 bg-rose-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center animate-pulse">
                  {unreadCount}
                </span>
              )}
            </button>

            {showNotifMenu && (
              <div className="absolute right-0 mt-2 w-80 sm:w-96 bg-white rounded-2xl shadow-xl border border-slate-200 overflow-hidden z-50">
                <div className="p-3.5 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <span className="font-bold text-xs text-slate-800 uppercase tracking-wider">Campus Alerts</span>
                    {unreadCount > 0 && (
                      <span className="px-1.5 py-0.5 text-[10px] font-bold bg-rose-100 text-rose-700 rounded-full">
                        {unreadCount} new
                      </span>
                    )}
                  </div>
                  {unreadCount > 0 && (
                    <button
                      onClick={markAllRead}
                      className="text-xs text-blue-600 hover:text-blue-800 font-medium"
                    >
                      Mark all read
                    </button>
                  )}
                </div>

                <div className="max-h-80 overflow-y-auto divide-y divide-slate-100 text-xs">
                  {notifications.length === 0 ? (
                    <div className="p-6 text-center text-slate-400">No notifications at this time.</div>
                  ) : (
                    notifications.map((n) => (
                      <div
                        key={n.id}
                        className={`p-3.5 transition ${n.is_read ? 'bg-white opacity-80' : 'bg-blue-50/40'}`}
                      >
                        <div className="flex items-start justify-between">
                          <span className="font-bold text-slate-900 leading-tight">{n.title}</span>
                          <span className="text-[10px] text-slate-400 shrink-0 ml-2">
                            {new Date(n.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          </span>
                        </div>
                        <p className="text-slate-600 mt-1 leading-normal">{n.message}</p>
                      </div>
                    ))
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Role Switcher Menu */}
          <div className="relative">
            <button
              onClick={() => {
                setShowRoleMenu(!showRoleMenu);
                setShowNotifMenu(false);
              }}
              className={`flex items-center space-x-2 px-2.5 py-1.5 rounded-xl border text-xs font-semibold transition ${
                roleConfig[currentRole]?.color || 'bg-slate-100'
              }`}
            >
              <CurrentRoleIcon className="w-3.5 h-3.5" />
              <span className="hidden md:inline">{roleConfig[currentRole]?.label}</span>
              <ChevronDown className="w-3.5 h-3.5 opacity-60" />
            </button>

            {showRoleMenu && (
              <div className="absolute right-0 mt-2 w-64 bg-white rounded-2xl shadow-xl border border-slate-200 overflow-hidden z-50 p-2 text-xs">
                <div className="px-3 py-2 text-[10px] font-bold uppercase tracking-wider text-slate-400">
                  Switch Active Role (Demo)
                </div>
                <div className="space-y-1">
                  {(Object.keys(roleConfig) as UserRole[]).map((r) => {
                    const cfg = roleConfig[r];
                    const Icon = cfg.icon;
                    const isActive = currentRole === r;
                    return (
                      <button
                        key={r}
                        onClick={() => {
                          quickSwitch(r);
                          setShowRoleMenu(false);
                        }}
                        className={`w-full flex items-center justify-between p-2 rounded-xl text-left transition ${
                          isActive ? 'bg-slate-100 font-bold text-slate-900' : 'hover:bg-slate-50 text-slate-700'
                        }`}
                      >
                        <div className="flex items-center space-x-2">
                          <Icon className="w-4 h-4 text-slate-500" />
                          <span>{cfg.label}</span>
                        </div>
                        {isActive && <CheckCircle className="w-4 h-4 text-emerald-600" />}
                      </button>
                    );
                  })}
                </div>

                <div className="border-t border-slate-100 mt-2 pt-1 space-y-1">
                  <button
                    onClick={() => {
                      setShowRoleMenu(false);
                      setShowDirectoryModal(true);
                    }}
                    className="w-full flex items-center space-x-2 p-2 rounded-xl text-blue-700 bg-blue-50/70 hover:bg-blue-100/70 text-left font-bold text-xs transition"
                  >
                    <BookOpen className="w-4 h-4 text-blue-600" />
                    <span>All 123 Student & Staff IDs</span>
                  </button>

                  <button
                    onClick={() => {
                      logout();
                      setShowRoleMenu(false);
                    }}
                    className="w-full flex items-center space-x-2 p-2 rounded-xl text-slate-700 hover:bg-slate-100 text-left font-medium text-xs transition"
                  >
                    <Home className="w-4 h-4 text-blue-600" />
                    <span>College Home (Student & Staff Login)</span>
                  </button>

                  <button
                    onClick={() => {
                      logout();
                      setShowRoleMenu(false);
                    }}
                    className="w-full flex items-center space-x-2 p-2 rounded-xl text-rose-600 hover:bg-rose-50 text-left font-medium transition"
                  >
                    <LogOut className="w-4 h-4" />
                    <span>Log Out</span>
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* User Avatar */}
          <div className="hidden sm:flex items-center space-x-2 pl-1 border-l border-slate-200">
            <img
              src={user?.avatar_url || 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=100'}
              alt={user?.name}
              className="w-8 h-8 rounded-full object-cover ring-2 ring-blue-500/20"
            />
            <div className="text-left hidden lg:block">
              <div className="text-xs font-bold text-slate-900 truncate max-w-[120px]">{user?.name}</div>
              <div className="text-[10px] text-slate-400 font-mono truncate max-w-[120px]">{user?.identifier}</div>
            </div>
          </div>
        </div>
      </div>

      {/* Directory Modal */}
      <CredentialDirectoryModal
        isOpen={showDirectoryModal}
        onClose={() => setShowDirectoryModal(false)}
        onSelectAccount={(identifier, pw) => {
          login(identifier, pw || 'college123');
          setShowDirectoryModal(false);
        }}
      />
    </header>
  );
};
