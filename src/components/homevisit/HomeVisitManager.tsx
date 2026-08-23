import React, { useState } from 'react';
import { useDatabase } from '../../context/DatabaseContext';
import { HomeVisitRecord } from '../../types';
import { Home, Plus, MapPin, Users, Calendar, CheckCircle2, Trash2, X, Save, FileText } from 'lucide-react';

export const HomeVisitManager: React.FC = () => {
  const { db, addHomeVisit, deleteHomeVisit, allStudentsFullData, activeClass, activeAcademicYear } = useDatabase();

  const [showAddModal, setShowAddModal] = useState(false);
  const [studentId, setStudentId] = useState(allStudentsFullData[0]?.student.student_id || '');
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [reason, setReason] = useState('');
  const [metParties, setMetParties] = useState('');
  const [address, setAddress] = useState('');
  const [result, setResult] = useState('');
  const [agreement, setAgreement] = useState('');
  const [followUp, setFollowUp] = useState('');
  const [documentation, setDocumentation] = useState('');

  const handleOpenAdd = (presetStudentId?: string) => {
    const sid = presetStudentId || allStudentsFullData[0]?.student.student_id || '';
    setStudentId(sid);
    const stu = allStudentsFullData.find(s => s.student.student_id === sid);
    if (stu?.address) {
      setAddress(stu.address.full_address || '');
    }
    if (stu?.parent) {
      setMetParties(`Orang tua: ${stu.parent.father_name || ''} & ${stu.parent.mother_name || ''}`);
    }
    setShowAddModal(true);
  };

  const handleStudentSelect = (sid: string) => {
    setStudentId(sid);
    const stu = allStudentsFullData.find(s => s.student.student_id === sid);
    if (stu?.address) {
      setAddress(stu.address.full_address || '');
    }
    if (stu?.parent) {
      setMetParties(`Orang tua: ${stu.parent.father_name || ''} & ${stu.parent.mother_name || ''}`);
    }
  };

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    if (!reason.trim() || !result.trim()) {
      alert('Alasan dan hasil kunjungan rumah wajib diisi.');
      return;
    }

    addHomeVisit({
      student_id: studentId,
      class_id: activeClass?.class_id || db.classes[0]?.class_id || '',
      academic_year_id: activeAcademicYear?.academic_year_id || db.academic_years[0]?.academic_year_id || '',
      date,
      reason: reason.trim(),
      met_parties: metParties.trim() || 'Kedua Orang Tua',
      address: address.trim(),
      result: result.trim(),
      agreement: agreement.trim(),
      follow_up: followUp.trim() || 'Pemantauan perkembangan kehadiran di kelas',
      documentation: documentation.trim(),
    });

    setShowAddModal(false);
    setReason('');
    setResult('');
    setAgreement('');
    setFollowUp('');
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white dark:bg-slate-800/90 p-4 rounded-2xl border border-slate-200 dark:border-slate-700/80 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-lg font-bold text-slate-900 dark:text-white flex items-center space-x-2">
            <Home className="w-5 h-5 text-indigo-600" />
            <span>Dokumentasi Kunjungan Rumah (Home Visit)</span>
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Pencatatan resmi kunjungan wali kelas ke kediaman siswa, hasil observasi keluarga, dan komitmen bersama
          </p>
        </div>

        <button
          id="btn-add-home-visit"
          onClick={() => handleOpenAdd()}
          className="bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-xl text-xs font-bold transition flex items-center space-x-1.5 shadow-sm cursor-pointer"
        >
          <Plus className="w-4 h-4" />
          <span>Buat Laporan Home Visit</span>
        </button>
      </div>

      {/* Visits List */}
      <div className="space-y-4">
        {db.home_visits.length === 0 ? (
          <div className="bg-white dark:bg-slate-800/90 rounded-2xl border border-slate-200 dark:border-slate-700/80 p-12 text-center text-slate-400">
            <Home className="w-12 h-12 mx-auto text-slate-400 mb-2 opacity-50" />
            <h3 className="text-base font-bold text-slate-800 dark:text-white">Belum Ada Catatan Home Visit</h3>
            <p className="text-xs text-slate-500">Klik tombol di atas untuk mendokumentasikan kunjungan rumah siswa.</p>
          </div>
        ) : (
          db.home_visits.map((hv) => {
            const student = db.students.find(s => s.student_id === hv.student_id);
            return (
              <div
                key={hv.visit_id}
                className="bg-white dark:bg-slate-800/90 rounded-2xl border border-slate-200 dark:border-slate-700/80 p-6 shadow-sm space-y-4"
              >
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 dark:border-slate-700 pb-3">
                  <div className="flex items-center space-x-3">
                    <div className="w-10 h-10 rounded-xl bg-indigo-50 dark:bg-indigo-950/50 flex items-center justify-center text-indigo-600 font-bold text-base">
                      🏡
                    </div>
                    <div>
                      <h3 className="text-base font-bold text-slate-900 dark:text-white">
                        {student?.full_name || hv.student_id}
                      </h3>
                      <div className="flex items-center space-x-2 text-xs text-slate-400">
                        <span>ID: {hv.student_id}</span>
                        <span>•</span>
                        <span>Tanggal Kunjungan: {hv.date}</span>
                      </div>
                    </div>
                  </div>

                  <button
                    onClick={() => {
                      if (window.confirm('Hapus dokumen home visit ini?')) {
                        deleteHomeVisit(hv.visit_id);
                      }
                    }}
                    className="text-slate-400 hover:text-rose-600 p-1 self-end sm:self-auto cursor-pointer"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
                  <div className="space-y-2 bg-slate-50 dark:bg-slate-900 p-4 rounded-xl border border-slate-200 dark:border-slate-700">
                    <p><strong className="text-slate-500">Alasan Kunjungan:</strong> {hv.reason}</p>
                    <p><strong className="text-slate-500">Pihak yang Ditemui:</strong> {hv.met_parties}</p>
                    <p><strong className="text-slate-500">Lokasi / Alamat:</strong> {hv.address}</p>
                  </div>

                  <div className="space-y-2 bg-slate-50 dark:bg-slate-900 p-4 rounded-xl border border-slate-200 dark:border-slate-700">
                    <p><strong className="text-slate-500">Hasil Pertemuan:</strong> {hv.result}</p>
                    <p><strong className="text-slate-500">Kesepakatan & Komitmen:</strong> {hv.agreement}</p>
                    <p><strong className="text-slate-500">Rencana Tindak Lanjut:</strong> {hv.follow_up}</p>
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Modal: Add Home Visit */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/80 backdrop-blur-sm flex items-center justify-center p-3">
          <div className="bg-white dark:bg-slate-900 rounded-2xl max-w-xl w-full p-6 shadow-2xl border border-slate-200 dark:border-slate-800 space-y-4 text-xs">
            <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-3">
              <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center space-x-2">
                <Home className="w-4 h-4 text-indigo-600" />
                <span>Formulir Berita Acara Home Visit</span>
              </h3>
              <button onClick={() => setShowAddModal(false)} className="text-slate-400 hover:text-white cursor-pointer">
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSave} className="space-y-3">
              <div>
                <label className="block font-semibold mb-1">Pilih Siswa yang Dikunjungi:</label>
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
                  <label className="block font-semibold mb-1">Tanggal Kunjungan:</label>
                  <input
                    type="date"
                    value={date}
                    onChange={(e) => setDate(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-900 dark:text-white"
                  />
                </div>
                <div>
                  <label className="block font-semibold mb-1">Pihak yang Ditemui:</label>
                  <input
                    type="text"
                    value={metParties}
                    onChange={(e) => setMetParties(e.target.value)}
                    placeholder="Contoh: Kedua Orang Tua / Ibu Kandung"
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-900 dark:text-white"
                  />
                </div>
              </div>

              <div>
                <label className="block font-semibold mb-1">Alamat Tempat Tinggal yang Dikunjungi:</label>
                <input
                  type="text"
                  value={address}
                  onChange={(e) => setAddress(e.target.value)}
                  placeholder="Kp. Sukaluyu RT 02 / RW 05..."
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-900 dark:text-white"
                />
              </div>

              <div>
                <label className="block font-semibold mb-1">Alasan Kunjungan:</label>
                <input
                  type="text"
                  required
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  placeholder="Contoh: Alpa 3 hari berturut-turut & tidak ada kabar"
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-900 dark:text-white"
                />
              </div>

              <div>
                <label className="block font-semibold mb-1">Hasil Observasi & Wawancara:</label>
                <textarea
                  rows={2}
                  required
                  value={result}
                  onChange={(e) => setResult(e.target.value)}
                  placeholder="Kondisi ekonomi keluarga, kendala siswa tidak masuk..."
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-900 dark:text-white"
                />
              </div>

              <div>
                <label className="block font-semibold mb-1">Kesepakatan dengan Orang Tua:</label>
                <input
                  type="text"
                  value={agreement}
                  onChange={(e) => setAgreement(e.target.value)}
                  placeholder="Orang tua berjanji memantau keberangkatan sekolah setiap pagi..."
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-900 dark:text-white"
                />
              </div>

              <div>
                <label className="block font-semibold mb-1">Tindak Lanjut Wali Kelas:</label>
                <input
                  type="text"
                  value={followUp}
                  onChange={(e) => setFollowUp(e.target.value)}
                  placeholder="Pemantauan absensi harian dan koordinasi via WhatsApp"
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
                  className="px-5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl shadow cursor-pointer"
                >
                  Simpan Home Visit
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
