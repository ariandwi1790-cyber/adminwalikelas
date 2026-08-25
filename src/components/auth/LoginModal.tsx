import React, { useState } from 'react';
import { useDatabase } from '../../context/DatabaseContext';
import { PRESET_ACCOUNTS } from '../../services/firebase';
import { AppAccount } from '../../types';
import { 
  UserCheck, 
  LogIn, 
  Mail, 
  Lock, 
  User as UserIcon, 
  X, 
  School, 
  ShieldCheck, 
  GraduationCap, 
  ChevronRight, 
  Check, 
  Sparkles,
  RefreshCw,
  AlertCircle
} from 'lucide-react';

interface LoginModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const LoginModal: React.FC<LoginModalProps> = ({ isOpen, onClose }) => {
  const { 
    currentUser, 
    loginWithPreset, 
    loginWithEmail, 
    registerWithEmail, 
    loginGoogleUser, 
    logoutUser 
  } = useDatabase();

  const [activeTab, setActiveTab] = useState<'preset' | 'email' | 'google'>('preset');
  const [isRegisterMode, setIsRegisterMode] = useState(false);

  // Email form state
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [role, setRole] = useState('Wali Kelas');
  const [nip, setNip] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleSelectPreset = async (account: AppAccount) => {
    setIsLoading(true);
    setErrorMessage(null);
    try {
      await loginWithPreset(account);
      onClose();
    } catch (err: any) {
      setErrorMessage(err.message || 'Gagal masuk dengan akun ini');
    } finally {
      setIsLoading(false);
    }
  };

  const handleEmailAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setErrorMessage(null);

