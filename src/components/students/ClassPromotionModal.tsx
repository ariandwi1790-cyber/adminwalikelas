import React, { useState } from 'react';
import { useDatabase } from '../../context/DatabaseContext';
import { X, GraduationCap, ArrowRight, ShieldCheck, CheckCircle2 } from 'lucide-react';

interface ClassPromotionModalProps {
  selectedStudentIds: string[];
  onClose: () => void;
}

export const ClassPromotionModal: React.FC<ClassPromotionModalProps> = ({
  selectedStudentIds,
  onClose,
}) => {
  const { db, promoteStudents } = useDatabase();

  const [actionType, setActionType] = useState<'Naik Kelas' | 'Lulus' | 'Mutasi Keluar'>('Naik Kelas');
  const [targetClassId, setTargetClassId] = useState<string>(db.classes[0]?.class_id || '');
  const [targetAcademicYearId, setTargetAcademicYearId] = useState<string>(
    db.academic_years.find(y => y.status === 'Active')?.academic_year_id || db.academic_years[0]?.academic_year_id || ''
  );

  const selectedStudents = db.students.filter(s => selectedStudentIds.includes(s.student_id));

  const handleExecutePromotion = (e: React.FormEvent) => {
    e.preventDefault();
    if (selectedStudentIds.length === 0) return;

    promoteStudents(selectedStudentIds, targetClassId, targetAcademicYearId, actionType);
    alert(`Berhasil memproses ${actionType} untuk ${selectedStudentIds.length} siswa. Riwayat tahun sebelumnya tetap diarsipkan secara utuh.`);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/80 backdrop-blur-sm flex items-center justify-center p-3 sm:p-4">
      <div className="bg-white dark:bg-slate-900 rounded-2xl max-w-2xl w-full flex flex-col shadow-2xl border border-slate-200 dark:border-slate-800 overflow-hidden">
        {/* Header */}
        <div className="p-4 bg-purple-900 text-white flex items-center justify-between">
          <div className="flex items-center space-x-2.5">
            <GraduationCap className="w-6 h-6 text-purple-300" />
            <div>
              <h3 className="text-base font-bold">Proses Kenaikan Kelas / Kelulusan (Lifecycle)</h3>
              <p className="text-xs text-purple-200">
                Memindahkan status dan kelas siswa tanpa menghapus data histori tahun sebelumnya
              </p>
            </div>
          </div>
          <button onClick={onClose} className="text-purple-200 hover:text-white p-1.5 rounded-lg cursor-pointer">
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleExecutePromotion} className="p-6 space-y-4 text-xs">
          {/* Action Type Selector */}
          <div>
            <label className="block text-slate-700 dark:text-slate-300 font-semibold mb-2">
              Pilih Jenis Tindakan:
            </label>
            <div className="grid grid-cols-3 gap-2">
              {[
                { id: 'Naik Kelas', label: 'Naik Kelas', desc: 'Pindah ke tingkat kelas berikutnya' },
                { id: 'Lulus', label: 'Kelulusan / Alumni', desc: 'Tamat belajar di jenjang ini' },
                { id: 'Mutasi Keluar', label: 'Mutasi / Pindah', desc: 'Pindah sekolah / keluar' },
              ].map(opt => (
                <button
                  key={opt.id}
                  type="button"
                  onClick={() => setActionType(opt.id as any)}
                  className={`p-3 rounded-xl border text-left transition cursor-pointer ${
                    actionType === opt.id
                      ? 'border-purple-600 bg-purple-50 dark:bg-purple-950/40 text-purple-900 dark:text-purple-200 font-bold shadow-sm'
                      : 'border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-600 dark:text-slate-400'
                  }`}
                >
                  <div className="text-xs font-bold">{opt.label}</div>
                  <div className="text-[10px] text-slate-500 dark:text-slate-400 mt-0.5">{opt.desc}</div>
                </button>
              ))}
            </div>
          </div>

          {/* If Naik Kelas, choose Target Class and Academic Year */}
          {actionType === 'Naik Kelas' && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
              <div>
                <label className="block text-slate-700 dark:text-slate-300 font-semibold mb-1">
                  Tahun Ajaran Baru:
                </label>
                <select
                  value={targetAcademicYearId}
                  onChange={(e) => setTargetAcademicYearId(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-900 dark:text-white cursor-pointer"
                >
                  {db.academic_years.map(ay => (
                    <option key={ay.academic_year_id} value={ay.academic_year_id}>
                      {ay.year_name} ({ay.semester}) {ay.status === 'Active' ? '★ Aktif' : ''}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-slate-700 dark:text-slate-300 font-semibold mb-1">
                  Kelas Tujuan Baru:
                </label>
                <select
                  value={targetClassId}
                  onChange={(e) => setTargetClassId(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-900 dark:text-white cursor-pointer"
                >
                  {db.classes.map(c => (
                    <option key={c.class_id} value={c.class_id}>
                      {c.class_name} ({c.major})
                    </option>
                  ))}
                </select>
              </div>
            </div>
          )}

          {/* Selected Students Preview */}
          <div>
            <label className="block text-slate-700 dark:text-slate-300 font-semibold mb-1.5">
              Daftar Siswa Terpilih ({selectedStudents.length} Siswa):
            </label>
            <div className="max-h-40 overflow-y-auto bg-slate-50 dark:bg-slate-800/60 p-3 rounded-xl border border-slate-200 dark:border-slate-700 divide-y divide-slate-200/60 dark:divide-slate-700/60">
              {selectedStudents.map((s, idx) => (
                <div key={s.student_id} className="py-1.5 flex items-center justify-between text-xs">
                  <div className="flex items-center space-x-2">
                    <span className="text-slate-400 font-mono">{idx + 1}.</span>
                    <span className="font-bold text-slate-800 dark:text-slate-200">{s.full_name}</span>
                    <span className="font-mono text-[10px] text-blue-500 font-semibold">({s.student_id})</span>
                  </div>
                  <span className="text-[10px] px-2 py-0.5 rounded bg-slate-200 dark:bg-slate-700 font-semibold">
                    NIS: {s.nis || '-'}
                  </span>
                </div>
              ))}
            </div>
          </div>

          <div className="p-3 bg-purple-50 dark:bg-purple-950/30 rounded-xl border border-purple-200 dark:border-purple-800 text-[11px] text-purple-900 dark:text-purple-200 flex items-start space-x-2">
            <ShieldCheck className="w-4 h-4 text-purple-600 flex-shrink-0 mt-0.5" />
            <p>
              <strong>Jaminan Keutuhan Data:</strong> Seluruh catatan presensi, pembinaan, pelanggaran, dan riwayat kelas tahun sebelumnya tetap tersimpan di database dan dapat dilihat di profil riwayat siswa kapan saja.
            </p>
          </div>

          {/* Footer Submit */}
          <div className="pt-3 border-t border-slate-200 dark:border-slate-800 flex items-center justify-end space-x-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 bg-slate-200 dark:bg-slate-700 hover:bg-slate-300 dark:hover:bg-slate-600 text-slate-800 dark:text-slate-200 font-semibold rounded-xl cursor-pointer"
            >
              Batal
            </button>
            <button
              type="submit"
              className="px-5 py-2 bg-purple-600 hover:bg-purple-700 text-white font-bold rounded-xl flex items-center space-x-1.5 shadow-md cursor-pointer"
            >
              <ArrowRight className="w-4 h-4" />
              <span>Jalankan {actionType}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
