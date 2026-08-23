import * as XLSX from 'xlsx';
import { 
  AppDatabase, 
  Student, 
  Address, 
  Parent, 
  SchoolClass, 
  AcademicYear, 
  StudentClassHistory,
  StudentFullData 
} from '../types';
import { generateNextStudentId } from './calculations';

export interface RawExcelRow {
  [key: string]: any;
}

export interface ColumnMapping {
  nama: string;
  tempat_lahir: string;
  tgl_lahir: string;
  nis: string;
  nisn: string;
  jenis_kelamin: string;
  rt: string;
  rw: string;
  dusun: string;
  desa: string;
  alamat_lengkap: string;
  asal_sekolah: string;
  nama_ayah: string;
  nama_ibu: string;
  pekerjaan_ayah: string;
  pekerjaan_ibu: string;
  no_hp_ortu: string;
  no_hp_siswa: string;
  agama: string;
  nik: string;
}

export interface ParsedImportRow {
  index: number;
  raw: RawExcelRow;
  student: Partial<Student>;
  address: Partial<Address>;
  parent: Partial<Parent>;
  duplicateStatus: 'new' | 'exact_duplicate' | 'potential_duplicate';
  duplicateWithStudentId?: string;
  duplicateReasons: string[];
  isValid: boolean;
  validationErrors: string[];
  userAction: 'create_new' | 'update_existing' | 'skip';
}

// Normalized header matcher
export function detectHeaderMapping(headers: string[]): ColumnMapping {
  const mapping: ColumnMapping = {
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
  };

  const clean = (str: string) => str.toLowerCase().replace(/[^a-z0-9]/g, '');

  headers.forEach(h => {
    const c = clean(h);
    if (!c) return;

    if (c === 'nama' || c === 'namalengkap' || c === 'namasiswa' || c === 'fullname') {
      mapping.nama = h;
    } else if (c === 'tempat' || c === 'tempatlahir' || c === 'tmplahir') {
      mapping.tempat_lahir = h;
    } else if (c === 'tgllahir' || c === 'tanggallahir' || c === 'tgl' || c === 'tglhr') {
      mapping.tgl_lahir = h;
    } else if (c === 'nis' || c === 'noinduk' || c === 'nomorinduk') {
      mapping.nis = h;
    } else if (c === 'nisn' || c === 'nonasional') {
      mapping.nisn = h;
    } else if (c === 'jk' || c === 'jeniskelamin' || c === 'gender' || c === 'sex') {
      mapping.jenis_kelamin = h;
    } else if (c === 'rt') {
      mapping.rt = h;
    } else if (c === 'rw') {
      mapping.rw = h;
    } else if (c === 'dsn' || c === 'dusun' || c === 'kampung' || c === 'kp') {
      mapping.dusun = h;
    } else if (c === 'ds' || c === 'desa' || c === 'kelurahan' || c === 'kel') {
      mapping.desa = h;
    } else if (c === 'alamat' || c === 'alamatlengkap' || c === 'fulladdress') {
      mapping.alamat_lengkap = h;
    } else if (c === 'asalsekolah' || c === 'sekolahasal' || c === 'smpasal' || c === 'asal') {
      mapping.asal_sekolah = h;
    } else if (c === 'ayah' || c === 'namaayah' || c === 'bapak') {
      mapping.nama_ayah = h;
    } else if (c === 'ibu' || c === 'namaibu') {
      mapping.nama_ibu = h;
    } else if (c === 'pekerjaanayah' || c === 'pekayah' || c === 'jobayah') {
      mapping.pekerjaan_ayah = h;
    } else if (c === 'pekerjaanibu' || c === 'pekibu' || c === 'jobibu') {
      mapping.pekerjaan_ibu = h;
    } else if (c === 'nohpwaortu' || c === 'nohpwatelporangtua' || c === 'nohportu' || c === 'telportu' || c === 'waortu' || c === 'nohp' || c === 'nohporangtua') {
      mapping.no_hp_ortu = h;
    } else if (c === 'nohpsiswa' || c === 'hpsiswa' || c === 'telepon' || c === 'hp') {
      mapping.no_hp_siswa = h;
    } else if (c === 'agama' || c === 'religion') {
      mapping.agama = h;
    } else if (c === 'nik' || c === 'noktp') {
      mapping.nik = h;
    }
  });

  return mapping;
}

