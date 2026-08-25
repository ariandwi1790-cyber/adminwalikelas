import React, { useState } from 'react';
import { useDatabase } from '../../context/DatabaseContext';
import { 
  School, 
  Calendar, 
  Users, 
  Download, 
  Upload, 
  Menu, 
  Cloud, 
  CloudOff, 
  RefreshCw, 
  LogIn, 
  LogOut, 
  User as UserIcon, 
  CheckCircle2, 
  Database 
} from 'lucide-react';
import { exportDatabaseBackup } from '../../db/storage';
import { ConfirmModal } from '../common/ConfirmModal';

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
    setActiveClassId,
    currentUser,
    isAuthenticated,
    isFirestoreConnected,
    isSyncing,
    isOffline,
    lastSyncTime,
    loginGoogleUser,
    logoutUser,
    localDataAvailableForMigration,
    localDataCount,
    migrateLocalDataToFirestore
  } = useDatabase();

  const [showUserDropdown, setShowUserDropdown] = useState(false);
  const [isMigrating, setIsMigrating] = useState(false);
  const [showMigrateModal, setShowMigrateModal] = useState(false);

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

  const handleMigrate = () => {
    setShowMigrateModal(true);
  };

  const executeMigrate = async () => {
    setIsMigrating(true);
    try {
      await migrateLocalDataToFirestore();
    } finally {
      setIsMigrating(false);
      setShowMigrateModal(false);
    }
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

          {/* Right: Cloud Sync Status, Context Switchers & User Actions */}
          <div className="flex items-center space-x-1.5 sm:space-x-2.5 flex-shrink-0">
            {/* Cloud Firestore Status Pill */}
            <div 
              title={isOffline ? 'Mode Offline (Perubahan tersimpan lokal)' : isSyncing ? 'Menyinkronkan ke Firestore...' : `Tersambung ke Cloud Firestore ${lastSyncTime ? `(Terakhir: ${lastSyncTime})` : ''}`}
              className={`hidden sm:flex items-center gap-1.5 px-2.5 py-1 rounded-lg border text-xs font-semibold ${
                isOffline 
                  ? 'bg-amber-50 border-amber-200 text-amber-800' 
                  : isSyncing 
                  ? 'bg-blue-50 border-blue-200 text-blue-800' 
                  : 'bg-emerald-50 border-emerald-200 text-emerald-800'
              }`}
            >
              {isOffline ? (
                <>
                  <CloudOff className="w-3.5 h-3.5 text-amber-600" />
                  <span className="text-[11px] hidden md:inline">Offline</span>
                </>
              ) : isSyncing ? (
                <>
                  <RefreshCw className="w-3.5 h-3.5 text-blue-600 animate-spin" />
                  <span className="text-[11px] hidden md:inline">Syncing...</span>
                </>
              ) : (
                <>
                  <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                  <Cloud className="w-3.5 h-3.5 text-emerald-600" />
                  <span className="text-[11px] hidden md:inline">Firestore Sync</span>
                </>
              )}
            </div>

            {/* Local Migration Banner if available */}
            {localDataAvailableForMigration && (
              <button
                id="btn-header-migrate"
                onClick={handleMigrate}
                disabled={isMigrating}
                className="hidden md:flex items-center gap-1 px-2.5 py-1 bg-amber-500 hover:bg-amber-600 text-white text-xs font-bold rounded-lg transition shadow-xs cursor-pointer min-h-[36px]"
              >
                <Database className="w-3.5 h-3.5" />
                <span>{isMigrating ? 'Memigrasikan...' : 'Migrasi ke Cloud'}</span>
              </button>
            )}

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

            {/* Google Auth Avatar / Login */}
            <div className="relative">
              {isAuthenticated && currentUser ? (
                <button
                  id="btn-header-user-profile"
                  onClick={() => setShowUserDropdown(prev => !prev)}
                  className="flex items-center gap-1.5 p-1 rounded-full hover:ring-2 hover:ring-blue-400 transition cursor-pointer"
                  title={`Akun: ${currentUser.displayName || currentUser.email}`}
                >
                  {currentUser.photoURL ? (
                    <img 
                      src={currentUser.photoURL} 
                      alt="User" 
                      className="w-7 h-7 sm:w-8 sm:h-8 rounded-full border border-zinc-300 object-cover" 
                      referrerPolicy="no-referrer"
                    />
                  ) : (
                    <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-full bg-blue-600 text-white font-bold text-xs flex items-center justify-center">
                      {(currentUser.displayName || currentUser.email || 'U')[0].toUpperCase()}
                    </div>
                  )}
                </button>
              ) : (
                <button
                  id="btn-header-google-login"
                  onClick={loginGoogleUser}
                  className="flex items-center gap-1 px-2.5 py-1.5 bg-zinc-900 hover:bg-zinc-800 text-white text-xs font-semibold rounded-lg shadow-xs transition cursor-pointer min-h-[36px]"
                >
                  <LogIn className="w-3.5 h-3.5 text-blue-400" />
                  <span className="hidden sm:inline">Login Google</span>
                </button>
              )}

              {/* User Dropdown */}
              {showUserDropdown && isAuthenticated && currentUser && (
                <div className="absolute right-0 mt-2 w-56 bg-white rounded-xl shadow-lg border border-zinc-200 py-2 z-50 text-xs animate-in fade-in zoom-in-95 duration-150">
                  <div className="px-3 py-2 border-b border-zinc-100">
                    <p className="font-bold text-zinc-900 truncate">{currentUser.displayName || 'Pengguna'}</p>
                    <p className="text-zinc-500 truncate text-[11px]">{currentUser.email}</p>
                  </div>
                  <div className="p-1">
                    <button
                      onClick={() => {
                        logoutUser();
                        setShowUserDropdown(false);
                      }}
                      className="w-full flex items-center gap-2 px-3 py-2 text-rose-600 hover:bg-rose-50 rounded-lg transition cursor-pointer text-left"
                    >
                      <LogOut className="w-3.5 h-3.5" />
                      <span>Keluar (Logout)</span>
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Migration Confirmation Modal */}
      <ConfirmModal
        isOpen={showMigrateModal}
        title="Unggah Data Lokal ke Cloud Firestore"
        message={`Ditemukan ${localDataCount} data siswa lokal. Apakah Anda ingin mengunggah dan menyinkronkan seluruh data ini ke Cloud Firestore sekarang?`}
        confirmText="Unggah ke Firestore"
        cancelText="Batal"
        type="info"
        isProcessing={isMigrating}
        onConfirm={executeMigrate}
        onClose={() => !isMigrating && setShowMigrateModal(false)}
      />
    </header>
  );
};