    try {
      if (isRegisterMode) {
        if (!displayName.trim()) throw new Error('Nama lengkap wajib diisi');
        await registerWithEmail(email, password, displayName, role, nip);
      } else {
        await loginWithEmail(email, password);
      }
      onClose();
    } catch (err: any) {
      setErrorMessage(err.message || 'Autentikasi gagal. Periksa data Anda.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleGoogleAuth = async () => {
    setIsLoading(true);
    setErrorMessage(null);
    try {
      await loginGoogleUser();
      onClose();
    } catch (err: any) {
      setErrorMessage(err.message || 'Gagal login via Google');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-150">
      <div 
        className="bg-white rounded-2xl max-w-lg w-full overflow-hidden shadow-2xl border border-zinc-200 animate-in zoom-in-95 duration-150 flex flex-col max-h-[90vh]"
        role="dialog"
        aria-modal="true"
      >
        {/* Modal Header */}
        <div className="bg-gradient-to-r from-blue-600 to-indigo-700 p-5 text-white flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-xl bg-white/15 backdrop-blur-xs flex items-center justify-center text-white border border-white/20">
              <School className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold tracking-tight">Akun & Akses Pengguna</h2>
              <p className="text-xs text-blue-100 mt-0.5">Sistem Manajemen Wali Kelas & Presensi</p>
            </div>
          </div>

          <button
            onClick={onClose}
            disabled={isLoading}
            className="text-white/80 hover:text-white p-1.5 rounded-lg hover:bg-white/10 transition cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Currently Logged In Account Alert if any */}
        {currentUser && (
          <div className="bg-emerald-50 border-b border-emerald-100 p-3.5 px-5 flex items-center justify-between">
            <div className="flex items-center space-x-2.5 min-w-0">
              <div className="w-8 h-8 rounded-full bg-emerald-600 text-white font-bold text-xs flex items-center justify-center flex-shrink-0">
                {(currentUser.displayName || currentUser.email || 'U')[0].toUpperCase()}
              </div>
              <div className="min-w-0">
                <p className="text-xs font-bold text-emerald-950 truncate flex items-center gap-1.5">
                  <span>{currentUser.displayName || 'Pengguna'}</span>
                  {currentUser.role && (
                    <span className="text-[10px] px-1.5 py-0.2 bg-emerald-200 text-emerald-800 rounded font-semibold">
                      {currentUser.role}
                    </span>
                  )}
                </p>
                <p className="text-[11px] text-emerald-700 truncate">{currentUser.email}</p>
              </div>
            </div>

            <button
              onClick={() => logoutUser()}
              className="text-xs font-semibold text-rose-600 hover:text-rose-700 bg-rose-50 hover:bg-rose-100 border border-rose-200 px-2.5 py-1 rounded-lg transition cursor-pointer flex-shrink-0"
            >
              Keluar
            </button>
          </div>
        )}

        {/* Tab Selector */}
        <div className="flex border-b border-zinc-200 bg-zinc-50/80 px-4 pt-2 gap-2">
          <button
            type="button"
            onClick={() => { setActiveTab('preset'); setErrorMessage(null); }}
            className={`pb-2.5 px-3 text-xs font-bold transition flex items-center space-x-1.5 border-b-2 cursor-pointer ${
              activeTab === 'preset'
                ? 'border-blue-600 text-blue-600'
                : 'border-transparent text-zinc-500 hover:text-zinc-800'
            }`}
          >
            <Sparkles className="w-3.5 h-3.5" />
            <span>Pilih Akun Guru</span>
          </button>

          <button
            type="button"
            onClick={() => { setActiveTab('email'); setErrorMessage(null); }}
            className={`pb-2.5 px-3 text-xs font-bold transition flex items-center space-x-1.5 border-b-2 cursor-pointer ${
              activeTab === 'email'
                ? 'border-blue-600 text-blue-600'
                : 'border-transparent text-zinc-500 hover:text-zinc-800'
            }`}
          >
            <Mail className="w-3.5 h-3.5" />
            <span>Email & Password</span>
          </button>

          <button
            type="button"
            onClick={() => { setActiveTab('google'); setErrorMessage(null); }}
            className={`pb-2.5 px-3 text-xs font-bold transition flex items-center space-x-1.5 border-b-2 cursor-pointer ${
              activeTab === 'google'
                ? 'border-blue-600 text-blue-600'
                : 'border-transparent text-zinc-500 hover:text-zinc-800'
            }`}
          >
            <LogIn className="w-3.5 h-3.5" />
            <span>Google Auth</span>
          </button>
        </div>

        {/* Error Alert */}
        {errorMessage && (
          <div className="mx-5 mt-4 p-3 bg-rose-50 border border-rose-200 rounded-xl flex items-start space-x-2 text-rose-800 text-xs">
            <AlertCircle className="w-4 h-4 text-rose-600 flex-shrink-0 mt-0.5" />
            <span className="flex-1 leading-relaxed">{errorMessage}</span>
          </div>
        )}

        {/* Tab Contents */}
        <div className="p-5 overflow-y-auto flex-1 space-y-4">
          {/* TAB 1: PRESET ACCOUNTS */}
          {activeTab === 'preset' && (
            <div className="space-y-3">
              <div className="bg-blue-50/70 border border-blue-100 rounded-xl p-3 text-xs text-blue-900 leading-relaxed flex items-start space-x-2">
                <ShieldCheck className="w-4 h-4 text-blue-600 flex-shrink-0 mt-0.5" />
                <span>
                  Pilih salah satu profil guru atau wali kelas di bawah untuk langsung beralih dan masuk ke sistem:
                </span>
              </div>

              <div className="space-y-2">
                {PRESET_ACCOUNTS.map((acc) => {
                  const isActive = currentUser?.email === acc.email;
                  return (
                    <button
                      key={acc.uid}
                      type="button"
                      disabled={isLoading}
                      onClick={() => handleSelectPreset(acc)}
                      className={`w-full flex items-center justify-between p-3 rounded-xl border text-left transition cursor-pointer ${
                        isActive
                          ? 'bg-blue-50/80 border-blue-400 ring-2 ring-blue-500/20'
                          : 'bg-white hover:bg-zinc-50 border-zinc-200 hover:border-zinc-300 shadow-2xs'
                      }`}
                    >
                      <div className="flex items-center space-x-3 min-w-0">
                        <div className="relative">
                          {acc.avatarUrl ? (
                            <img 
                              src={acc.avatarUrl} 
                              alt={acc.displayName} 
                              className="w-10 h-10 rounded-full object-cover border border-zinc-200" 
                            />
                          ) : (
                            <div className="w-10 h-10 rounded-full bg-blue-100 text-blue-700 font-bold text-xs flex items-center justify-center">
                              {acc.displayName[0]}
                            </div>
                          )}
                          {isActive && (
                            <span className="absolute -bottom-0.5 -right-0.5 w-3.5 h-3.5 bg-emerald-500 rounded-full border-2 border-white flex items-center justify-center">
                              <Check className="w-2 h-2 text-white" />
                            </span>
                          )}
                        </div>

                        <div className="min-w-0">
                          <p className="text-xs font-bold text-zinc-900 truncate">{acc.displayName}</p>
                          <p className="text-[11px] font-semibold text-blue-700 truncate">{acc.role}</p>
                          <p className="text-[10px] text-zinc-500 truncate">{acc.email} {acc.nip ? `• NIP ${acc.nip}` : ''}</p>
                        </div>
                      </div>

                      <div className="flex items-center space-x-1 text-xs text-zinc-400 flex-shrink-0 ml-2">
                        {isActive ? (
                          <span className="text-xs font-bold text-emerald-600 bg-emerald-100 px-2 py-0.5 rounded-full">
                            Aktif
                          </span>
                        ) : (
                          <span className="text-xs font-semibold text-blue-600 flex items-center">
                            Masuk <ChevronRight className="w-3.5 h-3.5 ml-0.5" />
                          </span>
                        )}
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* TAB 2: EMAIL & PASSWORD */}
          {activeTab === 'email' && (
            <form onSubmit={handleEmailAuth} className="space-y-3.5">
              <div className="flex items-center justify-between pb-1">
                <span className="text-xs text-zinc-600 font-medium">
                  {isRegisterMode ? 'Daftarkan Akun Guru Baru' : 'Masuk dengan Akun Terdaftar'}
                </span>
                <button
                  type="button"
                  onClick={() => {
                    setIsRegisterMode(!isRegisterMode);
                    setErrorMessage(null);
                  }}
                  className="text-xs font-bold text-blue-600 hover:text-blue-700 underline cursor-pointer"
                >
                  {isRegisterMode ? 'Sudah punya akun? Masuk' : 'Daftar akun baru'}
                </button>
              </div>

              {isRegisterMode && (
                <>
                  <div>
                    <label className="block text-[11px] font-bold text-zinc-700 mb-1">Nama Lengkap & Gelar</label>
                    <div className="relative">
                      <UserIcon className="w-4 h-4 absolute left-3 top-2.5 text-zinc-400" />
                      <input
                        type="text"
                        required
                        placeholder="cth: Budi Santoso, S.Pd"
                        value={displayName}
                        onChange={(e) => setDisplayName(e.target.value)}
                        className="w-full pl-9 pr-3 py-2 text-xs border border-zinc-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:outline-none"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="block text-[11px] font-bold text-zinc-700 mb-1">Peran / Jabatan</label>
                      <select
                        value={role}
                        onChange={(e) => setRole(e.target.value)}
                        className="w-full px-2.5 py-2 text-xs border border-zinc-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:outline-none"
                      >
                        <option value="Wali Kelas">Wali Kelas</option>
                        <option value="Guru BK">Guru BK</option>
                        <option value="Kepala Sekolah">Kepala Sekolah</option>
                        <option value="Guru Pengajar">Guru Pengajar</option>
                        <option value="Administrator">Administrator</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-[11px] font-bold text-zinc-700 mb-1">NIP (Opsional)</label>
                      <input
                        type="text"
                        placeholder="1980xxxx..."
                        value={nip}
                        onChange={(e) => setNip(e.target.value)}
                        className="w-full px-2.5 py-2 text-xs border border-zinc-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:outline-none"
                      />
                    </div>
                  </div>
                </>
              )}

              <div>
                <label className="block text-[11px] font-bold text-zinc-700 mb-1">Email Sekolah / Pribadi</label>
                <div className="relative">
                  <Mail className="w-4 h-4 absolute left-3 top-2.5 text-zinc-400" />
                  <input
                    type="email"
                    required
                    placeholder="nama@sekolah.sch.id"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full pl-9 pr-3 py-2 text-xs border border-zinc-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-bold text-zinc-700 mb-1">Kata Sandi (Password)</label>
                <div className="relative">
                  <Lock className="w-4 h-4 absolute left-3 top-2.5 text-zinc-400" />
                  <input
                    type="password"
                    required
                    minLength={6}
                    placeholder="Minimal 6 karakter"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full pl-9 pr-3 py-2 text-xs border border-zinc-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:outline-none"
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={isLoading}
                className="w-full py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs rounded-xl shadow-xs transition cursor-pointer flex items-center justify-center space-x-1.5 disabled:opacity-50 min-h-[42px]"
              >
                {isLoading ? (
                  <RefreshCw className="w-4 h-4 animate-spin" />
                ) : (
                  <LogIn className="w-4 h-4" />
                )}
                <span>{isLoading ? 'Memproses...' : isRegisterMode ? 'Daftar Akun Guru' : 'Masuk ke Sistem'}</span>
              </button>
            </form>
          )}

          {/* TAB 3: GOOGLE AUTH */}
          {activeTab === 'google' && (
            <div className="space-y-4 py-2 text-center">
              <div className="w-12 h-12 rounded-2xl bg-blue-50 border border-blue-100 flex items-center justify-center mx-auto text-blue-600">
                <svg className="w-6 h-6" viewBox="0 0 24 24">
                  <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                  <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                  <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"/>
                  <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"/>
                </svg>
              </div>

              <div>
                <h3 className="text-sm font-bold text-zinc-900">Masuk dengan Akun Google Workspace</h3>
                <p className="text-xs text-zinc-500 mt-1 max-w-xs mx-auto leading-relaxed">
                  Gunakan email Google resmi sekolah Anda untuk otomatis sinkronisasi data presensi dan Cloud Firestore.
                </p>
              </div>

              <button
                type="button"
                disabled={isLoading}
                onClick={handleGoogleAuth}
                className="w-full max-w-xs mx-auto py-2.5 px-4 bg-white hover:bg-zinc-50 border border-zinc-300 text-zinc-800 font-bold text-xs rounded-xl shadow-xs transition cursor-pointer flex items-center justify-center space-x-2 min-h-[42px] disabled:opacity-50"
              >
                {isLoading ? (
                  <RefreshCw className="w-4 h-4 animate-spin text-blue-600" />
                ) : (
                  <svg className="w-4 h-4" viewBox="0 0 24 24">
                    <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                    <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                    <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"/>
                    <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"/>
                  </svg>
                )}
                <span>{isLoading ? 'Menghubungkan...' : 'Lanjutkan dengan Google'}</span>
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
