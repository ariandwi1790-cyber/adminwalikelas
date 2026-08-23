import React from 'react';
import { useDatabase } from '../../context/DatabaseContext';
import { 
  School, 
  Calendar, 
  Users, 
  Download, 
  Upload, 
  Menu,
  Sparkles
} from 'lucide-react';
import { exportDatabaseBackup } from '../../db/storage';

interface HeaderProps {
  onOpenBackupModal?: () => void;
  onOpenImport?: () => void;
  onOpenSettings?: () => void;
  onToggleMobileMenu?: () => void;
}

export const Header: React.FC<HeaderProps> = ({ 
  onOpenBackupModal,
  onOpenImport,
  onOpenSettings,
  onToggleMobileMenu,
}) => {
  const { 
    db, 
    activeAcademicYear, 
    activeClass, 
    setActiveAcademicYearId, 
    setActiveClassId 
  } = useDatabase();

  const handleQuickBackup = () => {
    const jsonStr = exportDatabaseBackup();
    const blob = new Blob([jsonStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `Backup_WaliKelas_${db.school_settings.school_name.replace(/\s+/g, '_')}_${new Date().toISOString().split('T')[0]}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <header className="bg-white border-b border-zinc-200 text-zinc-900 sticky top-0 z-30 shadow-xs">
      <div className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-14 sm:h-16 gap-2">
          {/* Left: Mobile Hamburger & School / App Info */}
          <div className="flex items-center space-x-2 sm:space-x-3 min-w-0">
            {onToggleMobileMenu && (
              <button
                id="btn-mobile-menu-toggle"
                onClick={onToggleMobileMenu}
                aria-label="Buka Menu Navigasi"
                className="lg:hidden p-2 -ml-1 text-zinc-700 hover:bg-zinc-100 rounded-xl transition cursor-pointer min-h-[44px] min-w-[44px] flex items-center justify-center"
              >
                <Menu className="w-5 h-5 text-zinc-800" />
              </button>
            )}

            <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-xl bg-blue-600 flex items-center justify-center text-white font-bold shadow-xs flex-shrink-0">
              <School className="w-4 h-4 sm:w-5 sm:h-5 text-white" />
            </div>

            <div className="min-w-0">
              <div className="flex items-center space-x-1.5">
                <h1 className="text-xs sm:text-base font-bold tracking-tight text-zinc-900 truncate">
                  {db.school_settings.school_name}
                </h1>
                <span className="bg-blue-50 text-blue-700 text-[9px] sm:text-[10px] px-1.5 py-0.5 rounded font-bold uppercase tracking-wider border border-blue-100 hidden md:inline-block">
                  WALI KELAS
                </span>
              </div>
              <p className="text-[10px] sm:text-[11px] text-zinc-500 truncate hidden xs:block">
                NPSN {db.school_settings.npsn} • {db.school_settings.school_city}
              </p>
            </div>
          </div>

          {/* Right: Context Switchers & Actions */}
          <div className="flex items-center space-x-1.5 sm:space-x-3 flex-shrink-0">
            {/* Academic Year Switcher Chip */}
            <div className="flex items-center bg-zinc-100 border border-zinc-200/80 rounded-lg px-2 sm:px-2.5 py-1 text-xs text-zinc-700 max-w-[130px] sm:max-w-none">
              <Calendar className="w-3.5 h-3.5 mr-1 text-blue-600 flex-shrink-0 hidden xs:block" />
              <select
                id="select-header-academic-year"
                aria-label="Pilih Tahun Ajaran"
                value={activeAcademicYear?.academic_year_id || ''}
                onChange={(e) => setActiveAcademicYearId(e.target.value)}
                className="bg-transparent border-0 text-[10px] sm:text-xs text-zinc-800 font-bold uppercase tracking-wider focus:ring-0 focus:outline-none cursor-pointer pr-1 truncate"
              >
                {db.academic_years.map(ay => (
                  <option key={ay.academic_year_id} value={ay.academic_year_id} className="bg-white text-zinc-900 font-normal">
                    TA {ay.year_name} ({ay.semester})
                  </option>
                ))}
              </select>
            </div>

            {/* Class Switcher Chip */}
            <div className="flex items-center bg-zinc-100 border border-zinc-200/80 rounded-lg px-2 sm:px-2.5 py-1 text-xs text-zinc-700 max-w-[120px] sm:max-w-none">
              <Users className="w-3.5 h-3.5 mr-1 text-emerald-600 flex-shrink-0 hidden xs:block" />
              <select
                id="select-header-class"
                aria-label="Pilih Kelas"
                value={activeClass?.class_id || ''}
                onChange={(e) => setActiveClassId(e.target.value)}
                className="bg-transparent border-0 text-[10px] sm:text-xs text-zinc-800 font-bold uppercase tracking-wider focus:ring-0 focus:outline-none cursor-pointer pr-1 truncate"
              >
                {db.classes.map(c => (
                  <option key={c.class_id} value={c.class_id} className="bg-white text-zinc-900 font-normal">
                    {c.class_name}
                  </option>
                ))}
              </select>
            </div>

            {/* Quick Import Link */}
            {onOpenImport && (
              <button
                id="btn-header-import"
                onClick={onOpenImport}
                className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-lg shadow-xs transition cursor-pointer min-h-[36px]"
              >
                <Upload className="w-3.5 h-3.5" />
                <span>Impor Siswa</span>
              </button>
            )}

            {/* Quick Backup Button */}
            <button
              id="btn-quick-backup"
              onClick={handleQuickBackup}
              title="Unduh Backup Database (.json)"
              className="bg-white hover:bg-zinc-50 text-zinc-700 p-1.5 sm:p-2 rounded-lg border border-zinc-200 transition flex items-center text-xs space-x-1 cursor-pointer shadow-2xs min-h-[36px]"
            >
              <Download className="w-3.5 h-3.5 text-blue-600" />
              <span className="hidden md:inline font-bold">Backup</span>
            </button>
          </div>
        </div>
      </div>
    </header>
  );
};