// Format Excel Date helper
export function parseExcelDate(val: any): string {
  if (!val) return '';
  if (typeof val === 'number') {
    // Excel serial date to JS Date
    const jsDate = new Date((val - (25567 + 2)) * 86400 * 1000);
    if (!isNaN(jsDate.getTime())) {
      return jsDate.toISOString().split('T')[0];
    }
  }
  if (typeof val === 'string') {
    const trimmed = val.trim();
    // Check if DD/MM/YYYY or DD-MM-YYYY
    const ddmmyyyy = trimmed.match(/^(\d{1,2})[/\-.](\d{1,2})[/\-.](\d{4})$/);
    if (ddmmyyyy) {
      const day = ddmmyyyy[1].padStart(2, '0');
      const month = ddmmyyyy[2].padStart(2, '0');
      const year = ddmmyyyy[3];
      return `${year}-${month}-${day}`;
    }
    // Check if YYYY-MM-DD
    const yyyymmdd = trimmed.match(/^(\d{4})[/\-.](\d{1,2})[/\-.](\d{1,2})$/);
    if (yyyymmdd) {
      const year = yyyymmdd[1];
      const month = yyyymmdd[2].padStart(2, '0');
      const day = yyyymmdd[3].padStart(2, '0');
      return `${year}-${month}-${day}`;
    }
  }
  return String(val);
}

