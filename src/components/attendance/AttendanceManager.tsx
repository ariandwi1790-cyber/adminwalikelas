import React, { useState, useMemo } from 'react';
import { useDatabase } from '../../context/DatabaseContext';
import { AttendanceStatus, AttendanceRecord } from '../../types';
import { 
  CalendarCheck, 
  CheckCheck, 
  Calendar, 
  Save, 
  Clock, 
  AlertTriangle, 
  FileSpreadsheet, 
  Filter, 
  CheckCircle2,
  ChevronLeft,
  ChevronRight
} from 'lucide-react';

export const AttendanceManager: React.FC = () => {
  const { db, allStudentsFullData, saveDailyAttendance, activeClass, activeAcademicYear } = useDatabase();

  const [selectedDate, setSelectedDate] = useState<string>(new Date().toISOString().split('T')[0]);
  const [activeView, setActiveView] = useState<'daily' | 'recap'>('daily');

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

  const handleSaveAttendance = () => {
    const records: Omit<AttendanceRecord, 'attendance_id' | 'created_at'>[] = allStudentsFullData.map(s => {
      const item = dailyStatusMap[s.student.student_id] || { status: 'Hadir', note: '' };
      return {
        student_id: s.student.student_id,
        class_id: activeClass?.class_id || db.classes[0]?.class_id || '',
        academic_year_id: activeAcademicYear?.academic_year_id || db.academic_years[0]?.academic_year_id || '',
        date: selectedDate,
        status: item.status,
        note: item.note,
        recorded_at: new Date().toISOString(),
      };
    });

    saveDailyAttendance(records);
    alert(`Presensi tanggal ${selectedDate} untuk ${records.length} siswa berhasil disimpan.`);
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
            Pencatatan kehadiran harian, keterlambatan, dan rekapitulasi kumulatif semester
          </p>
        </div>

        <div className="flex items-center space-x-2">
          <div className="flex bg-slate-100 dark:bg-slate-900 p-1 rounded-xl border border-slate-200 dark:border-slate-700 text-xs font-semibold">
            <button
              onClick={() => setActiveView('daily')}
              className={`px-3 py-1.5 rounded-lg transition cursor-pointer ${
                activeView === 'daily' ? 'bg-blue-600 text-white shadow' : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
              }`}
            >
              Input Presensi Harian
            </button>
            <button
              onClick={() => setActiveView('recap')}
              className={`px-3 py-1.5 rounded-lg transition cursor-pointer ${
                activeView === 'recap' ? 'bg-blue-600 text-white shadow' : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
              }`}
            >
              Rekapitulasi Kumulatif
            </button>
          </div>
        </div>
      </div>

      {activeView === 'daily' ? (
        <div className="space-y-4">
          {/* Daily Controls Toolbar */}
          <div className="bg-white dark:bg-slate-800/90 p-4 rounded-2xl border border-slate-200 dark:border-slate-700/80 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="flex items-center space-x-3">
              <div className="flex items-center space-x-2 bg-slate-50 dark:bg-slate-900 px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700">
                <Calendar className="w-4 h-4 text-blue-500" />
                <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">Tanggal:</label>
                <input
                  type="date"
                  value={selectedDate}
                  onChange={(e) => setSelectedDate(e.target.value)}
                  className="bg-transparent text-xs font-bold text-slate-900 dark:text-white border-0 focus:ring-0 p-0 cursor-pointer"
                />
              </div>

              {/* Quick Set All Hadir Button */}
              <button
                id="btn-set-all-hadir"
                onClick={() => handleSetAllStatus('Hadir')}
                className="bg-emerald-50 dark:bg-emerald-950/40 text-emerald-800 dark:text-emerald-300 hover:bg-emerald-100 border border-emerald-300 dark:border-emerald-800 px-3.5 py-1.5 rounded-xl text-xs font-bold transition flex items-center space-x-1.5 cursor-pointer"
              >
                <CheckCheck className="w-4 h-4 text-emerald-600" />
                <span>Tandai Semua Hadir</span>
              </button>
            </div>

            {/* Quick Summary Pill Bar */}
            <div className="flex items-center space-x-2 text-xs">
              <span className="px-2.5 py-1 bg-emerald-100 text-emerald-800 rounded-lg font-bold">H: {tally.Hadir}</span>
              <span className="px-2.5 py-1 bg-blue-100 text-blue-800 rounded-lg font-bold">S: {tally.Sakit}</span>
              <span className="px-2.5 py-1 bg-amber-100 text-amber-800 rounded-lg font-bold">I: {tally.Izin}</span>
              <span className="px-2.5 py-1 bg-rose-100 text-rose-800 rounded-lg font-bold">A: {tally.Alpa}</span>
              <span className="px-2.5 py-1 bg-purple-100 text-purple-800 rounded-lg font-bold">T: {tally.Terlambat}</span>
            </div>

            <button
              id="btn-save-attendance-main"
              onClick={handleSaveAttendance}
              className="bg-blue-600 hover:bg-blue-700 text-white px-5 py-2 rounded-xl text-xs font-bold transition flex items-center space-x-1.5 shadow-md cursor-pointer"
            >
              <Save className="w-4 h-4" />
              <span>Simpan Presensi</span>
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
                                    : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-200'
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
                            currentStatus === 'Izin' ? 'Misal: Menghadiri pernikahan kakak' :
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
                          A:{d.attendance_summary.alpa} • S:{d.attendance_summary.sakit} • I:{d.attendance_summary.izin}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        /* RECAP MATRIX VIEW */
        <div className="bg-white dark:bg-slate-800/90 rounded-2xl border border-slate-200 dark:border-slate-700/80 p-5 shadow-sm space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                Tabel Rekapitulasi Presensi Semester Berjalan
              </h3>
              <p className="text-xs text-slate-500">
                Data dihitung otomatis berdasarkan seluruh tanggal pencatatan presensi
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
