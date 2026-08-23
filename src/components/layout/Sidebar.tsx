import React from 'react';
import { useDatabase } from '../../context/DatabaseContext';
import { 
  LayoutDashboard, 
  Users, 
  FileSpreadsheet, 
  CalendarCheck, 
  ShieldAlert, 
  Home, 
  StickyNote, 
  Trophy, 
  MessageSquareQuote, 
  FileText, 
  Settings,
  AlertTriangle,
  X,
  GraduationCap
} from 'lucide-react';

export type ActiveTab = 
  | 'dashboard'
  | 'students'
  | 'import'
  | 'attendance'
  | 'discipline'
  | 'homevisit'
  | 'notes'
  | 'achievements'
  | 'communication'
  | 'reports'
  | 'settings';

interface SidebarProps {
  activeTab: ActiveTab;
  setActiveTab: (tab: ActiveTab) => void;
  earlyWarningCount: number;
  activeViolationsCount: number;
  mobileOpen?: boolean;
  onCloseMobile?: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({ 
  activeTab, 
  setActiveTab, 
  earlyWarningCount,
  activeViolationsCount,
  mobileOpen = false,
  onCloseMobile,
}) => {
  const { allStudentsFullData, db, activeClass } = useDatabase();

  const navItems: { id: ActiveTab; label: string; icon: any; badge?: number; badgeColor?: string; subtitle?: string }[] = [
    {
      id: 'dashboard',
      label: 'Dashboard',
      icon: LayoutDashboard,
      subtitle: 'Monitoring & Bento Stats',
    },
    {
      id: 'students',
      label: 'Daftar Siswa',
      icon: Users,
      badge: allStudentsFullData.length,
      badgeColor: 'bg-blue-100 text-blue-700',
      subtitle: 'Database & Riwayat',
    },
    {
      id: 'import',
      label: 'Import Excel / Sheets',
      icon: FileSpreadsheet,
      subtitle: 'Wizard & Sync',
    },
    {
      id: 'attendance',
      label: 'Presensi Harian',
      icon: CalendarCheck,
      subtitle: 'Input & Rekap',
    },
    {
      id: 'discipline',
      label: 'Kedisiplinan',
      icon: ShieldAlert,
      badge: activeViolationsCount > 0 ? activeViolationsCount : undefined,
      badgeColor: 'bg-red-100 text-red-700',
      subtitle: 'Kasus & Pembinaan',
    },
    {
      id: 'homevisit',
      label: 'Home Visit',
      icon: Home,
      subtitle: 'Kunjungan Rumah',
    },
    {
      id: 'notes',
      label: 'Catatan Siswa',
      icon: StickyNote,
      subtitle: 'Timeline & Perilaku',
    },
    {
      id: 'achievements',
      label: 'Prestasi & Potensi',
      icon: Trophy,
      subtitle: 'Kejuaraan & Bakat',
    },
    {
      id: 'communication',
      label: 'Komunikasi Ortu',
      icon: MessageSquareQuote,
      subtitle: 'Log WA & Surat',
    },
    {
      id: 'reports',
      label: 'Laporan & Raport',
      icon: FileText,
      subtitle: 'PDF & Rekap Excel',
    },
    {
      id: 'settings',
      label: 'Pengaturan',
      icon: Settings,
      subtitle: 'Profil & Bobot',
    },
  ];

  const handleSelectTab = (tab: ActiveTab) => {
    setActiveTab(tab);
    if (onCloseMobile) {
      onCloseMobile();
    }
  };

  const sidebarContent = (
    <div className="flex flex-col h-full bg-white border-r border-zinc-200">
      {/* Brand Header */}
      <div className="p-4 sm:p-5 border-b border-zinc-100 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center text-white font-bold text-sm shadow-xs">
            <GraduationCap className="w-5 h-5" />
          </div>
          <div>
            <span className="font-bold text-sm sm:text-base tracking-tight text-zinc-900">WALI KELAS</span>
            <p className="text-[10px] text-zinc-400 uppercase tracking-widest font-bold">Terpadu v1.2</p>
          </div>
        </div>

        {/* Mobile close button */}
        {onCloseMobile && (
          <button
            onClick={onCloseMobile}
            className="lg:hidden p-2 text-zinc-500 hover:text-zinc-900 rounded-lg cursor-pointer min-h-[44px] min-w-[44px] flex items-center justify-center"
            aria-label="Tutup Menu"
          >
            <X className="w-5 h-5" />
          </button>
        )}
      </div>

      {/* Early Warning Banner if any */}
      {earlyWarningCount > 0 && (
        <div className="p-3 mx-3 mt-3 bg-red-50 border border-red-100 rounded-xl">
          <div className="flex items-center space-x-2">
            <AlertTriangle className="w-4 h-4 text-red-600 flex-shrink-0" />
            <div className="text-xs font-bold text-red-700">
              {earlyWarningCount} Siswa Perlu Perhatian
            </div>
          </div>
          <p className="text-[10px] text-red-600/80 mt-0.5">
            Presensi &lt;80% atau memiliki catatan pembinaan.
          </p>
        </div>
      )}

      {/* Nav List */}
      <nav className="flex-1 px-3 py-3 space-y-1 overflow-y-auto">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = activeTab === item.id;

          return (
            <button
              key={item.id}
              id={`nav-item-${item.id}`}
              onClick={() => handleSelectTab(item.id)}
              className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-left text-xs transition cursor-pointer min-h-[44px] ${
                isActive
                  ? 'bg-blue-600 text-white font-bold shadow-xs'
                  : 'text-zinc-700 hover:bg-zinc-100 hover:text-zinc-900 font-medium'
              }`}
            >
              <div className="flex items-center space-x-2.5 truncate">
                <Icon className={`w-4 h-4 flex-shrink-0 ${isActive ? 'text-white' : 'text-zinc-500'}`} />
                <div className="truncate">
                  <div className="truncate">{item.label}</div>
                </div>
              </div>
              {item.badge !== undefined && (
                <span
                  className={`ml-2 px-1.5 py-0.5 text-[10px] font-bold rounded-md ${
                    isActive ? 'bg-white text-blue-700' : item.badgeColor || 'bg-zinc-100 text-zinc-600'
                  }`}
                >
                  {item.badge}
                </span>
              )}
            </button>
          );
        })}
      </nav>

      {/* Footer Teacher Profile Card */}
      <div className="p-3 border-t border-zinc-100">
        <div className="flex items-center gap-2.5 p-2.5 bg-zinc-50 border border-zinc-200/70 rounded-xl">
          <div className="w-8 h-8 rounded-full bg-blue-100 text-blue-800 flex items-center justify-center font-bold text-xs flex-shrink-0">
            {db.school_settings.homeroom_teacher_name.charAt(0)}
          </div>
          <div className="truncate">
            <p className="text-xs font-bold text-zinc-900 truncate">
              {db.school_settings.homeroom_teacher_name}
            </p>
            <p className="text-[10px] text-zinc-500 truncate">
              Wali Kelas {activeClass?.class_name || 'X TKR B'}
            </p>
          </div>
        </div>
      </div>
    </div>
  );

  return (
    <>
      {/* Desktop permanent sidebar */}
      <aside className="hidden lg:flex w-64 flex-col flex-shrink-0 min-h-[calc(100vh-4rem)]">
        {sidebarContent}
      </aside>

      {/* Mobile / Tablet slide-over drawer */}
      {mobileOpen && (
        <div className="fixed inset-0 z-50 lg:hidden flex">
          {/* Backdrop */}
          <div 
            className="fixed inset-0 bg-black/40 backdrop-blur-xs transition-opacity"
            onClick={onCloseMobile}
          />

          {/* Drawer Panel */}
          <div className="relative w-72 max-w-[85vw] h-full shadow-2xl z-10 animate-in slide-in-from-left duration-200">
            {sidebarContent}
          </div>
        </div>
      )}
    </>
  );
};