// Validate & Check Duplicates
export function validateAndDetectDuplicates(
  rawRows: RawExcelRow[],
  mapping: ColumnMapping,
  existingStudents: Student[]
): ParsedImportRow[] {
  return rawRows.map((row, idx) => {
    const validationErrors: string[] = [];
    const duplicateReasons: string[] = [];
    let duplicateStatus: 'new' | 'exact_duplicate' | 'potential_duplicate' = 'new';
    let duplicateWithStudentId: string | undefined = undefined;

    const fullName = String(row[mapping.nama] || '').trim();
    const nis = String(row[mapping.nis] || '').trim();
    const nisn = String(row[mapping.nisn] || '').trim();
    const rawBirthDate = row[mapping.tgl_lahir];
    const birthDate = parseExcelDate(rawBirthDate);
    const birthPlace = String(row[mapping.tempat_lahir] || '').trim();

    let genderRaw = String(row[mapping.jenis_kelamin] || '').toUpperCase().trim();
    let gender: 'L' | 'P' = 'L';
    if (genderRaw.startsWith('P') || genderRaw === 'PEREMPUAN' || genderRaw === 'WANITA' || genderRaw === 'F') {
      gender = 'P';
    }

    if (!fullName) {
      validationErrors.push('Nama lengkap wajib diisi');
    }

    // Duplicate detection rules
    if (existingStudents && existingStudents.length > 0) {
      // 1. Check NISN (Priority 1)
      if (nisn) {
        const matchNISN = existingStudents.find(s => s.nisn && s.nisn.trim() === nisn);
        if (matchNISN) {
          duplicateStatus = 'exact_duplicate';
          duplicateWithStudentId = matchNISN.student_id;
          duplicateReasons.push(`NISN ${nisn} sudah terdaftar pada ${matchNISN.full_name} (${matchNISN.student_id})`);
        }
      }

      // 2. Check NIS (Priority 2)
      if (!duplicateWithStudentId && nis) {
        const matchNIS = existingStudents.find(s => s.nis && s.nis.trim() === nis);
        if (matchNIS) {
          duplicateStatus = 'exact_duplicate';
          duplicateWithStudentId = matchNIS.student_id;
          duplicateReasons.push(`NIS ${nis} sudah terdaftar pada ${matchNIS.full_name} (${matchNIS.student_id})`);
        }
      }

      // 3. Check Name + Birth Date combo (Priority 3)
      if (!duplicateWithStudentId && fullName && birthDate) {
        const cleanName = fullName.toLowerCase().replace(/\s+/g, '');
        const matchCombo = existingStudents.find(s => {
          const sName = s.full_name.toLowerCase().replace(/\s+/g, '');
          return sName === cleanName && s.birth_date === birthDate;
        });
        if (matchCombo) {
          duplicateStatus = 'potential_duplicate';
          duplicateWithStudentId = matchCombo.student_id;
          duplicateReasons.push(`Nama & Tanggal Lahir sama dengan ${matchCombo.full_name} (${matchCombo.student_id})`);
        }
      }

      // 4. Check Name only (Warning)
      if (!duplicateWithStudentId && fullName) {
        const cleanName = fullName.toLowerCase().replace(/\s+/g, '');
        const matchNameOnly = existingStudents.find(s => s.full_name.toLowerCase().replace(/\s+/g, '') === cleanName);
        if (matchNameOnly) {
          duplicateStatus = 'potential_duplicate';
          duplicateWithStudentId = matchNameOnly.student_id;
          duplicateReasons.push(`Nama sama persis dengan ${matchNameOnly.full_name} (${matchNameOnly.student_id}), periksa kembali apakah siswa baru atau siswa lama.`);
        }
      }
    }

    const rt = String(row[mapping.rt] || '').trim();
    const rw = String(row[mapping.rw] || '').trim();
    const dusun = String(row[mapping.dusun] || '').trim();
    const desa = String(row[mapping.desa] || '').trim();
    let full_address = String(row[mapping.alamat_lengkap] || '').trim();
    if (!full_address && (rt || rw || dusun || desa)) {
      full_address = [
        dusun ? `Dusun ${dusun}` : '',
        rt ? `RT ${rt}` : '',
        rw ? `RW ${rw}` : '',
        desa ? `Desa ${desa}` : '',
      ].filter(Boolean).join(', ');
    }

    const student: Partial<Student> = {
      full_name: fullName,
      nis,
      nisn,
      gender,
      birth_place: birthPlace,
      birth_date: birthDate,
      previous_school: String(row[mapping.asal_sekolah] || '').trim(),
      phone: String(row[mapping.no_hp_siswa] || '').trim(),
      religion: String(row[mapping.agama] || 'Islam').trim(),
      nik: String(row[mapping.nik] || '').trim(),
      status: 'Aktif',
    };

    const address: Partial<Address> = {
      rt,
      rw,
      dusun,
      desa,
      kecamatan: '',
      kabupaten: '',
      full_address,
    };

    const parent: Partial<Parent> = {
      father_name: String(row[mapping.nama_ayah] || '').trim(),
      father_job: String(row[mapping.pekerjaan_ayah] || '').trim(),
      mother_name: String(row[mapping.nama_ibu] || '').trim(),
      mother_job: String(row[mapping.pekerjaan_ibu] || '').trim(),
      parent_phone: String(row[mapping.no_hp_ortu] || '').trim(),
    };

    const isValid = validationErrors.length === 0;

    return {
      index: idx + 1,
      raw: row,
      student,
      address,
      parent,
      duplicateStatus,
      duplicateWithStudentId,
      duplicateReasons,
      isValid,
      validationErrors,
      userAction: duplicateStatus === 'exact_duplicate' ? 'update_existing' : 'create_new',
    };
  });
}

