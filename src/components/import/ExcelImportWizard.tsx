import React, { useState, useRef } from 'react';
import { useDatabase } from '../../context/DatabaseContext';
import { 
  FileSpreadsheet, 
  Upload, 
  CheckCircle2, 
  AlertTriangle, 
  Download, 
  RefreshCw, 
  ArrowRight, 
  ArrowLeft, 
  ShieldCheck, 
  Link2, 
  ClipboardPaste, 
  FileCheck2,
  Table,
  Sparkles,
  LogIn,
  Layers,
  UserCheck
} from 'lucide-react';
import { 
  parseExcelFile, 
  downloadExcelTemplate, 
  parseDelimitedText, 
  parseGoogleSheetMatrix,
  ColumnMapping, 
  ParsedImportRow 
} from '../../utils/excel';
import { googleSignIn } from '../../services/googleAuth';
import { fetchGoogleSpreadsheetValues } from '../../services/googleSheets';

interface ExcelImportWizardProps {
  onSuccessNavigate: () => void;
}

type WizardStep = 1 | 2 | 3 | 4;
type ImportSource = 'gsheet' | 'paste' | 'file';
type DuplicateStrategy = 'replace_all' | 'merge_update' | 'skip_duplicate';

export const ExcelImportWizard: React.FC<ExcelImportWizardProps> = ({ onSuccessNavigate }) => {
  const { db, batchImportStudents, replaceAllStudentsWithImport, activeClass, activeAcademicYear } = useDatabase();

  const [currentStep, setCurrentStep] = useState<WizardStep>(1);
  const [sourceType, setSourceType] = useState<ImportSource>('gsheet');
  
  // Google Sheets input state
  const [sheetUrl, setSheetUrl] = useState<string>(
    'https://docs.google.com/spreadsheets/d/1QbHbNJTOXmUlZvaOtaULkNNfw4Q6MVrV/edit?gid=635191688#gid=635191688'
  );
  const [pasteContent, setPasteContent] = useState<string>('');
  const [fileName, setFileName] = useState<string>('Google Spreadsheet Siswa');
  const [sourceInfo, setSourceInfo] = useState<string>('');

  // Parsed data
  const [rawHeaders, setRawHeaders] = useState<string[]>([]);
  const [mappingConfig, setMappingConfig] = useState<ColumnMapping>({
    nama: '',
    tempat_lahir: '',
    tgl_lahir: '',
    nis: '',
    nisn: '',
    jenis_kelamin: '',
    rt: '',
    rw: '',
    dusun: '',
    desa: '',
    alamat_lengkap: '',
    asal_sekolah: '',
    nama_ayah: '',
    nama_ibu: '',
    pekerjaan_ayah: '',
    pekerjaan_ibu: '',
    no_hp_ortu: '',
    no_hp_siswa: '',
    agama: '',
    nik: '',
  });
  const [parsedRows, setParsedRows] = useState<ParsedImportRow[]>([]);
  
  // Settings
  const [duplicateStrategy, setDuplicateStrategy] = useState<DuplicateStrategy>('replace_all');
  const [targetClassId, setTargetClassId] = useState<string>(activeClass?.class_id || db.classes[0]?.class_id || '');
  const [targetAyId, setTargetAyId] = useState<string>(activeAcademicYear?.academic_year_id || db.academic_years[0]?.academic_year_id || '');

  // Loading & Result
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [statusMessage, setStatusMessage] = useState<string>('');
  const [importResult, setImportResult] = useState<{
    total: number;
    created: number;
    updated: number;
    skipped: number;
  } | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);

  // Parse from Google Sheets via live OAuth or public CSV/gviz
  const handleFetchGoogleSheets = async () => {
    setIsLoading(true);
    setStatusMessage('Menghubungkan ke Google Spreadsheet...');

    try {
      // Extract sheet ID
      const sheetIdMatch = sheetUrl.match(/\/spreadsheets\/d\/([a-zA-Z0-9-_]+)/);
      const gidMatch = sheetUrl.match(/[#&?]gid=([0-9]+)/);
      
      const spreadsheetId = sheetIdMatch ? sheetIdMatch[1] : '1QbHbNJTOXmUlZvaOtaULkNNfw4Q6MVrV';
      const gid = gidMatch ? gidMatch[1] : '635191688';

      // 1. Try public direct CSV endpoint first
      const exportUrls = [
        `https://docs.google.com/spreadsheets/d/${spreadsheetId}/gviz/tq?tqx=out:csv&gid=${gid}`,
        `https://docs.google.com/spreadsheets/d/${spreadsheetId}/export?format=csv&gid=${gid}`,
      ];

      let csvText = '';
      for (const url of exportUrls) {
        try {
          const resp = await fetch(url);
          if (resp.ok) {
            const text = await resp.text();
            if (text && (text.includes(',') || text.includes('\t')) && !text.includes('<!DOCTYPE html>')) {
              csvText = text;
              break;
            }
          }
        } catch (e) {
          // ignore CORS and continue to OAuth
        }
      }

      if (csvText) {
        const result = parseDelimitedText(csvText, db.students);
        if (result.rows.length > 0) {
          setRawHeaders(result.headers);
          setMappingConfig(result.mapping);
          setParsedRows(result.rows);
          setFileName(`Google Sheet [${spreadsheetId.substring(0, 8)}...]`);
          setSourceInfo(`Sinkronisasi Google Sheets (${result.rows.length} siswa terbaca)`);
          setCurrentStep(2);
          setIsLoading(false);
          return;
        }
      }

      // 2. If direct CSV is private/restricted, trigger Google OAuth Sign-in Popup
      setStatusMessage('Meminta izin Google Sign-In...');
      const authRes = await googleSignIn();
      if (authRes.accessToken) {
        setStatusMessage('Mengambil baris dari Google Sheets API...');
        const matrix = await fetchGoogleSpreadsheetValues(spreadsheetId, 'A1:Z100', authRes.accessToken);
        if (matrix && matrix.length > 0) {
          const result = parseGoogleSheetMatrix(matrix, db.students);
          setRawHeaders(result.headers);
          setMappingConfig(result.mapping);
          setParsedRows(result.rows);
          setFileName(`Google Sheet [${authRes.user.displayName || 'Akun Google'}]`);
          setSourceInfo(`Terhubung via Google API (${result.rows.length} siswa terbaca)`);
          setCurrentStep(2);
          setIsLoading(false);
          return;
        }
      }

      throw new Error('Tidak dapat membaca baris data spreadsheet. Silakan gunakan opsi Salin & Tempel.');
    } catch (err: any) {
      console.warn('Google sheets direct fetch info:', err);
      // Seamlessly switch to paste tab with helpful instruction
      setSourceType('paste');
      setStatusMessage('');
      alert(
        `Tips Akses:\nJika Google Sheets Anda dalam mode internal/terproteksi, Anda dapat langsung memilih seluruh tabel di spreadsheet (Ctrl+A / Cmd+A), salin (Ctrl+C), lalu tempelkan di kotak Tempel di bawah ini untuk pemrosesan 1 detik!`
      );
    } finally {
      setIsLoading(false);
    }
  };

  // Parse pasted TSV/CSV content
  const handleParsePastedContent = () => {
    if (!pasteContent.trim()) {
      alert('Silakan tempel (paste) data dari spreadsheet terlebih dahulu.');
      return;
    }

    setIsLoading(true);
    try {
      const result = parseDelimitedText(pasteContent, db.students);
      if (result.rows.length === 0) {
        alert('Tidak ada baris data siswa yang berhasil diidentifikasi. Pastikan baris judul kolom dan baris nama siswa ikut tersalin.');
        setIsLoading(false);
        return;
      }

      setRawHeaders(result.headers);
      setMappingConfig(result.mapping);
      setParsedRows(result.rows);
      setFileName('Tabel Spreadsheet (Tempel / Paste)');
      setSourceInfo(`Disalin dari Spreadsheet (${result.rows.length} siswa)`);
      setCurrentStep(2);
    } catch (err: any) {
      alert(`Gagal membaca data: ${err.message}`);
    } finally {
      setIsLoading(false);
    }
  };

  // Handle uploaded Excel / CSV file
  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setFileName(file.name);
    setIsLoading(true);

    try {
      const result = await parseExcelFile(file, db.students);
      setRawHeaders(result.headers);
      setMappingConfig(result.mapping);
      setParsedRows(result.rows);
      setSourceInfo(`Berkas: ${file.name} (${result.rows.length} siswa)`);
      setCurrentStep(2);
    } catch (err: any) {
      alert(`Gagal membaca berkas Excel: ${err.message || 'Format tidak dikenali'}`);
    } finally {
      setIsLoading(false);
    }
  };

  // Execute Import
  const handleExecuteImport = () => {
    if (parsedRows.length === 0) return;

    setIsLoading(true);
    setTimeout(() => {
      if (duplicateStrategy === 'replace_all') {
        const payload = parsedRows.map(r => ({
          student: r.student,
          address: r.address,
          parent: r.parent,
          classId: targetClassId,
          academicYearId: targetAyId,
        }));

        const res = replaceAllStudentsWithImport(payload);
        setImportResult({
          total: parsedRows.length,
          created: res.totalImported,
          updated: 0,
          skipped: 0,
        });
      } else {
        const payload = parsedRows.map(r => ({
          student: r.student,
          address: r.address,
          parent: r.parent,
          classId: targetClassId,
          academicYearId: targetAyId,
          userAction: (duplicateStrategy === 'merge_update' ? 'update_existing' : 'skip') as any,
          existingStudentId: r.duplicateWithStudentId,
        }));

        const res = batchImportStudents(payload);
        setImportResult({
          total: parsedRows.length,
          created: res.created,
          updated: res.updated,
          skipped: res.skipped,
        });
      }

      setCurrentStep(4);
      setIsLoading(false);
    }, 400);
  };

  return (
    <div className="space-y-4 sm:space-y-6 max-w-5xl mx-auto">
      {/* Header Info */}
      <div className="bg-white p-4 sm:p-5 rounded-2xl border border-zinc-200/90 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center space-x-2">
            <div className="w-8 h-8 rounded-xl bg-blue-600 flex items-center justify-center text-white font-bold flex-shrink-0">
              <FileSpreadsheet className="w-4 h-4" />
            </div>
            <h2 className="text-sm sm:text-base font-bold text-zinc-900">
              Sinkronisasi & Impor Data Siswa
            </h2>
          </div>
          <p className="text-xs text-zinc-500 mt-1">
            Mendukung Google Spreadsheet terintegrasi, salin-tempel tabel langsung, dan berkas Excel (.xlsx / .csv). Kolom umur orang tua dihapus otomatis.
          </p>
        </div>

        <button
          id="btn-download-sample-template"
          onClick={() => downloadExcelTemplate()}
          className="bg-zinc-100 hover:bg-zinc-200 text-zinc-800 border border-zinc-200 px-3.5 py-2 rounded-xl text-xs font-bold transition flex items-center justify-center space-x-2 shadow-xs cursor-pointer min-h-[40px]"
        >
          <Download className="w-4 h-4 text-zinc-600" />
          <span>Format Template Excel</span>
        </button>
      </div>

      {/* Stepper Wizard Bar */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-center text-xs font-semibold">
        {[
          { step: 1, label: '1. Sumber Data' },
          { step: 2, label: '2. Mapping & Preview' },
          { step: 3, label: '3. Konfirmasi Kelas' },
          { step: 4, label: '4. Hasil Selesai' },
        ].map((s) => (
          <div
            key={s.step}
            className={`p-2.5 rounded-xl border transition text-center ${
              currentStep === s.step
                ? 'bg-blue-600 text-white border-blue-600 shadow-xs font-bold'
                : currentStep > s.step
                ? 'bg-emerald-50 text-emerald-800 border-emerald-300'
                : 'bg-zinc-50 text-zinc-400 border-zinc-200'
            }`}
          >
            {s.label}
          </div>
        ))}
      </div>

      {/* STEP 1: CHOOSE DATA SOURCE */}
      {currentStep === 1 && (
        <div className="bg-white rounded-2xl border border-zinc-200/90 p-4 sm:p-6 shadow-xs space-y-5">
          {/* Source Tabs */}
          <div className="flex flex-wrap border-b border-zinc-200 pb-2 gap-2">
            <button
              id="tab-source-gsheet"
              onClick={() => setSourceType('gsheet')}
              className={`flex items-center space-x-1.5 px-3 sm:px-4 py-2 rounded-xl text-xs font-bold transition cursor-pointer min-h-[40px] ${
                sourceType === 'gsheet'
                  ? 'bg-blue-50 text-blue-700 border border-blue-200'
                  : 'text-zinc-500 hover:bg-zinc-100'
              }`}
            >
              <Link2 className="w-4 h-4" />
              <span>Google Spreadsheet</span>
            </button>

            <button
              id="tab-source-paste"
              onClick={() => setSourceType('paste')}
              className={`flex items-center space-x-1.5 px-3 sm:px-4 py-2 rounded-xl text-xs font-bold transition cursor-pointer min-h-[40px] ${
                sourceType === 'paste'
                  ? 'bg-blue-50 text-blue-700 border border-blue-200'
                  : 'text-zinc-500 hover:bg-zinc-100'
              }`}
            >
              <ClipboardPaste className="w-4 h-4" />
              <span>Salin & Tempel Tabel</span>
            </button>

            <button
              id="tab-source-file"
              onClick={() => setSourceType('file')}
              className={`flex items-center space-x-1.5 px-3 sm:px-4 py-2 rounded-xl text-xs font-bold transition cursor-pointer min-h-[40px] ${
                sourceType === 'file'
                  ? 'bg-blue-50 text-blue-700 border border-blue-200'
                  : 'text-zinc-500 hover:bg-zinc-100'
              }`}
            >
              <Upload className="w-4 h-4" />
              <span>Unggah File Excel</span>
            </button>
          </div>

          {/* TAB 1: Google Sheets URL Input */}
          {sourceType === 'gsheet' && (
            <div className="space-y-4">
              <div className="bg-blue-50/70 border border-blue-200 rounded-xl p-4 text-xs text-blue-900 space-y-1">
                <div className="font-bold flex items-center space-x-1.5">
                  <Sparkles className="w-4 h-4 text-blue-600" />
                  <span>Google Workspace Sheets Integration</span>
                </div>
                <p className="text-zinc-600 leading-relaxed">
                  Tautan spreadsheet telah terpasang. Klik tombol di bawah untuk mengambil nama-nama siswa langsung via Google Sheets API.
                </p>
              </div>

              <div>
                <label className="block text-xs font-bold text-zinc-700 mb-1.5">
                  URL Google Spreadsheet:
                </label>
                <div className="flex flex-col sm:flex-row gap-2">
                  <input
                    id="input-gsheet-url"
                    type="text"
                    value={sheetUrl}
                    onChange={(e) => setSheetUrl(e.target.value)}
                    placeholder="https://docs.google.com/spreadsheets/d/..."
                    className="flex-1 px-3.5 py-2.5 bg-zinc-50 border border-zinc-300 rounded-xl text-xs text-zinc-900 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white font-mono"
                  />
                  <button
                    id="btn-fetch-gsheet"
                    onClick={handleFetchGoogleSheets}
                    disabled={isLoading}
                    className="px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold transition flex items-center justify-center space-x-1.5 shadow-xs cursor-pointer min-h-[44px]"
                  >
                    {isLoading ? (
                      <>
                        <RefreshCw className="w-4 h-4 animate-spin" />
                        <span>{statusMessage || 'Menghubungkan...'}</span>
                      </>
                    ) : (
                      <>
                        <Link2 className="w-4 h-4" />
                        <span>Tarik Data Spreadsheet</span>
                      </>
                    )}
                  </button>
                </div>
              </div>

              <div className="p-3 bg-zinc-50 border border-zinc-200 rounded-xl text-center">
                <p className="text-xs text-zinc-500">
                  Ingin cara tercepat tanpa login? Di spreadsheet Anda, tekan <strong>Ctrl + A & Ctrl + C</strong>, lalu buka tab <strong>"Salin & Tempel Tabel"</strong> di atas.
                </p>
              </div>
            </div>
          )}

          {/* TAB 2: Copy-Paste Raw Table */}
          {sourceType === 'paste' && (
            <div className="space-y-4">
              <div className="bg-emerald-50/70 border border-emerald-200 rounded-xl p-4 text-xs text-emerald-900 space-y-1">
                <div className="font-bold flex items-center space-x-1.5">
                  <ClipboardPaste className="w-4 h-4 text-emerald-600" />
                  <span>Salin Sel Spreadsheet & Tempel di Sini</span>
                </div>
                <p className="text-zinc-600">
                  Buka Google Sheet Anda, tekan <strong>Ctrl + A</strong> (atau tandai tabel) lalu <strong>Ctrl + C</strong>. Kemudian klik di dalam kotak di bawah dan tekan <strong>Ctrl + V</strong>.
                </p>
              </div>

              <div>
                <label className="block text-xs font-bold text-zinc-700 mb-1.5">
                  Tempel Data Spreadsheet:
                </label>
                <textarea
                  id="textarea-paste-spreadsheet"
                  rows={8}
                  value={pasteContent}
                  onChange={(e) => setPasteContent(e.target.value)}
                  placeholder="Contoh isi data saat ditempel:&#10;NO	NAMA	NIS	NISN	JK	TEMPAT LAHIR	TANGGAL LAHIR	ALAMAT	NAMA AYAH	NAMA IBU	NO HP&#10;1	AZIZ ZUHRIANSYAH	26271001	0082194812	L	Bandung	14/04/2009	Kp. Sukaluyu RT 02	Dedi Kurniawan	Siti Maryam	081234567801&#10;..."
                  className="w-full p-3 bg-zinc-50 border border-zinc-300 rounded-xl text-xs text-zinc-900 font-mono focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white"
                />
              </div>

              <div className="flex justify-end">
                <button
                  id="btn-process-pasted-data"
                  onClick={handleParsePastedContent}
                  disabled={isLoading || !pasteContent.trim()}
                  className="w-full sm:w-auto px-6 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold transition flex items-center justify-center space-x-1.5 shadow-xs cursor-pointer min-h-[44px]"
                >
                  <FileCheck2 className="w-4 h-4" />
                  <span>Proses & Identifikasi Kolom Siswa</span>
                </button>
              </div>
            </div>
          )}

          {/* TAB 3: File Upload */}
          {sourceType === 'file' && (
            <div>
              <input
                type="file"
                ref={fileInputRef}
                onChange={handleFileUpload}
                accept=".xlsx,.xls,.csv"
                className="hidden"
              />

              <div
                id="dropzone-excel-upload"
                onClick={() => fileInputRef.current?.click()}
                className="border-2 border-dashed border-zinc-300 rounded-2xl p-8 sm:p-12 hover:bg-blue-50/50 hover:border-blue-400 transition cursor-pointer flex flex-col items-center justify-center group text-center"
              >
                <div className="w-12 h-12 sm:w-14 sm:h-14 rounded-2xl bg-blue-100 flex items-center justify-center text-blue-600 mb-3 group-hover:scale-105 transition">
                  <Upload className="w-6 h-6 sm:w-7 sm:h-7" />
                </div>
                <h3 className="text-sm font-bold text-zinc-800">
                  Pilih Berkas Excel (.xlsx, .xls, .csv)
                </h3>
                <p className="text-xs text-zinc-500 mt-1 max-w-md">
                  Format yang didukung: <strong>.XLSX, .XLS, .CSV</strong>. Header kolom otomatis dikenali dan kolom umur orang tua diabaikan.
                </p>
                <span className="mt-4 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs rounded-xl shadow-xs cursor-pointer min-h-[40px] flex items-center">
                  Pilih Berkas Dari Perangkat
                </span>
              </div>
            </div>
          )}
        </div>
      )}

      {/* STEP 2: AUTO-MAPPING & PREVIEW */}
      {currentStep === 2 && (
        <div className="bg-white rounded-2xl border border-zinc-200/90 p-4 sm:p-6 shadow-xs space-y-5">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between border-b border-zinc-100 pb-3 gap-2">
            <div>
              <h3 className="text-sm font-bold text-zinc-900">
                Hasil Pemetaan Kolom (Auto Header Mapping)
              </h3>
              <p className="text-xs text-zinc-500">
                {sourceInfo || fileName} • Terdeteksi <strong>{parsedRows.length}</strong> baris data siswa
              </p>
            </div>
            <button
              onClick={() => setCurrentStep(1)}
              className="text-xs text-zinc-500 hover:text-zinc-900 font-semibold cursor-pointer text-left sm:text-right"
            >
              Ganti Sumber Data
            </button>
          </div>

          {/* Mapping Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2 text-xs">
            {Object.entries(mappingConfig).slice(0, 12).map(([field, header]) => (
              <div key={field} className="p-2.5 bg-zinc-50 rounded-xl border border-zinc-200/80">
                <span className="text-[10px] text-zinc-400 font-mono block uppercase truncate">
                  {field.replace(/_/g, ' ')}:
                </span>
                <strong className={`truncate block ${header ? 'text-blue-600 font-bold' : 'text-zinc-400 italic font-normal'}`}>
                  {header || '(Otomatis / Kosong)'}
                </strong>
              </div>
            ))}
          </div>

          {/* Sample Preview Table */}
          <div>
            <h4 className="text-xs font-bold text-zinc-700 mb-2 flex items-center space-x-1.5">
              <Table className="w-3.5 h-3.5 text-zinc-500" />
              <span>Preview Data Siswa Terbaca:</span>
            </h4>
            <div className="overflow-x-auto border border-zinc-200 rounded-xl">
              <table className="w-full text-left text-xs min-w-[650px]">
                <thead className="bg-zinc-50 text-[10px] font-bold text-zinc-500 uppercase tracking-wider border-b border-zinc-200">
                  <tr>
                    <th className="p-2.5">No</th>
                    <th className="p-2.5">Nama Lengkap</th>
                    <th className="p-2.5">NIS / NISN</th>
                    <th className="p-2.5 text-center">JK</th>
                    <th className="p-2.5">Alamat / Dusun</th>
                    <th className="p-2.5">Nama Ayah</th>
                    <th className="p-2.5">Nama Ibu</th>
                    <th className="p-2.5">No HP Ortu</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-100">
                  {parsedRows.slice(0, 8).map((row, i) => (
                    <tr key={i} className="hover:bg-zinc-50/80">
                      <td className="p-2.5 text-zinc-400 font-mono">{i + 1}</td>
                      <td className="p-2.5 font-bold text-zinc-900">{row.student.full_name || '-'}</td>
                      <td className="p-2.5 text-zinc-600 font-mono">
                        {row.student.nis || '-'} / {row.student.nisn || '-'}
                      </td>
                      <td className="p-2.5 text-center font-bold">
                        <span className={`px-2 py-0.5 rounded text-[10px] ${
                          row.student.gender === 'L' ? 'bg-sky-100 text-sky-800' : 'bg-pink-100 text-pink-800'
                        }`}>
                          {row.student.gender || 'L'}
                        </span>
                      </td>
                      <td className="p-2.5 text-zinc-600">{row.address.full_address || row.address.dusun || '-'}</td>
                      <td className="p-2.5 text-zinc-800">{row.parent.father_name || '-'}</td>
                      <td className="p-2.5 text-zinc-800">{row.parent.mother_name || '-'}</td>
                      <td className="p-2.5 text-emerald-600 font-mono">{row.parent.parent_phone || '-'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row items-center justify-between pt-4 border-t border-zinc-100 gap-3">
            <button
              onClick={() => setCurrentStep(1)}
              className="w-full sm:w-auto px-4 py-2 bg-zinc-100 text-zinc-800 rounded-xl text-xs font-semibold flex items-center justify-center space-x-1 cursor-pointer min-h-[40px]"
            >
              <ArrowLeft className="w-4 h-4" />
              <span>Kembali</span>
            </button>
            <button
              id="btn-confirm-mapping"
              onClick={() => setCurrentStep(3)}
              className="w-full sm:w-auto px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold flex items-center justify-center space-x-1.5 shadow-xs cursor-pointer min-h-[44px]"
            >
              <span>Lanjut ke Pengaturan Kelas</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* STEP 3: STRATEGY & TARGET CLASS */}
      {currentStep === 3 && (
        <div className="bg-white rounded-2xl border border-zinc-200/90 p-4 sm:p-6 shadow-xs space-y-6">
          <div>
            <h3 className="text-sm sm:text-base font-bold text-zinc-900">
              Pengaturan Kelas Tujuan & Strategi Sinkronisasi
            </h3>
            <p className="text-xs text-zinc-500 mt-0.5">
              Pilih tindakan yang diinginkan untuk data {parsedRows.length} siswa yang akan diimpor.
            </p>
          </div>

          {/* Class selection */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 p-4 bg-zinc-50 rounded-2xl border border-zinc-200/80">
            <div>
              <label className="block text-xs font-bold text-zinc-700 mb-1">
                Pilih Kelas Tujuan:
              </label>
              <select
                id="select-target-class"
                value={targetClassId}
                onChange={(e) => setTargetClassId(e.target.value)}
                className="w-full px-3 py-2 bg-white border border-zinc-300 rounded-xl text-xs font-semibold text-zinc-900 cursor-pointer min-h-[40px]"
              >
                {db.classes.map(c => (
                  <option key={c.class_id} value={c.class_id}>
                    Kelas {c.class_name} ({c.major})
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold text-zinc-700 mb-1">
                Tahun Ajaran:
              </label>
              <select
                id="select-target-ay"
                value={targetAyId}
                onChange={(e) => setTargetAyId(e.target.value)}
                className="w-full px-3 py-2 bg-white border border-zinc-300 rounded-xl text-xs font-semibold text-zinc-900 cursor-pointer min-h-[40px]"
              >
                {db.academic_years.map(y => (
                  <option key={y.academic_year_id} value={y.academic_year_id}>
                    Tahun Ajaran {y.year_name} ({y.semester})
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Strategy Selection */}
          <div className="space-y-3">
            <label className="block text-xs font-bold text-zinc-700">
              Pilih Metode Penerapan Data:
            </label>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              {[
                {
                  id: 'replace_all',
                  title: 'Ganti Seluruh Data Siswa (Reset & Timpa)',
                  desc: 'Menghapus data contoh dan menggantikan penuh dengan daftar nama dari spreadsheet ini.',
                  recommended: true,
                },
                {
                  id: 'merge_update',
                  title: 'Perbarui & Gabungkan (Merge)',
                  desc: 'Memperbarui NIS, telepon, dan alamat siswa lama jika sudah ada, atau menambah jika baru.',
                  recommended: false,
                },
                {
                  id: 'skip_duplicate',
                  title: 'Hanya Tambah Siswa Baru',
                  desc: 'Hanya memasukkan siswa yang belum pernah ada sama sekali di database.',
                  recommended: false,
                },
              ].map(opt => (
                <button
                  key={opt.id}
                  type="button"
                  onClick={() => setDuplicateStrategy(opt.id as DuplicateStrategy)}
                  className={`p-4 rounded-2xl border text-left transition cursor-pointer relative flex flex-col justify-between ${
                    duplicateStrategy === opt.id
                      ? 'border-blue-600 bg-blue-50/60 text-blue-950 font-bold shadow-xs'
                      : 'border-zinc-200 bg-white text-zinc-600 hover:bg-zinc-50'
                  }`}
                >
                  {opt.recommended && (
                    <span className="inline-block self-start px-2 py-0.5 bg-blue-600 text-white text-[10px] font-bold rounded-md mb-2">
                      Direkomendasikan
                    </span>
                  )}
                  <div>
                    <div className="text-xs font-bold text-zinc-900">{opt.title}</div>
                    <p className="text-[11px] font-normal text-zinc-500 mt-1">{opt.desc}</p>
                  </div>
                </button>
              ))}
            </div>
          </div>

          <div className="p-3.5 bg-blue-50 border border-blue-200 rounded-xl text-xs text-blue-900 flex items-start space-x-2">
            <ShieldCheck className="w-4 h-4 text-blue-600 flex-shrink-0 mt-0.5" />
            <div>
              <strong>Integritas Database Terjamin:</strong> Setiap siswa akan diberikan Student ID permanen (STU-00001, STU-00002, ...) yang saling terhubung ke tabel alamat dan orang tua. Kolom umur orang tua telah dihapus sesuai ketentuan.
            </div>
          </div>

          <div className="flex flex-col sm:flex-row items-center justify-between pt-4 border-t border-zinc-100 gap-3">
            <button
              onClick={() => setCurrentStep(2)}
              className="w-full sm:w-auto px-4 py-2 bg-zinc-100 text-zinc-800 rounded-xl text-xs font-semibold flex items-center justify-center space-x-1 cursor-pointer min-h-[40px]"
            >
              <ArrowLeft className="w-4 h-4" />
              <span>Kembali</span>
            </button>
            <button
              id="btn-execute-final-import"
              onClick={handleExecuteImport}
              disabled={isLoading}
              className="w-full sm:w-auto px-6 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold flex items-center justify-center space-x-2 shadow-xs cursor-pointer min-h-[44px]"
            >
              {isLoading ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin" />
                  <span>Sedang Memproses Database...</span>
                </>
              ) : (
                <>
                  <CheckCircle2 className="w-4 h-4" />
                  <span>Terapkan Data Siswa ({parsedRows.length} Siswa)</span>
                </>
              )}
            </button>
          </div>
        </div>
      )}

      {/* STEP 4: IMPORT RESULT SUMMARY */}
      {currentStep === 4 && importResult && (
        <div className="bg-white rounded-2xl border border-zinc-200/90 p-6 sm:p-8 shadow-xs text-center space-y-6">
          <div className="w-14 h-14 sm:w-16 sm:h-16 rounded-2xl bg-emerald-100 flex items-center justify-center text-emerald-600 mx-auto">
            <CheckCircle2 className="w-8 h-8" />
          </div>

          <div>
            <h3 className="text-base sm:text-lg font-bold text-zinc-900">
              Sinkronisasi Data Siswa Selesai!
            </h3>
            <p className="text-xs text-zinc-500 mt-1">
              Data siswa dari spreadsheet telah berhasil diterapkan ke dalam database sistem wali kelas.
            </p>
          </div>

          {/* Stats Cards */}
          <div className="grid grid-cols-2 md:grid-cols-3 gap-3 max-w-lg mx-auto text-center">
            <div className="p-3 bg-zinc-50 rounded-xl border border-zinc-200">
              <div className="text-xs text-zinc-500">Total Baris</div>
              <div className="text-lg sm:text-xl font-bold text-zinc-900 mt-1">{importResult.total}</div>
            </div>
            <div className="p-3 bg-emerald-50 rounded-xl border border-emerald-200 text-emerald-900">
              <div className="text-xs text-emerald-700">Siswa Tersimpan</div>
              <div className="text-lg sm:text-xl font-bold mt-1">{importResult.created}</div>
            </div>
            <div className="p-3 bg-blue-50 rounded-xl border border-blue-200 text-blue-900">
              <div className="text-xs text-blue-700">Diperbarui / Merge</div>
              <div className="text-lg sm:text-xl font-bold mt-1">{importResult.updated}</div>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-4">
            <button
              onClick={() => {
                setCurrentStep(1);
                setParsedRows([]);
                setImportResult(null);
              }}
              className="w-full sm:w-auto px-4 py-2 bg-zinc-100 text-zinc-700 rounded-xl text-xs font-semibold cursor-pointer min-h-[40px]"
            >
              Impor Data Lain
            </button>
            <button
              id="btn-navigate-to-students"
              onClick={onSuccessNavigate}
              className="w-full sm:w-auto px-6 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold shadow-xs cursor-pointer flex items-center justify-center space-x-1.5 min-h-[44px]"
            >
              <span>Buka Database Siswa Sekarang</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
