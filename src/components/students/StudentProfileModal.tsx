import React, { useState } from 'react';
import { useDatabase } from '../../context/DatabaseContext';
import { 
  X, 
  User, 
  Calendar, 
  ShieldAlert, 
  Home, 
  StickyNote, 
  Trophy, 
  MessageSquareQuote, 
  History, 
  Download, 
  Phone, 
  MapPin, 
  Heart, 
  Plus, 
  FileText, 
  CheckCircle2, 
  AlertTriangle,
  Flame,
  Award,
  Sparkles
} from 'lucide-react';
import { generateStudentReportPDF } from '../../utils/pdf';

interface StudentProfileModalProps {
  studentId: string;
  onClose: () => void;
}

type ProfileTab = 
  | 'overview'
  | 'attendance'
  | 'discipline'
  | 'violations'
  | 'guidance'
  | 'homevisit'
  | 'notes'
  | 'achievements'
  | 'communication'
  | 'history';

export const StudentProfileModal: React.FC<StudentProfileModalProps> = ({ studentId, onClose }) => {
  const { db, getStudentById } = useDatabase();
  const [activeTab, setActiveTab] = useState<ProfileTab>('overview');

  const data = getStudentById(studentId);
  if (!data) return null;

  const { student, parent, address, potential, current_class, class_history, attendance_summary, discipline_score } = data;

  const studentAttendance = db.attendance.filter(a => a.student_id === studentId);
  const studentViolations = db.violations.filter(v => v.student_id === studentId);
  const studentGuidance = db.guidance.filter(g => g.student_id === studentId);
  const studentHomeVisits = db.home_visits.filter(hv => hv.student_id === studentId);
  const studentNotes = db.student_notes.filter(n => n.student_id === studentId);
  const studentAchievements = db.achievements.filter(ach => ach.student_id === studentId);
  const studentComms = db.parent_communications.filter(c => c.student_id === studentId);

  const handlePrintPDF = () => {
    generateStudentReportPDF(data, db.school_settings, db);
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/80 backdrop-blur-sm flex items-center justify-center p-3 sm:p-4">
      <div className="bg-white dark:bg-slate-900 rounded-2xl max-w-5xl w-full max-h-[92vh] flex flex-col shadow-2xl border border-slate-200 dark:border-slate-800 overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        {/* Top Header Card */}
        <div className="bg-gradient-to-r from-blue-700 via-indigo-700 to-slate-900 p-5 text-white flex-shrink-0">
          <div className="flex items-start justify-between">
            <div className="flex items-center space-x-4">
              <div className="w-14 h-14 rounded-2xl bg-white/10 backdrop-blur-md border border-white/20 flex items-center justify-center text-white text-xl font-black shadow-inner">
                {student.gender === 'L' ? '👨‍🎓' : '👩‍🎓'}
              </div>
              <div>
                <div className="flex items-center space-x-2">
                  <h2 className="text-xl font-bold text-white tracking-tight">
                    {student.full_name}
                  </h2>
                  <span className="bg-white/20 text-white text-xs px-2.5 py-0.5 rounded-full font-mono font-semibold">
                    {student.student_id}
                  </span>
                  <span className="bg-emerald-500/30 text-emerald-200 text-xs px-2 py-0.5 rounded-full font-semibold border border-emerald-400/30">
                    {student.status}
                  </span>
                </div>
                <p className="text-xs text-blue-100 mt-1">
                  Kelas: <strong className="text-white">{current_class?.class_name || 'Belum Terdaftar'}</strong> • NIS: {student.nis || '-'} • NISN: {student.nisn || '-'} • Asal: {student.previous_school || '-'}
                </p>
              </div>
            </div>

            <div className="flex items-center space-x-2">
              <button
                id="btn-print-student-pdf"
                onClick={handlePrintPDF}
                className="bg-white text-blue-800 hover:bg-blue-50 px-3 py-1.5 rounded-xl text-xs font-bold transition flex items-center space-x-1.5 shadow-sm cursor-pointer"
              >
                <Download className="w-3.5 h-3.5 text-blue-600" />
                <span>Cetak Rapor PDF</span>
              </button>
              <button
                onClick={onClose}
                className="text-white/70 hover:text-white hover:bg-white/10 p-1.5 rounded-xl transition cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
          </div>

          {/* Quick Metrics Bar inside Header */}
          <div className="grid grid-cols-2 sm:grid-cols-6 gap-2 mt-4 pt-4 border-t border-white/10 text-center">
            <div className="bg-white/10 rounded-lg p-2">
              <div className="text-[10px] text-blue-200">Kehadiran</div>
              <div className="text-sm font-bold text-white">{attendance_summary.attendance_rate}%</div>
            </div>
            <div className="bg-white/10 rounded-lg p-2">
              <div className="text-[10px] text-blue-200">Indeks Disiplin</div>
              <div className="text-sm font-bold text-white">{discipline_score.score} ({discipline_score.category})</div>
            </div>
            <div className="bg-white/10 rounded-lg p-2">
              <div className="text-[10px] text-blue-200">Pelanggaran</div>
              <div className="text-sm font-bold text-white">{studentViolations.length} Kasus</div>
            </div>
            <div className="bg-white/10 rounded-lg p-2">
              <div className="text-[10px] text-blue-200">Pembinaan</div>
              <div className="text-sm font-bold text-white">{studentGuidance.length} Sesi</div>
            </div>
            <div className="bg-white/10 rounded-lg p-2">
              <div className="text-[10px] text-blue-200">Home Visit</div>
              <div className="text-sm font-bold text-white">{studentHomeVisits.length} Kali</div>
            </div>
            <div className="bg-white/10 rounded-lg p-2">
              <div className="text-[10px] text-blue-200">Prestasi</div>
              <div className="text-sm font-bold text-white">{studentAchievements.length} Gelar</div>
            </div>
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="bg-slate-100 dark:bg-slate-800/80 border-b border-slate-200 dark:border-slate-700 px-4 flex items-center space-x-1 overflow-x-auto flex-shrink-0">
          {[
            { id: 'overview', label: 'Profil & Ortu', icon: User },
            { id: 'attendance', label: 'Presensi', icon: Calendar, badge: studentAttendance.length },
            { id: 'discipline', label: 'Disiplin', icon: Flame },
            { id: 'violations', label: 'Pelanggaran', icon: ShieldAlert, badge: studentViolations.length },
            { id: 'guidance', label: 'Pembinaan', icon: Heart, badge: studentGuidance.length },
            { id: 'homevisit', label: 'Home Visit', icon: Home, badge: studentHomeVisits.length },
            { id: 'notes', label: 'Catatan', icon: StickyNote, badge: studentNotes.length },
            { id: 'achievements', label: 'Prestasi', icon: Trophy, badge: studentAchievements.length },
            { id: 'communication', label: 'Komunikasi Ortu', icon: MessageSquareQuote, badge: studentComms.length },
            { id: 'history', label: 'Riwayat Kelas', icon: History, badge: class_history.length },
          ].map(tab => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as ProfileTab)}
                className={`flex items-center space-x-1.5 px-3 py-2.5 text-xs font-semibold whitespace-nowrap border-b-2 transition cursor-pointer ${
                  isActive
                    ? 'border-blue-600 text-blue-600 dark:text-blue-400 bg-white dark:bg-slate-900 rounded-t-lg'
                    : 'border-transparent text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                }`}
              >
                <Icon className="w-3.5 h-3.5" />
                <span>{tab.label}</span>
                {tab.badge !== undefined && tab.badge > 0 && (
                  <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300 font-bold">
                    {tab.badge}
                  </span>
                )}
              </button>
            );
          })}
        </div>

        {/* Tab Body Contents */}
        <div className="p-6 overflow-y-auto flex-1 text-slate-800 dark:text-slate-200">
          {/* TAB 1: OVERVIEW & BIODATA */}
          {activeTab === 'overview' && (
            <div className="space-y-6">
              {/* Early Warning Banner if active */}
              {data.warning_level !== 'Normal' && (
                <div className={`p-4 rounded-xl border flex items-start space-x-3 ${
                  data.warning_level === 'Prioritas Tinggi' 
                    ? 'bg-red-50 dark:bg-red-950/40 border-red-300 text-red-900 dark:text-red-200'
                    : 'bg-amber-50 dark:bg-amber-950/40 border-amber-300 text-amber-900 dark:text-amber-200'
                }`}>
                  <AlertTriangle className="w-5 h-5 flex-shrink-0 mt-0.5" />
                  <div>
                    <h4 className="text-xs font-bold uppercase tracking-wider">Status Early Warning: {data.warning_level}</h4>
                    <ul className="text-xs list-disc list-inside mt-1 space-y-0.5">
                      {data.warning_reasons.map((r, i) => (
                        <li key={i}>{r}</li>
                      ))}
                    </ul>
                  </div>
                </div>
              )}

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Siswa & Alamat */}
                <div className="bg-slate-50 dark:bg-slate-800/60 p-4 rounded-xl border border-slate-200 dark:border-slate-700/80 space-y-3">
                  <h3 className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider flex items-center space-x-1.5">
                    <User className="w-3.5 h-3.5 text-blue-500" />
                    <span>Data Pribadi & Kontak Siswa</span>
                  </h3>
                  <div className="grid grid-cols-2 gap-2 text-xs">
                    <div><span className="text-slate-400">Tempat, Tgl Lahir:</span> <p className="font-semibold">{student.birth_place || '-'}, {student.birth_date || '-'}</p></div>
                    <div><span className="text-slate-400">Jenis Kelamin:</span> <p className="font-semibold">{student.gender === 'L' ? 'Laki-laki (L)' : 'Perempuan (P)'}</p></div>
                    <div><span className="text-slate-400">Agama:</span> <p className="font-semibold">{student.religion || 'Islam'}</p></div>
                    <div><span className="text-slate-400">NIK:</span> <p className="font-semibold">{student.nik || '-'}</p></div>
                    <div><span className="text-slate-400">Nomor HP Siswa:</span> <p className="font-semibold">{student.phone || '-'}</p></div>
                    <div><span className="text-slate-400">Asal SMP/MTs:</span> <p className="font-semibold">{student.previous_school || '-'}</p></div>
                  </div>

                  <div className="pt-2 border-t border-slate-200 dark:border-slate-700">
                    <h4 className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider flex items-center space-x-1.5 mb-1.5">
                      <MapPin className="w-3.5 h-3.5 text-emerald-500" />
                      <span>Data Alamat Tempat Tinggal</span>
                    </h4>
                    <p className="text-xs font-medium text-slate-700 dark:text-slate-300">
                      {address?.full_address || 'Belum diisi'}
                    </p>
                    <div className="grid grid-cols-4 gap-1 text-[11px] text-slate-500 mt-1">
                      <span>RT: {address?.rt || '-'}</span>
                      <span>RW: {address?.rw || '-'}</span>
                      <span>Dusun: {address?.dusun || '-'}</span>
                      <span>Desa: {address?.desa || '-'}</span>
                    </div>
                  </div>
                </div>

                {/* Orang Tua & Potensi */}
                <div className="bg-slate-50 dark:bg-slate-800/60 p-4 rounded-xl border border-slate-200 dark:border-slate-700/80 space-y-3">
                  <h3 className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider flex items-center space-x-1.5">
                    <Heart className="w-3.5 h-3.5 text-pink-500" />
                    <span>Data Orang Tua / Wali</span>
                  </h3>
                  <div className="grid grid-cols-2 gap-2 text-xs">
                    <div>
                      <span className="text-slate-400">Nama Ayah:</span>
                      <p className="font-semibold">{parent?.father_name || '-'}</p>
                      <p className="text-[11px] text-slate-500">{parent?.father_job || 'Pekerjaan tidak tercatat'}</p>
                    </div>
                    <div>
                      <span className="text-slate-400">Nama Ibu:</span>
                      <p className="font-semibold">{parent?.mother_name || '-'}</p>
                      <p className="text-[11px] text-slate-500">{parent?.mother_job || 'Ibu Rumah Tangga'}</p>
                    </div>
                  </div>

                  <div className="pt-2 border-t border-slate-200 dark:border-slate-700">
                    <span className="text-slate-400 text-xs">No HP/WA Narahubung Orang Tua:</span>
                    <p className="text-sm font-bold text-emerald-600 dark:text-emerald-400 flex items-center space-x-1 mt-0.5">
                      <Phone className="w-3.5 h-3.5" />
                      <span>{parent?.parent_phone || 'Belum tercatat'}</span>
                    </p>
                  </div>

                  <div className="pt-2 border-t border-slate-200 dark:border-slate-700">
                    <h4 className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider flex items-center space-x-1.5 mb-1">
                      <Sparkles className="w-3.5 h-3.5 text-amber-500" />
                      <span>Minat, Bakat & Potensi Siswa</span>
                    </h4>
                    <div className="text-xs space-y-1">
                      <p><strong className="text-slate-400">Minat:</strong> {potential?.interests || '-'}</p>
                      <p><strong className="text-slate-400">Bakat:</strong> {potential?.talents || '-'}</p>
                      <p><strong className="text-slate-400">Keterampilan:</strong> {potential?.skills || '-'}</p>
                      {potential?.notes && <p className="text-[11px] text-amber-600 dark:text-amber-300 italic">{potential.notes}</p>}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: PRESENSI */}
          {activeTab === 'attendance' && (
            <div className="space-y-4">
              <div className="grid grid-cols-5 gap-3">
                <div className="p-3 bg-emerald-50 dark:bg-emerald-950/30 rounded-xl border border-emerald-200 text-center">
                  <div className="text-xs text-emerald-700">Hadir</div>
                  <div className="text-xl font-bold text-emerald-900 dark:text-emerald-300">{attendance_summary.hadir}</div>
                </div>
                <div className="p-3 bg-blue-50 dark:bg-blue-950/30 rounded-xl border border-blue-200 text-center">
                  <div className="text-xs text-blue-700">Sakit</div>
                  <div className="text-xl font-bold text-blue-900 dark:text-blue-300">{attendance_summary.sakit}</div>
                </div>
                <div className="p-3 bg-amber-50 dark:bg-amber-950/30 rounded-xl border border-amber-200 text-center">
                  <div className="text-xs text-amber-700">Izin</div>
                  <div className="text-xl font-bold text-amber-900 dark:text-amber-300">{attendance_summary.izin}</div>
                </div>
                <div className="p-3 bg-rose-50 dark:bg-rose-950/30 rounded-xl border border-rose-200 text-center">
                  <div className="text-xs text-rose-700">Alpa</div>
                  <div className="text-xl font-bold text-rose-900 dark:text-rose-300">{attendance_summary.alpa}</div>
                </div>
                <div className="p-3 bg-purple-50 dark:bg-purple-950/30 rounded-xl border border-purple-200 text-center">
                  <div className="text-xs text-purple-700">Terlambat</div>
                  <div className="text-xl font-bold text-purple-900 dark:text-purple-300">{attendance_summary.terlambat}</div>
                </div>
              </div>

              <div className="border border-slate-200 dark:border-slate-700 rounded-xl overflow-hidden">
                <table className="w-full text-xs text-left">
                  <thead className="bg-slate-50 dark:bg-slate-800 text-slate-500">
                    <tr>
                      <th className="p-3">Tanggal</th>
                      <th className="p-3 text-center">Status</th>
                      <th className="p-3">Keterangan</th>
                      <th className="p-3 text-right">Waktu Input</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-700">
                    {studentAttendance.length === 0 ? (
                      <tr><td colSpan={4} className="p-6 text-center text-slate-400">Belum ada data presensi.</td></tr>
                    ) : (
                      studentAttendance.map((a) => (
                        <tr key={a.attendance_id} className="hover:bg-slate-50 dark:hover:bg-slate-800/40">
                          <td className="p-3 font-medium">{a.date}</td>
                          <td className="p-3 text-center">
                            <span className={`px-2 py-0.5 rounded-full font-bold text-[10px] ${
                              a.status === 'Hadir' ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/60 dark:text-emerald-200' :
                              a.status === 'Sakit' ? 'bg-blue-100 text-blue-800 dark:bg-blue-900/60 dark:text-blue-200' :
                              a.status === 'Izin' ? 'bg-amber-100 text-amber-800 dark:bg-amber-900/60 dark:text-amber-200' :
                              a.status === 'Alpa' ? 'bg-rose-100 text-rose-800 dark:bg-rose-900/60 dark:text-rose-200' :
                              'bg-purple-100 text-purple-800 dark:bg-purple-900/60 dark:text-purple-200'
                            }`}>
                              {a.status}
                            </span>
                          </td>
                          <td className="p-3 text-slate-500">{a.note || '-'}</td>
                          <td className="p-3 text-right text-slate-400">{new Date(a.recorded_at).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })}</td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* TAB 3: DISIPLIN BREAKDOWN */}
          {activeTab === 'discipline' && (
            <div className="space-y-4">
              <div className="p-5 bg-gradient-to-br from-indigo-50 to-blue-50 dark:from-slate-800 dark:to-indigo-950/40 rounded-2xl border border-indigo-100 dark:border-indigo-900/50 flex items-center justify-between">
                <div>
                  <div className="text-xs font-semibold text-indigo-700 dark:text-indigo-300">Indeks Kedisiplinan Siswa</div>
                  <div className="text-3xl font-black text-indigo-950 dark:text-white mt-1">
                    {discipline_score.score} <span className="text-sm font-normal text-slate-500">/ 100</span>
                  </div>
                  <p className="text-xs text-indigo-800 dark:text-indigo-200 font-semibold mt-0.5">
                    Kategori: {discipline_score.category}
                  </p>
                </div>
                <div className="text-right text-xs text-slate-500 space-y-1">
                  <p>Kehadiran (30%): <strong>{discipline_score.factors.attendance_score}</strong></p>
                  <p>Ketepatan Waktu (20%): <strong>{discipline_score.factors.punctuality_score}</strong></p>
                  <p>Catatan Pelanggaran (25%): <strong>{discipline_score.factors.violation_score}</strong></p>
                  <p>Kepatuhan Seragam (15%): <strong>{discipline_score.factors.compliance_score}</strong></p>
                  <p>Tanggung Jawab (10%): <strong>{discipline_score.factors.responsibility_score}</strong></p>
                </div>
              </div>
            </div>
          )}

          {/* TAB 4: PELANGGARAN */}
          {activeTab === 'violations' && (
            <div className="space-y-3">
              {studentViolations.length === 0 ? (
                <div className="p-8 text-center text-slate-400">
                  <CheckCircle2 className="w-10 h-10 mx-auto text-emerald-500 mb-2 opacity-80" />
                  <p className="text-xs font-semibold text-slate-700 dark:text-slate-300">Siswa Tertib</p>
                  <p className="text-[11px]">Tidak ada catatan pelanggaran yang tercatat.</p>
                </div>
              ) : (
                studentViolations.map((v) => (
                  <div key={v.violation_id} className="p-4 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/50 space-y-2">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-2">
                        <span className={`px-2.5 py-0.5 text-xs font-bold rounded-full ${
                          v.level === 'Berat' ? 'bg-red-100 text-red-700 dark:bg-red-900/60 dark:text-red-300' :
                          v.level === 'Sedang' ? 'bg-amber-100 text-amber-700 dark:bg-amber-900/60 dark:text-amber-300' :
                          'bg-blue-100 text-blue-700 dark:bg-blue-900/60 dark:text-blue-300'
                        }`}>
                          {v.level} • {v.penalty_points} Poin
                        </span>
                        <span className="text-xs font-bold text-slate-900 dark:text-white">{v.violation_type}</span>
                      </div>
                      <span className="text-xs text-slate-400">{v.date}</span>
                    </div>
                    <p className="text-xs text-slate-700 dark:text-slate-300"><strong className="text-slate-500">Kronologi:</strong> {v.chronology}</p>
                    <p className="text-xs text-slate-700 dark:text-slate-300"><strong className="text-slate-500">Tindakan Langsung:</strong> {v.action_taken}</p>
                    <div className="flex items-center justify-between pt-2 border-t border-slate-200 dark:border-slate-700 text-xs">
                      <span className="text-slate-400">Bukti: {v.evidence_notes || '-'}</span>
                      <span className="font-semibold text-blue-600">Status: {v.status}</span>
                    </div>
                  </div>
                ))
              )}
            </div>
          )}

          {/* TAB 5: PEMBINAAN */}
          {activeTab === 'guidance' && (
            <div className="space-y-3">
              {studentGuidance.length === 0 ? (
                <p className="text-xs text-slate-400 text-center py-6">Belum ada riwayat sesi pembinaan.</p>
              ) : (
                studentGuidance.map((g) => (
                  <div key={g.guidance_id} className="p-4 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/50 space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="px-2.5 py-0.5 text-xs font-bold rounded-lg bg-indigo-100 text-indigo-800 dark:bg-indigo-900/60 dark:text-indigo-200">
                        {g.stage}
                      </span>
                      <span className="text-xs text-slate-400">{g.date} • Oleh {g.counselor_name}</span>
                    </div>
                    <p className="text-xs text-slate-700 dark:text-slate-300"><strong className="text-slate-500">Hasil Pembinaan:</strong> {g.notes}</p>
                    <p className="text-xs text-slate-700 dark:text-slate-300"><strong className="text-slate-500">Komitmen / Kesepakatan:</strong> {g.agreement}</p>
                    <p className="text-xs text-slate-700 dark:text-slate-300"><strong className="text-slate-500">Tindak Lanjut:</strong> {g.follow_up}</p>
                  </div>
                ))
              )}
            </div>
          )}

          {/* TAB 6: HOME VISIT */}
          {activeTab === 'homevisit' && (
            <div className="space-y-3">
              {studentHomeVisits.length === 0 ? (
                <p className="text-xs text-slate-400 text-center py-6">Belum ada riwayat kunjungan rumah.</p>
              ) : (
                studentHomeVisits.map((hv) => (
                  <div key={hv.visit_id} className="p-4 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/50 space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-blue-600">Alasan: {hv.reason}</span>
                      <span className="text-xs text-slate-400">{hv.date}</span>
                    </div>
                    <p className="text-xs"><strong className="text-slate-400">Pihak yang Ditemui:</strong> {hv.met_parties}</p>
                    <p className="text-xs"><strong className="text-slate-400">Alamat:</strong> {hv.address}</p>
                    <p className="text-xs"><strong className="text-slate-400">Hasil:</strong> {hv.result}</p>
                    <p className="text-xs"><strong className="text-slate-400">Kesepakatan:</strong> {hv.agreement}</p>
                    <p className="text-xs"><strong className="text-slate-400">Tindak Lanjut:</strong> {hv.follow_up}</p>
                  </div>
                ))
              )}
            </div>
          )}

          {/* TAB 7: CATATAN SISWA */}
          {activeTab === 'notes' && (
            <div className="space-y-3">
              {studentNotes.length === 0 ? (
                <p className="text-xs text-slate-400 text-center py-6">Belum ada catatan khusus.</p>
              ) : (
                studentNotes.map((n) => (
                  <div key={n.note_id} className="p-3.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/50 space-y-1">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-slate-900 dark:text-white">
                        [{n.category}] {n.title}
                      </span>
                      <span className="text-xs text-slate-400">{n.date} • {n.author}</span>
                    </div>
                    <p className="text-xs text-slate-600 dark:text-slate-300">{n.content}</p>
                  </div>
                ))
              )}
            </div>
          )}

          {/* TAB 8: PRESTASI */}
          {activeTab === 'achievements' && (
            <div className="space-y-3">
              {studentAchievements.length === 0 ? (
                <p className="text-xs text-slate-400 text-center py-6">Belum ada catatan prestasi kejuaraan.</p>
              ) : (
                studentAchievements.map((ach) => (
                  <div key={ach.achievement_id} className="p-4 rounded-xl border border-amber-200 dark:border-amber-900/50 bg-amber-50/40 dark:bg-amber-950/20 space-y-1">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-2">
                        <Award className="w-4 h-4 text-amber-500" />
                        <span className="text-xs font-bold text-slate-900 dark:text-white">{ach.title}</span>
                      </div>
                      <span className="px-2 py-0.5 bg-amber-200 dark:bg-amber-900 text-amber-900 dark:text-amber-200 text-xs font-bold rounded-full">
                        {ach.rank}
                      </span>
                    </div>
                    <p className="text-xs text-slate-600 dark:text-slate-300">
                      Tingkat: {ach.level} • Kategori: {ach.category} • Penyelenggara: {ach.organizer}
                    </p>
                    <p className="text-[11px] text-slate-400">Dokumentasi: {ach.documentation || '-'}</p>
                  </div>
                ))
              )}
            </div>
          )}

          {/* TAB 9: KOMUNIKASI ORANG TUA */}
          {activeTab === 'communication' && (
            <div className="space-y-3">
              {studentComms.length === 0 ? (
                <p className="text-xs text-slate-400 text-center py-6">Belum ada log komunikasi dengan orang tua.</p>
              ) : (
                studentComms.map((c) => (
                  <div key={c.comm_id} className="p-3.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/50 space-y-1 text-xs">
                    <div className="flex items-center justify-between font-semibold">
                      <span>{c.media} dengan {c.parent_name}</span>
                      <span className="text-slate-400 font-normal">{c.date}</span>
                    </div>
                    <p><strong className="text-slate-400">Topik:</strong> {c.topic}</p>
                    <p><strong className="text-slate-400">Hasil:</strong> {c.result}</p>
                    <p><strong className="text-slate-400">Tindak Lanjut:</strong> {c.follow_up}</p>
                  </div>
                ))
              )}
            </div>
          )}

          {/* TAB 10: RIWAYAT KELAS (LIFECYCLE) */}
          {activeTab === 'history' && (
            <div className="space-y-3">
              <div className="bg-blue-50 dark:bg-blue-950/30 p-3 rounded-xl text-xs text-blue-800 dark:text-blue-300">
                <strong>Data Lifecycle:</strong> Riwayat kelas siswa tetap tersimpan permanen ketika naik kelas dari tahun ke tahun tanpa menghapus arsip lama.
              </div>

              <div className="relative pl-6 space-y-6 before:absolute before:left-2 before:top-2 before:bottom-2 before:w-0.5 before:bg-slate-200 dark:before:bg-slate-700">
                {class_history.map((h, i) => (
                  <div key={h.history.history_id} className="relative">
                    <div className="absolute -left-6 top-1 w-4 h-4 rounded-full bg-blue-600 border-4 border-white dark:border-slate-900"></div>
                    <div className="bg-slate-50 dark:bg-slate-800/80 p-3 rounded-xl border border-slate-200 dark:border-slate-700 text-xs">
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-slate-900 dark:text-white">
                          Kelas {h.school_class?.class_name || 'Tidak diketahui'} ({h.school_class?.major || '-'})
                        </span>
                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                          h.history.status === 'Active' ? 'bg-emerald-100 text-emerald-800' : 'bg-slate-200 text-slate-700'
                        }`}>
                          {h.history.status}
                        </span>
                      </div>
                      <p className="text-slate-500 mt-1">
                        Tahun Ajaran: {h.academic_year?.year_name || '-'} • Semester: {h.academic_year?.semester || '-'}
                      </p>
                      <p className="text-[11px] text-slate-400 mt-0.5">
                        Periode: {h.history.start_date} s/d {h.history.end_date || 'Sekarang'}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 bg-slate-50 dark:bg-slate-900 border-t border-slate-200 dark:border-slate-800 flex items-center justify-between flex-shrink-0">
          <span className="text-xs text-slate-400">
            Terakhir diperbarui: {new Date(student.updated_at).toLocaleString('id-ID')}
          </span>
          <button
            onClick={onClose}
            className="px-4 py-2 bg-slate-200 dark:bg-slate-700 hover:bg-slate-300 dark:hover:bg-slate-600 text-slate-800 dark:text-slate-200 font-semibold text-xs rounded-xl transition cursor-pointer"
          >
            Tutup
          </button>
        </div>
      </div>
    </div>
  );
};
