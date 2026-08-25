import React, { useState } from 'react';
import { useDatabase } from '../../context/DatabaseContext';
import { AchievementRecord, AchievementLevel } from '../../types';
import { Trophy, Plus, Award, Trash2, X, Star, Sparkles } from 'lucide-react';
import { ConfirmModal } from '../common/ConfirmModal';

export const AchievementsManager: React.FC = () => {
  const { db, addAchievement, deleteAchievement, allStudentsFullData, activeAcademicYear } = useDatabase();

  const [showAddModal, setShowAddModal] = useState(false);
  const [studentId, setStudentId] = useState(allStudentsFullData[0]?.student.student_id || '');
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [title, setTitle] = useState('');
  const [rank, setRank] = useState('Juara 1');
  const [level, setLevel] = useState<AchievementLevel>('Kabupaten/Kota');
  const [category, setCategory] = useState('Kejuruan / Vokasi');
  const [organizer, setOrganizer] = useState('');
  const [documentation, setDocumentation] = useState('');

  const [deleteTarget, setDeleteTarget] = useState<{ id: string; name: string } | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !rank.trim()) {
      alert('Judul kejuaraan dan peringkat wajib diisi.');
      return;
    }

    addAchievement({
      student_id: studentId,
      academic_year_id: activeAcademicYear?.academic_year_id || db.academic_years[0]?.academic_year_id || '',
      date,
      title: title.trim(),
      rank: rank.trim(),
      level,
      category: category.trim(),
      organizer: organizer.trim() || 'Dinas Pendidikan / Industri',
      documentation: documentation.trim(),
    });

    setShowAddModal(false);
    setTitle('');
    setOrganizer('');
    setDocumentation('');
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white dark:bg-slate-800/90 p-4 rounded-2xl border border-slate-200 dark:border-slate-700/80 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-lg font-bold text-slate-900 dark:text-white flex items-center space-x-2">
            <Trophy className="w-5 h-5 text-amber-500" />
            <span>Prestasi, Potensi & Bakat Siswa</span>
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Pencatatan kejuaraan akademik, vokasi/LKS, non-akademik, dan pemetaan potensi siswa
          </p>
        </div>

        <button
          onClick={() => setShowAddModal(true)}
          className="bg-amber-600 hover:bg-amber-700 text-white px-4 py-2 rounded-xl text-xs font-bold transition flex items-center space-x-1.5 shadow-sm cursor-pointer"
        >
          <Plus className="w-4 h-4" />
          <span>Tambah Catatan Prestasi</span>
        </button>
      </div>

      {/* Grid of Achievements */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {db.achievements.length === 0 ? (
          <div className="md:col-span-3 bg-white dark:bg-slate-800/90 rounded-2xl border border-slate-200 dark:border-slate-700/80 p-12 text-center text-slate-400">
            <Trophy className="w-12 h-12 mx-auto text-slate-400 mb-2 opacity-50" />
            <h3 className="text-base font-bold text-slate-800 dark:text-white">Belum Ada Prestasi Terdaftar</h3>
            <p className="text-xs text-slate-500">Klik tombol di atas untuk menambahkan rekam jejak kejuaraan siswa.</p>
          </div>
        ) : (
          db.achievements.map((ach) => {
            const s = db.students.find(stu => stu.student_id === ach.student_id);
            return (
              <div
                key={ach.achievement_id}
                className="bg-white dark:bg-slate-800/90 rounded-2xl border border-amber-200 dark:border-amber-900/50 p-5 shadow-sm space-y-3 relative overflow-hidden"
              >
                <div className="flex items-start justify-between">
                  <div className="flex items-center space-x-2.5">
                    <div className="w-10 h-10 rounded-xl bg-amber-100 dark:bg-amber-900/50 flex items-center justify-center text-amber-600 dark:text-amber-300 font-bold">
                      <Award className="w-5 h-5" />
                    </div>
                    <div>
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-200 dark:bg-amber-900 text-amber-900 dark:text-amber-200">
                        {ach.rank}
                      </span>
                      <h3 className="text-sm font-bold text-slate-900 dark:text-white mt-0.5">
                        {ach.title}
                      </h3>
                    </div>
                  </div>

                  <button
                    onClick={() => setDeleteTarget({
                      id: ach.achievement_id,
                      name: `Prestasi "${ach.title}" (${s?.full_name || ach.student_id})`
                    })}
                    className="text-slate-400 hover:text-rose-600 p-1 cursor-pointer"
                    title="Hapus Prestasi"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>

                <div className="text-xs space-y-1 bg-amber-50/50 dark:bg-slate-900 p-3 rounded-xl border border-amber-100 dark:border-slate-700">
                  <p><strong className="text-slate-500">Siswa:</strong> {s?.full_name || ach.student_id}</p>
                  <p><strong className="text-slate-500">Tingkat:</strong> {ach.level} • {ach.category}</p>
                  <p><strong className="text-slate-500">Penyelenggara:</strong> {ach.organizer}</p>
                  {ach.documentation && <p><strong className="text-slate-500">Keterangan:</strong> {ach.documentation}</p>}
                </div>

                <div className="text-[10px] text-slate-400 flex items-center justify-between">
                  <span>ID Siswa: {ach.student_id}</span>
                  <span>Tanggal: {ach.date}</span>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Modal Add Achievement */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/80 backdrop-blur-sm flex items-center justify-center p-3">
          <div className="bg-white dark:bg-slate-900 rounded-2xl max-w-lg w-full p-6 shadow-2xl border border-slate-200 dark:border-slate-800 space-y-4 text-xs">
            <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-3">
              <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center space-x-2">
                <Trophy className="w-4 h-4 text-amber-500" />
                <span>Pencatatan Gelar Juara & Prestasi Siswa</span>
              </h3>
              <button onClick={() => setShowAddModal(false)} className="text-slate-400 hover:text-white cursor-pointer">
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSave} className="space-y-3">
              <div>
                <label className="block font-semibold mb-1">Pilih Siswa yang Berprestasi:</label>
                <select
                  value={studentId}
                  onChange={(e) => setStudentId(e.target.value)}
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
                  <label className="block font-semibold mb-1">Peringkat / Gelar:</label>
                  <input
                    type="text"
                    required
                    placeholder="Juara 1 / Medali Emas"
                    value={rank}
                    onChange={(e) => setRank(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-900 dark:text-white"
                  />
                </div>
                <div>
                  <label className="block font-semibold mb-1">Tingkat Kejuaraan:</label>
                  <select
                    value={level}
                    onChange={(e) => setLevel(e.target.value as AchievementLevel)}
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-900 dark:text-white cursor-pointer"
                  >
                    <option value="Sekolah">Tingkat Sekolah</option>
                    <option value="Kecamatan">Tingkat Kecamatan</option>
                    <option value="Kabupaten/Kota">Tingkat Kabupaten/Kota</option>
                    <option value="Provinsi">Tingkat Provinsi</option>
                    <option value="Nasional">Tingkat Nasional</option>
                    <option value="Internasional">Tingkat Internasional</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block font-semibold mb-1">Nama Kejuaraan / Lomba:</label>
                <input
                  type="text"
                  required
                  placeholder="Contoh: Lomba Kompetensi Siswa (LKS) Otomotif SMK"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-900 dark:text-white"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold mb-1">Bidang / Kategori:</label>
                  <input
                    type="text"
                    placeholder="Kejuruan / Olahraga / Seni"
                    value={category}
                    onChange={(e) => setCategory(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-900 dark:text-white"
                  />
                </div>
                <div>
                  <label className="block font-semibold mb-1">Tanggal Acara:</label>
                  <input
                    type="date"
                    value={date}
                    onChange={(e) => setDate(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-900 dark:text-white"
                  />
                </div>
              </div>

              <div>
                <label className="block font-semibold mb-1">Penyelenggara Kegiatan:</label>
                <input
                  type="text"
                  placeholder="Contoh: Dinas Pendidikan Provinsi Jawa Barat & PT Astra Honda Motor"
                  value={organizer}
                  onChange={(e) => setOrganizer(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-900 dark:text-white"
                />
              </div>

              <div>
                <label className="block font-semibold mb-1">Nomor Sertifikat / Dokumentasi:</label>
                <input
                  type="text"
                  placeholder="Sertifikat No: 421/LKS-JBR/2026"
                  value={documentation}
                  onChange={(e) => setDocumentation(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-900 dark:text-white"
                />
              </div>

              <div className="pt-3 border-t border-slate-200 dark:border-slate-800 flex justify-end space-x-2">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="px-4 py-2 bg-slate-200 dark:bg-slate-700 rounded-xl cursor-pointer"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-amber-600 hover:bg-amber-700 text-white font-bold rounded-xl shadow cursor-pointer"
                >
                  Simpan Prestasi
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Confirmation Modal */}
      <ConfirmModal
        isOpen={!!deleteTarget}
        title="Konfirmasi Hapus Prestasi"
        message={`Apakah Anda yakin ingin menghapus catatan ${deleteTarget?.name}? Data yang dihapus tidak dapat dipulihkan.`}
        confirmText="Ya, Hapus"
        cancelText="Batal"
        type="danger"
        isProcessing={isDeleting}
        onConfirm={async () => {
          if (!deleteTarget) return;
          setIsDeleting(true);
          try {
            await deleteAchievement(deleteTarget.id);
          } finally {
            setIsDeleting(false);
            setDeleteTarget(null);
          }
        }}
        onClose={() => !isDeleting && setDeleteTarget(null)}
      />
    </div>
  );
};
