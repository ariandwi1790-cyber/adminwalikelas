import { 
  Student, 
  AttendanceRecord, 
  ViolationRecord, 
  DisciplineSettings, 
  EarlyWarningSettings, 
  WarningLevel 
} from '../types';

export function calculateAttendanceMetrics(records: AttendanceRecord[]) {
  const total = records.length;
  if (total === 0) {
    return {
      total: 0,
      hadir: 0,
      sakit: 0,
      izin: 0,
      alpa: 0,
      terlambat: 0,
      attendance_rate: 100,
    };
  }

  let hadir = 0;
  let sakit = 0;
  let izin = 0;
  let alpa = 0;
  let terlambat = 0;

  for (const r of records) {
    if (r.status === 'Hadir') hadir++;
    else if (r.status === 'Sakit') sakit++;
    else if (r.status === 'Izin') izin++;
    else if (r.status === 'Alpa') alpa++;
    else if (r.status === 'Terlambat') {
      terlambat++;
      hadir++; // Terlambat tetap dihitung hadir secara fisik tetapi kena penalti ketepatan waktu
    }
  }

  // Attendance rate (Hadir / Total) * 100
  // Note: Sakit & Izin are with permission, but pure presence rate
  const rate = total > 0 ? Math.round(((hadir) / total) * 100) : 100;

  return {
    total,
    hadir,
    sakit,
    izin,
    alpa,
    terlambat,
    attendance_rate: Math.min(100, Math.max(0, rate)),
  };
}

export function calculateDisciplineIndex(
  attendanceRecords: AttendanceRecord[],
  violations: ViolationRecord[],
  settings: DisciplineSettings
) {
  const metrics = calculateAttendanceMetrics(attendanceRecords);

  // 1. Attendance Factor (0-100)
  // Kehadiran base score
  let attendanceScore = 100;
  if (metrics.total > 0) {
    // Pengurangan berat untuk alpa (tiap 1 alpa -15 poin dari skor kehadiran)
    const alpaPenalty = metrics.alpa * 15;
    const basicRate = (metrics.hadir / metrics.total) * 100;
    attendanceScore = Math.max(0, basicRate - alpaPenalty);
  }

  // 2. Punctuality Factor (0-100)
  let punctualityScore = 100;
  if (metrics.total > 0) {
    // Tiap terlambat memotong 10 poin dari faktor ketepatan waktu
    punctualityScore = Math.max(0, 100 - (metrics.terlambat * 10));
  }

  // 3. Violations Factor (0-100)
  // Tiap poin pelanggaran mengurangi skor
  let totalPenaltyPoints = 0;
  let activeBeratCount = 0;

  for (const v of violations) {
    totalPenaltyPoints += v.penalty_points || (v.level === 'Berat' ? 30 : v.level === 'Sedang' ? 15 : 5);
    if (v.level === 'Berat' && v.status !== 'Selesai') {
      activeBeratCount++;
    }
  }

  let violationScore = Math.max(0, 100 - totalPenaltyPoints);

  // 4. Compliance Factor (Kepatuhan seragam, kelengkapan, dsb) (0-100)
  // Dihitung berdasarkan pelanggaran ringan & sedang yang tercatat
  const minorViolations = violations.filter(v => v.level === 'Ringan').length;
  const complianceScore = Math.max(0, 100 - (minorViolations * 8));

  // 5. Responsibility Factor (Tanggung jawab tugas, sikap) (0-100)
  const medViolations = violations.filter(v => v.level === 'Sedang').length;
  const responsibilityScore = Math.max(0, 100 - (medViolations * 12) - (activeBeratCount * 25));

  // Total weighted calculation
  const totalWeight = 
    (settings.weight_attendance || 30) +
    (settings.weight_punctuality || 20) +
    (settings.weight_violations || 25) +
    (settings.weight_compliance || 15) +
    (settings.weight_responsibility || 10);

  const finalScore = Math.round(
    (
      (attendanceScore * (settings.weight_attendance || 30)) +
      (punctualityScore * (settings.weight_punctuality || 20)) +
      (violationScore * (settings.weight_violations || 25)) +
      (complianceScore * (settings.weight_compliance || 15)) +
      (responsibilityScore * (settings.weight_responsibility || 10))
    ) / (totalWeight || 100)
  );

  const boundedScore = Math.min(100, Math.max(0, finalScore));

  let category: 'Sangat Baik' | 'Baik' | 'Cukup' | 'Perlu Pembinaan' | 'Perhatian Khusus';
  if (boundedScore >= 90) category = 'Sangat Baik';
  else if (boundedScore >= 80) category = 'Baik';
  else if (boundedScore >= 70) category = 'Cukup';
  else if (boundedScore >= 60) category = 'Perlu Pembinaan';
  else category = 'Perhatian Khusus';

  return {
    score: boundedScore,
    category,
    factors: {
      attendance_score: Math.round(attendanceScore),
      punctuality_score: Math.round(punctualityScore),
      violation_score: Math.round(violationScore),
      compliance_score: Math.round(complianceScore),
      responsibility_score: Math.round(responsibilityScore),
    }
  };
}

