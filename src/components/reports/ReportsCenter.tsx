import React, { useState } from 'react';
import { useDatabase } from '../../context/DatabaseContext';
import { 
  FileText, 
  FileSpreadsheet, 
  Download, 
  Printer, 
  CheckCircle2, 
  Sparkles,
  Users,
  ShieldAlert,
  CalendarCheck
} from 'lucide-react';
import { generateStudentReportPDF, generateClassRecapPDF } from '../../utils/pdf';
import { exportFullWorkbook, exportClassRecapExcel } from '../../utils/excel';

export const ReportsCenter: React.FC = () => {
  const { db, allStudentsFullData, activeClass, activeAcademicYear, showToast } = useDatabase();

  const [selectedStudentId, setSelectedStudentId] = useState(allStudentsFullData[0]?.student.student_id || '');

  const handlePrintIndividualPDF = () => {
    const studentData = allStudentsFullData.find(s => s.student.student_id === selectedStudentId);
    if (!studentData) {
      showToast('error', 'Pilih siswa terlebih dahulu.');
      return;
    }
    try {
      generateStudentReportPDF(studentData, db.school_settings, db);
      showToast('success', `PDF Rapor ${studentData.student.full_name} berhasil dibuat.`);
    } catch (err: any) {
      console.error('PDF generation failed:', err);
      showToast('error', 'Gagal membuat PDF rapor siswa. Silakan periksa data laporan.');
    }
  };

  const handlePrintClassPDF = () => {
    try {
      generateClassRecapPDF(
        allStudentsFullData,
        activeClass?.class_name || 'XI TKR B',
        activeAcademicYear?.year_name || '2026/2027',
        db.school_settings
      );
      showToast('success', `PDF Rekap Kelas ${activeClass?.class_name || ''} berhasil dibuat.`);
    } catch (err: any) {
      console.error('PDF generation failed:', err);
      showToast('error', 'Gagal membuat PDF rekap kelas. Silakan periksa data.');
    }
  };

  const handleExportFullExcel = () => {
    try {
      exportFullWorkbook(db);
      showToast('success', 'Master Database Workbook Excel berhasil diunduh.');
    } catch (err: any) {
      console.error('Excel export failed:', err);
      showToast('error', `Gagal mengekspor Excel: ${err.message}`);
    }
  };

  const handleExportClassRecapExcel = () => {
    try {
      exportClassRecapExcel(
        allStudentsFullData,
        activeClass?.class_name || 'XI TKR B',
        activeAcademicYear?.year_name || '2026/2027',
        db.school_settings
      );
      showToast('success', `Excel Rekap Kelas ${activeClass?.class_name || ''} berhasil diunduh.`);
    } catch (err: any) {
      console.error('Excel export failed:', err);
      showToast('error', `Gagal mengekspor Excel: ${err.message}`);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white dark:bg-slate-800/90 p-5 rounded-2xl border border-slate-200 dark:border-slate-700/80 shadow-sm">
        <div className="flex items-center space-x-3">
          <div className="w-10 h-10 rounded-xl bg-blue-600 flex items-center justify-center text-white font-bold">
            <FileText className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-lg font-bold text-slate-900 dark:text-white">
              Pusat Laporan, Arsip & Ekspor Administrasi
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Cetak laporan profil siswa, rekap presensi kelas, indeks kedisiplinan, dan ekspor multi-sheet Excel
            </p>
          </div>
        </div>
      </div>

      {/* Grid of Report Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* CARD 1: INDIVIDUAL STUDENT REPORT PDF */}
        <div className="bg-white dark:bg-slate-800/90 rounded-2xl border border-slate-200 dark:border-slate-700/80 p-6 shadow-sm flex flex-col justify-between space-y-4">
          <div className="space-y-3">
            <div className="flex items-center space-x-2.5">
              <div className="w-8 h-8 rounded-lg bg-rose-50 dark:bg-rose-950/40 text-rose-600 flex items-center justify-center font-bold">
                <FileText className="w-4 h-4" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                  Rapor Profil Individual Siswa (PDF)
                </h3>
                <p className="text-xs text-slate-400">
                  Kop surat resmi, biodata lengkap, rekap presensi, catatan pembinaan & tanda tangan
                </p>
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                Pilih Siswa yang Dicetak:
              </label>
              <select
                value={selectedStudentId}
                onChange={(e) => setSelectedStudentId(e.target.value)}
                className="w-full px-3 py-2 text-xs bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white font-semibold cursor-pointer"
              >
                {allStudentsFullData.map(s => (
                  <option key={s.student.student_id} value={s.student.student_id}>
                    {s.student.full_name} ({s.student.student_id}) - NIS: {s.student.nis || '-'}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <button
            id="btn-print-individual-report"
            onClick={handlePrintIndividualPDF}
            className="w-full py-2.5 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-xs font-bold transition flex items-center justify-center space-x-2 shadow-md cursor-pointer"
          >
            <Download className="w-4 h-4" />
            <span>Generate PDF Rapor Siswa</span>
          </button>
        </div>

        {/* CARD 2: CLASS RECAP REPORT PDF */}
        <div className="bg-white dark:bg-slate-800/90 rounded-2xl border border-slate-200 dark:border-slate-700/80 p-6 shadow-sm flex flex-col justify-between space-y-4">
          <div className="space-y-3">
            <div className="flex items-center space-x-2.5">
              <div className="w-8 h-8 rounded-lg bg-blue-50 dark:bg-blue-950/40 text-blue-600 flex items-center justify-center font-bold">
                <Users className="w-4 h-4" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                  Rekapitulasi Kelas Terpadu (PDF)
                </h3>
                <p className="text-xs text-slate-400">
                  Tabel rekapitulasi presensi, indeks kedisiplinan kelas {activeClass?.class_name}, dan tanda tangan
                </p>
              </div>
            </div>

            <div className="p-3 bg-slate-50 dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-700 text-xs text-slate-600 dark:text-slate-300">
              <p>• Total Siswa: <strong>{allStudentsFullData.length} Orang</strong></p>
              <p>• Kelas: <strong>{activeClass?.class_name} ({activeClass?.major})</strong></p>
              <p>• Tahun Ajaran: <strong>{activeAcademicYear?.year_name} ({activeAcademicYear?.semester})</strong></p>
            </div>
          </div>

          <button
            id="btn-print-class-recap-pdf"
            onClick={handlePrintClassPDF}
            className="w-full py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold transition flex items-center justify-center space-x-2 shadow-md cursor-pointer"
          >
            <Download className="w-4 h-4" />
            <span>Generate PDF Rekap Kelas</span>
          </button>
        </div>

        {/* CARD 3: CLASS RECAP EXCEL SPREADSHEET */}
        <div className="bg-white dark:bg-slate-800/90 rounded-2xl border border-slate-200 dark:border-slate-700/80 p-6 shadow-sm flex flex-col justify-between space-y-4">
          <div className="space-y-3">
            <div className="flex items-center space-x-2.5">
              <div className="w-8 h-8 rounded-lg bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 flex items-center justify-center font-bold">
                <FileSpreadsheet className="w-4 h-4" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                  Ekspor Lembar Rekap Kelas (Excel .xlsx)
                </h3>
                <p className="text-xs text-slate-400">
                  Tabel format spreadsheet berisi data presensi, indeks disiplin, dan kontak orang tua
                </p>
              </div>
            </div>

            <p className="text-xs text-slate-500">
              Cocok untuk arsip berkas dinas, pelaporan ke kepala sekolah, atau pengolahan nilai lanjutan di Microsoft Excel / Google Sheets.
            </p>
          </div>

          <button
            id="btn-export-class-excel"
            onClick={handleExportClassRecapExcel}
            className="w-full py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold transition flex items-center justify-center space-x-2 shadow-md cursor-pointer"
          >
            <Download className="w-4 h-4" />
            <span>Unduh Excel Rekap Kelas (.xlsx)</span>
          </button>
        </div>

        {/* CARD 4: FULL DATABASE WORKBOOK EXCEL */}
        <div className="bg-white dark:bg-slate-800/90 rounded-2xl border border-slate-200 dark:border-slate-700/80 p-6 shadow-sm flex flex-col justify-between space-y-4">
          <div className="space-y-3">
            <div className="flex items-center space-x-2.5">
              <div className="w-8 h-8 rounded-lg bg-purple-50 dark:bg-purple-950/40 text-purple-600 flex items-center justify-center font-bold">
                <FileSpreadsheet className="w-4 h-4" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                  Full Master Database Workbook (Multi-Sheet Excel)
                </h3>
                <p className="text-xs text-slate-400">
                  Ekspor lengkap seluruh tabel (Siswa, Presensi, Pelanggaran, Pembinaan, Home Visit, Prestasi, dsb.)
                </p>
              </div>
            </div>

            <p className="text-xs text-slate-500">
              Satu file Excel yang mencakup 7 sheet terpisah yang merepresentasikan relational database wali kelas secara menyeluruh.
            </p>
          </div>

          <button
            id="btn-export-full-workbook"
            onClick={handleExportFullExcel}
            className="w-full py-2.5 bg-purple-600 hover:bg-purple-700 text-white rounded-xl text-xs font-bold transition flex items-center justify-center space-x-2 shadow-md cursor-pointer"
          >
            <Download className="w-4 h-4" />
            <span>Unduh Full Master Workbook (.xlsx)</span>
          </button>
        </div>
      </div>
    </div>
  );
};
