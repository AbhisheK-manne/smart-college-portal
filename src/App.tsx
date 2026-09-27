import React, { useState } from 'react';
import { AuthProvider, useAuth } from './context/AuthContext.tsx';
import { Navbar } from './components/Navbar.tsx';
import { Sidebar } from './components/Sidebar.tsx';
import { GlobalSearchModal } from './components/GlobalSearchModal.tsx';
import { AiAssistantDrawer } from './components/AiAssistantDrawer.tsx';
import { AiComplaintModal } from './components/AiComplaintModal.tsx';
import { DigitalIdCard } from './components/DigitalIdCard.tsx';

import { LoginView } from './views/LoginView.tsx';
import { StudentDashboard } from './views/StudentDashboard.tsx';
import { FacultyAttendanceScanner } from './views/FacultyAttendanceScanner.tsx';
import { HodAdminDashboard } from './views/HodAdminDashboard.tsx';
import { PlacementCellView } from './views/PlacementCellView.tsx';
import { SuperAdminView } from './views/SuperAdminView.tsx';
import { DatabasePortalView } from './views/DatabasePortalView.tsx';

import { Bot, Sparkles, MessageSquarePlus } from 'lucide-react';

const PortalMain: React.FC = () => {
  const { user, loading } = useAuth();
  const [activeTab, setActiveTab] = useState<string>('dashboard');
  const [sidebarOpen, setSidebarOpen] = useState(false);

  // Modals state
  const [searchOpen, setSearchOpen] = useState(false);
  const [aiAssistantOpen, setAiAssistantOpen] = useState(false);
  const [complaintModalOpen, setComplaintModalOpen] = useState(false);
  const [idCardOpen, setIdCardOpen] = useState(false);

  // Keyboard shortcut for search
  React.useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
        e.preventDefault();
        setSearchOpen((prev) => !prev);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  // Update default tab when role switches
  React.useEffect(() => {
    if (!user) return;
    if (user.role === 'student') setActiveTab('dashboard');
    else if (user.role === 'faculty') setActiveTab('attendance_scanner');
    else if (user.role === 'hod') setActiveTab('hod_dashboard');
    else if (user.role === 'placement') setActiveTab('placement_drives');
    else if (user.role === 'admin') setActiveTab('admin_dashboard');
  }, [user?.role]);

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-900 flex items-center justify-center">
        <div className="text-center space-y-3">
          <div className="w-10 h-10 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto"></div>
          <p className="text-sm text-slate-300 font-medium">Initializing TKREC Campus OS...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return <LoginView />;
  }

  // Render content according to user role and active tab
  const renderContent = () => {
    if (activeTab === 'database_portal') {
      return <DatabasePortalView />;
    }

    const role = user.role;

    // STUDENT ROLE
    if (role === 'student') {
      return (
        <StudentDashboard
          activeTab={activeTab}
          onOpenIdCard={() => setIdCardOpen(true)}
          onOpenComplaintModal={() => setComplaintModalOpen(true)}
          onNavigateTab={(tab) => setActiveTab(tab)}
        />
      );
    }

    // FACULTY ROLE
    if (role === 'faculty') {
      if (activeTab === 'attendance_scanner' || activeTab === 'attendance_records') {
        return <FacultyAttendanceScanner />;
      }
      if (activeTab === 'complaints') {
        return <HodAdminDashboard />;
      }
      return <FacultyAttendanceScanner />;
    }

    // HOD / DEPARTMENT ADMIN
    if (role === 'hod') {
      if (activeTab === 'attendance_reports') {
        return <FacultyAttendanceScanner />;
      }
      return <HodAdminDashboard />;
    }

    // PLACEMENT CELL
    if (role === 'placement') {
      return <PlacementCellView />;
    }

    // SUPER ADMIN
    if (role === 'admin') {
      if (activeTab === 'attendance_audit') {
        return <FacultyAttendanceScanner />;
      }
      if (activeTab === 'all_placements') {
        return <PlacementCellView />;
      }
      return <SuperAdminView />;
    }

    return (
      <StudentDashboard
        activeTab={activeTab}
        onOpenIdCard={() => setIdCardOpen(true)}
        onOpenComplaintModal={() => setComplaintModalOpen(true)}
        onNavigateTab={(tab) => setActiveTab(tab)}
      />
    );
  };

  return (
    <div className="min-h-screen bg-slate-100 flex flex-col font-sans text-slate-900 antialiased selection:bg-blue-600 selection:text-white">
      {/* Top Navigation */}
      <Navbar
        onOpenSearch={() => setSearchOpen(true)}
        onOpenAiAssistant={() => setAiAssistantOpen(true)}
        onOpenIdCard={() => setIdCardOpen(true)}
        onToggleSidebar={() => setSidebarOpen(!sidebarOpen)}
      />

      <div className="flex-1 flex overflow-hidden">
        {/* Dynamic Sidebar */}
        <Sidebar
          activeTab={activeTab}
          onSelectTab={(tab) => setActiveTab(tab)}
          isOpen={sidebarOpen}
          onClose={() => setSidebarOpen(false)}
        />

        {/* Main Content Area */}
        <main className="flex-1 lg:pl-64 overflow-y-auto">
          {renderContent()}
        </main>
      </div>

      {/* Floating AI Campus Assistant Button */}
      <div className="fixed bottom-6 right-6 z-30 flex flex-col items-end space-y-2">
        {user.role === 'student' && (
          <button
            onClick={() => setComplaintModalOpen(true)}
            className="flex items-center space-x-2 px-3.5 py-2 bg-white hover:bg-slate-50 text-slate-700 border border-slate-200 rounded-full shadow-lg text-xs font-bold transition hover:scale-105"
          >
            <MessageSquarePlus className="w-4 h-4 text-amber-600" />
            <span className="hidden sm:inline">AI Grievance Desk</span>
          </button>
        )}

        <button
          onClick={() => setAiAssistantOpen(true)}
          className="relative group p-3.5 bg-gradient-to-tr from-blue-700 via-indigo-600 to-blue-600 text-white rounded-2xl shadow-xl hover:shadow-blue-500/25 transition hover:scale-105 flex items-center space-x-2"
        >
          <Bot className="w-6 h-6 animate-pulse" />
          <span className="text-xs font-bold pr-1 hidden sm:inline">Ask AI Assistant</span>
          <span className="absolute -top-1 -right-1 flex h-3 w-3">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-3 w-3 bg-emerald-500"></span>
          </span>
        </button>
      </div>

      {/* Global Modals */}
      <GlobalSearchModal
        isOpen={searchOpen}
        onClose={() => setSearchOpen(false)}
        onNavigateTab={(tab) => setActiveTab(tab)}
      />

      <AiAssistantDrawer
        isOpen={aiAssistantOpen}
        onClose={() => setAiAssistantOpen(false)}
        onOpenComplaintModal={() => {
          setAiAssistantOpen(false);
          setComplaintModalOpen(true);
        }}
      />

      <AiComplaintModal
        isOpen={complaintModalOpen}
        onClose={() => setComplaintModalOpen(false)}
      />

      <DigitalIdCard
        isOpen={idCardOpen}
        onClose={() => setIdCardOpen(false)}
      />
    </div>
  );
};

export default function App() {
  return (
    <AuthProvider>
      <PortalMain />
    </AuthProvider>
  );
}
