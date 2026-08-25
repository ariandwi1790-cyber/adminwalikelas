import React, { useState, useRef, useEffect } from 'react';
import { useDatabase } from '../../context/DatabaseContext';
import { SchoolSettings, DisciplineFactorWeights, EarlyWarningThresholds } from '../../types';
import { 
  Settings, 
  School, 
  Sliders, 
  ShieldAlert, 
  Database, 
  Save, 
  Download, 
  Upload, 
  RotateCcw, 
  Cloud,
  CloudOff,
  CheckCircle2,
  AlertTriangle,
  RefreshCw,
  Server
} from 'lucide-react';
import { exportDatabaseBackup } from '../../db/storage';
import { ConfirmModal } from '../common/ConfirmModal';

export const SettingsManager: React.FC = () => {
  const { 
    db, 
    updateSettings, 
    addAcademicYear, 
    addClass,
    resetDatabase,
    restoreDatabaseFromJSON,
    migrateLocalDataToFirestore,
    localDataAvailableForMigration,
    localDataCount,
    isFirestoreConnected,
    isSyncing,
    isOffline,
    lastSyncTime
  } = useDatabase();

  const [activeTab, setActiveTab] = useState<'school' | 'academic' | 'weights' | 'backup'>('school');

  // School Settings State
  const [schoolSettings, setSchoolSettings] = useState<SchoolSettings>(() => ({ ...db.school_settings }));

  // Weights State
  const [weights, setWeights] = useState<DisciplineFactorWeights>(() => ({ ...db.school_settings.discipline_weights }));

  // Warning Thresholds State
  const [thresholds, setThresholds] = useState<EarlyWarningThresholds>(() => ({ ...db.school_settings.early_warning_thresholds }));

  // Synchronize state when db.school_settings updates (e.g. from cloud snapshot)
  useEffect(() => {
    if (db.school_settings) {
      setSchoolSettings({ ...db.school_settings });
      if (db.school_settings.discipline_weights) {
        setWeights({ ...db.school_settings.discipline_weights });
      }
      if (db.school_settings.early_warning_thresholds) {
        setThresholds({ ...db.school_settings.early_warning_thresholds });
      }
    }
  }, [db.school_settings]);

  // Loading states for Save buttons
  const [isSavingSchool, setIsSavingSchool] = useState(false);
  const [isSavingWeights, setIsSavingWeights] = useState(false);

  // Add Academic Year Form
  const [newYearName, setNewYearName] = useState('');
  const [newSemester, setNewSemester] = useState<'Ganjil' | 'Genap'>('Ganjil');

  // Add Class Form
  const [newClassName, setNewClassName] = useState('');
  const [newGradeLevel, setNewGradeLevel] = useState(11);
  const [newMajor, setNewMajor] = useState('Teknik Kendaraan Ringan Otomotif');

  const [isMigrating, setIsMigrating] = useState(false);
  const [isRestoring, setIsRestoring] = useState(false);
  const [restoreFeedback, setRestoreFeedback] = useState<string | null>(null);

  // Confirm Modal State
  const [showResetModal, setShowResetModal] = useState(false);
  const [isResetting, setIsResetting] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleSaveSchoolSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSavingSchool(true);
    try {
      await updateSettings(schoolSettings);
    } finally {
      setIsSavingSchool(false);
    }
  };

  const handleSaveWeights = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSavingWeights(true);
    try {
      await updateSettings({
        discipline_weights: weights,
        early_warning_thresholds: thresholds,
      });
    } finally {
      setIsSavingWeights(false);
    }
  };

  const handleAddAcademicYear = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newYearName.trim()) return;
    await addAcademicYear({
      year_name: newYearName.trim(),
      semester: newSemester,
      start_date: `${newYearName.split('/')[0]}-07-15`,
      end_date: `${newYearName.split('/')[1] || '2028'}-06-20`,
      status: 'Active',
    });
    setNewYearName('');
  };

  const handleAddClass = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newClassName.trim()) return;
    await addClass({
      class_name: newClassName.trim(),
      grade: Number(newGradeLevel),
      major: newMajor.trim(),
      academic_year_id: db.school_settings.current_academic_year_id,
      homeroom_teacher: db.school_settings.homeroom_teacher_name,
      status: 'Active',
    });
    setNewClassName('');
  };

  const handleDownloadBackup = () => {
    const jsonStr = exportDatabaseBackup();
    const blob = new Blob([jsonStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `WaliKelas_CloudBackup_${db.school_settings.school_name.replace(/\s+/g, '_')}_${new Date().toISOString().split('T')[0]}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleRestoreBackup = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async (event) => {
      try {
        const content = event.target?.result as string;
        setIsRestoring(true);
        const result = await restoreDatabaseFromJSON(content);
        setIsRestoring(false);
        setRestoreFeedback(result.message);
      } catch (err: any) {
        setIsRestoring(false);
        setRestoreFeedback(`Gagal memproses file: ${err.message}`);
      }
    };
    reader.readAsText(file);
  };

  const handleResetToSeed = () => {
    setShowResetModal(true);
  };

  const executeReset = async () => {
    setIsResetting(true);
    try {
      await resetDatabase();
    } finally {
      setIsResetting(false);
      setShowResetModal(false);
    }
  };

  const handleManualMigrate = async () => {
    setIsMigrating(true);
    await migrateLocalDataToFirestore();
    setIsMigrating(false);
  };

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      {/* Header */}
      <div className="bg-white p-5 rounded-2xl border border-zinc-200 shadow-xs">
        <div className="flex items-center space-x-3">
          <div className="w-10 h-10 rounded-xl bg-zinc-900 text-white flex items-center justify-center font-bold">
            <Settings className="w-5 h-5 text-blue-400" />
          </div>
          <div>
            <h2 className="text-lg font-bold text-zinc-900">
              Pengaturan Sistem & Konfigurasi Administrasi
            </h2>
            <p className="text-xs text-zinc-500">
              Kelola profil sekolah, kop laporan, bobot formula indeks kedisiplinan, dan sinkronisasi Cloud Firestore
            </p>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex flex-wrap bg-zinc-100 p-1 rounded-xl border border-zinc-200 text-xs font-semibold w-fit gap-1">
        <button
          onClick={() => setActiveTab('school')}
          className={`px-3 sm:px-4 py-2 rounded-lg transition cursor-pointer flex items-center space-x-1.5 min-h-[36px] ${
            activeTab === 'school' ? 'bg-blue-600 text-white shadow-xs font-bold' : 'text-zinc-600 hover:text-zinc-900'
          }`}
        >
          <School className="w-4 h-4" />
          <span>Identitas Sekolah & Wali</span>
        </button>

        <button
          onClick={() => setActiveTab('academic')}
          className={`px-3 sm:px-4 py-2 rounded-lg transition cursor-pointer flex items-center space-x-1.5 min-h-[36px] ${
            activeTab === 'academic' ? 'bg-blue-600 text-white shadow-xs font-bold' : 'text-zinc-600 hover:text-zinc-900'
          }`}
        >
          <Sliders className="w-4 h-4" />
          <span>Tahun Ajaran & Kelas</span>
        </button>

        <button
          onClick={() => setActiveTab('weights')}
          className={`px-3 sm:px-4 py-2 rounded-lg transition cursor-pointer flex items-center space-x-1.5 min-h-[36px] ${
            activeTab === 'weights' ? 'bg-blue-600 text-white shadow-xs font-bold' : 'text-zinc-600 hover:text-zinc-900'
          }`}
        >
          <ShieldAlert className="w-4 h-4" />
          <span>Bobot Disiplin & Alert</span>
        </button>

        <button
          onClick={() => setActiveTab('backup')}
          className={`px-3 sm:px-4 py-2 rounded-lg transition cursor-pointer flex items-center space-x-1.5 min-h-[36px] ${
            activeTab === 'backup' ? 'bg-blue-600 text-white shadow-xs font-bold' : 'text-zinc-600 hover:text-zinc-900'
          }`}
        >
          <Database className="w-4 h-4" />
          <span>Cloud Persistence & Backup</span>
        </button>
      </div>

      {/* TAB 1: SCHOOL SETTINGS */}
      {activeTab === 'school' && (
        <form onSubmit={handleSaveSchoolSettings} className="bg-white rounded-2xl border border-zinc-200 p-6 shadow-xs space-y-4 text-xs">
          <h3 className="text-sm font-bold text-zinc-900 border-b border-zinc-200 pb-2">
            Identitas Resmi Satuan Pendidikan (Kop Rapor & Laporan)
          </h3>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-zinc-700 font-semibold mb-1">Nama Resmi Sekolah</label>
              <input
                type="text"
                required
                value={schoolSettings.school_name}
                onChange={(e) => setSchoolSettings(prev => ({ ...prev, school_name: e.target.value }))}
                className="w-full px-3 py-2 bg-zinc-50 border border-zinc-200 rounded-lg text-zinc-900 font-bold"
              />
            </div>

            <div>
              <label className="block text-zinc-700 font-semibold mb-1">NPSN (Nomor Pokok Sekolah Nasional)</label>
              <input
                type="text"
                value={schoolSettings.npsn}
                onChange={(e) => setSchoolSettings(prev => ({ ...prev, npsn: e.target.value }))}
                className="w-full px-3 py-2 bg-zinc-50 border border-zinc-200 rounded-lg text-zinc-900 font-mono"
              />
            </div>

            <div className="md:col-span-2">
              <label className="block text-zinc-700 font-semibold mb-1">Alamat Lengkap Sekolah</label>
              <input
                type="text"
                value={schoolSettings.school_address}
                onChange={(e) => setSchoolSettings(prev => ({ ...prev, school_address: e.target.value }))}
                className="w-full px-3 py-2 bg-zinc-50 border border-zinc-200 rounded-lg text-zinc-900"
              />
            </div>

            <div>
              <label className="block text-zinc-700 font-semibold mb-1">Kota / Kabupaten</label>
              <input
                type="text"
                value={schoolSettings.school_city}
                onChange={(e) => setSchoolSettings(prev => ({ ...prev, school_city: e.target.value }))}
                className="w-full px-3 py-2 bg-zinc-50 border border-zinc-200 rounded-lg text-zinc-900"
              />
            </div>

            <div>
              <label className="block text-zinc-700 font-semibold mb-1">Provinsi</label>
              <input
                type="text"
                value={schoolSettings.school_province}
                onChange={(e) => setSchoolSettings(prev => ({ ...prev, school_province: e.target.value }))}
                className="w-full px-3 py-2 bg-zinc-50 border border-zinc-200 rounded-lg text-zinc-900"
              />
            </div>
          </div>

          <h3 className="text-sm font-bold text-zinc-900 border-b border-zinc-200 pb-2 pt-4">
            Data Pimpinan & Wali Kelas (Penandatangan Dokumen)
          </h3>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-zinc-700 font-semibold mb-1">Nama Kepala Sekolah</label>
              <input
                type="text"
                value={schoolSettings.principal_name}
                onChange={(e) => setSchoolSettings(prev => ({ ...prev, principal_name: e.target.value }))}
                className="w-full px-3 py-2 bg-zinc-50 border border-zinc-200 rounded-lg text-zinc-900 font-semibold"
              />
            </div>

            <div>
              <label className="block text-zinc-700 font-semibold mb-1">NIP Kepala Sekolah</label>
              <input
                type="text"
                value={schoolSettings.principal_nip}
                onChange={(e) => setSchoolSettings(prev => ({ ...prev, principal_nip: e.target.value }))}
                className="w-full px-3 py-2 bg-zinc-50 border border-zinc-200 rounded-lg text-zinc-900 font-mono"
              />
            </div>

            <div>
              <label className="block text-zinc-700 font-semibold mb-1">Nama Wali Kelas</label>
              <input
                type="text"
                required
                value={schoolSettings.homeroom_teacher_name}
                onChange={(e) => setSchoolSettings(prev => ({ ...prev, homeroom_teacher_name: e.target.value }))}
                className="w-full px-3 py-2 bg-zinc-50 border border-zinc-200 rounded-lg text-zinc-900 font-semibold"
              />
            </div>

            <div>
              <label className="block text-zinc-700 font-semibold mb-1">NIP Wali Kelas</label>
              <input
                type="text"
                value={schoolSettings.homeroom_teacher_nip}
                onChange={(e) => setSchoolSettings(prev => ({ ...prev, homeroom_teacher_nip: e.target.value }))}
                className="w-full px-3 py-2 bg-zinc-50 border border-zinc-200 rounded-lg text-zinc-900 font-mono"
              />
            </div>
          </div>

          <div className="pt-4 border-t border-zinc-200 flex justify-end">
            <button
              type="submit"
              disabled={isSavingSchool}
              className="px-6 py-2.5 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white font-bold rounded-xl flex items-center space-x-1.5 shadow-xs cursor-pointer min-h-[44px] transition"
            >
              {isSavingSchool ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
              <span>{isSavingSchool ? 'Menyimpan Pengaturan...' : 'Simpan Identitas ke Cloud Firestore'}</span>
            </button>
          </div>
        </form>
      )}

      {/* TAB 2: ACADEMIC YEARS & CLASSES */}
      {activeTab === 'academic' && (
        <div className="space-y-6 text-xs">
          {/* Academic Years Management */}
          <div className="bg-white rounded-2xl border border-zinc-200 p-6 shadow-xs space-y-4">
            <h3 className="text-sm font-bold text-zinc-900">
              Daftar Tahun Ajaran
            </h3>

            <div className="overflow-x-auto border border-zinc-200 rounded-xl">
              <table className="w-full text-left">
                <thead className="bg-zinc-50 text-zinc-500">
                  <tr>
                    <th className="p-3">ID</th>
                    <th className="p-3">Tahun Ajaran</th>
                    <th className="p-3">Semester</th>
                    <th className="p-3 text-center">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-100">
                  {db.academic_years.map(ay => (
                    <tr key={ay.academic_year_id}>
                      <td className="p-3 font-mono text-zinc-400">{ay.academic_year_id}</td>
                      <td className="p-3 font-bold">{ay.year_name}</td>
                      <td className="p-3">{ay.semester}</td>
                      <td className="p-3 text-center">
                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                          ay.status === 'Active' ? 'bg-emerald-100 text-emerald-800' : 'bg-zinc-100 text-zinc-600'
                        }`}>
                          {ay.status}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Add AY Form */}
            <form onSubmit={handleAddAcademicYear} className="flex flex-wrap items-center gap-3 pt-2">
              <input
                type="text"
                required
                placeholder="Contoh: 2027/2028"
                value={newYearName}
                onChange={(e) => setNewYearName(e.target.value)}
                className="px-3 py-2 bg-zinc-50 border border-zinc-200 rounded-lg text-zinc-900 min-h-[40px]"
              />
              <select
                value={newSemester}
                onChange={(e) => setNewSemester(e.target.value as any)}
                className="px-3 py-2 bg-zinc-50 border border-zinc-200 rounded-lg text-zinc-900 cursor-pointer min-h-[40px]"
              >
                <option value="Ganjil">Semester Ganjil</option>
                <option value="Genap">Semester Genap</option>
              </select>
              <button
                type="submit"
                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl shadow-xs cursor-pointer min-h-[40px]"
              >
                + Tambah Tahun Ajaran
              </button>
            </form>
          </div>

          {/* Classes Management */}
          <div className="bg-white rounded-2xl border border-zinc-200 p-6 shadow-xs space-y-4">
            <h3 className="text-sm font-bold text-zinc-900">
              Daftar Rombongan Belajar / Kelas
            </h3>

            <div className="overflow-x-auto border border-zinc-200 rounded-xl">
              <table className="w-full text-left">
                <thead className="bg-zinc-50 text-zinc-500">
                  <tr>
                    <th className="p-3">ID Kelas</th>
                    <th className="p-3">Nama Kelas</th>
                    <th className="p-3">Tingkat</th>
                    <th className="p-3">Program Keahlian / Jurusan</th>
                    <th className="p-3">Wali Kelas</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-100">
                  {db.classes.map(c => (
                    <tr key={c.class_id}>
                      <td className="p-3 font-mono text-zinc-400">{c.class_id}</td>
                      <td className="p-3 font-bold">{c.class_name}</td>
                      <td className="p-3">Kelas {c.grade}</td>
                      <td className="p-3">{c.major}</td>
                      <td className="p-3">{c.homeroom_teacher}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Add Class Form */}
            <form onSubmit={handleAddClass} className="grid grid-cols-1 sm:grid-cols-4 gap-3 pt-2">
              <input
                type="text"
                required
                placeholder="Nama Kelas (Contoh: XII TKR A)"
                value={newClassName}
                onChange={(e) => setNewClassName(e.target.value)}
                className="px-3 py-2 bg-zinc-50 border border-zinc-200 rounded-lg text-zinc-900 min-h-[40px]"
              />
              <select
                value={newGradeLevel}
                onChange={(e) => setNewGradeLevel(Number(e.target.value))}
                className="px-3 py-2 bg-zinc-50 border border-zinc-200 rounded-lg text-zinc-900 cursor-pointer min-h-[40px]"
              >
                <option value={10}>Tingkat X (10)</option>
                <option value={11}>Tingkat XI (11)</option>
                <option value={12}>Tingkat XII (12)</option>
              </select>
              <input
                type="text"
                placeholder="Jurusan"
                value={newMajor}
                onChange={(e) => setNewMajor(e.target.value)}
                className="px-3 py-2 bg-zinc-50 border border-zinc-200 rounded-lg text-zinc-900 min-h-[40px]"
              />
              <button
                type="submit"
                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl shadow-xs cursor-pointer min-h-[40px]"
              >
                + Tambah Kelas
              </button>
            </form>
          </div>
        </div>
      )}

      {/* TAB 3: WEIGHTS & EARLY WARNING THRESHOLDS */}
      {activeTab === 'weights' && (
        <form onSubmit={handleSaveWeights} className="bg-white rounded-2xl border border-zinc-200 p-6 shadow-xs space-y-6 text-xs">
          <div>
            <h3 className="text-sm font-bold text-zinc-900 mb-1">
              Bobot Formula Indeks Kedisiplinan Siswa (Total harus 100%)
            </h3>
            <p className="text-zinc-500">
              Formula standar PRD: Kehadiran + Ketepatan Waktu + Pelanggaran + Kepatuhan Atribut + Tanggung Jawab
            </p>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
            <div className="p-3 bg-zinc-50 rounded-xl border border-zinc-200">
              <label className="block text-zinc-500 mb-1 font-semibold">Kehadiran (%)</label>
              <input
                type="number"
                value={weights.attendance_weight}
                onChange={(e) => setWeights(prev => ({ ...prev, attendance_weight: Number(e.target.value) }))}
                className="w-full px-2 py-1 bg-white border border-zinc-200 rounded text-center font-bold text-zinc-900"
              />
            </div>

            <div className="p-3 bg-zinc-50 rounded-xl border border-zinc-200">
              <label className="block text-zinc-500 mb-1 font-semibold">Tepat Waktu (%)</label>
              <input
                type="number"
                value={weights.punctuality_weight}
                onChange={(e) => setWeights(prev => ({ ...prev, punctuality_weight: Number(e.target.value) }))}
                className="w-full px-2 py-1 bg-white border border-zinc-200 rounded text-center font-bold text-zinc-900"
              />
            </div>

            <div className="p-3 bg-zinc-50 rounded-xl border border-zinc-200">
              <label className="block text-zinc-500 mb-1 font-semibold">Pelanggaran (%)</label>
              <input
                type="number"
                value={weights.violation_weight}
                onChange={(e) => setWeights(prev => ({ ...prev, violation_weight: Number(e.target.value) }))}
                className="w-full px-2 py-1 bg-white border border-zinc-200 rounded text-center font-bold text-zinc-900"
              />
            </div>

            <div className="p-3 bg-zinc-50 rounded-xl border border-zinc-200">
              <label className="block text-zinc-500 mb-1 font-semibold">Seragam/Atribut (%)</label>
              <input
                type="number"
                value={weights.compliance_weight}
                onChange={(e) => setWeights(prev => ({ ...prev, compliance_weight: Number(e.target.value) }))}
                className="w-full px-2 py-1 bg-white border border-zinc-200 rounded text-center font-bold text-zinc-900"
              />
            </div>

            <div className="p-3 bg-zinc-50 rounded-xl border border-zinc-200">
              <label className="block text-zinc-500 mb-1 font-semibold">Tanggung Jawab (%)</label>
              <input
                type="number"
                value={weights.responsibility_weight}
                onChange={(e) => setWeights(prev => ({ ...prev, responsibility_weight: Number(e.target.value) }))}
                className="w-full px-2 py-1 bg-white border border-zinc-200 rounded text-center font-bold text-zinc-900"
              />
            </div>
          </div>

          <div className="pt-4 border-t border-zinc-200">
            <h3 className="text-sm font-bold text-zinc-900 mb-1">
              Batas Pemicu Peringatan Dini (Rule-based Early Warning Thresholds)
            </h3>
            <p className="text-zinc-500 mb-3">
              Kondisi yang langsung memicu status &quot;Prioritas Tinggi&quot; atau &quot;Perlu Perhatian&quot;
            </p>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div className="p-3 bg-zinc-50 rounded-xl border border-zinc-200">
                <label className="block text-zinc-500 mb-1">Batas Minimal Kehadiran (%):</label>
                <input
                  type="number"
                  value={thresholds.min_attendance_rate}
                  onChange={(e) => setThresholds(prev => ({ ...prev, min_attendance_rate: Number(e.target.value) }))}
                  className="w-full px-3 py-1.5 bg-white border border-zinc-200 rounded-lg text-zinc-900 font-bold"
                />
              </div>

              <div className="p-3 bg-zinc-50 rounded-xl border border-zinc-200">
                <label className="block text-zinc-500 mb-1">Maksimal Alpa Sebelum Alert:</label>
                <input
                  type="number"
                  value={thresholds.max_alpa_count}
                  onChange={(e) => setThresholds(prev => ({ ...prev, max_alpa_count: Number(e.target.value) }))}
                  className="w-full px-3 py-1.5 bg-white border border-zinc-200 rounded-lg text-zinc-900 font-bold"
                />
              </div>

              <div className="p-3 bg-zinc-50 rounded-xl border border-zinc-200">
                <label className="block text-zinc-500 mb-1">Poin Pelanggaran Pemicu Alert:</label>
                <input
                  type="number"
                  value={thresholds.max_violation_points}
                  onChange={(e) => setThresholds(prev => ({ ...prev, max_violation_points: Number(e.target.value) }))}
                  className="w-full px-3 py-1.5 bg-white border border-zinc-200 rounded-lg text-zinc-900 font-bold"
                />
              </div>
            </div>
          </div>

          <div className="pt-4 border-t border-zinc-200 flex justify-end">
            <button
              type="submit"
              disabled={isSavingWeights}
              className="px-6 py-2.5 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white font-bold rounded-xl flex items-center space-x-1.5 shadow-xs cursor-pointer min-h-[44px] transition"
            >
              {isSavingWeights ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
              <span>{isSavingWeights ? 'Menyimpan Parameter...' : 'Simpan Parameter Disiplin & Alert ke Firestore'}</span>
            </button>
          </div>
        </form>
      )}

      {/* TAB 4: CLOUD PERSISTENCE & BACKUP */}
      {activeTab === 'backup' && (
        <div className="bg-white rounded-2xl border border-zinc-200 p-6 shadow-xs space-y-6 text-xs">
          {/* Cloud Connection Status Card */}
          <div className="p-4 bg-zinc-50 rounded-2xl border border-zinc-200 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Server className="w-5 h-5 text-blue-600" />
                <h3 className="text-sm font-bold text-zinc-900">
                  Status Database Utama: Cloud Firestore
                </h3>
              </div>
              <div className="flex items-center gap-1.5">
                <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-bold ${
                  isOffline ? 'bg-amber-100 text-amber-800' : 'bg-emerald-100 text-emerald-800'
                }`}>
                  <span className={`w-2 h-2 rounded-full ${isOffline ? 'bg-amber-500' : 'bg-emerald-500'}`} />
                  {isOffline ? 'Mode Offline' : 'Tersambung ke Cloud Firestore'}
                </span>
              </div>
            </div>
            <p className="text-zinc-600 leading-relaxed">
              Seluruh data relasional (siswa, orang tua, presensi, pelanggaran, home visit, dsb.) tersimpan secara aman di <strong>Cloud Firestore</strong> dengan sinkronisasi real-time dan proteksi ID unik permanen.
            </p>
            {lastSyncTime && (
              <p className="text-[11px] text-zinc-400">
                Waktu sinkronisasi terakhir: {lastSyncTime}
              </p>
            )}
          </div>

          {/* Local Data Migration Card if applicable */}
          {localDataAvailableForMigration && (
            <div className="p-5 bg-amber-50 rounded-2xl border border-amber-200 space-y-3">
              <div className="flex items-center space-x-2 text-amber-800 font-bold">
                <AlertTriangle className="w-5 h-5 text-amber-600" />
                <span className="text-sm">Data Lokal Terdeteksi ({localDataCount} Siswa)</span>
              </div>
              <p className="text-amber-700">
                Ditemukan data yang tersimpan pada penyimpanan peramban (localStorage). Anda dapat mengunggahnya sekarang ke Cloud Firestore secara permanen.
              </p>
              <button
                id="btn-settings-migrate-local"
                onClick={handleManualMigrate}
                disabled={isMigrating}
                className="px-5 py-2.5 bg-amber-600 hover:bg-amber-700 text-white font-bold rounded-xl shadow-xs cursor-pointer flex items-center space-x-1.5 min-h-[40px]"
              >
                {isMigrating ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Cloud className="w-4 h-4" />}
                <span>{isMigrating ? 'Mengunggah ke Firestore...' : 'Migrasikan Data Lokal ke Firestore'}</span>
              </button>
            </div>
          )}

          {/* Feedback banner */}
          {restoreFeedback && (
            <div className="p-4 bg-blue-50 border border-blue-200 rounded-xl text-blue-800 text-xs flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-blue-600 flex-shrink-0" />
              <span>{restoreFeedback}</span>
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Download Backup */}
            <div className="p-5 bg-zinc-50 rounded-2xl border border-zinc-200 flex flex-col justify-between space-y-3">
              <div>
                <div className="flex items-center space-x-2 text-blue-600 font-bold">
                  <Download className="w-5 h-5" />
                  <span className="text-sm">Unduh Cadangan Lengkap (.json)</span>
                </div>
                <p className="text-zinc-500 mt-1">
                  Menghasilkan file .json utuh berisi seluruh tabel relasional dari Cloud Firestore.
                </p>
              </div>

              <button
                id="btn-settings-download-backup"
                onClick={handleDownloadBackup}
                className="w-full py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl shadow-xs cursor-pointer flex items-center justify-center space-x-1.5 min-h-[44px]"
              >
                <Download className="w-4 h-4" />
                <span>Unduh File Backup (.json)</span>
              </button>
            </div>

            {/* Upload Restore */}
            <div className="p-5 bg-zinc-50 rounded-2xl border border-zinc-200 flex flex-col justify-between space-y-3">
              <input
                type="file"
                ref={fileInputRef}
                onChange={handleRestoreBackup}
                accept=".json"
                className="hidden"
              />
              <div>
                <div className="flex items-center space-x-2 text-emerald-600 font-bold">
                  <Upload className="w-5 h-5" />
                  <span className="text-sm">Pulihkan ke Cloud Firestore</span>
                </div>
                <p className="text-zinc-500 mt-1">
                  Menulis ulang seluruh data dari file .json cadangan langsung ke Cloud Firestore.
                </p>
              </div>

              <button
                id="btn-settings-restore-backup"
                onClick={() => fileInputRef.current?.click()}
                disabled={isRestoring}
                className="w-full py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl shadow-xs cursor-pointer flex items-center justify-center space-x-1.5 min-h-[44px]"
              >
                {isRestoring ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4" />}
                <span>{isRestoring ? 'Menulis ke Firestore...' : 'Pilih File Backup JSON'}</span>
              </button>
            </div>
          </div>

          {/* Reset to Default Seed Data */}
          <div className="pt-4 border-t border-zinc-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <h4 className="font-bold text-zinc-800">Reset ke Data Contoh Percontohan</h4>
              <p className="text-zinc-400">Kembalikan data di Firestore ke kondisi awal kelas XI TKR B SMK Negeri 1 Sukamaju.</p>
            </div>
            <button
              onClick={handleResetToSeed}
              className="px-4 py-2.5 bg-rose-50 text-rose-700 hover:bg-rose-100 border border-rose-200 rounded-xl font-bold transition flex items-center space-x-1.5 cursor-pointer min-h-[44px]"
            >
              <RotateCcw className="w-4 h-4 text-rose-600" />
              <span>Reset Data ke Firestore</span>
            </button>
          </div>
        </div>
      )}

      {/* Reset Confirmation Modal */}
      <ConfirmModal
        isOpen={showResetModal}
        title="Reset ke Data Contoh Percontohan"
        message="PERINGATAN: Seluruh data saat ini akan direset dan digantikan dengan data percontohan SMK Indonesia yang ditulis ke Cloud Firestore. Tindakan ini tidak dapat dibatalkan."
        confirmText="Ya, Reset Database"
        cancelText="Batal"
        type="danger"
        isProcessing={isResetting}
        onConfirm={executeReset}
        onClose={() => !isResetting && setShowResetModal(false)}
      />
    </div>
  );
};