// Download Excel Template for Homeroom Teacher
export function downloadExcelTemplate(): void {
  const sampleData = [
    {
      'NO': 1,
      'NAMA': 'AZIZ ZUHRIANSYAH',
      'NIS': '26271001',
      'NISN': '0082194812',
      'JENIS KELAMIN': 'L',
      'TEMPAT': 'Bandung',
      'TGL LAHIR': '14/04/2009',
      'RT': '02',
      'RW': '05',
      'DSN': 'Sukaluyu',
      'DS': 'Mekarsari',
      'ALAMAT': 'Kp. Sukaluyu RT 02 / RW 05, Desa Mekarsari',
      'ASAL SEKOLAH': 'SMP Negeri 2 Sukamaju',
      'AYAH': 'Dedi Kurniawan',
      'IBU': 'Siti Maryam',
      'PEKERJAAN AYAH': 'Wiraswasta / Bengkel Las',
      'PEKERJAAN IBU': 'Ibu Rumah Tangga',
      'NO HP/WA/TELP ORANG TUA': '081321456789',
    },
    {
      'NO': 2,
      'NAMA': 'GITA PUSPITA',
      'NIS': '26271006',
      'NISN': '0094726190',
      'JENIS KELAMIN': 'P',
      'TEMPAT': 'Bandung',
      'TGL LAHIR': '25/03/2009',
      'RT': '01',
      'RW': '04',
      'DSN': 'Cisomang',
      'DS': 'Tenjolaut',
      'ALAMAT': 'Jl. Cisomang Hilir RT 01 / RW 04',
      'ASAL SEKOLAH': 'SMP Negeri 1 Cikalong',
      'AYAH': 'Dadang Kosasih',
      'IBU': 'Iis Aisyah',
      'PEKERJAAN AYAH': 'Mekanik Otomotif',
      'PEKERJAAN IBU': 'Ibu Rumah Tangga',
      'NO HP/WA/TELP ORANG TUA': '081355443322',
    },
  ];

  const ws = XLSX.utils.json_to_sheet(sampleData);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'Format_Data_Siswa');
  XLSX.writeFile(wb, 'Format_Import_Siswa_WaliKelas.xlsx');
}

