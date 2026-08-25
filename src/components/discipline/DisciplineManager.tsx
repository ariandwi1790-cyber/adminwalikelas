import React, { useState } from 'react';
import { useDatabase } from '../../context/DatabaseContext';
import { ViolationRecord, GuidanceRecord, ViolationLevel, GuidanceStage } from '../../types';
import { 
  ShieldAlert, 
  Plus, 
  HeartHandshake, 
  Flame, 
  CheckCircle2, 
  AlertTriangle, 
  FileText, 
  Trash2, 
  Filter,
  User,
  Calendar,
  X,
  Save,
  ArrowRight
} from 'lucide-react';
import { ConfirmModal } from '../common/ConfirmModal';

export const DisciplineManager: React.FC = () => {
  const { db, addViolation, addGuidance, deleteViolation, deleteGuidance, allStudentsFullData, activeClass, activeAcademicYear } = useDatabase();

  const [activeTab, setActiveTab] = useState<'violations' | 'guidance' | 'matrix'>('violations');

  // Add Violation Modal State
  const [showAddViolationModal, setShowAddViolationModal] = useState(false);
  const [violationStudentId, setViolationStudentId] = useState(allStudentsFullData[0]?.student.student_id || '');
  const [violationType, setViolationType] = useState('');
  const [violationLevel, setViolationLevel] = useState<ViolationLevel>('Ringan');
  const [violationPoints, setViolationPoints] = useState(10);
  const [violationDate, setViolationDate] = useState(new Date().toISOString().split('T')[0]);
  const [violationChronology, setViolationChronology] = useState('');
  const [violationAction, setViolationAction] = useState('');
  const [violationEvidence, setViolationEvidence] = useState('');

  // Delete modal state
  const [deleteItem, setDeleteItem] = useState<{ id: string; type: 'violation' | 'guidance'; title: string } | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  // Add Guidance Modal State
  const [showAddGuidanceModal, setShowAddGuidanceModal] = useState(false);
  const [guidanceStudentId, setGuidanceStudentId] = useState(allStudentsFullData[0]?.student.student_id || '');
  const [guidanceStage, setGuidanceStage] = useState<GuidanceStage>('Pembinaan 1');
  const [guidanceDate, setGuidanceDate] = useState(new Date().toISOString().split('T')[0]);
  const [guidanceCounselor, setGuidanceCounselor] = useState(db.school_settings.homeroom_teacher_name);
  const [guidanceNotes, setGuidanceNotes] = useState('');
  const [guidanceAgreement, setGuidanceAgreement] = useState('');
  const [guidanceFollowUp, setGuidanceFollowUp] = useState('');

  const handleLevelChange = (lvl: ViolationLevel) => {
    setViolationLevel(lvl);
    if (lvl === 'Ringan') setViolationPoints(10);
    else if (lvl === 'Sedang') setViolationPoints(25);
    else setViolationPoints(50);
  };

  const handleSaveViolation = (e: React.FormEvent) => {
    e.preventDefault();
    if (!violationType.trim() || !violationChronology.trim()) {
      alert('Jenis pelanggaran dan kronologi wajib diisi.');
      return;
    }

    addViolation({
      student_id: violationStudentId,
      class_id: activeClass?.class_id || db.classes[0]?.class_id || '',
      academic_year_id: activeAcademicYear?.academic_year_id || db.academic_years[0]?.academic_year_id || '',
      date: violationDate,
      violation_type: violationType.trim(),
      level: violationLevel,
      penalty_points: Number(violationPoints),
      chronology: violationChronology.trim(),
      action_taken: violationAction.trim() || 'Teguran lisan dan pencatatan',
      evidence_notes: violationEvidence.trim(),
      status: 'Proses Pembinaan',
    });

    setShowAddViolationModal(false);
    setViolationType('');
    setViolationChronology('');
    setViolationAction('');
    setViolationEvidence('');
  };

  const handleSaveGuidance = (e: React.FormEvent) => {
    e.preventDefault();
    if (!guidanceNotes.trim() || !guidanceAgreement.trim()) {
      alert('Hasil pembinaan dan kesepakatan komitmen wajib diisi.');
      return;
    }

    addGuidance({
      student_id: guidanceStudentId,
      date: guidanceDate,
      counselor_name: guidanceCounselor.trim() || db.school_settings.homeroom_teacher_name,
      stage: guidanceStage,
      notes: guidanceNotes.trim(),
      agreement: guidanceAgreement.trim(),
      follow_up: guidanceFollowUp.trim() || 'Pemantauan berkala oleh wali kelas',
    });

    setShowAddGuidanceModal(false);
    setGuidanceNotes('');
    setGuidanceAgreement('');
    setGuidanceFollowUp('');
  };

  return (
    <div className="space-y-6">
      {/* Header Bar */}
      <div className="bg-white dark:bg-slate-800/90 p-4 rounded-2xl border border-slate-200 dark:border-slate-700/80 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-lg font-bold text-slate-900 dark:text-white flex items-center space-x-2">
            <ShieldAlert className="w-5 h-5 text-rose-600" />
            <span>Kedisiplinan, Pelanggaran & Alur Pembinaan</span>
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Penghitungan indeks disiplin, pencatatan pelanggaran, dan tahapan pembinaan berjenjang
          </p>
        </div>

        <div className="flex items-center space-x-2">
          <button
            onClick={() => setShowAddViolationModal(true)}
            className="bg-rose-600 hover:bg-rose-700 text-white px-3.5 py-2 rounded-xl text-xs font-bold transition flex items-center space-x-1.5 shadow-sm cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>Catat Pelanggaran</span>
          </button>
          <button
            onClick={() => setShowAddGuidanceModal(true)}
            className="bg-indigo-600 hover:bg-indigo-700 text-white px-3.5 py-2 rounded-xl text-xs font-bold transition flex items-center space-x-1.5 shadow-sm cursor-pointer"
          >
            <HeartHandshake className="w-4 h-4" />
            <span>Input Pembinaan</span>
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex bg-slate-100 dark:bg-slate-800/80 p-1 rounded-xl border border-slate-200 dark:border-slate-700 text-xs font-semibold w-fit">
        <button
          onClick={() => setActiveTab('violations')}
          className={`px-4 py-1.5 rounded-lg transition cursor-pointer ${
            activeTab === 'violations' ? 'bg-blue-600 text-white shadow' : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
          }`}
        >
          Daftar Pelanggaran ({db.violations.length})
        </button>
        <button
          onClick={() => setActiveTab('guidance')}
          className={`px-4 py-1.5 rounded-lg transition cursor-pointer ${
            activeTab === 'guidance' ? 'bg-blue-600 text-white shadow' : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
          }`}
        >
          Alur Pembinaan Siswa ({db.guidance.length})
        </button>
        <button
          onClick={() => setActiveTab('matrix')}
          className={`px-4 py-1.5 rounded-lg transition cursor-pointer ${
            activeTab === 'matrix' ? 'bg-blue-600 text-white shadow' : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
          }`}
        >
          Indeks Kedisiplinan Kelas
        </button>
      </div>

      {/* TAB 1: VIOLATIONS LIST */}
      {activeTab === 'violations' && (
        <div className="space-y-4">
          {db.violations.length === 0 ? (
            <div className="bg-white dark:bg-slate-800/90 rounded-2xl border border-slate-200 dark:border-slate-700/80 p-12 text-center text-slate-400">
              <CheckCircle2 className="w-12 h-12 mx-auto text-emerald-500 mb-2 opacity-80" />
              <h3 className="text-base font-bold text-slate-800 dark:text-white">Tidak Ada Catatan Pelanggaran</h3>
              <p className="text-xs text-slate-500">Seluruh siswa berada dalam kondisi tertib dan taat tata tertib sekolah.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {db.violations.map((v) => {
                const student = db.students.find(s => s.student_id === v.student_id);
                return (
                  <div
                    key={v.violation_id}
                    className="bg-white dark:bg-slate-800/90 rounded-2xl border border-slate-200 dark:border-slate-700/80 p-5 shadow-sm space-y-3"
                  >
                    <div className="flex items-start justify-between">
                      <div>
                        <div className="flex items-center space-x-2">
                          <span className="font-bold text-sm text-slate-900 dark:text-white">
                            {student?.full_name || v.student_id}
                          </span>
                          <span className={`px-2.5 py-0.5 text-[10px] font-bold rounded-full ${
                            v.level === 'Berat' ? 'bg-red-100 text-red-700 dark:bg-red-900/60 dark:text-red-300' :
                            v.level === 'Sedang' ? 'bg-amber-100 text-amber-700 dark:bg-amber-900/60 dark:text-amber-300' :
                            'bg-blue-100 text-blue-700 dark:bg-blue-900/60 dark:text-blue-300'
                          }`}>
                            {v.level} • {v.penalty_points} Poin
                          </span>
                        </div>
                        <p className="text-xs text-slate-400 font-mono mt-0.5">
                          ID: {v.student_id} • Tanggal: {v.date}
                        </p>
                      </div>

                      <button
                        onClick={() => setDeleteItem({
                          id: v.violation_id,
                          type: 'violation',
                          title: `Pelanggaran "${v.violation_type}" (${student?.full_name || v.student_id})`
                        })}
                        className="text-slate-400 hover:text-rose-600 p-1 cursor-pointer"
                        title="Hapus Pelanggaran"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>

                    <div className="text-xs space-y-1 bg-slate-50 dark:bg-slate-900 p-3 rounded-xl border border-slate-200 dark:border-slate-700">
                      <p><strong className="text-slate-500">Pelanggaran:</strong> {v.violation_type}</p>
                      <p><strong className="text-slate-500">Kronologi:</strong> {v.chronology}</p>
                      <p><strong className="text-slate-500">Tindakan Langsung:</strong> {v.action_taken}</p>
                      {v.evidence_notes && <p><strong className="text-slate-500">Bukti:</strong> {v.evidence_notes}</p>}
                    </div>

                    <div className="flex items-center justify-between text-xs pt-1">
                      <span className="font-semibold text-blue-600">Status: {v.status}</span>
                      <button
                        onClick={() => {
                          setGuidanceStudentId(v.student_id);
                          setShowAddGuidanceModal(true);
                        }}
                        className="text-xs font-bold text-indigo-600 hover:text-indigo-700 flex items-center space-x-1 cursor-pointer"
                      >
                        <span>Tindak Lanjuti Pembinaan</span>
                        <ArrowRight className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* TAB 2: GUIDANCE STAGES */}
      {activeTab === 'guidance' && (
        <div className="space-y-4">
          <div className="bg-gradient-to-r from-indigo-900 to-slate-900 text-white p-4 rounded-2xl">
            <h3 className="text-sm font-bold">Standar Alur 5 Tahap Pembinaan Wali Kelas (PRD)</h3>
            <div className="grid grid-cols-5 gap-2 mt-3 text-center text-xs">
              <div className="bg-white/10 p-2 rounded-xl">1. Pembinaan 1<br/><span className="text-[10px] text-blue-200">Teguran lisan</span></div>
              <div className="bg-white/10 p-2 rounded-xl">2. Komunikasi Ortu<br/><span className="text-[10px] text-blue-200">Panggilan / WA</span></div>
              <div className="bg-white/10 p-2 rounded-xl">3. Monitoring<br/><span className="text-[10px] text-blue-200">Evaluasi perilaku</span></div>
              <div className="bg-white/10 p-2 rounded-xl">4. Home Visit<br/><span className="text-[10px] text-blue-200">Kunjungan rumah</span></div>
              <div className="bg-white/10 p-2 rounded-xl">5. Selesai<br/><span className="text-[10px] text-blue-200">Kasus tuntas</span></div>
            </div>
          </div>

          <div className="space-y-3">
            {db.guidance.map((g) => {
              const student = db.students.find(s => s.student_id === g.student_id);
              return (
                <div key={g.guidance_id} className="bg-white dark:bg-slate-800/90 rounded-2xl border border-slate-200 dark:border-slate-700/80 p-5 shadow-sm space-y-2">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-2">
                      <span className="font-bold text-sm text-slate-900 dark:text-white">
                        {student?.full_name || g.student_id}
                      </span>
                      <span className="px-2.5 py-0.5 text-xs font-bold rounded-lg bg-indigo-100 text-indigo-800 dark:bg-indigo-900/60 dark:text-indigo-200">
                        {g.stage}
                      </span>
                    </div>
                    <div className="flex items-center space-x-3">
                      <span className="text-xs text-slate-400">{g.date} • Oleh {g.counselor_name}</span>
                      <button
                        onClick={() => setDeleteItem({
                          id: g.guidance_id,
                          type: 'guidance',
                          title: `Catatan ${g.stage} (${student?.full_name || g.student_id})`
                        })}
                        className="text-slate-400 hover:text-rose-600 p-1 cursor-pointer"
                        title="Hapus Pembinaan"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-xs bg-slate-50 dark:bg-slate-900 p-3 rounded-xl border border-slate-200 dark:border-slate-700">
                    <div><strong className="text-slate-400">Hasil Pembinaan:</strong> <p>{g.notes}</p></div>
                    <div><strong className="text-slate-400">Komitmen / Perjanjian:</strong> <p>{g.agreement}</p></div>
                    <div><strong className="text-slate-400">Rencana Tindak Lanjut:</strong> <p>{g.follow_up}</p></div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* TAB 3: DISCIPLINE INDEX MATRIX */}
      {activeTab === 'matrix' && (
        <div className="bg-white dark:bg-slate-800/90 rounded-2xl border border-slate-200 dark:border-slate-700/80 p-5 shadow-sm space-y-4">
          <div>
            <h3 className="text-sm font-bold text-slate-900 dark:text-white">
              Tabel Matriks Indeks Kedisiplinan Seluruh Siswa
            </h3>
            <p className="text-xs text-slate-500">
              Formula bobot: Kehadiran (30%) + Ketepatan Waktu (20%) + Poin Pelanggaran (25%) + Kepatuhan Atribut (15%) + Tanggung Jawab (10%)
            </p>
          </div>

          <div className="overflow-x-auto border border-slate-200 dark:border-slate-700 rounded-xl">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 dark:bg-slate-900 text-slate-500">
                <tr>
                  <th className="p-3 font-semibold">Nama Siswa</th>
                  <th className="p-3 text-center font-semibold">Kehadiran (30%)</th>
                  <th className="p-3 text-center font-semibold">Tepat Waktu (20%)</th>
                  <th className="p-3 text-center font-semibold">Pelanggaran (25%)</th>
                  <th className="p-3 text-center font-semibold">Seragam (15%)</th>
                  <th className="p-3 text-center font-semibold">Total Indeks</th>
                  <th className="p-3 text-center font-semibold">Kategori Disiplin</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-700">
                {allStudentsFullData.map((d) => {
                  const s = d.student;
                  const disc = d.discipline_score;
                  return (
                    <tr key={s.student_id} className="hover:bg-slate-50 dark:hover:bg-slate-800/40">
                      <td className="p-3">
                        <div className="font-bold text-slate-900 dark:text-white">{s.full_name}</div>
                        <div className="text-[11px] text-slate-400 font-mono">{s.student_id}</div>
                      </td>
                      <td className="p-3 text-center font-semibold">{disc.factors.attendance_score}</td>
                      <td className="p-3 text-center font-semibold">{disc.factors.punctuality_score}</td>
                      <td className="p-3 text-center font-semibold">{disc.factors.violation_score}</td>
                      <td className="p-3 text-center font-semibold">{disc.factors.compliance_score}</td>
                      <td className="p-3 text-center font-black text-indigo-600 dark:text-indigo-400 text-sm">
                        {disc.score}
                      </td>
                      <td className="p-3 text-center">
                        <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold ${
                          disc.category === 'Sangat Baik' ? 'bg-emerald-100 text-emerald-800' :
                          disc.category === 'Baik' ? 'bg-blue-100 text-blue-800' :
                          disc.category === 'Cukup' ? 'bg-amber-100 text-amber-800' :
                          'bg-red-100 text-red-800'
                        }`}>
                          {disc.category}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* MODAL: ADD VIOLATION */}
      {showAddViolationModal && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/80 backdrop-blur-sm flex items-center justify-center p-3">
          <div className="bg-white dark:bg-slate-900 rounded-2xl max-w-lg w-full p-6 shadow-2xl border border-slate-200 dark:border-slate-800 space-y-4 text-xs">
            <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-3">
              <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center space-x-2">
                <ShieldAlert className="w-4 h-4 text-rose-600" />
                <span>Pencatatan Kasus Pelanggaran Tata Tertib</span>
              </h3>
              <button onClick={() => setShowAddViolationModal(false)} className="text-slate-400 hover:text-white cursor-pointer">
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSaveViolation} className="space-y-3">
              <div>
                <label className="block font-semibold mb-1">Pilih Siswa yang Bersangkutan:</label>
                <select
                  value={violationStudentId}
                  onChange={(e) => setViolationStudentId(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-900 dark:text-white cursor-pointer"
                >
                  {allStudentsFullData.map(s => (
                    <option key={s.student.student_id} value={s.student.student_id}>
                      {s.student.full_name} ({s.student.student_id})
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold mb-1">Tingkat Pelanggaran:</label>
                  <select
                    value={violationLevel}
                    onChange={(e) => handleLevelChange(e.target.value as ViolationLevel)}
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-900 dark:text-white cursor-pointer"
                  >
                    <option value="Ringan">Ringan (5-10 Poin)</option>
                    <option value="Sedang">Sedang (15-25 Poin)</option>
                    <option value="Berat">Berat (50-100 Poin)</option>
                  </select>
                </div>
                <div>
                  <label className="block font-semibold mb-1">Poin Pelanggaran:</label>
                  <input
                    type="number"
                    value={violationPoints}
                    onChange={(e) => setViolationPoints(Number(e.target.value))}
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-900 dark:text-white"
                  />
                </div>
              </div>

              <div>
                <label className="block font-semibold mb-1">Jenis / Bentuk Pelanggaran:</label>
                <input
                  type="text"
                  required
                  placeholder="Contoh: Merokok di area belakang kantin sekolah"
                  value={violationType}
                  onChange={(e) => setViolationType(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-900 dark:text-white"
                />
              </div>

              <div>
                <label className="block font-semibold mb-1">Tanggal Kejadian:</label>
                <input
                  type="date"
                  value={violationDate}
                  onChange={(e) => setViolationDate(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-900 dark:text-white"
                />
              </div>

              <div>
                <label className="block font-semibold mb-1">Kronologi Kejadian:</label>
                <textarea
                  rows={2}
                  required
                  placeholder="Jelaskan secara runtut kejadian pelanggaran..."
                  value={violationChronology}
                  onChange={(e) => setViolationChronology(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-900 dark:text-white"
                />
              </div>

              <div>
                <label className="block font-semibold mb-1">Tindakan Langsung / Bukti:</label>
                <input
                  type="text"
                  placeholder="Contoh: Barang bukti rokok diamankan, siswa diberikan teguran lisan"
                  value={violationAction}
                  onChange={(e) => setViolationAction(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-900 dark:text-white"
                />
              </div>

              <div className="pt-3 border-t border-slate-200 dark:border-slate-800 flex justify-end space-x-2">
                <button
                  type="button"
                  onClick={() => setShowAddViolationModal(false)}
                  className="px-4 py-2 bg-slate-200 dark:bg-slate-700 rounded-xl cursor-pointer"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-rose-600 hover:bg-rose-700 text-white font-bold rounded-xl shadow cursor-pointer"
                >
                  Simpan Pelanggaran
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: ADD GUIDANCE */}
      {showAddGuidanceModal && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/80 backdrop-blur-sm flex items-center justify-center p-3">
          <div className="bg-white dark:bg-slate-900 rounded-2xl max-w-lg w-full p-6 shadow-2xl border border-slate-200 dark:border-slate-800 space-y-4 text-xs">
            <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-3">
              <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center space-x-2">
                <HeartHandshake className="w-4 h-4 text-indigo-600" />
                <span>Pencatatan Sesi Pembinaan Siswa</span>
              </h3>
              <button onClick={() => setShowAddGuidanceModal(false)} className="text-slate-400 hover:text-white cursor-pointer">
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSaveGuidance} className="space-y-3">
              <div>
                <label className="block font-semibold mb-1">Pilih Siswa yang Dibina:</label>
                <select
                  value={guidanceStudentId}
                  onChange={(e) => setGuidanceStudentId(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-900 dark:text-white cursor-pointer"
                >
                  {allStudentsFullData.map(s => (
                    <option key={s.student.student_id} value={s.student.student_id}>
                      {s.student.full_name} ({s.student.student_id})
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold mb-1">Tahapan Pembinaan:</label>
                  <select
                    value={guidanceStage}
                    onChange={(e) => setGuidanceStage(e.target.value as GuidanceStage)}
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-900 dark:text-white cursor-pointer"
                  >
                    <option value="Pembinaan 1">1. Pembinaan 1 (Teguran Lisan)</option>
                    <option value="Komunikasi Orang Tua">2. Komunikasi Orang Tua</option>
                    <option value="Monitoring & Evaluasi">3. Monitoring & Evaluasi</option>
                    <option value="Home Visit">4. Home Visit</option>
                    <option value="Selesai">5. Selesai (Tuntas)</option>
                  </select>
                </div>

                <div>
                  <label className="block font-semibold mb-1">Tanggal Pembinaan:</label>
                  <input
                    type="date"
                    value={guidanceDate}
                    onChange={(e) => setGuidanceDate(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-900 dark:text-white"
                  />
                </div>
              </div>

              <div>
                <label className="block font-semibold mb-1">Nama Pembina / Konselor:</label>
                <input
                  type="text"
                  value={guidanceCounselor}
                  onChange={(e) => setGuidanceCounselor(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-900 dark:text-white"
                />
              </div>

              <div>
                <label className="block font-semibold mb-1">Hasil Pembahasan Pembinaan:</label>
                <textarea
                  rows={2}
                  required
                  placeholder="Siswa mengakui kesalahan dan mendiskusikan faktor penyebab..."
                  value={guidanceNotes}
                  onChange={(e) => setGuidanceNotes(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-900 dark:text-white"
                />
              </div>

              <div>
                <label className="block font-semibold mb-1">Komitmen / Surat Kesepakatan Siswa:</label>
                <input
                  type="text"
                  required
                  placeholder="Contoh: Siswa berkomitmen tidak mengulangi dan menandatangani surat perjanjian"
                  value={guidanceAgreement}
                  onChange={(e) => setGuidanceAgreement(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-900 dark:text-white"
                />
              </div>

              <div>
                <label className="block font-semibold mb-1">Rencana Tindak Lanjut:</label>
                <input
                  type="text"
                  placeholder="Contoh: Pemantauan harian oleh wali kelas selama 2 pekan"
                  value={guidanceFollowUp}
                  onChange={(e) => setGuidanceFollowUp(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-900 dark:text-white"
                />
              </div>

              <div className="pt-3 border-t border-slate-200 dark:border-slate-800 flex justify-end space-x-2">
                <button
                  type="button"
                  onClick={() => setShowAddGuidanceModal(false)}
                  className="px-4 py-2 bg-slate-200 dark:bg-slate-700 rounded-xl cursor-pointer"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl shadow cursor-pointer"
                >
                  Simpan Pembinaan
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Confirmation Modal */}
      <ConfirmModal
        isOpen={!!deleteItem}
        title={`Konfirmasi Hapus ${deleteItem?.type === 'violation' ? 'Pelanggaran' : 'Pembinaan'}`}
        message={`Apakah Anda yakin ingin menghapus catatan ${deleteItem?.title}? Tindakan ini akan menghapus data dari sistem dan cloud Firestore.`}
        confirmText="Ya, Hapus"
        cancelText="Batal"
        type="danger"
        isProcessing={isDeleting}
        onConfirm={async () => {
          if (!deleteItem) return;
          setIsDeleting(true);
          try {
            if (deleteItem.type === 'violation') {
              await deleteViolation(deleteItem.id);
            } else {
              await deleteGuidance(deleteItem.id);
            }
          } finally {
            setIsDeleting(false);
            setDeleteItem(null);
          }
        }}
        onClose={() => !isDeleting && setDeleteItem(null)}
      />
    </div>
  );
};
