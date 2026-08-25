import React, { useState } from 'react';
import { useDatabase } from '../../context/DatabaseContext';
import { StickyNote, Plus, Trash2, X, Filter, Tag, Calendar, User } from 'lucide-react';
import { ConfirmModal } from '../common/ConfirmModal';

export const NotesManager: React.FC = () => {
  const { db, addStudentNote, deleteStudentNote, allStudentsFullData } = useDatabase();

  const [showAddModal, setShowAddModal] = useState(false);
  const [filterCategory, setFilterCategory] = useState<string>('all');
  const [studentId, setStudentId] = useState(allStudentsFullData[0]?.student.student_id || '');
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [category, setCategory] = useState<'Akademik' | 'Perilaku' | 'Sosial' | 'Keluarga' | 'Lainnya'>('Perilaku');
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');

  const [deleteTarget, setDeleteTarget] = useState<{ id: string; name: string } | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const filteredNotes = db.student_notes.filter(n => {
    return filterCategory === 'all' || n.category === filterCategory;
  });

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !content.trim()) {
      alert('Judul dan isi catatan wajib diisi.');
      return;
    }

    addStudentNote({
      student_id: studentId,
      date,
      category,
      title: title.trim(),
      content: content.trim(),
      author: db.school_settings.homeroom_teacher_name,
    });

    setShowAddModal(false);
    setTitle('');
    setContent('');
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white dark:bg-slate-800/90 p-4 rounded-2xl border border-slate-200 dark:border-slate-700/80 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-lg font-bold text-slate-900 dark:text-white flex items-center space-x-2">
            <StickyNote className="w-5 h-5 text-amber-500" />
            <span>Timeline Catatan Perkembangan Siswa</span>
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Jurnal perkembangan harian, perilaku sosial, akademik, dan latar belakang keluarga
          </p>
        </div>

        <button
          onClick={() => setShowAddModal(true)}
          className="bg-amber-600 hover:bg-amber-700 text-white px-4 py-2 rounded-xl text-xs font-bold transition flex items-center space-x-1.5 shadow-sm cursor-pointer"
        >
          <Plus className="w-4 h-4" />
          <span>Tulis Catatan Baru</span>
        </button>
      </div>

      {/* Filter Category */}
      <div className="flex bg-slate-100 dark:bg-slate-800/80 p-1 rounded-xl border border-slate-200 dark:border-slate-700 text-xs font-semibold w-fit">
        {['all', 'Akademik', 'Perilaku', 'Sosial', 'Keluarga', 'Lainnya'].map(cat => (
          <button
            key={cat}
            onClick={() => setFilterCategory(cat)}
            className={`px-3 py-1.5 rounded-lg transition cursor-pointer ${
              filterCategory === cat ? 'bg-amber-600 text-white shadow' : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
            }`}
          >
            {cat === 'all' ? 'Semua Kategori' : cat}
          </button>
        ))}
      </div>

      {/* Notes Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {filteredNotes.length === 0 ? (
          <div className="md:col-span-2 bg-white dark:bg-slate-800/90 rounded-2xl border border-slate-200 dark:border-slate-700/80 p-12 text-center text-slate-400">
            <StickyNote className="w-12 h-12 mx-auto text-slate-400 mb-2 opacity-50" />
            <h3 className="text-base font-bold text-slate-800 dark:text-white">Belum Ada Catatan Siswa</h3>
            <p className="text-xs text-slate-500">Klik tombol di atas untuk membuat catatan perkembangan baru.</p>
          </div>
        ) : (
          filteredNotes.map((n) => {
            const s = db.students.find(stu => stu.student_id === n.student_id);
            return (
              <div
                key={n.note_id}
                className="bg-white dark:bg-slate-800/90 rounded-2xl border border-slate-200 dark:border-slate-700/80 p-5 shadow-sm space-y-2 relative"
              >
                <div className="flex items-start justify-between">
                  <div className="flex items-center space-x-2">
                    <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-amber-100 text-amber-800 dark:bg-amber-900/60 dark:text-amber-200">
                      {n.category}
                    </span>
                    <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                      {n.title}
                    </h3>
                  </div>
                  <button
                    onClick={() => setDeleteTarget({
                      id: n.note_id,
                      name: `Catatan "${n.title}" (${s?.full_name || n.student_id})`
                    })}
                    className="text-slate-400 hover:text-rose-600 p-1 cursor-pointer"
                    title="Hapus Catatan"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>

                <p className="text-xs text-slate-700 dark:text-slate-300 whitespace-pre-line bg-slate-50 dark:bg-slate-900 p-3 rounded-xl border border-slate-200 dark:border-slate-700">
                  {n.content}
                </p>

                <div className="flex items-center justify-between text-[11px] text-slate-400 pt-1">
                  <span>Siswa: <strong className="text-slate-600 dark:text-slate-300">{s?.full_name || n.student_id}</strong></span>
                  <span>{n.date} • Oleh {n.author}</span>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Modal Add Note */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/80 backdrop-blur-sm flex items-center justify-center p-3">
          <div className="bg-white dark:bg-slate-900 rounded-2xl max-w-lg w-full p-6 shadow-2xl border border-slate-200 dark:border-slate-800 space-y-4 text-xs">
            <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-3">
              <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center space-x-2">
                <StickyNote className="w-4 h-4 text-amber-500" />
                <span>Tulis Catatan Perkembangan Siswa</span>
              </h3>
              <button onClick={() => setShowAddModal(false)} className="text-slate-400 hover:text-white cursor-pointer">
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSave} className="space-y-3">
              <div>
                <label className="block font-semibold mb-1">Pilih Siswa:</label>
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
                  <label className="block font-semibold mb-1">Kategori Catatan:</label>
                  <select
                    value={category}
                    onChange={(e) => setCategory(e.target.value as any)}
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-900 dark:text-white cursor-pointer"
                  >
                    <option value="Perilaku">Perilaku & Sikap</option>
                    <option value="Akademik">Akademik & Nilai</option>
                    <option value="Sosial">Interaksi Sosial</option>
                    <option value="Keluarga">Latar Belakang Keluarga</option>
                    <option value="Lainnya">Lainnya</option>
                  </select>
                </div>
                <div>
                  <label className="block font-semibold mb-1">Tanggal Catatan:</label>
                  <input
                    type="date"
                    value={date}
                    onChange={(e) => setDate(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-900 dark:text-white"
                  />
                </div>
              </div>

              <div>
                <label className="block font-semibold mb-1">Judul Ringkas Catatan:</label>
                <input
                  type="text"
                  required
                  placeholder="Contoh: Mengalami peningkatan antusiasme di praktek bengkel"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-900 dark:text-white"
                />
              </div>

              <div>
                <label className="block font-semibold mb-1">Isi Narasi Catatan:</label>
                <textarea
                  rows={3}
                  required
                  placeholder="Deskripsikan perkembangan atau observasi penting mengenai siswa..."
                  value={content}
                  onChange={(e) => setContent(e.target.value)}
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
                  Simpan Catatan
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Confirmation Modal */}
      <ConfirmModal
        isOpen={!!deleteTarget}
        title="Konfirmasi Hapus Catatan"
        message={`Apakah Anda yakin ingin menghapus catatan ${deleteTarget?.name}? Data yang dihapus tidak dapat dipulihkan.`}
        confirmText="Ya, Hapus"
        cancelText="Batal"
        type="danger"
        isProcessing={isDeleting}
        onConfirm={async () => {
          if (!deleteTarget) return;
          setIsDeleting(true);
          try {
            await deleteStudentNote(deleteTarget.id);
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