// Export Full Database Workbook
export function exportFullWorkbook(db: AppDatabase): void {
  const wb = XLSX.utils.book_new();

  // Sheet 1: Data Siswa
  const studentsRows = db.students.map((s, idx) => {
    const p = db.parents.find(parent => parent.student_id === s.student_id);
    const a = db.addresses.find(addr => addr.student_id === s.student_id);
    const hist = db.student_class_history.find(h => h.student_id === s.student_id && h.status === 'Active');
    const cls = hist ? db.classes.find(c => c.class_id === hist.class_id) : undefined;

    return {
      'No': idx + 1,
      'Student ID (Permanen)': s.student_id,
      'NIS': s.nis || '',
      'NISN': s.nisn || '',
      'Nama Lengkap': s.full_name,
      'Jenis Kelamin': s.gender === 'L' ? 'Laki-laki' : 'Perempuan',
      'Tempat Lahir': s.birth_place || '',
      'Tanggal Lahir': s.birth_date || '',
      'Kelas Aktif': cls?.class_name || '-',
      'Asal Sekolah': s.previous_school || '',
      'Agama': s.religion || '',
      'No Telp Siswa': s.phone || '',
      'Status Siswa': s.status,
      'Nama Ayah': p?.father_name || '',
      'Pekerjaan Ayah': p?.father_job || '',
      'Nama Ibu': p?.mother_name || '',
      'Pekerjaan Ibu': p?.mother_job || '',
      'No HP/WA Ortu': p?.parent_phone || '',
      'Alamat Lengkap': a?.full_address || '',
      'RT': a?.rt || '',
      'RW': a?.rw || '',
      'Dusun': a?.dusun || '',
      'Desa': a?.desa || '',
    };
  });
  XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(studentsRows), 'Data Siswa');

  // Sheet 2: Orang Tua
  const parentsRows = db.parents.map((p, idx) => {
    const s = db.students.find(stu => stu.student_id === p.student_id);
    return {
      'No': idx + 1,
      'Student ID': p.student_id,
      'Nama Siswa': s?.full_name || '',
      'Nama Ayah': p.father_name,
      'Pekerjaan Ayah': p.father_job,
      'Nama Ibu': p.mother_name,
      'Pekerjaan Ibu': p.mother_job,
      'Nama Wali': p.guardian_name || '',
      'No HP/WA Ortu': p.parent_phone,
    };
  });
  XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(parentsRows), 'Orang Tua');

  // Sheet 3: Riwayat Kelas (Lifecycle)
  const historyRows = db.student_class_history.map((h, idx) => {
    const s = db.students.find(stu => stu.student_id === h.student_id);
    const cls = db.classes.find(c => c.class_id === h.class_id);
    const ay = db.academic_years.find(y => y.academic_year_id === h.academic_year_id);
    return {
      'No': idx + 1,
      'Student ID': h.student_id,
      'Nama Siswa': s?.full_name || '',
      'Kelas': cls?.class_name || '',
      'Tahun Ajaran': ay?.year_name || '',
      'Mulai': h.start_date,
      'Selesai': h.end_date || 'Sekarang',
      'Status': h.status,
    };
  });
  XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(historyRows), 'Riwayat Kelas');

  // Sheet 4: Presensi Harian
  const attendanceRows = db.attendance.map((att, idx) => {
    const s = db.students.find(stu => stu.student_id === att.student_id);
    const cls = db.classes.find(c => c.class_id === att.class_id);
    return {
      'No': idx + 1,
      'Tanggal': att.date,
      'Student ID': att.student_id,
      'Nama Siswa': s?.full_name || '',
      'Kelas': cls?.class_name || '',
      'Status Kehadiran': att.status,
      'Keterangan / Catatan': att.note || '',
    };
  });
  XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(attendanceRows), 'Presensi');

  // Sheet 5: Pelanggaran
  const violRows = db.violations.map((v, idx) => {
    const s = db.students.find(stu => stu.student_id === v.student_id);
    return {
      'No': idx + 1,
      'Tanggal': v.date,
      'Student ID': v.student_id,
      'Nama Siswa': s?.full_name || '',
      'Jenis Pelanggaran': v.violation_type,
      'Tingkat': v.level,
      'Poin': v.penalty_points,
      'Kronologi': v.chronology,
      'Tindakan': v.action_taken,
      'Status Kasus': v.status,
    };
  });
  XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(violRows), 'Pelanggaran');

  // Sheet 6: Pembinaan
  const guidRows = db.guidance.map((g, idx) => {
    const s = db.students.find(stu => stu.student_id === g.student_id);
    return {
      'No': idx + 1,
      'Tanggal': g.date,
      'Student ID': g.student_id,
      'Nama Siswa': s?.full_name || '',
      'Tahap Pembinaan': g.stage,
      'Pembina / Wali Kelas': g.counselor_name,
      'Catatan Pembinaan': g.notes,
      'Kesepakatan / Komitmen': g.agreement,
      'Tindak Lanjut': g.follow_up,
      'Status': g.status,
    };
  });
  XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(guidRows), 'Pembinaan');

  // Sheet 7: Home Visit
  const hvRows = db.home_visits.map((hv, idx) => {
    const s = db.students.find(stu => stu.student_id === hv.student_id);
    return {
      'No': idx + 1,
      'Tanggal': hv.date,
      'Student ID': hv.student_id,
      'Nama Siswa': s?.full_name || '',
      'Alasan Kunjungan': hv.reason,
      'Alamat Dikunjungi': hv.address,
      'Pihak yang Ditemui': hv.met_parties,
      'Kondisi & Masalah': `${hv.condition} | ${hv.problem}`,
      'Hasil & Kesepakatan': `${hv.result} | ${hv.agreement}`,
      'Tindak Lanjut': hv.follow_up,
    };
  });
  XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(hvRows), 'Home Visit');

  // Sheet 8: Prestasi
  const achRows = db.achievements.map((ach, idx) => {
    const s = db.students.find(stu => stu.student_id === ach.student_id);
    return {
      'No': idx + 1,
      'Tanggal': ach.date,
      'Student ID': ach.student_id,
      'Nama Siswa': s?.full_name || '',
      'Nama Prestasi': ach.title,
      'Kategori': ach.category,
      'Tingkat': ach.level,
      'Peringkat': ach.rank,
      'Penyelenggara': ach.organizer,
      'Dokumentasi': ach.documentation || '',
    };
  });
  XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(achRows), 'Prestasi');

  // Sheet 9: Catatan Siswa
  const notesRows = db.student_notes.map((n, idx) => {
    const s = db.students.find(stu => stu.student_id === n.student_id);
    return {
      'No': idx + 1,
      'Tanggal': n.date,
      'Student ID': n.student_id,
      'Nama Siswa': s?.full_name || '',
      'Kategori': n.category,
      'Judul Catatan': n.title,
      'Isi Catatan': n.content,
      'Penulis': n.author,
    };
  });
  XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(notesRows), 'Catatan Siswa');

  // Sheet 10: Komunikasi Ortu
  const commRows = db.parent_communications.map((c, idx) => {
    const s = db.students.find(stu => stu.student_id === c.student_id);
    return {
      'No': idx + 1,
      'Tanggal': c.date,
      'Student ID': c.student_id,
      'Nama Siswa': s?.full_name || '',
      'Orang Tua / Wali': c.parent_name,
      'Media Komunikasi': c.media,
      'Topik': c.topic,
      'Hasil Pembicaraan': c.result,
      'Tindak Lanjut': c.follow_up,
    };
  });
  XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(commRows), 'Komunikasi Ortu');

  const fileName = `Full_Export_WaliKelas_${db.school_settings.school_name.replace(/\s+/g, '_')}_${new Date().toISOString().split('T')[0]}.xlsx`;
  XLSX.writeFile(wb, fileName);
}

