import { jsPDF } from 'jspdf';
import { autoTable } from 'jspdf-autotable';
import { StudentFullData, SchoolSettings, AppDatabase, AttendanceRecord } from '../types';

export function generateStudentReportPDF(
  data: StudentFullData,
  settings: SchoolSettings,
  db: AppDatabase
): void {
  try {
    const doc = new jsPDF({
      orientation: 'portrait',
      unit: 'mm',
      format: 'a4',
    });

    const pageWidth = doc.internal.pageSize.getWidth();
    const today = new Date().toLocaleDateString('id-ID', {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    });

    // 1. KOP SURAT SEKOLAH
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(14);
    doc.text(settings.school_name.toUpperCase(), pageWidth / 2, 16, { align: 'center' });

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9);
    doc.text(`NPSN: ${settings.npsn} | Email: ${settings.school_email} | Telp: ${settings.school_phone}`, pageWidth / 2, 21, { align: 'center' });
    doc.text(`${settings.school_address}, ${settings.school_city}, ${settings.school_province}`, pageWidth / 2, 26, { align: 'center' });

    // Garis KOP Ganda
    doc.setLineWidth(0.8);
    doc.line(14, 29, pageWidth - 14, 29);
    doc.setLineWidth(0.2);
    doc.line(14, 30, pageWidth - 14, 30);

    // JUDUL DOKUMEN
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(12);
    doc.text('LEMBAR LAPORAN PERKEMBANGAN DAN MONITORING SISWA', pageWidth / 2, 38, { align: 'center' });
    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    const activeAy = db.academic_years.find(y => y.academic_year_id === settings.current_academic_year_id);
    doc.text(`Tahun Ajaran: ${activeAy?.year_name || '2026/2027'} - Semester ${activeAy?.semester || 'Ganjil'}`, pageWidth / 2, 43, { align: 'center' });

    let curY = 50;

    // TABEL IDENTITAS SISWA & ORANG TUA
    const s = data.student;
    const p = data.parent;
    const a = data.address;
    const c = data.current_class;

    const bioBody = [
      [
        { content: 'ID Siswa (Permanen)', styles: { fontStyle: 'bold' as const } },
        `: ${s.student_id}`,
        { content: 'Nama Ayah', styles: { fontStyle: 'bold' as const } },
        `: ${p?.father_name || '-'} (${p?.father_job || '-'})`,
      ],
      [
        { content: 'Nama Lengkap', styles: { fontStyle: 'bold' as const } },
        `: ${s.full_name}`,
        { content: 'Nama Ibu', styles: { fontStyle: 'bold' as const } },
        `: ${p?.mother_name || '-'} (${p?.mother_job || '-'})`,
      ],
      [
        { content: 'NIS / NISN', styles: { fontStyle: 'bold' as const } },
        `: ${s.nis || '-'} / ${s.nisn || '-'}`,
        { content: 'No HP Orang Tua', styles: { fontStyle: 'bold' as const } },
        `: ${p?.parent_phone || '-'}`,
      ],
      [
        { content: 'Kelas / Jurusan', styles: { fontStyle: 'bold' as const } },
        `: ${c?.class_name || '-'} (${c?.major || '-'})`,
        { content: 'Alamat Siswa', styles: { fontStyle: 'bold' as const } },
        `: ${a?.full_address || '-'}`,
      ],
      [
        { content: 'Tempat, Tanggal Lahir', styles: { fontStyle: 'bold' as const } },
        `: ${s.birth_place || '-'}, ${s.birth_date || '-'}`,
        { content: 'Asal Sekolah', styles: { fontStyle: 'bold' as const } },
        `: ${s.previous_school || '-'}`,
      ],
    ];

    autoTable(doc, {
      startY: curY,
      body: bioBody,
      theme: 'plain',
      styles: { fontSize: 8.5, cellPadding: 1.2 },
      columnStyles: {
        0: { cellWidth: 38 },
        1: { cellWidth: 55 },
        2: { cellWidth: 35 },
        3: { cellWidth: 55 },
      },
      margin: { left: 14, right: 14 },
    });

    curY = ((doc as any).lastAutoTable?.finalY ?? curY) + 4;

    // REKAP MONITORING (PRESENSI & KEDISIPLINAN)
    const att = data.attendance_summary;
    const disc = data.discipline_score;

    const statBody = [
      [
        `Total Pertemuan: ${att.total} Hari`,
        `Hadir: ${att.hadir}`,
        `Sakit: ${att.sakit}`,
        `Izin: ${att.izin}`,
        `Alpa: ${att.alpa}`,
        `Terlambat: ${att.terlambat}`,
        `Kehadiran: ${att.attendance_rate}%`,
      ],
      [
        { content: `Indeks Disiplin: ${disc.score}/100 (${disc.category})`, colSpan: 3, styles: { fontStyle: 'bold' as const } },
        { content: `Status Early Warning: ${data.warning_level}`, colSpan: 4, styles: { fontStyle: 'bold' as const } },
      ]
    ];

    autoTable(doc, {
      startY: curY,
      head: [['REKAPITULASI PRESENSI & TINGKAT KEDISIPLINAN']],
      body: statBody,
      theme: 'grid',
      headStyles: { fillColor: [40, 60, 90], textColor: 255, fontSize: 9, halign: 'center' },
      styles: { fontSize: 8.5, cellPadding: 2, halign: 'center' },
      margin: { left: 14, right: 14 },
    });

    curY = ((doc as any).lastAutoTable?.finalY ?? curY) + 4;

    // RIWAYAT PELANGGARAN & PEMBINAAN
    const violRecords = db.violations.filter(v => v.student_id === s.student_id);
    const guidRecords = db.guidance.filter(g => g.student_id === s.student_id);

    const violGuidBody = violRecords.map(v => {
      const guidances = guidRecords.filter(g => g.violation_id === v.violation_id || g.date >= v.date);
      const guidSummary = guidances.length > 0 
        ? guidances.map(g => `• [${g.stage} - ${g.date}] ${g.notes}`).join('\n')
        : 'Belum ada pembinaan lanjutan';

      return [
        v.date,
        `${v.violation_type} (${v.level} - Poin: ${v.penalty_points})`,
        v.chronology,
        guidSummary,
        v.status,
      ];
    });

    if (violGuidBody.length === 0) {
      violGuidBody.push(['-', 'Tidak ada catatan pelanggaran (Siswa Tertib)', '-', '-', 'Bersih']);
    }

    autoTable(doc, {
      startY: curY,
      head: [['Tanggal', 'Pelanggaran / Tingkat', 'Kronologi / Masalah', 'Tindakan & Tahap Pembinaan', 'Status']],
      body: violGuidBody,
      theme: 'grid',
      headStyles: { fillColor: [60, 80, 110], textColor: 255, fontSize: 8.5 },
      styles: { fontSize: 7.5, cellPadding: 2 },
      columnStyles: {
        0: { cellWidth: 20 },
        1: { cellWidth: 42 },
        2: { cellWidth: 48 },
        3: { cellWidth: 52 },
        4: { cellWidth: 20, halign: 'center' },
      },
      margin: { left: 14, right: 14 },
    });

    curY = ((doc as any).lastAutoTable?.finalY ?? curY) + 4;

    // HOME VISIT & PRESTASI (Jika ada)
    const studentHVs = db.home_visits.filter(hv => hv.student_id === s.student_id);
    const studentAchs = db.achievements.filter(ach => ach.student_id === s.student_id);

    if (studentHVs.length > 0 || studentAchs.length > 0) {
      const extraRows: any[] = [];
      studentHVs.forEach(hv => {
        extraRows.push([
          hv.date,
          'Home Visit',
          `Alasan: ${hv.reason}\nDitemui: ${hv.met_parties}`,
          `Hasil & Kesepakatan: ${hv.result} | ${hv.agreement}`,
          'Selesai'
        ]);
      });
      studentAchs.forEach(ach => {
        extraRows.push([
          ach.date,
          'Prestasi Siswa',
          `${ach.title} (${ach.level})`,
          `Peringkat: ${ach.rank} | Penyelenggara: ${ach.organizer}`,
          'Terverifikasi'
        ]);
      });

      autoTable(doc, {
        startY: curY,
        head: [['Tanggal', 'Kategori', 'Uraian Kegiatan / Prestasi', 'Hasil / Tindak Lanjut', 'Status']],
        body: extraRows,
        theme: 'grid',
        headStyles: { fillColor: [75, 95, 125], textColor: 255, fontSize: 8.5 },
        styles: { fontSize: 7.5, cellPadding: 2 },
        columnStyles: {
          0: { cellWidth: 20 },
          1: { cellWidth: 28 },
          2: { cellWidth: 55 },
          3: { cellWidth: 55 },
          4: { cellWidth: 24, halign: 'center' },
        },
        margin: { left: 14, right: 14 },
      });

      curY = ((doc as any).lastAutoTable?.finalY ?? curY) + 6;
    } else {
      curY += 4;
    }

    // TANDA TANGAN (Wali Kelas & Kepala Sekolah)
    if (curY > 235) {
      doc.addPage();
      curY = 30;
    }

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8.5);

    const sigCol1 = 25;
    const sigCol2 = pageWidth - 75;

    doc.text(`Mengetahui,`, sigCol1, curY);
    doc.text(`Kepala Sekolah`, sigCol1, curY + 5);

    doc.text(`${(settings.school_city || '').replace('Kabupaten ', '').replace('Kota ', '')}, ${today}`, sigCol2, curY);
    doc.text(`Wali Kelas ${c?.class_name || ''}`, sigCol2, curY + 5);

    const sigNameY = curY + 28;

    doc.setFont('helvetica', 'bold');
    doc.text(settings.principal_name || 'Kepala Sekolah', sigCol1, sigNameY);
    doc.setFont('helvetica', 'normal');
    doc.text(`NIP. ${settings.principal_nip || '-'}`, sigCol1, sigNameY + 4);

    doc.setFont('helvetica', 'bold');
    doc.text(settings.homeroom_teacher_name || 'Wali Kelas', sigCol2, sigNameY);
    doc.setFont('helvetica', 'normal');
    doc.text(`NIP. ${settings.homeroom_teacher_nip || '-'}`, sigCol2, sigNameY + 4);

    // Simpan file PDF
    const safeName = (s.full_name || 'Siswa').replace(/[^a-zA-Z0-9]/g, '_');
    doc.save(`Laporan_WaliKelas_${s.student_id}_${safeName}.pdf`);
  } catch (error) {
    console.error('Gagal generate PDF Siswa:', error);
    throw new Error('Gagal membuat PDF rapor siswa. Silakan periksa data.');
  }
}