export function evaluateEarlyWarning(
  attendanceRecords: AttendanceRecord[],
  violations: ViolationRecord[],
  settings: EarlyWarningSettings
): { level: WarningLevel; reasons: string[] } {
  const metrics = calculateAttendanceMetrics(attendanceRecords);
  const reasons: string[] = [];

  const activeViolations = violations.filter(v => v.status !== 'Selesai');
  const activeBerat = activeViolations.filter(v => v.level === 'Berat');

  // Rule 1: High Priority (Prioritas Tinggi)
  // Kehadiran < threshold (80%) ATAU Alpa >= threshold (3) ATAU Kasus berat aktif
  let isHighPriority = false;

  if (metrics.total >= 5 && metrics.attendance_rate < settings.high_priority_attendance_threshold) {
    isHighPriority = true;
    reasons.push(`Tingkat kehadiran sangat rendah (${metrics.attendance_rate}% < ${settings.high_priority_attendance_threshold}%)`);
  }

  if (metrics.alpa >= settings.high_priority_alpa_threshold) {
    isHighPriority = true;
    reasons.push(`Akumulasi Alpa mencapai ${metrics.alpa} hari (Batas: ${settings.high_priority_alpa_threshold})`);
  }

  if (activeBerat.length > 0) {
    isHighPriority = true;
    reasons.push(`Memiliki ${activeBerat.length} kasus pelanggaran berat aktif yang belum selesai`);
  }

  if (isHighPriority) {
    return { level: 'Prioritas Tinggi', reasons };
  }

  // Rule 2: Warning (Perlu Perhatian)
  // Kehadiran 80-89% ATAU Terlambat >= 3 ATAU Pelanggaran >= 2
  let isWarning = false;

  if (metrics.total >= 5 && metrics.attendance_rate < settings.warning_attendance_threshold) {
    isWarning = true;
    reasons.push(`Kehadiran di bawah standar (${metrics.attendance_rate}% < ${settings.warning_attendance_threshold}%)`);
  }

  if (metrics.terlambat >= settings.warning_late_threshold) {
    isWarning = true;
    reasons.push(`Sering terlambat (${metrics.terlambat} kali terlambat)`);
  }

  if (activeViolations.length >= settings.warning_violation_threshold) {
    isWarning = true;
    reasons.push(`Terdapat ${activeViolations.length} catatan pelanggaran belum selesai`);
  }

  if (isWarning) {
    return { level: 'Perlu Perhatian', reasons };
  }

  return { level: 'Normal', reasons: ['Kondisi dan perkembangan siswa terpantau stabil dan tertib.'] };
}

export function generateNextStudentId(existingStudents: Student[]): string {
  if (!existingStudents || existingStudents.length === 0) {
    return 'STU-00001';
  }

  let maxNum = 0;
  for (const s of existingStudents) {
    const match = s.student_id?.match(/STU-(\d+)/i);
    if (match && match[1]) {
      const num = parseInt(match[1], 10);
      if (!isNaN(num) && num > maxNum) {
        maxNum = num;
      }
    }
  }

  const nextNum = maxNum + 1;
  return `STU-${String(nextNum).padStart(5, '0')}`;
}
