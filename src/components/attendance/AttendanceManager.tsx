import React, { useState, useMemo } from 'react';
import { useDatabase } from '../../context/DatabaseContext';
import { AttendanceStatus, AttendanceRecord } from '../../types';
import { 
  CalendarCheck, 
  CheckCheck, 
  Calendar, 
  Save, 
  FileSpreadsheet, 
  Filter, 
  Download,
  Printer,
  Table as TableIcon,
  Grid,
  Search,
  AlertTriangle,
  CheckCircle2,
  Clock,
  UserCheck,
  CalendarDays,
  RefreshCw
} from 'lucide-react';
import { generateMonthlyAttendancePDF, MonthlyAttendanceStudentSummary } from '../../utils/pdf';
import { exportMonthlyAttendanceExcel } from '../../utils/excel';

const MONTH_NAMES = [
  'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
  'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'
];

export const AttendanceManager: React.FC = () => {
  const { 
    db, 
    allStudentsFullData, 
    saveAttendanceBatch, 
    saveDailyAttendance, 
    activeClass, 
    activeAcademicYear,
    showToast 
  } = useDatabase();

  const [selectedDate, setSelectedDate] = useState<string>(new Date().toISOString().split('T')[0]);
  const [activeTab, setActiveTab] = useState<'daily' | 'monthly' | 'cumulative'>('daily');
  const [isSaving, setIsSaving] = useState(false);

  // Filters for Monthly Recap
  const currentDateObj = new Date();
  const [selectedMonth, setSelectedMonth] = useState<number>(currentDateObj.getMonth() + 1); // 1-12
  const [selectedYear, setSelectedYear] = useState<number>(currentDateObj.getFullYear());
  const [filterClassId, setFilterClassId] = useState<string>(activeClass?.class_id || db.classes[0]?.class_id || '');
  const [filterAcademicYearId, setFilterAcademicYearId] = useState<string>(activeAcademicYear?.academic_year_id || db.academic_years[0]?.academic_year_id || '');
  const [filterSemester, setFilterSemester] = useState<'Ganjil' | 'Genap'>(activeAcademicYear?.semester || 'Ganjil');
  const [studentSearchQuery, setStudentSearchQuery] = useState<string>('');
  const [monthlyViewMode, setMonthlyViewMode] = useState<'summary' | 'matrix'>('summary');

  // Sync class & academic year when context changes
  React.useEffect(() => {
    if (activeClass?.class_id && !filterClassId) {
      setFilterClassId(activeClass.class_id);
    }
  }, [activeClass, filterClassId]);

  React.useEffect(() => {
    if (activeAcademicYear) {
      if (!filterAcademicYearId) setFilterAcademicYearId(activeAcademicYear.academic_year_id);
      if (activeAcademicYear.semester) setFilterSemester(activeAcademicYear.semester);
    }
  }, [activeAcademicYear, filterAcademicYearId]);

  // Load existing records for the selected date or default to 'Hadir'
  const [dailyStatusMap, setDailyStatusMap] = useState<Record<string, { status: AttendanceStatus; note: string }>>({});

  // Sync daily map when selected date or students change
  React.useEffect(() => {
    const existing = db.attendance.filter(a => a.date === selectedDate);
    const map: Record<string, { status: AttendanceStatus; note: string }> = {};

    allStudentsFullData.forEach(s => {
      const rec = existing.find(e => e.student_id === s.student.student_id);
      if (rec) {
        map[s.student.student_id] = { status: rec.status, note: rec.note || '' };
      } else {
        map[s.student.student_id] = { status: 'Hadir', note: '' };
      }
    });

    setDailyStatusMap(map);
  }, [selectedDate, allStudentsFullData, db.attendance]);

  const handleSetAllStatus = (status: AttendanceStatus) => {
    const nextMap: Record<string, { status: AttendanceStatus; note: string }> = {};
    allStudentsFullData.forEach(s => {
      nextMap[s.student.student_id] = {
        status,
        note: dailyStatusMap[s.student.student_id]?.note || ''
      };
    });
    setDailyStatusMap(nextMap);
  };

  const handleStatusChange = (studentId: string, status: AttendanceStatus) => {
    setDailyStatusMap(prev => ({
      ...prev,
      [studentId]: {
        ...prev[studentId],
        status,
      }
    }));
  };

  const handleNoteChange = (studentId: string, note: string) => {
    setDailyStatusMap(prev => ({
      ...prev,
      [studentId]: {
        ...prev[studentId],
        note,
      }
    }));
  };

  // AUDITED SAVE HANDLER WITH FULL VALIDATION & ERROR HANDLING
  const handleSaveAttendance = async () => {
    if (isSaving) return;

    // 1. Validations
    const targetClassId = activeClass?.class_id || db.classes[0]?.class_id;
    if (!targetClassId) {
      showToast('error', 'Silakan pilih kelas terlebih dahulu sebelum menyimpan presensi.');
      return;
    }

    const targetAyId = activeAcademicYear?.academic_year_id || db.academic_years[0]?.academic_year_id;
    if (!targetAyId) {
      showToast('error', 'Tahun ajaran aktif belum terkonfigurasi.');
      return;
    }

    if (!selectedDate) {
      showToast('error', 'Silakan pilih tanggal presensi.');
      return;
    }

    if (allStudentsFullData.length === 0) {
      showToast('error', 'Tidak ada data siswa dalam kelas ini untuk dicatat presensinya.');
      return;
    }

    const validStatuses: AttendanceStatus[] = ['Hadir', 'Sakit', 'Izin', 'Alpa', 'Terlambat'];

    const records: Omit<AttendanceRecord, 'attendance_id' | 'recorded_at'>[] = [];

    for (const s of allStudentsFullData) {
      const item = dailyStatusMap[s.student.student_id] || { status: 'Hadir', note: '' };
      if (!validStatuses.includes(item.status)) {
        showToast('error', `Status presensi untuk siswa ${s.student.full_name} tidak valid.`);
        return;
      }

      records.push({
        student_id: s.student.student_id,
        class_id: targetClassId,
        academic_year_id: targetAyId,
        date: selectedDate,
        status: item.status,
        note: item.note || '',
      });
    }

    setIsSaving(true);
    try {
      showToast('loading', `Menyimpan presensi ${records.length} siswa untuk tanggal ${selectedDate}...`);
      const saveFn = saveDailyAttendance || saveAttendanceBatch;
      if (typeof saveFn === 'function') {
        await saveFn(records);
        showToast('success', `Presensi tanggal ${selectedDate} untuk ${records.length} siswa berhasil disimpan.`);
      } else {
        throw new Error('Fungsi penyimpanan presensi tidak tersedia di DatabaseContext.');
      }
    } catch (err: any) {
      console.error('Error saving attendance:', err);
      showToast('error', `Gagal menyimpan presensi: ${err.message || 'Terjadi kesalahan sistem'}`);
    } finally {
      setIsSaving(false);
    }
  };

  // Quick tally of current daily state
  const tally = useMemo(() => {
    const res: Record<AttendanceStatus, number> = { Hadir: 0, Sakit: 0, Izin: 0, Alpa: 0, Terlambat: 0 };
    Object.values(dailyStatusMap).forEach((item: { status: AttendanceStatus; note: string }) => {
      if (item && item.status && res[item.status] !== undefined) {
        res[item.status]++;
      }
    });
    return res;
  }, [dailyStatusMap]);

  // MONTHLY RECAP DERIVATION (Strictly derived from existing attendance collection)
  const currentSelectedClass = useMemo(() => {
    return db.classes.find(c => c.class_id === filterClassId) || activeClass || db.classes[0];
  }, [db.classes, filterClassId, activeClass]);

  const currentSelectedAY = useMemo(() => {
    return db.academic_years.find(ay => ay.academic_year_id === filterAcademicYearId) || activeAcademicYear || db.academic_years[0];
  }, [db.academic_years, filterAcademicYearId, activeAcademicYear]);

  // Days count in the selected month
  const daysInSelectedMonth = useMemo(() => {
    return new Date(selectedYear, selectedMonth, 0).getDate();
  }, [selectedYear, selectedMonth]);

  const monthDatePrefix = useMemo(() => {
    return `${selectedYear}-${String(selectedMonth).padStart(2, '0')}`;
  }, [selectedYear, selectedMonth]);

  // Students belonging to the filtered class
  const classStudents = useMemo(() => {
    let list = allStudentsFullData;
    if (filterClassId && filterClassId !== activeClass?.class_id) {
      // Find students whose class history or current class matches filterClassId
      const studentIdsInClass = db.student_class_history
        .filter(h => h.class_id === filterClassId)
        .map(h => h.student_id);
      list = allStudentsFullData.filter(s => 
        s.current_class?.class_id === filterClassId || studentIdsInClass.includes(s.student.student_id)
      );
    }
    if (studentSearchQuery.trim()) {
      const q = studentSearchQuery.toLowerCase();
      list = list.filter(s => 
        s.student.full_name.toLowerCase().includes(q) ||
        s.student.student_id.toLowerCase().includes(q) ||
        (s.student.nis && s.student.nis.toLowerCase().includes(q))
      );
    }
    return list;
  }, [allStudentsFullData, filterClassId, activeClass, db.student_class_history, studentSearchQuery]);

  // Monthly Summaries calculation per student
  const monthlyStudentSummaries: (MonthlyAttendanceStudentSummary & { warning_status: string; warning_color: string })[] = useMemo(() => {
    return classStudents.map(s => {
      const studentId = s.student.student_id;
      // Filter attendance records by student_id, academic_year_id (if matched), and attendance date prefix
      const records = db.attendance.filter(a => 
        a.student_id === studentId && 
        a.date.startsWith(monthDatePrefix)
      );

      let hadir = 0;
      let sakit = 0;
      let izin = 0;
      let alpa = 0;
      let terlambat = 0;

      records.forEach(r => {
        if (r.status === 'Hadir') hadir++;
        else if (r.status === 'Sakit') sakit++;
        else if (r.status === 'Izin') izin++;
        else if (r.status === 'Alpa') alpa++;
        else if (r.status === 'Terlambat') terlambat++;
      });

      const totalRecorded = records.length;
      // Formula: (Hadir + Terlambat) / Total Recorded Days * 100
      // Protection against division by zero: if totalRecorded == 0 => 0%
      const physicalPresence = hadir + terlambat;
      const rate = totalRecorded > 0 ? Math.round((physicalPresence / totalRecorded) * 100) : 0;

      // Early Warning check for the student
      const activeViolations = db.violations.filter(v => v.student_id === studentId && v.status !== 'Selesai');
      const hasHeavyViolation = activeViolations.some(v => v.level === 'Berat');
      
      let warningStatus = 'Normal';
      let warningColor = 'text-emerald-700 bg-emerald-100 dark:bg-emerald-950/60 dark:text-emerald-300';

      if (rate < 80 || alpa >= 3 || hasHeavyViolation) {
        warningStatus = 'Prioritas Tinggi';
        warningColor = 'text-rose-700 bg-rose-100 dark:bg-rose-950/60 dark:text-rose-300';
      } else if (rate < 90 || terlambat >= 3 || activeViolations.length >= 2) {
        warningStatus = 'Perlu Perhatian';
        warningColor = 'text-amber-700 bg-amber-100 dark:bg-amber-950/60 dark:text-amber-300';
      }

      return {
        student_id: studentId,
        nis: s.student.nis || '-',
        full_name: s.student.full_name,
        hadir,
        sakit,
        izin,
        alpa,
        terlambat,
        total_recorded: totalRecorded,
        attendance_percentage: rate,
        warning_status: warningStatus,
        warning_color: warningColor,
      };
    });
  }, [classStudents, db.attendance, db.violations, monthDatePrefix]);

  // Overall Class Monthly Totals
  const monthlyClassStats = useMemo(() => {
    const totalStudents = monthlyStudentSummaries.length;
    const totalHadir = monthlyStudentSummaries.reduce((acc, c) => acc + c.hadir, 0);
    const totalSakit = monthlyStudentSummaries.reduce((acc, c) => acc + c.sakit, 0);
    const totalIzin = monthlyStudentSummaries.reduce((acc, c) => acc + c.izin, 0);
    const totalAlpa = monthlyStudentSummaries.reduce((acc, c) => acc + c.alpa, 0);
    const totalTerlambat = monthlyStudentSummaries.reduce((acc, c) => acc + c.terlambat, 0);
    
    // Distinct recorded dates in this month
    const distinctDates = new Set(
      db.attendance
        .filter(a => a.date.startsWith(monthDatePrefix))
        .map(a => a.date)
    );
    const totalRecordedDays = distinctDates.size;

    const avgAttendance = totalStudents > 0
      ? Math.round(monthlyStudentSummaries.reduce((acc, c) => acc + c.attendance_percentage, 0) / totalStudents)
      : 0;

    return {
      totalStudents,
      totalRecordedDays,
      totalHadir,
      totalSakit,
      totalIzin,
      totalAlpa,
      totalTerlambat,
      avgAttendance,
    };
  }, [monthlyStudentSummaries, db.attendance, monthDatePrefix]);

  // Monthly PDF Handler
  const handlePrintMonthlyPDF = () => {
    try {
      generateMonthlyAttendancePDF(
        monthlyStudentSummaries,
        currentSelectedClass?.class_name || 'Kelas',
        currentSelectedAY?.year_name || '2026/2027',
        filterSemester,
        MONTH_NAMES[selectedMonth - 1],
        selectedYear,
        db.school_settings
      );
      showToast('success', `PDF Rekap Presensi Bulan ${MONTH_NAMES[selectedMonth - 1]} ${selectedYear} berhasil dibuat.`);
    } catch (err: any) {
      console.error('PDF Error:', err);
      showToast('error', `Gagal membuat PDF: ${err.message}`);
    }
  };

  // Monthly Excel Handler
  const handleExportMonthlyExcel = () => {
    try {
      // Prepare detailed daily records for Sheet 2
      const className = currentSelectedClass?.class_name || 'Kelas';
      const monthAttendance = db.attendance.filter(a => a.date.startsWith(monthDatePrefix));
      const dailyRecords = monthAttendance.map(a => {
        const student = db.students.find(s => s.student_id === a.student_id);
        return {
          date: a.date,
          student_id: a.student_id,
          full_name: student?.full_name || 'Siswa',
          className,
          status: a.status,
          note: a.note || '',
        };
      });

      exportMonthlyAttendanceExcel(
        monthlyStudentSummaries,
        dailyRecords,
        className,
        MONTH_NAMES[selectedMonth - 1],
        selectedYear
      );
      showToast('success', `Excel Rekap Presensi Bulan ${MONTH_NAMES[selectedMonth - 1]} ${selectedYear} berhasil diunduh.`);
    } catch (err: any) {
      console.error('Excel Error:', err);
      showToast('error', `Gagal mengekspor Excel: ${err.message}`);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header Bar */}
      <div className="bg-white dark:bg-slate-800/90 p-4 rounded-2xl border border-slate-200 dark:border-slate-700/80 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-lg font-bold text-slate-900 dark:text-white flex items-center space-x-2">
            <CalendarCheck className="w-5 h-5 text-blue-600" />
            <span>Manajemen Presensi Kelas {activeClass?.class_name}</span>
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Pencatatan kehadiran harian, keterlambatan, rekapitulasi bulanan, dan rekapitulasi kumulatif semester
          </p>
        </div>

        <div className="flex items-center space-x-2">
          <div className="flex bg-slate-100 dark:bg-slate-900 p-1 rounded-xl border border-slate-200 dark:border-slate-700 text-xs font-semibold">
            <button
              id="tab-attendance-daily"
              onClick={() => setActiveTab('daily')}
              className={`px-3 py-1.5 rounded-lg transition cursor-pointer ${
                activeTab === 'daily' ? 'bg-blue-600 text-white shadow' : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              Input Harian
            </button>
            <button
              id="tab-attendance-monthly"
              onClick={() => setActiveTab('monthly')}
              className={`px-3 py-1.5 rounded-lg transition cursor-pointer flex items-center space-x-1 ${
                activeTab === 'monthly' ? 'bg-blue-600 text-white shadow' : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              <CalendarDays className="w-3.5 h-3.5" />
              <span>Rekap Bulanan</span>
            </button>
            <button
              id="tab-attendance-cumulative"
              onClick={() => setActiveTab('cumulative')}
              className={`px-3 py-1.5 rounded-lg transition cursor-pointer ${
                activeTab === 'cumulative' ? 'bg-blue-600 text-white shadow' : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              Rekap Kumulatif
            </button>
          </div>
        </div>
      </div>

      {/* VIEW 1: DAILY INPUT */}
      {activeTab === 'daily' && (
        <div className="space-y-4">
          {/* Daily Controls Toolbar */}
          <div className="bg-white dark:bg-slate-800/90 p-4 rounded-2xl border border-slate-200 dark:border-slate-700/80 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="flex flex-wrap items-center gap-3">
              <div className="flex items-center space-x-2 bg-slate-50 dark:bg-slate-900 px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700">
                <Calendar className="w-4 h-4 text-blue-500" />
                <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">Tanggal:</label>
                <input
                  id="input-attendance-date"
                  type="date"
                  value={selectedDate}
                  onChange={(e) => setSelectedDate(e.target.value)}
                  className="bg-transparent text-xs font-bold text-slate-900 dark:text-white border-0 focus:ring-0 p-0 cursor-pointer"
                />
              </div>

              {/* Quick Set All Hadir Button */}
              <button
                id="btn-set-all-hadir"
                type="button"
                onClick={() => handleSetAllStatus('Hadir')}
                className="bg-emerald-50 dark:bg-emerald-950/40 text-emerald-800 dark:text-emerald-300 hover:bg-emerald-100 border border-emerald-300 dark:border-emerald-800 px-3.5 py-1.5 rounded-xl text-xs font-bold transition flex items-center space-x-1.5 cursor-pointer"
              >
                <CheckCheck className="w-4 h-4 text-emerald-600" />
                <span>Tandai Semua Hadir</span>
              </button>
            </div>

            {/* Quick Summary Pill Bar */}
            <div className="flex items-center space-x-2 text-xs">
              <span className="px-2.5 py-1 bg-emerald-100 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-300 rounded-lg font-bold">H: {tally.Hadir}</span>
              <span className="px-2.5 py-1 bg-blue-100 dark:bg-blue-950/60 text-blue-800 dark:text-blue-300 rounded-lg font-bold">S: {tally.Sakit}</span>
              <span className="px-2.5 py-1 bg-amber-100 dark:bg-amber-950/60 text-amber-800 dark:text-amber-300 rounded-lg font-bold">I: {tally.Izin}</span>
              <span className="px-2.5 py-1 bg-rose-100 dark:bg-rose-950/60 text-rose-800 dark:text-rose-300 rounded-lg font-bold">A: {tally.Alpa}</span>
              <span className="px-2.5 py-1 bg-purple-100 dark:bg-purple-950/60 text-purple-800 dark:text-purple-300 rounded-lg font-bold">T: {tally.Terlambat}</span>
            </div>

            <button
              id="btn-save-attendance-main"
              type="button"
              disabled={isSaving}
              onClick={handleSaveAttendance}
              className={`bg-blue-600 hover:bg-blue-700 text-white px-5 py-2 rounded-xl text-xs font-bold transition flex items-center space-x-1.5 shadow-md cursor-pointer ${
                isSaving ? 'opacity-50 cursor-not-allowed' : ''
              }`}
            >
              <Save className="w-4 h-4" />
              <span>{isSaving ? 'Menyimpan...' : 'Simpan Presensi'}</span>
            </button>
          </div>

          {/* Student Daily List Table */}
          <div className="bg-white dark:bg-slate-800/90 rounded-2xl border border-slate-200 dark:border-slate-700/80 shadow-sm overflow-hidden">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 dark:bg-slate-900/80 text-slate-500 dark:text-slate-400 font-semibold border-b border-slate-200 dark:border-slate-700">
                <tr>
                  <th className="p-3 w-12 text-center">No</th>
                  <th className="p-3">Nama Siswa & ID</th>
                  <th className="p-3 text-center">Status Kehadiran</th>
                  <th className="p-3">Catatan / Alasan</th>
                  <th className="p-3 text-center">Rekap Kehadiran</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-700/60">
                {allStudentsFullData.map((d, index) => {
                  const s = d.student;
                  const currentStatus = dailyStatusMap[s.student_id]?.status || 'Hadir';
                  const currentNote = dailyStatusMap[s.student_id]?.note || '';

                  return (
                    <tr key={s.student_id} className="hover:bg-slate-50 dark:hover:bg-slate-800/40">
                      <td className="p-3 text-center text-slate-400 font-mono">{index + 1}</td>
                      <td className="p-3">
                        <div className="font-bold text-slate-900 dark:text-white">{s.full_name}</div>
                        <div className="text-[11px] text-slate-400">{s.student_id} • NIS: {s.nis || '-'}</div>
                      </td>
                      <td className="p-3">
                        <div className="flex items-center justify-center space-x-1.5">
                          {(['Hadir', 'Sakit', 'Izin', 'Alpa', 'Terlambat'] as AttendanceStatus[]).map(st => {
                            const isSelected = currentStatus === st;
                            return (
                              <button
                                key={st}
                                type="button"
                                onClick={() => handleStatusChange(s.student_id, st)}
                                className={`px-2.5 py-1 rounded-lg text-xs font-bold transition cursor-pointer ${
                                  isSelected
                                    ? st === 'Hadir' ? 'bg-emerald-600 text-white shadow' :
                                      st === 'Sakit' ? 'bg-blue-600 text-white shadow' :
                                      st === 'Izin' ? 'bg-amber-600 text-white shadow' :
                                      st === 'Alpa' ? 'bg-rose-600 text-white shadow' :
                                      'bg-purple-600 text-white shadow'
                                    : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700'
                                }`}
                              >
                                {st}
                              </button>
                            );
                          })}
                        </div>
                      </td>
                      <td className="p-3">
                        <input
                          type="text"
                          value={currentNote}
                          onChange={(e) => handleNoteChange(s.student_id, e.target.value)}
                          placeholder={
                            currentStatus === 'Sakit' ? 'Misal: Demam, surat dokter ada' :
                            currentStatus === 'Izin' ? 'Misal: Menghadiri pernikahan keluarga' :
                            currentStatus === 'Terlambat' ? 'Misal: Ban bocor (15 menit)' :
                            'Catatan keterangan...'
                          }
                          className="w-full px-2.5 py-1 text-xs bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-900 dark:text-white"
                        />
                      </td>
                      <td className="p-3 text-center">
                        <div className="font-bold text-slate-800 dark:text-slate-200">
                          {d.attendance_summary.attendance_rate}%
                        </div>
                        <div className="text-[10px] text-slate-400">
                          H:{d.attendance_summary.hadir} • A:{d.attendance_summary.alpa} • S:{d.attendance_summary.sakit} • I:{d.attendance_summary.izin}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* VIEW 2: MONTHLY RECAP (NEW PHASE 4 FEATURE) */}
      {activeTab === 'monthly' && (
        <div className="space-y-5">
          {/* Monthly Filter Bar */}
          <div className="bg-white dark:bg-slate-800/90 p-4 rounded-2xl border border-slate-200 dark:border-slate-700/80 shadow-sm space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 dark:border-slate-700 pb-3">
              <div className="flex items-center space-x-2 text-sm font-bold text-slate-900 dark:text-white">
                <Filter className="w-4 h-4 text-blue-600" />
                <span>Filter & Parameter Rekapitulasi Bulanan</span>
              </div>

              {/* PDF & Excel Action Buttons */}
              <div className="flex flex-wrap items-center gap-2">
                <button
                  id="btn-print-monthly-attendance-pdf"
                  type="button"
                  onClick={handlePrintMonthlyPDF}
                  className="px-3.5 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold transition flex items-center space-x-1.5 shadow-sm cursor-pointer"
                >
                  <Printer className="w-3.5 h-3.5" />
                  <span>Cetak Rekap Presensi Bulanan (PDF)</span>
                </button>
                <button
                  id="btn-export-monthly-attendance-excel"
                  type="button"
                  onClick={handleExportMonthlyExcel}
                  className="px-3.5 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold transition flex items-center space-x-1.5 shadow-sm cursor-pointer"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>Export Rekap Bulanan (.xlsx)</span>
                </button>
              </div>
            </div>

            {/* Filter Inputs Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-5 gap-3 text-xs">
              {/* Filter 1: Tahun Ajaran */}
              <div>
                <label className="block text-slate-500 font-semibold mb-1">Tahun Ajaran:</label>
                <select
                  value={filterAcademicYearId}
                  onChange={(e) => setFilterAcademicYearId(e.target.value)}
                  className="w-full px-2.5 py-1.5 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white font-medium cursor-pointer"
                >
                  {db.academic_years.map(ay => (
                    <option key={ay.academic_year_id} value={ay.academic_year_id}>
                      {ay.year_name} ({ay.semester})
                    </option>
                  ))}
                </select>
              </div>

              {/* Filter 2: Semester */}
              <div>
                <label className="block text-slate-500 font-semibold mb-1">Semester:</label>
                <select
                  value={filterSemester}
                  onChange={(e) => setFilterSemester(e.target.value as 'Ganjil' | 'Genap')}
                  className="w-full px-2.5 py-1.5 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white font-medium cursor-pointer"
                >
                  <option value="Ganjil">Semester Ganjil</option>
                  <option value="Genap">Semester Genap</option>
                </select>
              </div>

              {/* Filter 3: Kelas */}
              <div>
                <label className="block text-slate-500 font-semibold mb-1">Kelas:</label>
                <select
                  value={filterClassId}
                  onChange={(e) => setFilterClassId(e.target.value)}
                  className="w-full px-2.5 py-1.5 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white font-medium cursor-pointer"
                >
                  {db.classes.map(c => (
                    <option key={c.class_id} value={c.class_id}>
                      {c.class_name} ({c.major})
                    </option>
                  ))}
                </select>
              </div>

              {/* Filter 4: Bulan & Tahun */}
              <div>
                <label className="block text-slate-500 font-semibold mb-1">Bulan:</label>
                <select
                  value={selectedMonth}
                  onChange={(e) => setSelectedMonth(Number(e.target.value))}
                  className="w-full px-2.5 py-1.5 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white font-medium cursor-pointer"
                >
                  {MONTH_NAMES.map((mName, idx) => (
                    <option key={mName} value={idx + 1}>
                      {mName}
                    </option>
                  ))}
                </select>
              </div>

              {/* Filter 5: Tahun Kalender */}
              <div>
                <label className="block text-slate-500 font-semibold mb-1">Tahun:</label>
                <input
                  type="number"
                  value={selectedYear}
                  onChange={(e) => setSelectedYear(Number(e.target.value))}
                  min={2020}
                  max={2035}
                  className="w-full px-2.5 py-1.5 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white font-medium cursor-pointer"
                />
              </div>
            </div>

            {/* Search and View Mode Switcher */}
            <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-2">
              <div className="relative w-full sm:w-72">
                <Search className="w-3.5 h-3.5 absolute left-3 top-2.5 text-slate-400" />
                <input
                  type="text"
                  placeholder="Cari nama atau ID siswa..."
                  value={studentSearchQuery}
                  onChange={(e) => setStudentSearchQuery(e.target.value)}
                  className="w-full pl-8 pr-3 py-1.5 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-xs text-slate-900 dark:text-white"
                />
              </div>

              <div className="flex bg-slate-100 dark:bg-slate-900 p-0.5 rounded-xl border border-slate-200 dark:border-slate-700 text-xs">
                <button
                  type="button"
                  onClick={() => setMonthlyViewMode('summary')}
                  className={`px-3 py-1 rounded-lg font-bold transition flex items-center space-x-1 ${
                    monthlyViewMode === 'summary' ? 'bg-white dark:bg-slate-800 text-blue-600 shadow' : 'text-slate-500'
                  }`}
                >
                  <TableIcon className="w-3.5 h-3.5" />
                  <span>Ringkasan Bulanan</span>
                </button>
                <button
                  type="button"
                  onClick={() => setMonthlyViewMode('matrix')}
                  className={`px-3 py-1 rounded-lg font-bold transition flex items-center space-x-1 ${
                    monthlyViewMode === 'matrix' ? 'bg-white dark:bg-slate-800 text-blue-600 shadow' : 'text-slate-500'
                  }`}
                >
                  <Grid className="w-3.5 h-3.5" />
                  <span>Matriks Harian (1 - {daysInSelectedMonth})</span>
                </button>
              </div>
            </div>
          </div>

          {/* Monthly Class Summary Cards */}
          <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-8 gap-3">
            <div className="bg-white dark:bg-slate-800/90 p-3 rounded-xl border border-slate-200 dark:border-slate-700 text-center">
              <span className="text-[11px] text-slate-400 font-semibold block">Jumlah Siswa</span>
              <span className="text-lg font-bold text-slate-900 dark:text-white">{monthlyClassStats.totalStudents}</span>
            </div>
            <div className="bg-white dark:bg-slate-800/90 p-3 rounded-xl border border-slate-200 dark:border-slate-700 text-center">
              <span className="text-[11px] text-slate-400 font-semibold block">Hari Tercatat</span>
              <span className="text-lg font-bold text-blue-600">{monthlyClassStats.totalRecordedDays} Hari</span>
            </div>
            <div className="bg-white dark:bg-slate-800/90 p-3 rounded-xl border border-slate-200 dark:border-slate-700 text-center">
              <span className="text-[11px] text-slate-400 font-semibold block">Total Hadir</span>
              <span className="text-lg font-bold text-emerald-600">{monthlyClassStats.totalHadir}</span>
            </div>
            <div className="bg-white dark:bg-slate-800/90 p-3 rounded-xl border border-slate-200 dark:border-slate-700 text-center">
              <span className="text-[11px] text-slate-400 font-semibold block">Total Sakit</span>
              <span className="text-lg font-bold text-blue-500">{monthlyClassStats.totalSakit}</span>
            </div>
            <div className="bg-white dark:bg-slate-800/90 p-3 rounded-xl border border-slate-200 dark:border-slate-700 text-center">
              <span className="text-[11px] text-slate-400 font-semibold block">Total Izin</span>
              <span className="text-lg font-bold text-amber-500">{monthlyClassStats.totalIzin}</span>
            </div>
            <div className="bg-white dark:bg-slate-800/90 p-3 rounded-xl border border-slate-200 dark:border-slate-700 text-center">
              <span className="text-[11px] text-slate-400 font-semibold block">Total Alpa</span>
              <span className="text-lg font-bold text-rose-600">{monthlyClassStats.totalAlpa}</span>
            </div>
            <div className="bg-white dark:bg-slate-800/90 p-3 rounded-xl border border-slate-200 dark:border-slate-700 text-center">
              <span className="text-[11px] text-slate-400 font-semibold block">Terlambat</span>
              <span className="text-lg font-bold text-purple-600">{monthlyClassStats.totalTerlambat}</span>
            </div>
            <div className="bg-white dark:bg-slate-800/90 p-3 rounded-xl border border-slate-200 dark:border-slate-700 text-center">
              <span className="text-[11px] text-slate-400 font-semibold block">Rata-rata Kelas</span>
              <span className="text-lg font-black text-slate-900 dark:text-white">{monthlyClassStats.avgAttendance}%</span>
            </div>
          </div>

          {/* SUB-VIEW A: MONTHLY SUMMARY TABLE */}
          {monthlyViewMode === 'summary' && (
            <div className="bg-white dark:bg-slate-800/90 rounded-2xl border border-slate-200 dark:border-slate-700/80 shadow-sm overflow-hidden">
              <div className="p-4 border-b border-slate-100 dark:border-slate-700 flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                    Tabel Rekapitulasi Presensi Bulan {MONTH_NAMES[selectedMonth - 1]} {selectedYear}
                  </h3>
                  <p className="text-xs text-slate-500">
                    Kelas: {currentSelectedClass?.class_name} • Semester: {filterSemester} • Tahun Ajaran: {currentSelectedAY?.year_name}
                  </p>
                </div>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-50 dark:bg-slate-900 text-slate-500 dark:text-slate-400 font-semibold border-b border-slate-200 dark:border-slate-700">
                    <tr>
                      <th className="p-3 w-10 text-center">No</th>
                      <th className="p-3">Student ID</th>
                      <th className="p-3">Nama Siswa</th>
                      <th className="p-3 text-center">Hadir (H)</th>
                      <th className="p-3 text-center">Sakit (S)</th>
                      <th className="p-3 text-center">Izin (I)</th>
                      <th className="p-3 text-center">Alpa (A)</th>
                      <th className="p-3 text-center">Terlambat (T)</th>
                      <th className="p-3 text-center">Total Hari</th>
                      <th className="p-3 text-center">% Kehadiran</th>
                      <th className="p-3 text-center">Status Early Warning</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-700">
                    {monthlyStudentSummaries.length === 0 ? (
                      <tr>
                        <td colSpan={11} className="p-8 text-center text-slate-400">
                          Tidak ada siswa dalam filter kelas ini.
                        </td>
                      </tr>
                    ) : (
                      monthlyStudentSummaries.map((s, idx) => (
                        <tr key={s.student_id} className="hover:bg-slate-50 dark:hover:bg-slate-800/40">
                          <td className="p-3 text-center text-slate-400 font-mono">{idx + 1}</td>
                          <td className="p-3 font-mono font-medium text-slate-600 dark:text-slate-300">{s.student_id}</td>
                          <td className="p-3 font-bold text-slate-900 dark:text-white">{s.full_name}</td>
                          <td className="p-3 text-center font-semibold text-emerald-600">{s.hadir}</td>
                          <td className="p-3 text-center font-semibold text-blue-600">{s.sakit}</td>
                          <td className="p-3 text-center font-semibold text-amber-600">{s.izin}</td>
                          <td className="p-3 text-center font-bold text-rose-600">{s.alpa}</td>
                          <td className="p-3 text-center font-semibold text-purple-600">{s.terlambat}</td>
                          <td className="p-3 text-center font-medium text-slate-500">{s.total_recorded}</td>
                          <td className="p-3 text-center">
                            <span className="font-black text-slate-900 dark:text-white">{s.attendance_percentage}%</span>
                          </td>
                          <td className="p-3 text-center">
                            <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${s.warning_color}`}>
                              {s.warning_status}
                            </span>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* SUB-VIEW B: DAILY ATTENDANCE MATRIX (1 - 31) */}
          {monthlyViewMode === 'matrix' && (
            <div className="bg-white dark:bg-slate-800/90 rounded-2xl border border-slate-200 dark:border-slate-700/80 shadow-sm overflow-hidden">
              <div className="p-4 border-b border-slate-100 dark:border-slate-700 flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                    Matriks Presensi Harian — {MONTH_NAMES[selectedMonth - 1]} {selectedYear}
                  </h3>
                  <p className="text-xs text-slate-500">
                    Legenda: <strong className="text-emerald-600">H</strong>=Hadir, <strong className="text-blue-600">S</strong>=Sakit, <strong className="text-amber-600">I</strong>=Izin, <strong className="text-rose-600">A</strong>=Alpa, <strong className="text-purple-600">T</strong>=Terlambat, <strong className="text-slate-400">-</strong>=Belum Ada Data
                  </p>
                </div>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left text-[11px] border-collapse">
                  <thead className="bg-slate-50 dark:bg-slate-900 text-slate-500 dark:text-slate-400 font-semibold border-b border-slate-200 dark:border-slate-700">
                    <tr>
                      <th className="p-2 w-8 text-center sticky left-0 bg-slate-50 dark:bg-slate-900 z-10">No</th>
                      <th className="p-2 min-w-[150px] sticky left-8 bg-slate-50 dark:bg-slate-900 z-10">Nama Siswa</th>
                      {Array.from({ length: daysInSelectedMonth }, (_, i) => i + 1).map(day => (
                        <th key={day} className="p-1 w-6 text-center border-l border-slate-200 dark:border-slate-700 font-mono">
                          {day}
                        </th>
                      ))}
                      <th className="p-2 text-center border-l border-slate-200 dark:border-slate-700">H</th>
                      <th className="p-2 text-center">S</th>
                      <th className="p-2 text-center">I</th>
                      <th className="p-2 text-center">A</th>
                      <th className="p-2 text-center">T</th>
                      <th className="p-2 text-center">%</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-700">
                    {classStudents.map((s, idx) => {
                      const studentId = s.student.student_id;
                      const studentRecords = db.attendance.filter(a => 
                        a.student_id === studentId && 
                        a.date.startsWith(monthDatePrefix)
                      );

                      const dayMap: Record<number, string> = {};
                      studentRecords.forEach(r => {
                        const dayNum = parseInt(r.date.split('-')[2], 10);
                        if (!isNaN(dayNum)) {
                          dayMap[dayNum] = r.status.charAt(0);
                        }
                      });

                      const summary = monthlyStudentSummaries.find(ms => ms.student_id === studentId);

                      return (
                        <tr key={studentId} className="hover:bg-slate-50 dark:hover:bg-slate-800/40">
                          <td className="p-2 text-center text-slate-400 font-mono sticky left-0 bg-white dark:bg-slate-800 z-10">{idx + 1}</td>
                          <td className="p-2 font-bold text-slate-900 dark:text-white sticky left-8 bg-white dark:bg-slate-800 z-10 whitespace-nowrap">
                            {s.student.full_name}
                          </td>
                          {Array.from({ length: daysInSelectedMonth }, (_, i) => i + 1).map(day => {
                            const code = dayMap[day];
                            return (
                              <td 
                                key={day} 
                                className="p-1 text-center font-bold font-mono border-l border-slate-100 dark:border-slate-700/60 text-[10px]"
                              >
                                {code === 'H' ? <span className="text-emerald-600">H</span> :
                                 code === 'S' ? <span className="text-blue-600">S</span> :
                                 code === 'I' ? <span className="text-amber-600">I</span> :
                                 code === 'A' ? <span className="text-rose-600">A</span> :
                                 code === 'T' ? <span className="text-purple-600">T</span> :
                                 <span className="text-slate-300 dark:text-slate-600">-</span>}
                              </td>
                            );
                          })}
                          <td className="p-2 text-center font-semibold text-emerald-600 border-l border-slate-200 dark:border-slate-700">{summary?.hadir ?? 0}</td>
                          <td className="p-2 text-center font-semibold text-blue-600">{summary?.sakit ?? 0}</td>
                          <td className="p-2 text-center font-semibold text-amber-600">{summary?.izin ?? 0}</td>
                          <td className="p-2 text-center font-bold text-rose-600">{summary?.alpa ?? 0}</td>
                          <td className="p-2 text-center font-semibold text-purple-600">{summary?.terlambat ?? 0}</td>
                          <td className="p-2 text-center font-black text-slate-900 dark:text-white">{summary?.attendance_percentage ?? 0}%</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}

      {/* VIEW 3: CUMULATIVE SEMESTER RECAP */}
      {activeTab === 'cumulative' && (
        <div className="bg-white dark:bg-slate-800/90 rounded-2xl border border-slate-200 dark:border-slate-700/80 p-5 shadow-sm space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                Tabel Rekapitulasi Presensi Semester Berjalan
              </h3>
              <p className="text-xs text-slate-500">
                Data dihitung otomatis berdasarkan seluruh tanggal pencatatan presensi semester ini
              </p>
            </div>
          </div>

          <div className="overflow-x-auto border border-slate-200 dark:border-slate-700 rounded-xl">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 dark:bg-slate-900 text-slate-500">
                <tr>
                  <th className="p-3 font-semibold">Nama Siswa</th>
                  <th className="p-3 text-center font-semibold">Hadir</th>
                  <th className="p-3 text-center font-semibold">Sakit</th>
                  <th className="p-3 text-center font-semibold">Izin</th>
                  <th className="p-3 text-center font-semibold">Alpa</th>
                  <th className="p-3 text-center font-semibold">Terlambat</th>
                  <th className="p-3 text-center font-semibold">Total Hari</th>
                  <th className="p-3 text-center font-semibold">Persentase</th>
                  <th className="p-3 text-center font-semibold">Status Peringatan</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-700">
                {allStudentsFullData.map((d) => {
                  const s = d.student;
                  const att = d.attendance_summary;
                  return (
                    <tr key={s.student_id} className="hover:bg-slate-50 dark:hover:bg-slate-800/40">
                      <td className="p-3">
                        <div className="font-bold text-slate-900 dark:text-white">{s.full_name}</div>
                        <div className="text-[11px] text-slate-400 font-mono">{s.student_id}</div>
                      </td>
                      <td className="p-3 text-center font-semibold text-emerald-600">{att.hadir}</td>
                      <td className="p-3 text-center font-semibold text-blue-600">{att.sakit}</td>
                      <td className="p-3 text-center font-semibold text-amber-600">{att.izin}</td>
                      <td className="p-3 text-center font-bold text-rose-600">{att.alpa}</td>
                      <td className="p-3 text-center font-semibold text-purple-600">{att.terlambat}</td>
                      <td className="p-3 text-center font-semibold text-slate-500">{att.total}</td>
                      <td className="p-3 text-center">
                        <span className="font-black text-slate-900 dark:text-white">{att.attendance_rate}%</span>
                      </td>
                      <td className="p-3 text-center">
                        {att.alpa >= 3 || att.attendance_rate < 80 ? (
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-red-100 text-red-700 dark:bg-red-900/60 dark:text-red-300">
                            ⚠️ Waspada Kehadiran
                          </span>
                        ) : (
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-700 dark:bg-emerald-900/60 dark:text-emerald-300">
                            Tertib
                          </span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};