export function generateClassRecapPDF(
  students: StudentFullData[],
  className: string,
  academicYearName: string,
  settings: SchoolSettings
): void {
  try {
    const doc = new jsPDF({
      orientation: 'landscape',
      unit: 'mm',
      format: 'a4',
    });

    const pageWidth = doc.internal.pageSize.getWidth();
    const today = new Date().toLocaleDateString('id-ID', {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    });

    // KOP
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(13);
    doc.text(settings.school_name.toUpperCase(), pageWidth / 2, 14, { align: 'center' });
    doc.setFontSize(8.5);
    doc.setFont('helvetica', 'normal');
    doc.text(`${settings.school_address}, ${settings.school_city} | NPSN: ${settings.npsn}`, pageWidth / 2, 19, { align: 'center' });

    doc.setLineWidth(0.6);
    doc.line(12, 22, pageWidth - 12, 22);

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(11);
    doc.text(`REKAPITULASI MONITORING WALI KELAS — ${className.toUpperCase()}`, pageWidth / 2, 28, { align: 'center' });
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9);
    doc.text(`Tahun Ajaran: ${academicYearName} | Wali Kelas: ${settings.homeroom_teacher_name}`, pageWidth / 2, 33, { align: 'center' });

    const tableBody = students.map((d, idx) => {
      const s = d.student;
      const att = d.attendance_summary;
      const disc = d.discipline_score;
      return [
        idx + 1,
        s.student_id,
        s.nis || '-',
        s.full_name,
        s.gender,
        att.hadir,
        att.sakit,
        att.izin,
        att.alpa,
        att.terlambat,
        `${att.attendance_rate}%`,
        `${disc.score} (${disc.category})`,
        d.violation_count,
        d.home_visit_count,
        d.achievement_count,
        d.warning_level,
      ];
    });

    autoTable(doc, {
      startY: 38,
      head: [[
        'No', 'ID Siswa', 'NIS', 'Nama Lengkap', 'JK', 
        'H', 'S', 'I', 'A', 'T', '% Hadir', 
        'Indeks Disiplin', 'Pelanggaran', 'HV', 'Prestasi', 'Early Warning'
      ]],
      body: tableBody,
      theme: 'grid',
      headStyles: { fillColor: [40, 60, 90], textColor: 255, fontSize: 8, halign: 'center' },
      styles: { fontSize: 7.5, cellPadding: 1.5 },
      columnStyles: {
        0: { cellWidth: 8, halign: 'center' },
        1: { cellWidth: 20, halign: 'center' },
        2: { cellWidth: 18, halign: 'center' },
        3: { cellWidth: 48 },
        4: { cellWidth: 9, halign: 'center' },
        5: { cellWidth: 9, halign: 'center' },
        6: { cellWidth: 9, halign: 'center' },
        7: { cellWidth: 9, halign: 'center' },
        8: { cellWidth: 9, halign: 'center' },
        9: { cellWidth: 9, halign: 'center' },
        10: { cellWidth: 16, halign: 'center' },
        11: { cellWidth: 32, halign: 'center' },
        12: { cellWidth: 18, halign: 'center' },
        13: { cellWidth: 12, halign: 'center' },
        14: { cellWidth: 15, halign: 'center' },
        15: { cellWidth: 24, halign: 'center' },
      },
      margin: { left: 12, right: 12 },
    });

    const finalY = ((doc as any).lastAutoTable?.finalY ?? 150) + 8;
    if (finalY < 185) {
      doc.setFontSize(8.5);
      const col2 = pageWidth - 80;
      doc.text(`${(settings.school_city || '').replace('Kabupaten ', '').replace('Kota ', '')}, ${today}`, col2, finalY);
      doc.text(`Wali Kelas ${className}`, col2, finalY + 5);
      doc.setFont('helvetica', 'bold');
      doc.text(settings.homeroom_teacher_name || 'Wali Kelas', col2, finalY + 22);
      doc.setFont('helvetica', 'normal');
      doc.text(`NIP. ${settings.homeroom_teacher_nip || '-'}`, col2, finalY + 26);
    }

    doc.save(`Rekap_Kelas_${className.replace(/\s+/g, '_')}_${new Date().toISOString().split('T')[0]}.pdf`);
  } catch (error) {
    console.error('Gagal generate PDF Rekap Kelas:', error);
    throw new Error('Gagal membuat PDF rekap kelas. Silakan periksa data.');
  }
}

