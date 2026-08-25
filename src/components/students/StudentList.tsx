import React, { useState, useMemo } from 'react';
import { useDatabase } from '../../context/DatabaseContext';
import { StudentFullData, WarningLevel, StudentStatus } from '../../types';
import { 
  Users, 
  Search, 
  Filter, 
  Plus, 
  ArrowUpRight, 
  Download, 
  Trash2, 
  Edit, 
  Eye, 
  AlertTriangle, 
  CheckCircle2, 
  Sparkles,
  GraduationCap,
  FileSpreadsheet,
  LayoutGrid,
  List,
  Phone,
  MapPin,
  User
} from 'lucide-react';
import { exportFullWorkbook } from '../../utils/excel';
import { ConfirmModal } from '../common/ConfirmModal';

interface StudentListProps {
  onSelectStudent: (studentId: string) => void;
  onOpenAddModal: () => void;
  onOpenEditModal: (studentId: string) => void;
  onOpenPromotionModal: (selectedStudentIds: string[]) => void;
  onOpenImport?: () => void;
}

export const StudentList: React.FC<StudentListProps> = ({
  onSelectStudent,
  onOpenAddModal,
  onOpenEditModal,
  onOpenPromotionModal,
  onOpenImport,
}) => {
  const { db, allStudentsFullData, deleteStudent, deleteMultipleStudents, activeClass, activeAcademicYear } = useDatabase();
  
  const [searchTerm, setSearchTerm] = useState('');
  const [filterGender, setFilterGender] = useState<string>('all');
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [filterWarning, setFilterWarning] = useState<string>('all');
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [viewMode, setViewMode] = useState<'table' | 'cards'>('table');
  
  const [deleteTarget, setDeleteTarget] = useState<{ id: string; name: string; isBatch?: boolean } | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  // Filter logic
  const filteredStudents = useMemo(() => {
    return allStudentsFullData.filter(d => {
      const s = d.student;
      const p = d.parent;
      const searchLower = searchTerm.toLowerCase();

      const matchSearch = 
        s.full_name.toLowerCase().includes(searchLower) ||
        s.student_id.toLowerCase().includes(searchLower) ||
        (s.nis && s.nis.includes(searchLower)) ||
        (s.nisn && s.nisn.includes(searchLower)) ||
        (p?.father_name && p.father_name.toLowerCase().includes(searchLower)) ||
        (p?.mother_name && p.mother_name.toLowerCase().includes(searchLower));

      const matchGender = filterGender === 'all' || s.gender === filterGender;
      const matchStatus = filterStatus === 'all' || s.status === filterStatus;
      const matchWarning = filterWarning === 'all' || d.warning_level === filterWarning;

      return matchSearch && matchGender && matchStatus && matchWarning;
    });
  }, [allStudentsFullData, searchTerm, filterGender, filterStatus, filterWarning]);

  const handleSelectAll = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.checked) {
      setSelectedIds(filteredStudents.map(s => s.student.student_id));
    } else {
      setSelectedIds([]);
    }
  };

  const toggleSelectOne = (studentId: string) => {
    setSelectedIds(prev => 
      prev.includes(studentId) ? prev.filter(id => id !== studentId) : [...prev, studentId]
    );
  };

  const handleDeleteConfirm = (studentId: string, name: string) => {
    setDeleteTarget({ id: studentId, name, isBatch: false });
  };

  const handleBatchDeleteConfirm = () => {
    setDeleteTarget({ id: 'batch', name: `${selectedIds.length} siswa terpilih`, isBatch: true });
  };

  const executeDelete = async () => {
    if (!deleteTarget) return;
    setIsDeleting(true);
    try {
      if (deleteTarget.isBatch) {
        await deleteMultipleStudents(selectedIds);
        setSelectedIds([]);
      } else {
        await deleteStudent(deleteTarget.id);
        setSelectedIds(prev => prev.filter(id => id !== deleteTarget.id));
      }
    } finally {
      setIsDeleting(false);
      setDeleteTarget(null);
    }
  };

  return (
    <div className="space-y-4">
      {/* Header Controls */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 bg-white p-4 sm:p-5 rounded-2xl border border-zinc-200/90 shadow-xs">
        <div>
          <h2 className="text-sm sm:text-base font-bold text-zinc-900 flex items-center space-x-2">
            <Users className="w-5 h-5 text-blue-600 flex-shrink-0" />
            <span>Database Siswa Kelas {activeClass?.class_name}</span>
          </h2>
          <p className="text-xs text-zinc-500 mt-0.5">
            Total {filteredStudents.length} dari {allStudentsFullData.length} siswa terdaftar • Student ID terverifikasi
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {selectedIds.length > 0 && (
            <>
              <button
                id="btn-mass-promotion"
                onClick={() => onOpenPromotionModal(selectedIds)}
                className="bg-purple-600 hover:bg-purple-700 text-white px-3.5 py-2 rounded-xl text-xs font-bold transition flex items-center space-x-1.5 shadow-xs cursor-pointer min-h-[38px]"
              >
                <GraduationCap className="w-4 h-4" />
                <span>Naik Kelas ({selectedIds.length})</span>
              </button>

              <button
                id="btn-mass-delete"
                onClick={handleBatchDeleteConfirm}
                className="bg-red-50 hover:bg-red-100 text-red-700 border border-red-200 px-3.5 py-2 rounded-xl text-xs font-bold transition flex items-center space-x-1.5 shadow-xs cursor-pointer min-h-[38px]"
              >
                <Trash2 className="w-4 h-4 text-red-600" />
                <span>Hapus ({selectedIds.length})</span>
              </button>
            </>
          )}

          {onOpenImport && (
            <button
              id="btn-open-import-wizard"
              onClick={onOpenImport}
              className="bg-blue-50 hover:bg-blue-100 text-blue-700 border border-blue-200 px-3.5 py-2 rounded-xl text-xs font-bold transition flex items-center space-x-1.5 shadow-xs cursor-pointer min-h-[38px]"
            >
              <FileSpreadsheet className="w-4 h-4 text-blue-600" />
              <span>Impor Spreadsheet</span>
            </button>
          )}

          <button
            id="btn-export-excel-db"
            onClick={() => exportFullWorkbook(db)}
            className="bg-emerald-600 hover:bg-emerald-700 text-white px-3.5 py-2 rounded-xl text-xs font-bold transition flex items-center space-x-1.5 shadow-xs cursor-pointer min-h-[38px]"
          >
            <FileSpreadsheet className="w-4 h-4" />
            <span>Export Excel</span>
          </button>

          <button
            id="btn-add-student"
            onClick={onOpenAddModal}
            className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-xl text-xs font-bold transition flex items-center space-x-1.5 shadow-xs cursor-pointer min-h-[38px]"
          >
            <Plus className="w-4 h-4" />
            <span>Tambah Siswa</span>
          </button>

          {/* Responsive Layout Toggle */}
          <div className="hidden sm:flex items-center bg-zinc-100 p-1 rounded-xl border border-zinc-200">
            <button
              onClick={() => setViewMode('table')}
              title="Tampilan Tabel"
              className={`p-1.5 rounded-lg text-xs cursor-pointer transition ${
                viewMode === 'table' ? 'bg-white shadow-xs text-blue-600 font-bold' : 'text-zinc-500 hover:text-zinc-800'
              }`}
            >
              <List className="w-4 h-4" />
            </button>
            <button
              onClick={() => setViewMode('cards')}
              title="Tampilan Bento Cards"
              className={`p-1.5 rounded-lg text-xs cursor-pointer transition ${
                viewMode === 'cards' ? 'bg-white shadow-xs text-blue-600 font-bold' : 'text-zinc-500 hover:text-zinc-800'
              }`}
            >
              <LayoutGrid className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* Search & Filter Toolbar */}
      <div className="bg-white p-4 rounded-2xl border border-zinc-200/90 shadow-xs space-y-3">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2.5">
          {/* Search bar */}
          <div className="relative sm:col-span-2">
            <Search className="w-4 h-4 text-zinc-400 absolute left-3 top-2.5" />
            <input
              id="input-search-students"
              type="text"
              placeholder="Cari ID Siswa, Nama, NIS, NISN, Orang Tua..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-9 pr-3 py-2 text-xs bg-zinc-50 border border-zinc-200 rounded-xl text-zinc-900 placeholder-zinc-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white min-h-[38px]"
            />
          </div>

          {/* Gender Filter */}
          <div>
            <select
              id="select-filter-gender"
              aria-label="Filter Jenis Kelamin"
              value={filterGender}
              onChange={(e) => setFilterGender(e.target.value)}
              className="w-full px-3 py-2 text-xs bg-zinc-50 border border-zinc-200 rounded-xl text-zinc-800 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white cursor-pointer min-h-[38px]"
            >
              <option value="all">Semua Jenis Kelamin (L/P)</option>
              <option value="L">Laki-laki (L)</option>
              <option value="P">Perempuan (P)</option>
            </select>
          </div>

          {/* Early Warning Filter */}
          <div>
            <select
              id="select-filter-warning"
              aria-label="Filter Status Early Warning"
              value={filterWarning}
              onChange={(e) => setFilterWarning(e.target.value)}
              className="w-full px-3 py-2 text-xs bg-zinc-50 border border-zinc-200 rounded-xl text-zinc-800 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white cursor-pointer min-h-[38px]"
            >
              <option value="all">Semua Status Early Warning</option>
              <option value="Normal">🟢 Normal (Tertib)</option>
              <option value="Perlu Perhatian">🟡 Perlu Perhatian</option>
              <option value="Prioritas Tinggi">🔴 Prioritas Tinggi</option>
            </select>
          </div>
        </div>
      </div>

      {/* MOBILE-ADAPTIVE VIEW: Cards for Mobile & when viewMode is cards */}
      <div className={`${viewMode === 'cards' ? 'grid' : 'grid md:hidden'} grid-cols-1 sm:grid-cols-2 gap-3`}>
        {filteredStudents.length === 0 ? (
          <div className="col-span-full bg-white p-8 rounded-2xl border border-zinc-200 text-center text-zinc-400">
            Tidak ada data siswa yang cocok dengan pencarian atau filter.
          </div>
        ) : (
          filteredStudents.map((d) => {
            const s = d.student;
            const p = d.parent;
            const att = d.attendance_summary;
            const disc = d.discipline_score;
            const isSelected = selectedIds.includes(s.student_id);

            return (
              <div 
                key={s.student_id}
                className={`bg-white p-4 rounded-2xl border transition shadow-xs flex flex-col justify-between space-y-3 ${
                  isSelected ? 'border-blue-500 bg-blue-50/20' : 'border-zinc-200/90 hover:border-zinc-300'
                }`}
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-start space-x-2.5">
                    <input
                      type="checkbox"
                      aria-label={`Pilih ${s.full_name}`}
                      checked={isSelected}
                      onChange={() => toggleSelectOne(s.student_id)}
                      className="rounded border-zinc-300 text-blue-600 focus:ring-blue-500 cursor-pointer mt-1"
                    />
                    <div>
                      <button
                        onClick={() => onSelectStudent(s.student_id)}
                        className="font-bold text-sm text-zinc-900 hover:text-blue-600 text-left transition cursor-pointer leading-tight"
                      >
                        {s.full_name}
                      </button>
                      <div className="text-[11px] text-zinc-400 font-mono mt-0.5">
                        {s.student_id} • NIS: {s.nis || '-'}
                      </div>
                    </div>
                  </div>

                  <span className={`px-2 py-0.5 rounded-md font-bold text-[10px] flex-shrink-0 ${
                    s.gender === 'L' ? 'bg-sky-100 text-sky-800' : 'bg-pink-100 text-pink-800'
                  }`}>
                    {s.gender === 'L' ? 'L' : 'P'}
                  </span>
                </div>

                {/* Info row */}
                <div className="grid grid-cols-2 gap-2 text-xs bg-zinc-50 p-2.5 rounded-xl border border-zinc-100">
                  <div>
                    <span className="text-[10px] text-zinc-400 block font-semibold">Kehadiran:</span>
                    <strong className="text-zinc-800">{att.attendance_rate}%</strong>
                    <span className="text-[10px] text-zinc-400 block">H:{att.hadir} A:{att.alpa}</span>
                  </div>
                  <div>
                    <span className="text-[10px] text-zinc-400 block font-semibold">Disiplin:</span>
                    <strong className="text-blue-600">{disc.score}/100</strong>
                    <span className="text-[10px] text-zinc-500 block truncate">{disc.category}</span>
                  </div>
                </div>

                {/* Parents info */}
                <div className="text-[11px] text-zinc-500 space-y-0.5">
                  <div className="flex items-center space-x-1.5 truncate">
                    <User className="w-3 h-3 text-zinc-400 flex-shrink-0" />
                    <span className="truncate">Ayah: {p?.father_name || '-'}</span>
                  </div>
                  {p?.parent_phone && (
                    <div className="flex items-center space-x-1.5 font-mono text-emerald-600">
                      <Phone className="w-3 h-3 flex-shrink-0" />
                      <span>{p.parent_phone}</span>
                    </div>
                  )}
                </div>

                {/* Footer status and actions */}
                <div className="flex items-center justify-between pt-2 border-t border-zinc-100">
                  <span className={`inline-flex items-center px-2 py-0.5 rounded-md text-[10px] font-bold ${
                    d.warning_level === 'Prioritas Tinggi'
                      ? 'bg-red-100 text-red-700'
                      : d.warning_level === 'Perlu Perhatian'
                      ? 'bg-amber-100 text-amber-700'
                      : 'bg-emerald-100 text-emerald-700'
                  }`}>
                    {d.warning_level}
                  </span>

                  <div className="flex items-center space-x-1">
                    <button
                      onClick={() => onSelectStudent(s.student_id)}
                      className="p-1.5 bg-zinc-100 hover:bg-zinc-200 text-zinc-700 hover:text-blue-600 rounded-lg text-xs font-semibold cursor-pointer"
                    >
                      <Eye className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={() => onOpenEditModal(s.student_id)}
                      className="p-1.5 bg-zinc-100 hover:bg-zinc-200 text-zinc-700 hover:text-amber-600 rounded-lg text-xs font-semibold cursor-pointer"
                    >
                      <Edit className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={() => handleDeleteConfirm(s.student_id, s.full_name)}
                      className="p-1.5 bg-red-50 hover:bg-red-100 text-red-600 rounded-lg text-xs font-semibold cursor-pointer"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* DESKTOP & TABLET TABLE VIEW */}
      <div className={`${viewMode === 'cards' ? 'hidden' : 'hidden md:block'} bg-white rounded-2xl border border-zinc-200/90 shadow-xs overflow-hidden`}>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-zinc-700 min-w-[700px]">
            <thead className="bg-zinc-50 text-[10px] font-bold text-zinc-400 uppercase tracking-wider border-b border-zinc-100">
              <tr>
                <th className="p-3 w-10 text-center">
                  <input
                    type="checkbox"
                    aria-label="Pilih semua siswa"
                    checked={filteredStudents.length > 0 && selectedIds.length === filteredStudents.length}
                    onChange={handleSelectAll}
                    className="rounded border-zinc-300 text-blue-600 focus:ring-blue-500 cursor-pointer"
                  />
                </th>
                <th className="p-3 font-semibold">Student ID & NIS</th>
                <th className="p-3 font-semibold">Nama Lengkap & Orang Tua</th>
                <th className="p-3 font-semibold text-center">JK</th>
                <th className="p-3 font-semibold text-center">Kehadiran</th>
                <th className="p-3 font-semibold text-center">Indeks Disiplin</th>
                <th className="p-3 font-semibold text-center">Status / Warning</th>
                <th className="p-3 font-semibold text-right">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-100">
              {filteredStudents.length === 0 ? (
                <tr>
                  <td colSpan={8} className="p-8 text-center text-zinc-400">
                    Tidak ada data siswa yang cocok dengan pencarian atau filter.
                  </td>
                </tr>
              ) : (
                filteredStudents.map((d) => {
                  const s = d.student;
                  const p = d.parent;
                  const att = d.attendance_summary;
                  const disc = d.discipline_score;
                  const isSelected = selectedIds.includes(s.student_id);

                  return (
                    <tr
                      key={s.student_id}
                      className={`hover:bg-zinc-50/80 transition ${
                        isSelected ? 'bg-blue-50/50' : ''
                      }`}
                    >
                      <td className="p-3 text-center">
                        <input
                          type="checkbox"
                          aria-label={`Pilih siswa ${s.full_name}`}
                          checked={isSelected}
                          onChange={() => toggleSelectOne(s.student_id)}
                          className="rounded border-zinc-300 text-blue-600 focus:ring-blue-500 cursor-pointer"
                        />
                      </td>

                      <td className="p-3">
                        <div className="font-mono font-bold text-blue-600">
                          {s.student_id}
                        </div>
                        <div className="text-[11px] text-zinc-400">
                          NIS: {s.nis || '-'} • NISN: {s.nisn || '-'}
                        </div>
                      </td>

                      <td className="p-3">
                        <button
                          onClick={() => onSelectStudent(s.student_id)}
                          className="font-bold text-zinc-900 hover:text-blue-600 text-left transition cursor-pointer"
                        >
                          {s.full_name}
                        </button>
                        <div className="text-[11px] text-zinc-500">
                          Ayah: {p?.father_name || '-'} • HP Ortu: {p?.parent_phone || '-'}
                        </div>
                      </td>

                      <td className="p-3 text-center">
                        <span className={`px-2 py-0.5 rounded-md font-bold text-[10px] ${
                          s.gender === 'L' 
                            ? 'bg-sky-100 text-sky-800' 
                            : 'bg-pink-100 text-pink-800'
                        }`}>
                          {s.gender}
                        </span>
                      </td>

                      <td className="p-3 text-center">
                        <div className="font-bold text-zinc-900">
                          {att.attendance_rate}%
                        </div>
                        <div className="text-[10px] text-zinc-400">
                          H:{att.hadir} S:{att.sakit} I:{att.izin} A:{att.alpa} T:{att.terlambat}
                        </div>
                      </td>

                      <td className="p-3 text-center">
                        <div className="font-bold text-blue-600">
                          {disc.score} <span className="text-[10px] text-zinc-400 font-normal">/ 100</span>
                        </div>
                        <div className="text-[10px] text-zinc-400 font-medium">
                          {disc.category}
                        </div>
                      </td>

                      <td className="p-3 text-center">
                        <span className={`inline-flex items-center px-2 py-0.5 rounded-md text-[10px] font-bold ${
                          d.warning_level === 'Prioritas Tinggi'
                            ? 'bg-red-100 text-red-700'
                            : d.warning_level === 'Perlu Perhatian'
                            ? 'bg-amber-100 text-amber-700'
                            : 'bg-emerald-100 text-emerald-700'
                        }`}>
                          {d.warning_level === 'Prioritas Tinggi' && <span className="w-1.5 h-1.5 rounded-full bg-red-600 mr-1 animate-pulse"></span>}
                          {d.warning_level}
                        </span>
                      </td>

                      <td className="p-3 text-right">
                        <div className="flex items-center justify-end space-x-1.5">
                          <button
                            id={`btn-view-${s.student_id}`}
                            onClick={() => onSelectStudent(s.student_id)}
                            title="Buka Profil Lengkap"
                            className="p-1.5 bg-zinc-100 text-zinc-600 hover:text-blue-600 hover:bg-zinc-200 rounded-lg transition cursor-pointer min-h-[32px] min-w-[32px] flex items-center justify-center"
                          >
                            <Eye className="w-3.5 h-3.5" />
                          </button>

                          <button
                            id={`btn-edit-${s.student_id}`}
                            onClick={() => onOpenEditModal(s.student_id)}
                            title="Edit Data Siswa & Ortu"
                            className="p-1.5 bg-zinc-100 text-zinc-600 hover:text-amber-600 hover:bg-zinc-200 rounded-lg transition cursor-pointer min-h-[32px] min-w-[32px] flex items-center justify-center"
                          >
                            <Edit className="w-3.5 h-3.5" />
                          </button>

                          <button
                            id={`btn-del-${s.student_id}`}
                            onClick={() => handleDeleteConfirm(s.student_id, s.full_name)}
                            title="Hapus Siswa"
                            className="p-1.5 bg-red-50 text-red-600 hover:bg-red-100 rounded-lg transition cursor-pointer min-h-[32px] min-w-[32px] flex items-center justify-center"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Confirmation Modal */}
      <ConfirmModal
        isOpen={!!deleteTarget}
        title={deleteTarget?.isBatch ? 'Konfirmasi Hapus Massal Siswa' : 'Konfirmasi Hapus Data Siswa'}
        message={
          deleteTarget?.isBatch
            ? `PERINGATAN: Anda akan menghapus ${deleteTarget?.name} beserta seluruh riwayat presensi, pelanggaran, catatan, prestasi, dan home visit terkait. Tindakan ini tidak dapat dibatalkan.`
            : `PERINGATAN: Anda yakin ingin menghapus data siswa "${deleteTarget?.name}" (${deleteTarget?.id}) beserta seluruh riwayat presensi, pelanggaran, catatan, prestasi, dan home visit? Tindakan ini tidak dapat dibatalkan.`
        }
        confirmText={deleteTarget?.isBatch ? 'Hapus Siswa Terpilih' : 'Ya, Hapus Siswa'}
        cancelText="Batal"
        type="danger"
        isProcessing={isDeleting}
        onConfirm={executeDelete}
        onClose={() => !isDeleting && setDeleteTarget(null)}
      />
    </div>
  );
};
