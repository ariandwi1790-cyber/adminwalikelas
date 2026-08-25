import React, { useState } from 'react';
import { useDatabase } from '../../context/DatabaseContext';
import { ParentCommunicationRecord } from '../../types';
import { MessageSquareQuote, Plus, Phone, MessageCircle, Mail, Users, Trash2, X, Save } from 'lucide-react';
import { ConfirmModal } from '../common/ConfirmModal';

export const ParentCommManager: React.FC = () => {
  const { db, addParentCommunication, deleteParentCommunication, allStudentsFullData } = useDatabase();

  const [showAddModal, setShowAddModal] = useState(false);
  const [studentId, setStudentId] = useState(allStudentsFullData[0]?.student.student_id || '');
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [parentName, setParentName] = useState('');
  const [media, setMedia] = useState<'WhatsApp' | 'Telepon' | 'Pertemuan Sekolah' | 'Surat Resmi'>('WhatsApp');
  const [topic, setTopic] = useState('');
  const [result, setResult] = useState('');
  const [followUp, setFollowUp] = useState('');

  const [deleteTarget, setDeleteTarget] = useState<{ id: string; name: string } | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const handleStudentSelect = (sid: string) => {
    setStudentId(sid);
    const stu = allStudentsFullData.find(s => s.student.student_id === sid);
    if (stu?.parent) {
      setParentName(stu.parent.father_name || stu.parent.mother_name || 'Orang Tua Siswa');
    }
  };

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    if (!topic.trim() || !result.trim()) {
      alert('Topik pembahasan dan hasil komunikasi wajib diisi.');
      return;
    }

    addParentCommunication({
      student_id: studentId,
      date,
      parent_name: parentName.trim() || 'Orang Tua Siswa',
      media,
      topic: topic.trim(),
      result: result.trim(),
      follow_up: followUp.trim() || 'Koordinasi lanjutan sesuai kesepakatan',
    });

    setShowAddModal(false);
    setTopic('');
    setResult('');
    setFollowUp('');
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white dark:bg-slate-800/90 p-4 rounded-2xl border border-slate-200 dark:border-slate-700/80 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-lg font-bold text-slate-900 dark:text-white flex items-center space-x-2">
            <MessageSquareQuote className="w-5 h-5 text-emerald-600" />
            <span>Log Komunikasi Orang Tua / Wali</span>
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Pencatatan komunikasi berkala melalui WhatsApp, telepon, tatap muka di sekolah, dan surat dinas
          </p>
        </div>

        <button
          onClick={() => {
            const sid = allStudentsFullData[0]?.student.student_id || '';
            handleStudentSelect(sid);
            setShowAddModal(true);
          }}
          className="bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-2 rounded-xl text-xs font-bold transition flex items-center space-x-1.5 shadow-sm cursor-pointer"
        >
          <Plus className="w-4 h-4" />
          <span>Catat Komunikasi Ortu</span>
        </button>
      </div>

      {/* Log List */}
      <div className="space-y-3">
        {db.parent_communications.length === 0 ? (
          <div className="bg-white dark:bg-slate-800/90 rounded-2xl border border-slate-200 dark:border-slate-700/80 p-12 text-center text-slate-400">
            <MessageSquareQuote className="w-12 h-12 mx-auto text-slate-400 mb-2 opacity-50" />
            <h3 className="text-base font-bold text-slate-800 dark:text-white">Belum Ada Riwayat Komunikasi</h3>
            <p className="text-xs text-slate-500">Klik tombol di atas untuk mencatat interaksi dengan orang tua siswa.</p>
          </div>
        ) : (
          db.parent_communications.map((c) => {
            const s = db.students.find(stu => stu.student_id === c.student_id);
            return (
              <div
                key={c.comm_id}
                className="bg-white dark:bg-slate-800/90 rounded-2xl border border-slate-200 dark:border-slate-700/80 p-5 shadow-sm space-y-3"
              >
                <div className="flex items-start justify-between">
                  <div className="flex items-center space-x-2.5">
                    <span className={`px-2.5 py-1 rounded-lg text-xs font-bold flex items-center space-x-1 ${
                      c.media === 'WhatsApp' ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/60 dark:text-emerald-200' :
                      c.media === 'Telepon' ? 'bg-blue-100 text-blue-800 dark:bg-blue-900/60 dark:text-blue-200' :
                      c.media === 'Pertemuan Sekolah' ? 'bg-purple-100 text-purple-800 dark:bg-purple-900/60 dark:text-purple-200' :
                      'bg-amber-100 text-amber-800 dark:bg-amber-900/60 dark:text-amber-200'
                    }`}>
                      {c.media === 'WhatsApp' && <MessageCircle className="w-3.5 h-3.5" />}
                      {c.media === 'Telepon' && <Phone className="w-3.5 h-3.5" />}
                      {c.media === 'Pertemuan Sekolah' && <Users className="w-3.5 h-3.5" />}
                      {c.media === 'Surat Resmi' && <Mail className="w-3.5 h-3.5" />}
                      <span>{c.media}</span>
                    </span>

                    <div>
                      <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                        {s?.full_name} <span className="font-normal text-slate-500">• Ortu: {c.parent_name}</span>
                      </h3>
                      <p className="text-[11px] text-slate-400 font-mono">ID: {c.student_id} • Tanggal: {c.date}</p>
                    </div>
                  </div>

                  <button
                    onClick={() => setDeleteTarget({
                      id: c.comm_id,
                      name: `Komunikasi ${c.media} (${s?.full_name || c.student_id} - ${c.parent_name})`
                    })}
                    className="text-slate-400 hover:text-rose-600 p-1 cursor-pointer"
                    title="Hapus Log Komunikasi"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-xs bg-slate-50 dark:bg-slate-900 p-3 rounded-xl border border-slate-200 dark:border-slate-700">
                  <div>
                    <strong className="text-slate-400 block mb-0.5">Topik / Bahasan:</strong>
                    <p className="font-semibold text-slate-800 dark:text-slate-200">{c.topic}</p>
                  </div>
                  <div>
                    <strong className="text-slate-400 block mb-0.5">Hasil Pembicaraan:</strong>
                    <p className="text-slate-700 dark:text-slate-300">{c.result}</p>
                  </div>
                  <div>
                    <strong className="text-slate-400 block mb-0.5">Tindak Lanjut Bersama:</strong>
                    <p className="text-slate-700 dark:text-slate-300">{c.follow_up}</p>
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Modal Add Communication */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/80 backdrop-blur-sm flex items-center justify-center p-3">
          <div className="bg-white dark:bg-slate-900 rounded-2xl max-w-lg w-full p-6 shadow-2xl border border-slate-200 dark:border-slate-800 space-y-4 text-xs">
            <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-3">
              <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center space-x-2">
                <MessageSquareQuote className="w-4 h-4 text-emerald-600" />
                <span>Pencatatan Log Komunikasi Orang Tua</span>
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
                  onChange={(e) => handleStudentSelect(e.target.value)}
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
                  <label className="block font-semibold mb-1">Nama Orang Tua / Wali:</label>
                  <input
                    type="text"
                    required
                    placeholder="Nama Orang Tua"
                    value={parentName}
                    onChange={(e) => setParentName(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-900 dark:text-white"
                  />
                </div>
                <div>
                  <label className="block font-semibold mb-1">Media Komunikasi:</label>
                  <select
                    value={media}
                    onChange={(e) => setMedia(e.target.value as any)}
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-900 dark:text-white cursor-pointer"
                  >
                    <option value="WhatsApp">WhatsApp / Chat</option>
                    <option value="Telepon">Telepon Suara</option>
                    <option value="Pertemuan Sekolah">Pertemuan di Sekolah</option>
                    <option value="Surat Resmi">Surat Resmi Pemanggilan</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block font-semibold mb-1">Tanggal Komunikasi:</label>
                <input
                  type="date"
                  value={date}
                  onChange={(e) => setDate(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-900 dark:text-white"
                />
              </div>

              <div>
                <label className="block font-semibold mb-1">Topik / Bahasan:</label>
                <input
                  type="text"
                  required
                  placeholder="Contoh: Konfirmasi ketidakhadiran 2 hari berturut-turut"
                  value={topic}
                  onChange={(e) => setTopic(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-900 dark:text-white"
                />
              </div>

              <div>
                <label className="block font-semibold mb-1">Hasil Komunikasi:</label>
                <textarea
                  rows={2}
                  required
                  placeholder="Orang tua mengonfirmasi bahwa siswa sedang sakit dan surat dokter akan disusulkan..."
                  value={result}
                  onChange={(e) => setResult(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-900 dark:text-white"
                />
              </div>

              <div>
                <label className="block font-semibold mb-1">Rencana Tindak Lanjut:</label>
                <input
                  type="text"
                  placeholder="Contoh: Menunggu penyerahan surat keterangan dokter besok pagi"
                  value={followUp}
                  onChange={(e) => setFollowUp(e.target.value)}
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
                  className="px-5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl shadow cursor-pointer"
                >
                  Simpan Log Komunikasi
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Confirmation Modal */}
      <ConfirmModal
        isOpen={!!deleteTarget}
        title="Konfirmasi Hapus Log Komunikasi"
        message={`Apakah Anda yakin ingin menghapus catatan ${deleteTarget?.name}? Data yang dihapus tidak dapat dipulihkan.`}
        confirmText="Ya, Hapus"
        cancelText="Batal"
        type="danger"
        isProcessing={isDeleting}
        onConfirm={async () => {
          if (!deleteTarget) return;
          setIsDeleting(true);
          try {
            await deleteParentCommunication(deleteTarget.id);
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