export const generateSampleTemplateExcel = downloadExcelTemplate;

export async function parseExcelFile(file: File, existingStudents: Student[] = []): Promise<{ headers: string[]; rawRows: RawExcelRow[]; mapping: ColumnMapping; rows: ParsedImportRow[] }> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const data = new Uint8Array(e.target?.result as ArrayBuffer);
        const workbook = XLSX.read(data, { type: 'array' });
        const firstSheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[firstSheetName];
        
        // Convert sheet to JSON array
        const rawJson: any[] = XLSX.utils.sheet_to_json(worksheet, { defval: '' });
        
        // Extract headers from first row
        const headers: string[] = [];
        if (rawJson.length > 0) {
          Object.keys(rawJson[0]).forEach(key => {
            if (!key.startsWith('__EMPTY')) {
              headers.push(key);
            }
          });
        }
        
        const mapping = detectHeaderMapping(headers);
        const rows = validateAndDetectDuplicates(rawJson, mapping, existingStudents);

        resolve({
          headers,
          rawRows: rawJson,
          mapping,
          rows,
        });
      } catch (err) {
        reject(err);
      }
    };
    reader.onerror = (err) => reject(err);
    reader.readAsArrayBuffer(file);
  });
}

export function parseGoogleSheetMatrix(
  matrix: any[][],
  existingStudents: Student[] = []
): { headers: string[]; rawRows: RawExcelRow[]; mapping: ColumnMapping; rows: ParsedImportRow[] } {
  if (!matrix || matrix.length === 0) {
    return { headers: [], rawRows: [], mapping: detectHeaderMapping([]), rows: [] };
  }

  // Find the header row (first non-empty row)
  let headerRowIndex = 0;
  for (let i = 0; i < Math.min(matrix.length, 5); i++) {
    const row = matrix[i];
    if (row && row.some(cell => {
      const str = String(cell || '').toLowerCase();
      return str.includes('nama') || str.includes('nis') || str.includes('siswa');
    })) {
      headerRowIndex = i;
      break;
    }
  }

  const rawHeaderList = matrix[headerRowIndex] || [];
  const headers = rawHeaderList.map((h, i) => String(h || '').trim() || `Kolom_${i + 1}`);

  const rawRows: RawExcelRow[] = [];
  for (let i = headerRowIndex + 1; i < matrix.length; i++) {
    const rowData = matrix[i];
    if (!rowData || rowData.length === 0) continue;

    // Check if entire row is empty
    const hasData = rowData.some(cell => String(cell || '').trim() !== '');
    if (!hasData) continue;

    const rowObj: RawExcelRow = {};
    headers.forEach((header, colIdx) => {
      rowObj[header] = rowData[colIdx] !== undefined ? rowData[colIdx] : '';
    });
    rawRows.push(rowObj);
  }

  const mapping = detectHeaderMapping(headers);
  const rows = validateAndDetectDuplicates(rawRows, mapping, existingStudents);

  return {
    headers,
    rawRows,
    mapping,
    rows,
  };
}

