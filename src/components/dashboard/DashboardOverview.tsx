import React from 'react';
import { useDatabase } from '../../context/DatabaseContext';
import { 
  Users, 
  UserCheck, 
  AlertTriangle, 
  CheckCircle2, 
  ShieldAlert, 
  Home, 
  Trophy, 
  TrendingUp,
  ArrowRight,
  Calendar,
  FileSpreadsheet,
  FileText,
  FileCheck2,
  StickyNote,
  Sparkles
} from 'lucide-react';
import { ActiveTab } from '../layout/Sidebar';
import { exportClassRecapExcel, exportFullWorkbook } from '../../utils/excel';

interface DashboardOverviewProps {
  setActiveTab: (tab: ActiveTab) => void;
  onSelectStudent: (studentId: string) => void;
}

export const DashboardOverview: React.FC<DashboardOverviewProps> = ({ 
  setActiveTab, 
  onSelectStudent 
}) => {
  const { db, activeClass, activeAcademicYear, allStudentsFullData } = useDatabase();

  const totalStudents = allStudentsFullData.length;

  // Aggregate attendance numbers
  let totalHadir = 0;
  let totalSakit = 0;
  let totalIzin = 0;
  let totalAlpa = 0;
  let totalTerlambat = 0;
  let totalAttDays = 0;
  let totalDiscScore = 0;

  allStudentsFullData.forEach(s => {
    totalHadir += s.attendance_summary.hadir;
    totalSakit += s.attendance_summary.sakit;
    totalIzin += s.attendance_summary.izin;
    totalAlpa += s.attendance_summary.alpa;
    totalTerlambat += s.attendance_summary.terlambat;
    totalAttDays += s.attendance_summary.total;
    totalDiscScore += s.discipline_score.score;
  });

  const avgAttendance = totalStudents > 0 
    ? Math.round(allStudentsFullData.reduce((acc, curr) => acc + curr.attendance_summary.attendance_rate, 0) / totalStudents)
    : 100;

  const avgDiscipline = totalStudents > 0
    ? (totalDiscScore / totalStudents).toFixed(1)
    : '100.0';

  // Filter alert students
  const highPriorityStudents = allStudentsFullData.filter(s => s.warning_level === 'Prioritas Tinggi');
  const warningStudents = allStudentsFullData.filter(s => s.warning_level === 'Perlu Perhatian');
  const alertCount = highPriorityStudents.length + warningStudents.length;

  // Active violations & guidance
  const activeViolations = db.violations.filter(v => v.status !== 'Selesai');
  const activeHomeVisits = db.home_visits.slice(0, 4);
  const recentAchievements = db.achievements.slice(0, 4);

  // Monthly stats sample based on active academic year
  const monthlyStats = [
    { month: 'JUL', rate: 92, alpa: 3 },
    { month: 'AGU', rate: 95, alpa: 2 },
    { month: 'SEP', rate: 88, alpa: 5 },
    { month: 'OKT', rate: 96, alpa: 1 },
    { month: 'NOV', rate: 90, alpa: 4 },
    { month: 'DES', rate: 82, alpa: 7 },
    { month: 'JAN', rate: 94, alpa: 2 },
  ];

  return (
    <div className="space-y-4">
      {/* 1. Bento Top Metric Row (4 columns) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Metric 1: Total Siswa */}
        <div 
          id="bento-metric-total-students"
          onClick={() => setActiveTab('students')}
          className="bg-white border border-zinc-200/90 rounded-2xl p-5 flex flex-col justify-between shadow-xs hover:border-blue-400 transition cursor-pointer"
        >
          <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider">Total Siswa</span>
          <div className="flex items-baseline gap-2 mt-2">
            <span className="text-3xl font-bold text-zinc-900">{totalStudents}</span>
            <span className="text-xs text-zinc-500 font-medium">Aktif ({activeClass?.class_name || 'XI'})</span>
          </div>
        </div>

        {/* Metric 2: Kehadiran Hari Ini / Rata-rata */}
        <div 
          id="bento-metric-attendance"
          onClick={() => setActiveTab('attendance')}
          className="bg-white border border-zinc-200/90 rounded-2xl p-5 flex flex-col justify-between shadow-xs hover:border-emerald-400 transition cursor-pointer"
        >
          <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider">Rata-Rata Kehadiran</span>
          <div className="flex items-baseline gap-2 mt-2">
            <span className="text-3xl font-bold text-emerald-600">{avgAttendance}%</span>
            <span className="text-xs text-zinc-500 font-medium">{totalStudents > 0 ? `${Math.round(totalStudents * (avgAttendance / 100))}/${totalStudents} Hadir` : 'Semester Ini'}</span>
          </div>
        </div>

        {/* Metric 3: Rata-rata Disiplin */}
        <div 
          id="bento-metric-discipline"
          onClick={() => setActiveTab('discipline')}
          className="bg-white border border-zinc-200/90 rounded-2xl p-5 flex flex-col justify-between shadow-xs hover:border-blue-400 transition cursor-pointer"
        >
          <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider">Rata-Rata Disiplin</span>
          <div className="flex items-baseline gap-2 mt-2">
            <span className="text-3xl font-bold text-blue-600">{avgDiscipline}</span>
            <span className="text-xs text-zinc-500 font-medium">
              {Number(avgDiscipline) >= 85 ? 'Sangat Baik' : Number(avgDiscipline) >= 70 ? 'Baik' : 'Perlu Evaluasi'}
            </span>
          </div>
        </div>

        {/* Metric 4: Early Warning */}
        <div 
          id="bento-metric-warning"
          onClick={() => setActiveTab('discipline')}
          className={`border rounded-2xl p-5 flex flex-col justify-between shadow-xs transition cursor-pointer ${
            alertCount > 0 
              ? 'bg-red-50 border-red-100 hover:border-red-300' 
              : 'bg-emerald-50 border-emerald-100 hover:border-emerald-300'
          }`}
        >
          <span className={`text-[10px] font-bold uppercase tracking-wider ${
            alertCount > 0 ? 'text-red-500' : 'text-emerald-600'
          }`}>
            Early Warning
          </span>
          <div className="flex items-baseline gap-2 mt-2">
            <span className={`text-3xl font-bold ${
              alertCount > 0 ? 'text-red-600' : 'text-emerald-700'
            }`}>
              {alertCount < 10 ? `0${alertCount}` : alertCount}
            </span>
            <span className={`text-xs font-medium ${
              alertCount > 0 ? 'text-red-500' : 'text-emerald-600'
            }`}>
              {alertCount > 0 ? 'Perlu Perhatian' : 'Kondisi Tertib'}
            </span>
          </div>
        </div>
      </div>

      {/* 2. Bento Middle Grid: Monitoring Table (8 cols) + Timeline Kasus (4 cols) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
        {/* Left: Monitoring Table (8 cols) */}
        <div className="lg:col-span-8 bg-white border border-zinc-200/90 rounded-2xl flex flex-col overflow-hidden shadow-xs">
          <div className="p-4 border-b border-zinc-100 flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <h3 className="font-bold text-sm text-zinc-900">Daftar Monitoring Siswa</h3>
              <span className="text-[11px] text-zinc-400">({allStudentsFullData.length} siswa)</span>
            </div>
            <button
              id="btn-bento-view-all-students"
              onClick={() => setActiveTab('students')}
              className="text-[10px] text-blue-600 hover:text-blue-700 font-bold uppercase tracking-wider cursor-pointer flex items-center space-x-1"
            >
              <span>Lihat Semua</span>
              <span>➔</span>
            </button>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead className="bg-zinc-50 text-[10px] font-bold text-zinc-400 uppercase tracking-wider">
                <tr>
                  <th className="px-4 py-3">ID Siswa</th>
                  <th className="px-4 py-3">Nama Lengkap</th>
                  <th className="px-4 py-3 text-center">Hadir</th>
                  <th className="px-4 py-3 text-center">Disiplin</th>
                  <th className="px-4 py-3">Status</th>
                </tr>
              </thead>
              <tbody className="text-xs divide-y divide-zinc-100">
                {allStudentsFullData.slice(0, 5).map((data) => {
                  const s = data.student;
                  const isCritical = data.warning_level === 'Prioritas Tinggi';
                  const isWarning = data.warning_level === 'Perlu Perhatian';

                  return (
                    <tr 
                      key={s.student_id}
                      onClick={() => onSelectStudent(s.student_id)}
                      className="hover:bg-zinc-50/80 transition cursor-pointer"
                    >
                      <td className="px-4 py-3 font-mono text-zinc-500 uppercase text-[11px]">
                        {s.student_id}
                      </td>
                      <td className="px-4 py-3">
                        <span className={`font-bold ${isCritical ? 'text-red-600' : isWarning ? 'text-zinc-900' : 'text-zinc-900'}`}>
                          {s.full_name}
                        </span>
                        <div className="text-[10px] text-zinc-400">{s.nis ? `NIS: ${s.nis}` : 'NIS -'}</div>
                      </td>
                      <td className="px-4 py-3 text-center font-semibold text-zinc-700">
                        {data.attendance_summary.attendance_rate}%
                      </td>
                      <td className="px-4 py-3 text-center font-semibold text-zinc-700">
                        {data.discipline_score.score}
                      </td>
                      <td className="px-4 py-3">
                        {isCritical ? (
                          <span className="bg-red-100 text-red-700 px-2 py-1 rounded-md font-bold text-[9px] uppercase tracking-wider inline-block">
                            Critical
                          </span>
                        ) : isWarning ? (
                          <span className="bg-amber-100 text-amber-700 px-2 py-1 rounded-md font-bold text-[9px] uppercase tracking-wider inline-block">
                            Warning
                          </span>
                        ) : (
                          <span className="bg-emerald-100 text-emerald-700 px-2 py-1 rounded-md font-bold text-[9px] uppercase tracking-wider inline-block">
                            Normal
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

        {/* Right: Timeline Kasus Terbaru (4 cols) */}
        <div className="lg:col-span-4 bg-white border border-zinc-200/90 rounded-2xl p-5 flex flex-col justify-between shadow-xs">
          <div>
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-bold text-sm text-zinc-900">Timeline Kasus Terbaru</h3>
              <button
                onClick={() => setActiveTab('discipline')}
                className="text-[10px] text-blue-600 font-bold uppercase cursor-pointer"
              >
                Kelola
              </button>
            </div>

            {activeViolations.length === 0 && db.home_visits.length === 0 ? (
              <div className="py-8 text-center text-zinc-400">
                <CheckCircle2 className="w-8 h-8 mx-auto text-emerald-500 mb-2 opacity-80" />
                <p className="text-xs font-bold text-zinc-700">Kondisi Disiplin Tertib</p>
                <p className="text-[10px] text-zinc-400">Tidak ada kasus aktif saat ini.</p>
              </div>
            ) : (
              <div className="space-y-3.5">
                {activeViolations.slice(0, 3).map((v) => {
                  const student = db.students.find(s => s.student_id === v.student_id);
                  const isBerat = v.level === 'Berat';
                  const isSedang = v.level === 'Sedang';

                  return (
                    <div 
                      key={v.violation_id}
                      onClick={() => student && onSelectStudent(student.student_id)}
                      className="flex gap-3 items-start cursor-pointer group"
                    >
                      <div className={`w-1 rounded-full h-11 flex-shrink-0 ${
                        isBerat ? 'bg-red-500' : isSedang ? 'bg-amber-500' : 'bg-blue-500'
                      }`} />
                      <div className="truncate">
                        <p className="text-[11px] font-bold text-zinc-900 group-hover:text-blue-600 transition">
                          Pelanggaran {v.level} • {v.violation_type}
                        </p>
                        <p className="text-[10px] text-zinc-500 truncate">
                          {student?.full_name || v.student_id} — {v.chronology}
                        </p>
                        <p className="text-[9px] text-zinc-400 mt-0.5">
                          {v.date} • {v.status}
                        </p>
                      </div>
                    </div>
                  );
                })}

                {/* Show recent home visit in timeline */}
                {db.home_visits.slice(0, 2).map((hv) => {
                  const student = db.students.find(s => s.student_id === hv.student_id);
                  return (
                    <div 
                      key={hv.visit_id}
                      onClick={() => student && onSelectStudent(student.student_id)}
                      className="flex gap-3 items-start cursor-pointer group"
                    >
                      <div className="w-1 bg-indigo-500 rounded-full h-11 flex-shrink-0" />
                      <div className="truncate">
                        <p className="text-[11px] font-bold text-zinc-900 group-hover:text-blue-600 transition">
                          Home Visit Terlaksana
                        </p>
                        <p className="text-[10px] text-zinc-500 truncate">
                          {student?.full_name || hv.student_id} — {hv.reason}
                        </p>
                        <p className="text-[9px] text-zinc-400 mt-0.5">
                          {hv.date} • Koordinasi Keluarga
                        </p>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          <div className="pt-3 border-t border-zinc-100 flex items-center justify-between text-[11px] text-zinc-500">
            <span>Kasus aktif: <strong className="text-zinc-800">{activeViolations.length}</strong></span>
            <span>Home visit: <strong className="text-zinc-800">{db.home_visits.length}</strong></span>
          </div>
        </div>
      </div>

      {/* 3. Bento Bottom Grid: Dark Quick Actions (4 cols) + Monthly Attendance Stats (8 cols) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
        {/* Left: Quick Actions Dark Bento Box (4 cols) */}
        <div className="lg:col-span-4 bg-zinc-900 text-white rounded-2xl p-5 relative overflow-hidden flex flex-col justify-between shadow-sm">
          <div className="relative z-10">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-bold opacity-90 tracking-wide">Quick Actions</h3>
              <span className="text-[10px] bg-white/10 text-white/80 px-2 py-0.5 rounded font-mono font-semibold">
                BENTO V1.1
              </span>
            </div>

            <div className="mt-4 grid grid-cols-2 gap-2.5">
              <button 
                id="btn-bento-raport"
                onClick={() => setActiveTab('reports')}
                className="bg-white/10 hover:bg-white/20 p-3 rounded-xl text-center flex flex-col items-center gap-1.5 border border-white/5 transition cursor-pointer"
              >
                <span className="text-lg">📄</span>
                <span className="text-[10px] font-bold uppercase tracking-tight text-white">Cetak Raport</span>
              </button>

              <button 
                id="btn-bento-excel"
                onClick={() => exportClassRecapExcel(allStudentsFullData, activeClass?.class_name || 'B', activeAcademicYear?.year_name || '2026-2027', db.school_settings)}
                className="bg-white/10 hover:bg-white/20 p-3 rounded-xl text-center flex flex-col items-center gap-1.5 border border-white/5 transition cursor-pointer"
              >
                <span className="text-lg">📊</span>
                <span className="text-[10px] font-bold uppercase tracking-tight text-white">Ekspor Excel</span>
              </button>

              <button 
                id="btn-bento-catatan"
                onClick={() => setActiveTab('notes')}
                className="bg-white/10 hover:bg-white/20 p-3 rounded-xl text-center flex flex-col items-center gap-1.5 border border-white/5 transition cursor-pointer"
              >
                <span className="text-lg">📝</span>
                <span className="text-[10px] font-bold uppercase tracking-tight text-white">Input Catatan</span>
              </button>

              <button 
                id="btn-bento-presensi"
                onClick={() => setActiveTab('attendance')}
                className="bg-white/10 hover:bg-white/20 p-3 rounded-xl text-center flex flex-col items-center gap-1.5 border border-white/5 transition cursor-pointer"
              >
                <span className="text-lg">✓</span>
                <span className="text-[10px] font-bold uppercase tracking-tight text-white">Presensi Hari Ini</span>
              </button>
            </div>
          </div>

          {/* Ambient blue glow accent */}
          <div className="absolute -bottom-8 -right-8 w-32 h-32 bg-blue-600 rounded-full blur-3xl opacity-25 pointer-events-none" />
        </div>

        {/* Right: Monthly Attendance Bento Histogram (8 cols) */}
        <div className="lg:col-span-8 bg-white border border-zinc-200/90 rounded-2xl p-5 flex flex-col justify-between shadow-xs">
          <div>
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="font-bold text-sm text-zinc-900">Statistik Kehadiran Bulanan</h3>
                <p className="text-[11px] text-zinc-400">Tren presensi siswa kelas {activeClass?.class_name} sepanjang semester</p>
              </div>
              <div className="flex gap-3">
                <div className="flex items-center gap-1.5">
                  <div className="w-2.5 h-2.5 rounded-full bg-blue-600" />
                  <span className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider">Hadir</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <div className="w-2.5 h-2.5 rounded-full bg-red-400" />
                  <span className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider">Alpa</span>
                </div>
              </div>
            </div>

            {/* Visual Bars Container */}
            <div className="flex items-end justify-between gap-3 px-2 pt-4 pb-2 h-32">
              {monthlyStats.map((item) => (
                <div key={item.month} className="flex flex-col items-center gap-2 w-full group">
                  <div className="text-[10px] font-bold text-zinc-600 opacity-0 group-hover:opacity-100 transition">
                    {item.rate}%
                  </div>
                  <div className="w-full bg-blue-100/70 rounded-t-lg relative h-24 overflow-hidden">
                    <div 
                      className="absolute bottom-0 w-full bg-blue-600 rounded-t-lg transition-all duration-500 group-hover:bg-blue-700" 
                      style={{ height: `${item.rate}%` }}
                    />
                  </div>
                  <span className="text-[9px] text-zinc-400 font-bold uppercase tracking-wider">
                    {item.month}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* Quick Stats Footer */}
          <div className="grid grid-cols-4 gap-2 pt-3 border-t border-zinc-100 text-center text-xs">
            <div className="p-1.5 bg-zinc-50 rounded-lg">
              <span className="text-[10px] text-zinc-400 block uppercase font-bold">Hadir</span>
              <span className="font-bold text-emerald-600">{totalHadir}</span>
            </div>
            <div className="p-1.5 bg-zinc-50 rounded-lg">
              <span className="text-[10px] text-zinc-400 block uppercase font-bold">Sakit</span>
              <span className="font-bold text-blue-600">{totalSakit}</span>
            </div>
            <div className="p-1.5 bg-zinc-50 rounded-lg">
              <span className="text-[10px] text-zinc-400 block uppercase font-bold">Izin</span>
              <span className="font-bold text-amber-600">{totalIzin}</span>
            </div>
            <div className="p-1.5 bg-zinc-50 rounded-lg">
              <span className="text-[10px] text-zinc-400 block uppercase font-bold">Alpa</span>
              <span className="font-bold text-red-600">{totalAlpa}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
