import React, { useState, useRef } from 'react';
import { useDatabase } from '../../context/DatabaseContext';
import { SchoolSettings, DisciplineFactorWeights, EarlyWarningThresholds } from '../../types';
import { 
  Settings, 
  School, 
  UserCheck, 
  Sliders, 
  ShieldAlert, 
  Database, 
  Save, 
  Download, 
  Upload, 
  RotateCcw, 
  Plus, 
  Trash2,
  CheckCircle2
} from 'lucide-react';
import { exportDatabaseBackup, importDatabaseBackup, resetDatabaseToSeed } from '../../db/storage';

export const SettingsManager: React.FC = () => {
  const { 
    db, 
    updateSchoolSettings, 
    updateDisciplineWeights, 
    updateEarlyWarningThresholds, 
    addAcademicYear, 
    addClass,
    refreshDatabaseState
  } = useDatabase();

  const [activeTab, setActiveTab] = useState<'school' | 'academic' | 'weights' | 'backup'>('school');

  // School Settings State
  const [schoolSettings, setSchoolSettings] = useState<SchoolSettings>({ ...db.school_settings });

  // Weights State
  const [weights, setWeights] = useState<DisciplineFactorWeights>({ ...db.discipline_weights });

  // Warning Thresholds State
  const [thresholds, setThresholds] = useState<EarlyWarningThresholds>({ ...db.early_warning_thresholds });

  // Add Academic Year Form
  const [newYearName, setNewYearName] = useState('');
  const [newSemester, setNewSemester] = useState<'Ganjil' | 'Genap'>('Ganjil');

  // Add Class Form
  const [newClassName, setNewClassName] = useState('');
  const [newGradeLevel, setNewGradeLevel] = useState(11);
  const [newMajor, setNewMajor] = useState('Teknik Kendaraan Ringan Otomotif');

  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleSaveSchoolSettings = (e: React.FormEvent) => {
    e.preventDefault();
    updateSchoolSettings(schoolSettings);
    alert('Identitas sekolah dan wali kelas berhasil disimpan.');
  };

  const handleSaveWeights = (e: React.FormEvent) => {
    e.preventDefault();
    const sum = weights.attendance_weight + weights.punctuality_weight + weights.violation_weight + weights.compliance_weight + weights.responsibility_weight;
    if (sum !== 100) {
      if (!window.confirm(`Total bobot saat ini ${sum}%. Disarankan total 100%. Tetap simpan?`)) {
        return;
      }
    }
    updateDisciplineWeights(weights);
    updateEarlyWarningThresholds(thresholds);
    alert('Bobot formula kedisiplinan dan threshold early warning berhasil diperbarui.');
  };

  const handleAddAcademicYear = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newYearName.trim()) return;
    addAcademicYear(newYearName.trim(), newSemester, false);
    setNewYearName('');
    alert(`Tahun ajaran ${newYearName} (${newSemester}) berhasil ditambahkan.`);
  };

  const handleAddClass = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newClassName.trim()) return;
    addClass(newClassName.trim(), Number(newGradeLevel), newMajor.trim(), db.school_settings.homeroom_teacher_name);
    setNewClassName('');
    alert(`Kelas ${newClassName} berhasil ditambahkan.`);
  };

  const handleDownloadBackup = () => {
    const jsonStr = exportDatabaseBackup();
    const blob = new Blob([jsonStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `WaliKelas_DB_Backup_${new Date().toISOString().split('T')[0]}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleRestoreBackup = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const content = event.target?.result as string;
        const success = importDatabaseBackup(content);
        if (success) {
          refreshDatabaseState();
          alert('Database berhasil dipulihkan dari file backup JSON!');
        } else {
          alert('Gagal memulihkan database. Format JSON tidak sesuai.');
        }
      } catch (err) {
        alert('Terjadi kesalahan saat memproses file backup.');
      }
    };
    reader.readAsText(file);
  };

  const handleResetToSeed = () => {
    if (window.confirm('PERINGATAN: Seluruh data saat ini akan digantikan dengan data awal percontohan SMK Indonesia. Anda yakin?')) {
      resetDatabaseToSeed();
      refreshDatabaseState();
      alert('Database berhasil direset ke data percontohan.');
    }
  };

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      {/* Header */}
      <div className="bg-white dark:bg-slate-800/90 p-5 rounded-2xl border border-slate-200 dark:border-slate-700/80 shadow-sm">
        <div className="flex items-center space-x-3">
          <div className="w-10 h-10 rounded-xl bg-slate-900 text-white flex items-center justify-center font-bold">
            <Settings className="w-5 h-5 text-blue-400" />
          </div>
          <div>
            <h2 className="text-lg font-bold text-slate-900 dark:text-white">
              Pengaturan Sistem & Konfigurasi Administrasi
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Kelola profil sekolah, kop laporan, bobot formula indeks kedisiplinan, dan manajemen backup data
            </p>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex bg-slate-100 dark:bg-slate-800/80 p-1 rounded-xl border border-slate-200 dark:border-slate-700 text-xs font-semibold w-fit">
        <button
          onClick={() => setActiveTab('school')}
          className={`px-4 py-2 rounded-lg transition cursor-pointer flex items-center space-x-1.5 ${
            activeTab === 'school' ? 'bg-blue-600 text-white shadow' : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
          }`}
        >
          <School className="w-4 h-4" />
          <span>Identitas Sekolah & Wali Kelas</span>
        </button>

        <button
          onClick={() => setActiveTab('academic')}
          className={`px-4 py-2 rounded-lg transition cursor-pointer flex items-center space-x-1.5 ${
            activeTab === 'academic' ? 'bg-blue-600 text-white shadow' : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
          }`}
        >
          <Sliders className="w-4 h-4" />
          <span>Tahun Ajaran & Kelas</span>
        </button>

        <button
          onClick={() => setActiveTab('weights')}
          className={`px-4 py-2 rounded-lg transition cursor-pointer flex items-center space-x-1.5 ${
            activeTab === 'weights' ? 'bg-blue-600 text-white shadow' : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
          }`}
        >
          <ShieldAlert className="w-4 h-4" />
          <span>Bobot Disiplin & Early Warning</span>
        </button>

        <button
          onClick={() => setActiveTab('backup')}
          className={`px-4 py-2 rounded-lg transition cursor-pointer flex items-center space-x-1.5 ${
            activeTab === 'backup' ? 'bg-blue-600 text-white shadow' : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
          }`}
        >
          <Database className="w-4 h-4" />
          <span>Backup & Pemulihan</span>
        </button>
      </div>

      {/* TAB 1: SCHOOL SETTINGS */}
      {activeTab === 'school' && (
        <form onSubmit={handleSaveSchoolSettings} className="bg-white dark:bg-slate-800/90 rounded-2xl border border-slate-200 dark:border-slate-700/80 p-6 shadow-sm space-y-4 text-xs">
          <h3 className="text-sm font-bold text-slate-900 dark:text-white border-b border-slate-200 dark:border-slate-700 pb-2">
            Identitas Resmi Satuan Pendidikan (Kop Rapor & Laporan)
          </h3>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-slate-700 dark:text-slate-300 font-semibold mb-1">Nama Resmi Sekolah</label>
              <input
                type="text"
                required
                value={schoolSettings.school_name}
                onChange={(e) => setSchoolSettings(prev => ({ ...prev, school_name: e.target.value }))}
                className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-900 dark:text-white font-bold"
              />
            </div>

            <div>
              <label className="block text-slate-700 dark:text-slate-300 font-semibold mb-1">NPSN (Nomor Pokok Sekolah Nasional)</label>
              <input
                type="text"
                value={schoolSettings.npsn}
                onChange={(e) => setSchoolSettings(prev => ({ ...prev, npsn: e.target.value }))}
                className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-900 dark:text-white font-mono"
              />
            </div>

            <div className="md:col-span-2">
              <label className="block text-slate-700 dark:text-slate-300 font-semibold mb-1">Alamat Lengkap Sekolah</label>
              <input
                type="text"
                value={schoolSettings.address}
                onChange={(e) => setSchoolSettings(prev => ({ ...prev, address: e.target.value }))}
                className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-900 dark:text-white"
              />
            </div>

            <div>
              <label className="block text-slate-700 dark:text-slate-300 font-semibold mb-1">Kota / Kabupaten</label>
              <input
                type="text"
                value={schoolSettings.city}
                onChange={(e) => setSchoolSettings(prev => ({ ...prev, city: e.target.value }))}
                className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-900 dark:text-white"
              />
            </div>

            <div>
              <label className="block text-slate-700 dark:text-slate-300 font-semibold mb-1">Provinsi</label>
              <input
                type="text"
                value={schoolSettings.province}
                onChange={(e) => setSchoolSettings(prev => ({ ...prev, province: e.target.value }))}
                className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-900 dark:text-white"
              />
            </div>
          </div>

          <h3 className="text-sm font-bold text-slate-900 dark:text-white border-b border-slate-200 dark:border-slate-700 pb-2 pt-4">
            Data Pimpinan & Wali Kelas (Penandatangan Laporan)
          </h3>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-slate-700 dark:text-slate-300 font-semibold mb-1">Nama Kepala Sekolah</label>
              <input
                type="text"
                value={schoolSettings.principal_name}
                onChange={(e) => setSchoolSettings(prev => ({ ...prev, principal_name: e.target.value }))}
                className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-900 dark:text-white font-semibold"
              />
            </div>

            <div>
              <label className="block text-slate-700 dark:text-slate-300 font-semibold mb-1">NIP Kepala Sekolah</label>
              <input
                type="text"
                value={schoolSettings.principal_nip}
                onChange={(e) => setSchoolSettings(prev => ({ ...prev, principal_nip: e.target.value }))}
                className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-900 dark:text-white font-mono"
              />
            </div>

            <div>
              <label className="block text-slate-700 dark:text-slate-300 font-semibold mb-1">Nama Wali Kelas</label>
              <input
                type="text"
                required
                value={schoolSettings.homeroom_teacher_name}
                onChange={(e) => setSchoolSettings(prev => ({ ...prev, homeroom_teacher_name: e.target.value }))}
                className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-900 dark:text-white font-semibold"
              />
            </div>

            <div>
              <label className="block text-slate-700 dark:text-slate-300 font-semibold mb-1">NIP Wali Kelas</label>
              <input
                type="text"
                value={schoolSettings.homeroom_teacher_nip}
                onChange={(e) => setSchoolSettings(prev => ({ ...prev, homeroom_teacher_nip: e.target.value }))}
                className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-900 dark:text-white font-mono"
              />
            </div>
          </div>

          <div className="pt-4 border-t border-slate-200 dark:border-slate-800 flex justify-end">
            <button
              type="submit"
              className="px-6 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl flex items-center space-x-1.5 shadow-md cursor-pointer"
            >
              <Save className="w-4 h-4" />
              <span>Simpan Identitas Sekolah</span>
            </button>
          </div>
        </form>
      )}

      {/* TAB 2: ACADEMIC YEARS & CLASSES */}
      {activeTab === 'academic' && (
        <div className="space-y-6 text-xs">
          {/* Academic Years Management */}
          <div className="bg-white dark:bg-slate-800/90 rounded-2xl border border-slate-200 dark:border-slate-700/80 p-6 shadow-sm space-y-4">
            <h3 className="text-sm font-bold text-slate-900 dark:text-white">
              Daftar Tahun Ajaran
            </h3>

            <div className="overflow-x-auto border border-slate-200 dark:border-slate-700 rounded-xl">
              <table className="w-full text-left">
                <thead className="bg-slate-50 dark:bg-slate-900 text-slate-500">
                  <tr>
                    <th className="p-3">ID</th>
                    <th className="p-3">Tahun Ajaran</th>
                    <th className="p-3">Semester</th>
                    <th className="p-3 text-center">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-700">
                  {db.academic_years.map(ay => (
                    <tr key={ay.academic_year_id}>
                      <td className="p-3 font-mono text-slate-400">{ay.academic_year_id}</td>
                      <td className="p-3 font-bold">{ay.year_name}</td>
                      <td className="p-3">{ay.semester}</td>
                      <td className="p-3 text-center">
                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                          ay.status === 'Active' ? 'bg-emerald-100 text-emerald-800' : 'bg-slate-100 text-slate-600'
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
                className="px-3 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-900 dark:text-white"
              />
              <select
                value={newSemester}
                onChange={(e) => setNewSemester(e.target.value as any)}
                className="px-3 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-900 dark:text-white cursor-pointer"
              >
                <option value="Ganjil">Semester Ganjil</option>
                <option value="Genap">Semester Genap</option>
              </select>
              <button
                type="submit"
                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl shadow cursor-pointer"
              >
                + Tambah Tahun Ajaran
              </button>
            </form>
          </div>

          {/* Classes Management */}
          <div className="bg-white dark:bg-slate-800/90 rounded-2xl border border-slate-200 dark:border-slate-700/80 p-6 shadow-sm space-y-4">
            <h3 className="text-sm font-bold text-slate-900 dark:text-white">
              Daftar Rombongan Belajar / Kelas
            </h3>

            <div className="overflow-x-auto border border-slate-200 dark:border-slate-700 rounded-xl">
              <table className="w-full text-left">
                <thead className="bg-slate-50 dark:bg-slate-900 text-slate-500">
                  <tr>
                    <th className="p-3">ID Kelas</th>
                    <th className="p-3">Nama Kelas</th>
                    <th className="p-3">Tingkat</th>
                    <th className="p-3">Program Keahlian / Jurusan</th>
                    <th className="p-3">Wali Kelas</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-700">
                  {db.classes.map(c => (
                    <tr key={c.class_id}>
                      <td className="p-3 font-mono text-slate-400">{c.class_id}</td>
                      <td className="p-3 font-bold">{c.class_name}</td>
                      <td className="p-3">Kelas {c.grade_level}</td>
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
                className="px-3 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-900 dark:text-white"
              />
              <select
                value={newGradeLevel}
                onChange={(e) => setNewGradeLevel(Number(e.target.value))}
                className="px-3 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-900 dark:text-white cursor-pointer"
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
                className="px-3 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-900 dark:text-white"
              />
              <button
                type="submit"
                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl shadow cursor-pointer"
              >
                + Tambah Kelas
              </button>
            </form>
          </div>
        </div>
      )}

      {/* TAB 3: WEIGHTS & EARLY WARNING THRESHOLDS */}
      {activeTab === 'weights' && (
        <form onSubmit={handleSaveWeights} className="bg-white dark:bg-slate-800/90 rounded-2xl border border-slate-200 dark:border-slate-700/80 p-6 shadow-sm space-y-6 text-xs">
          <div>
            <h3 className="text-sm font-bold text-slate-900 dark:text-white mb-1">
              Bobot Formula Indeks Kedisiplinan Siswa (Total harus 100%)
            </h3>
            <p className="text-slate-500">
              Formula standar PRD: Kehadiran + Ketepatan Waktu + Pelanggaran + Kepatuhan Atribut + Tanggung Jawab
            </p>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
            <div className="p-3 bg-slate-50 dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-700">
              <label className="block text-slate-500 mb-1 font-semibold">Kehadiran (%)</label>
              <input
                type="number"
                value={weights.attendance_weight}
                onChange={(e) => setWeights(prev => ({ ...prev, attendance_weight: Number(e.target.value) }))}
                className="w-full px-2 py-1 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded text-center font-bold text-slate-900 dark:text-white"
              />
            </div>

            <div className="p-3 bg-slate-50 dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-700">
              <label className="block text-slate-500 mb-1 font-semibold">Tepat Waktu (%)</label>
              <input
                type="number"
                value={weights.punctuality_weight}
                onChange={(e) => setWeights(prev => ({ ...prev, punctuality_weight: Number(e.target.value) }))}
                className="w-full px-2 py-1 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded text-center font-bold text-slate-900 dark:text-white"
              />
            </div>

            <div className="p-3 bg-slate-50 dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-700">
              <label className="block text-slate-500 mb-1 font-semibold">Pelanggaran (%)</label>
              <input
                type="number"
                value={weights.violation_weight}
                onChange={(e) => setWeights(prev => ({ ...prev, violation_weight: Number(e.target.value) }))}
                className="w-full px-2 py-1 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded text-center font-bold text-slate-900 dark:text-white"
              />
            </div>

            <div className="p-3 bg-slate-50 dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-700">
              <label className="block text-slate-500 mb-1 font-semibold">Seragam/Atribut (%)</label>
              <input
                type="number"
                value={weights.compliance_weight}
                onChange={(e) => setWeights(prev => ({ ...prev, compliance_weight: Number(e.target.value) }))}
                className="w-full px-2 py-1 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded text-center font-bold text-slate-900 dark:text-white"
              />
            </div>

            <div className="p-3 bg-slate-50 dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-700">
              <label className="block text-slate-500 mb-1 font-semibold">Tanggung Jawab (%)</label>
              <input
                type="number"
                value={weights.responsibility_weight}
                onChange={(e) => setWeights(prev => ({ ...prev, responsibility_weight: Number(e.target.value) }))}
                className="w-full px-2 py-1 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded text-center font-bold text-slate-900 dark:text-white"
              />
            </div>
          </div>

          <div className="pt-4 border-t border-slate-200 dark:border-slate-700">
            <h3 className="text-sm font-bold text-slate-900 dark:text-white mb-1">
              Batas Pemicu Peringatan Dini (Rule-based Early Warning Thresholds)
            </h3>
            <p className="text-slate-500 mb-3">
              Kondisi yang langsung memicu status "Prioritas Tinggi" atau "Perlu Perhatian"
            </p>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div className="p-3 bg-slate-50 dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-700">
                <label className="block text-slate-500 mb-1">Batas Minimal Kehadiran (%):</label>
                <input
                  type="number"
                  value={thresholds.min_attendance_rate}
                  onChange={(e) => setThresholds(prev => ({ ...prev, min_attendance_rate: Number(e.target.value) }))}
                  className="w-full px-3 py-1.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-900 dark:text-white font-bold"
                />
              </div>

              <div className="p-3 bg-slate-50 dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-700">
                <label className="block text-slate-500 mb-1">Maksimal Alpa Sebelum Alert:</label>
                <input
                  type="number"
                  value={thresholds.max_alpa_count}
                  onChange={(e) => setThresholds(prev => ({ ...prev, max_alpa_count: Number(e.target.value) }))}
                  className="w-full px-3 py-1.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-900 dark:text-white font-bold"
                />
              </div>

              <div className="p-3 bg-slate-50 dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-700">
                <label className="block text-slate-500 mb-1">Poin Pelanggaran Pemicu Alert:</label>
                <input
                  type="number"
                  value={thresholds.max_violation_points}
                  onChange={(e) => setThresholds(prev => ({ ...prev, max_violation_points: Number(e.target.value) }))}
                  className="w-full px-3 py-1.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-900 dark:text-white font-bold"
                />
              </div>
            </div>
          </div>

          <div className="pt-4 border-t border-slate-200 dark:border-slate-800 flex justify-end">
            <button
              type="submit"
              className="px-6 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl flex items-center space-x-1.5 shadow-md cursor-pointer"
            >
              <Save className="w-4 h-4" />
              <span>Simpan Parameter Disiplin & Alert</span>
            </button>
          </div>
        </form>
      )}

      {/* TAB 4: BACKUP & RESTORE */}
      {activeTab === 'backup' && (
        <div className="bg-white dark:bg-slate-800/90 rounded-2xl border border-slate-200 dark:border-slate-700/80 p-6 shadow-sm space-y-6 text-xs">
          <div>
            <h3 className="text-sm font-bold text-slate-900 dark:text-white mb-1">
              Pencadangan & Pemulihan Basis Data (Offline-First Storage)
            </h3>
            <p className="text-slate-500">
              Seluruh relasi database (siswa, orang tua, presensi, pelanggaran, home visit, dsb.) dapat dicadangkan ke file JSON atau dipulihkan sewaktu-waktu.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Download Backup */}
            <div className="p-5 bg-slate-50 dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-700 flex flex-col justify-between space-y-3">
              <div>
                <div className="flex items-center space-x-2 text-blue-600 font-bold">
                  <Download className="w-5 h-5" />
                  <span className="text-sm">Unduh Cadangan Database</span>
                </div>
                <p className="text-slate-500 mt-1">
                  Menghasilkan file .json utuh berisi seluruh tabel relasional wali kelas.
                </p>
              </div>

              <button
                id="btn-settings-download-backup"
                onClick={handleDownloadBackup}
                className="w-full py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl shadow cursor-pointer flex items-center justify-center space-x-1.5"
              >
                <Download className="w-4 h-4" />
                <span>Unduh File Backup (.json)</span>
              </button>
            </div>

            {/* Upload Restore */}
            <div className="p-5 bg-slate-50 dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-700 flex flex-col justify-between space-y-3">
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
                  <span className="text-sm">Pulihkan dari File Backup</span>
                </div>
                <p className="text-slate-500 mt-1">
                  Muat ulang database dari file .json cadangan sebelumnya.
                </p>
              </div>

              <button
                id="btn-settings-restore-backup"
                onClick={() => fileInputRef.current?.click()}
                className="w-full py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl shadow cursor-pointer flex items-center justify-center space-x-1.5"
              >
                <Upload className="w-4 h-4" />
                <span>Pilih File Backup JSON</span>
              </button>
            </div>
          </div>

          {/* Reset to Default Seed Data */}
          <div className="pt-4 border-t border-slate-200 dark:border-slate-700 flex items-center justify-between">
            <div>
              <h4 className="font-bold text-slate-800 dark:text-white">Reset ke Data Contoh Asli</h4>
              <p className="text-slate-400">Kembalikan data ke kondisi awal kelas XI TKR B SMK Negeri 1 Sukamaju.</p>
            </div>
            <button
              onClick={handleResetToSeed}
              className="px-4 py-2 bg-rose-50 text-rose-700 hover:bg-rose-100 border border-rose-200 rounded-xl font-bold transition flex items-center space-x-1.5 cursor-pointer"
            >
              <RotateCcw className="w-4 h-4 text-rose-600" />
              <span>Reset Data Contoh</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