export function parseDelimitedText(
  text: string,
  existingStudents: Student[] = []
): { headers: string[]; rawRows: RawExcelRow[]; mapping: ColumnMapping; rows: ParsedImportRow[] } {
  const trimmed = text.trim();
  if (!trimmed) {
    return { headers: [], rawRows: [], mapping: detectHeaderMapping([]), rows: [] };
  }

  // Detect delimiter: tab (\t), comma (,), semicolon (;)
  const firstLine = trimmed.split('\n')[0];
  const tabCount = (firstLine.match(/\t/g) || []).length;
  const commaCount = (firstLine.match(/,/g) || []).length;
  const semicolonCount = (firstLine.match(/;/g) || []).length;

  let delimiter = '\t';
  if (commaCount > tabCount && commaCount > semicolonCount) {
    delimiter = ',';
  } else if (semicolonCount > tabCount && semicolonCount > commaCount) {
    delimiter = ';';
  }

  const lines = trimmed.split(/\r?\n/).filter(line => line.trim().length > 0);
  const matrix = lines.map(line => {
    if (delimiter === ',') {
      // Basic CSV splitter respecting quotes
      const result: string[] = [];
      let current = '';
      let inQuotes = false;
      for (let i = 0; i < line.length; i++) {
        const char = line[i];
        if (char === '"' || char === "'") {
          inQuotes = !inQuotes;
        } else if (char === ',' && !inQuotes) {
          result.push(current.trim());
          current = '';
        } else {
          current += char;
        }
      }
      result.push(current.trim());
      return result;
    }
    return line.split(delimiter).map(c => c.trim().replace(/^["']|["']$/g, ''));
  });

  return parseGoogleSheetMatrix(matrix, existingStudents);
}

export function exportClassRecapExcel(
  students: StudentFullData[],
  className: string,
  academicYear: string,
  settings: any
): void {
  const wb = XLSX.utils.book_new();

  const rows = students.map((s, idx) => ({
    'No': idx + 1,
    'Student ID': s.student.student_id,
    'NIS': s.student.nis || '-',
    'NISN': s.student.nisn || '-',
    'Nama Lengkap': s.student.full_name,
    'L/P': s.student.gender,
    'Kehadiran (%)': `${s.attendance_summary.attendance_rate}%`,
    'Hadir': s.attendance_summary.hadir,
    'Sakit': s.attendance_summary.sakit,
    'Izin': s.attendance_summary.izin,
    'Alpa': s.attendance_summary.alpa,
    'Terlambat': s.attendance_summary.terlambat,
    'Skor Kedisiplinan': s.discipline_score.score,
    'Predikat Disiplin': s.discipline_score.category,
    'Status Early Warning': s.warning_level,
    'Poin Pelanggaran': s.violation_count,
    'Prestasi / Juara': s.achievement_count,
    'No HP Orang Tua': s.parent?.parent_phone || '-',
  }));

  const ws = XLSX.utils.json_to_sheet(rows);
  XLSX.utils.book_append_sheet(wb, ws, `Rekap_${className.replace(/\s+/g, '_')}`);
  XLSX.writeFile(wb, `Rekap_Kelas_${className.replace(/\s+/g, '_')}_${academicYear.replace(/\//g, '-')}.xlsx`);
}
