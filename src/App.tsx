import React, { useState } from 'react';
import { DatabaseProvider, useDatabase } from './context/DatabaseContext';
import { Header } from './components/layout/Header';
import { Sidebar, ActiveTab } from './components/layout/Sidebar';
import { MobileBottomNav } from './components/layout/MobileBottomNav';
import { DashboardOverview } from './components/dashboard/DashboardOverview';
import { StudentList } from './components/students/StudentList';
import { StudentProfileModal } from './components/students/StudentProfileModal';
import { StudentFormModal } from './components/students/StudentFormModal';
import { ClassPromotionModal } from './components/students/ClassPromotionModal';
import { ExcelImportWizard } from './components/import/ExcelImportWizard';
import { AttendanceManager } from './components/attendance/AttendanceManager';
import { DisciplineManager } from './components/discipline/DisciplineManager';
import { HomeVisitManager } from './components/homevisit/HomeVisitManager';
import { NotesManager } from './components/notes/NotesManager';
import { AchievementsManager } from './components/achievements/AchievementsManager';
import { ParentCommManager } from './components/communication/ParentCommManager';
import { ReportsCenter } from './components/reports/ReportsCenter';
import { SettingsManager } from './components/settings/SettingsManager';
import { ToastNotification } from './components/common/ToastNotification';
import { LoginModal } from './components/auth/LoginModal';

const MainAppContent: React.FC = () => {
  const { allStudentsFullData, db, toast, clearToast, isLoginModalOpen, setIsLoginModalOpen } = useDatabase();
  const [activeTab, setActiveTab] = useState<ActiveTab>('dashboard');
  const [mobileMenuOpen, setMobileMenuOpen] = useState<boolean>(false);

  // Modals state
  const [viewingStudentId, setViewingStudentId] = useState<string | null>(null);
  const [editingStudentId, setEditingStudentId] = useState<string | null>(null);
  const [showAddStudentModal, setShowAddStudentModal] = useState<boolean>(false);
  const [promotionStudentIds, setPromotionStudentIds] = useState<string[] | null>(null);

  // Early warning count
  const earlyWarningCount = allStudentsFullData.filter(
    s => s.warning_level === 'Prioritas Tinggi' || s.warning_level === 'Perlu Perhatian'
  ).length;

  const activeViolationsCount = db.violations.filter(v => v.status !== 'Selesai').length;

  return (
    <div className="min-h-screen bg-zinc-50 text-zinc-900 flex flex-col font-sans antialiased">
      {/* Top Header */}
      <Header 
        onOpenImport={() => setActiveTab('import')} 
        onOpenSettings={() => setActiveTab('settings')}
        onToggleMobileMenu={() => setMobileMenuOpen(prev => !prev)}
      />

      {/* Main Workspace Layout: Sidebar + Bento Content */}
      <div className="flex-1 flex flex-row overflow-hidden relative">
        <Sidebar
          activeTab={activeTab}
          setActiveTab={setActiveTab}
          earlyWarningCount={earlyWarningCount}
          activeViolationsCount={activeViolationsCount}
          mobileOpen={mobileMenuOpen}
          onCloseMobile={() => setMobileMenuOpen(false)}
        />

        {/* Dynamic Bento Workspace Area with safe bottom spacing on mobile for navigation bar */}
        <main className="flex-1 overflow-y-auto p-3 sm:p-5 md:p-6 lg:p-8 pb-20 lg:pb-8 bg-zinc-50/70">
          <div className="max-w-7xl mx-auto">
            {activeTab === 'dashboard' && (
              <DashboardOverview
                setActiveTab={setActiveTab}
                onSelectStudent={(id) => setViewingStudentId(id)}
              />
            )}

            {activeTab === 'students' && (
              <StudentList
                onSelectStudent={(id) => setViewingStudentId(id)}
                onOpenAddModal={() => setShowAddStudentModal(true)}
                onOpenEditModal={(id) => setEditingStudentId(id)}
                onOpenPromotionModal={(ids) => setPromotionStudentIds(ids)}
                onOpenImport={() => setActiveTab('import')}
              />
            )}

            {activeTab === 'import' && (
              <ExcelImportWizard
                onSuccessNavigate={() => setActiveTab('students')}
              />
            )}

            {activeTab === 'attendance' && <AttendanceManager />}

            {activeTab === 'discipline' && <DisciplineManager />}

            {activeTab === 'homevisit' && <HomeVisitManager />}

            {activeTab === 'notes' && <NotesManager />}

            {activeTab === 'achievements' && <AchievementsManager />}

            {activeTab === 'communication' && <ParentCommManager />}

            {activeTab === 'reports' && <ReportsCenter />}

            {activeTab === 'settings' && <SettingsManager />}
          </div>
        </main>
      </div>

      {/* Mobile Bottom Quick Navigation */}
      <MobileBottomNav
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        onOpenMobileMenu={() => setMobileMenuOpen(true)}
        earlyWarningCount={earlyWarningCount}
        studentCount={allStudentsFullData.length}
      />

      {/* Global Cloud Toast Notification with Auto-Dismiss & Countdown */}
      <ToastNotification toast={toast} onClose={clearToast} />

      {/* Multi-Account Login / Switcher Modal */}
      <LoginModal 
        isOpen={isLoginModalOpen} 
        onClose={() => setIsLoginModalOpen(false)} 
      />

      {/* Global Modals */}
      {viewingStudentId && (
        <StudentProfileModal
          studentId={viewingStudentId}
          onClose={() => setViewingStudentId(null)}
        />
      )}

      {(showAddStudentModal || editingStudentId) && (
        <StudentFormModal
          studentId={editingStudentId}
          onClose={() => {
            setShowAddStudentModal(false);
            setEditingStudentId(null);
          }}
        />
      )}

      {promotionStudentIds && (
        <ClassPromotionModal
          selectedStudentIds={promotionStudentIds}
          onClose={() => setPromotionStudentIds(null)}
        />
      )}
    </div>
  );
};

export default function App() {
  return (
    <DatabaseProvider>
      <MainAppContent />
    </DatabaseProvider>
  );
}