export interface MonthlyAttendanceStudentSummary {
  student_id: string;
  nis: string;
  full_name: string;
  hadir: number;
  sakit: number;
  izin: number;
  alpa: number;
  terlambat: number;
  total_recorded: number;
  attendance_percentage: number;
}

export function generateMonthlyAttendancePDF(
  summaries: MonthlyAttendanceStudentSummary[],
  className: string,
  academicYearName: string,
  semester: string,
  monthName: string,
  year: number,
  settings: SchoolSettings
): void {
  try {
    const doc = new jsPDF({
      orientation: 'landscape',
      unit: 'mm',
      format: 'a4',
    });

    const pageWidth = doc.internal.pageSize.getWidth();
    const today = new Date().toLocaleDateString('id-ID', {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    });

    // 1. KOP SURAT RESMI
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(13);
    doc.text((settings.school_name || 'SEKOLAH').toUpperCase(), pageWidth / 2, 14, { align: 'center' });
    doc.setFontSize(8.5);
    doc.setFont('helvetica', 'normal');
    doc.text(`${settings.school_address || ''}, ${settings.school_city || ''} | NPSN: ${settings.npsn || '-'}`, pageWidth / 2, 19, { align: 'center' });

    doc.setLineWidth(0.6);
    doc.line(12, 22, pageWidth - 12, 22);

    // 2. JUDUL DOKUMEN
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(11);
    doc.text(`REKAPITULASI PRESENSI SISWA — BULAN ${monthName.toUpperCase()} ${year}`, pageWidth / 2, 28, { align: 'center' });
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8.5);
    doc.text(`Kelas: ${className} | Semester: ${semester} | Tahun Ajaran: ${academicYearName} | Wali Kelas: ${settings.homeroom_teacher_name}`, pageWidth / 2, 33, { align: 'center' });

    // 3. TABLE BODY
    const tableBody = summaries.map((s, idx) => [
      idx + 1,
      s.student_id,
      s.nis || '-',
      s.full_name,
      s.hadir,
      s.sakit,
      s.izin,
      s.alpa,
      s.terlambat,
      s.total_recorded,
      `${s.attendance_percentage}%`,
    ]);

    // Totals
    const totHadir = summaries.reduce((acc, curr) => acc + curr.hadir, 0);
    const totSakit = summaries.reduce((acc, curr) => acc + curr.sakit, 0);
    const totIzin = summaries.reduce((acc, curr) => acc + curr.izin, 0);
    const totAlpa = summaries.reduce((acc, curr) => acc + curr.alpa, 0);
    const totTerlambat = summaries.reduce((acc, curr) => acc + curr.terlambat, 0);
    const avgRate = summaries.length > 0
      ? Math.round(summaries.reduce((acc, curr) => acc + curr.attendance_percentage, 0) / summaries.length)
      : 0;

    tableBody.push([
      { content: 'TOTAL KELAS / RATA-RATA', colSpan: 4, styles: { fontStyle: 'bold' as const, halign: 'center' as const } } as any,
      { content: String(totHadir), styles: { fontStyle: 'bold' as const, halign: 'center' as const } } as any,
      { content: String(totSakit), styles: { fontStyle: 'bold' as const, halign: 'center' as const } } as any,
      { content: String(totIzin), styles: { fontStyle: 'bold' as const, halign: 'center' as const } } as any,
      { content: String(totAlpa), styles: { fontStyle: 'bold' as const, halign: 'center' as const } } as any,
      { content: String(totTerlambat), styles: { fontStyle: 'bold' as const, halign: 'center' as const } } as any,
      { content: '-', styles: { fontStyle: 'bold' as const, halign: 'center' as const } } as any,
      { content: `${avgRate}%`, styles: { fontStyle: 'bold' as const, halign: 'center' as const } } as any,
    ]);

    autoTable(doc, {
      startY: 38,
      head: [[
        'No', 'ID Siswa', 'NIS', 'Nama Lengkap Siswa',
        'Hadir (H)', 'Sakit (S)', 'Izin (I)', 'Alpa (A)', 'Terlambat (T)',
        'Total Hari', '% Kehadiran'
      ]],
      body: tableBody,
      theme: 'grid',
      headStyles: { fillColor: [30, 58, 138], textColor: 255, fontSize: 8.5, halign: 'center' },
      styles: { fontSize: 8, cellPadding: 1.8 },
      columnStyles: {
        0: { cellWidth: 10, halign: 'center' },
        1: { cellWidth: 26, halign: 'center' },
        2: { cellWidth: 22, halign: 'center' },
        3: { cellWidth: 70 },
        4: { cellWidth: 20, halign: 'center' },
        5: { cellWidth: 18, halign: 'center' },
        6: { cellWidth: 18, halign: 'center' },
        7: { cellWidth: 18, halign: 'center' },
        8: { cellWidth: 24, halign: 'center' },
        9: { cellWidth: 22, halign: 'center' },
        10: { cellWidth: 24, halign: 'center' },
      },
      margin: { left: 12, right: 12 },
    });

    let finalY = ((doc as any).lastAutoTable?.finalY ?? 140) + 8;
    if (finalY > 175) {
      doc.addPage();
      finalY = 25;
    }

    // SIGNATURE AREA
    doc.setFontSize(8.5);
    const col1 = 30;
    const col2 = pageWidth - 85;

    doc.text(`Mengetahui,`, col1, finalY);
    doc.text(`Kepala Sekolah`, col1, finalY + 5);

    doc.text(`${(settings.school_city || '').replace('Kabupaten ', '').replace('Kota ', '')}, ${today}`, col2, finalY);
    doc.text(`Wali Kelas ${className}`, col2, finalY + 5);

    const sigNameY = finalY + 22;
    doc.setFont('helvetica', 'bold');
    doc.text(settings.principal_name || 'Kepala Sekolah', col1, sigNameY);
    doc.setFont('helvetica', 'normal');
    doc.text(`NIP. ${settings.principal_nip || '-'}`, col1, sigNameY + 4);

    doc.setFont('helvetica', 'bold');
    doc.text(settings.homeroom_teacher_name || 'Wali Kelas', col2, sigNameY);
    doc.setFont('helvetica', 'normal');
    doc.text(`NIP. ${settings.homeroom_teacher_nip || '-'}`, col2, sigNameY + 4);

    doc.save(`Rekap_Presensi_${className.replace(/\s+/g, '_')}_${monthName}_${year}.pdf`);
  } catch (error) {
    console.error('Gagal generate PDF Rekap Bulanan:', error);
    throw new Error('Gagal membuat PDF rekap presensi bulanan. Silakan periksa data laporan.');
  }
}
