import { 
  Student, 
  AttendanceRecord, 
  ViolationRecord, 
  DisciplineSettings, 
  EarlyWarningSettings, 
  PeriodicEvaluation,
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
      physical_presence_count: 0,
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
    }
  }

  // Formula: (Hadir + Terlambat) / Total Hari Efektif * 100
  // Terlambat tetap hadir fisik, Sakit & Izin bukan kehadiran fisik (meski berizin)
  const physicalPresence = hadir + terlambat;
  const rate = total > 0 ? Math.round((physicalPresence / total) * 100) : 100;

  return {
    total,
    hadir,
    sakit,
    izin,
    alpa,
    terlambat,
    physical_presence_count: physicalPresence,
    attendance_rate: Math.min(100, Math.max(0, rate)),
  };
}

export function calculateDisciplineIndex(
  attendanceRecords: AttendanceRecord[],
  violations: ViolationRecord[],
  settings: DisciplineSettings,
  evaluation?: PeriodicEvaluation
) {
  const metrics = calculateAttendanceMetrics(attendanceRecords);

  // 1. Attendance Factor (30% weight) - Range 0 to 100
  let attendanceScore = 100;
  if (metrics.total > 0) {
    const basicRate = (metrics.physical_presence_count / metrics.total) * 100;
    // Alpa gives strict penalty of 15 points per occurrence
    const alpaPenalty = metrics.alpa * 15;
    attendanceScore = Math.max(0, Math.min(100, basicRate - alpaPenalty));
  }

  // 2. Punctuality Factor (20% weight) - Range 0 to 100
  // Each late arrival deducts 10 points
  let punctualityScore = 100;
  if (metrics.total > 0) {
    punctualityScore = Math.max(0, 100 - (metrics.terlambat * 10));
  }

  // 3. Violation-Free Factor (25% weight) - Range 0 to 100
  let totalPenaltyPoints = 0;
  for (const v of violations) {
    const points = typeof v.penalty_points === 'number' && v.penalty_points > 0
      ? v.penalty_points
      : (v.level === 'Berat' ? 30 : v.level === 'Sedang' ? 15 : 5);
    totalPenaltyPoints += points;
  }
  const violationScore = Math.max(0, 100 - totalPenaltyPoints);

  // 4. Compliance Factor (15% weight) - Range 0 to 100
  // Sourced from periodic homeroom teacher evaluation; fallback to 0 if not assessed yet
  const hasComplianceInput = typeof evaluation?.compliance_score === 'number' && !isNaN(evaluation.compliance_score);
  const complianceScore = hasComplianceInput ? Math.min(100, Math.max(0, evaluation!.compliance_score!)) : 0;

  // 5. Responsibility Factor (10% weight) - Range 0 to 100
  // Sourced from periodic homeroom teacher evaluation; fallback to 0 if not assessed yet
  const hasResponsibilityInput = typeof evaluation?.responsibility_score === 'number' && !isNaN(evaluation.responsibility_score);
  const responsibilityScore = hasResponsibilityInput ? Math.min(100, Math.max(0, evaluation!.responsibility_score!)) : 0;

  const isComplete = hasComplianceInput && hasResponsibilityInput;
  const statusLabel = isComplete ? 'Penilaian Lengkap' : 'Penilaian belum lengkap';

  const wAttendance = settings.weight_attendance ?? 30;
  const wPunctuality = settings.weight_punctuality ?? 20;
  const wViolations = settings.weight_violations ?? 25;
  const wCompliance = settings.weight_compliance ?? 15;
  const wResponsibility = settings.weight_responsibility ?? 10;

  const totalWeight = wAttendance + wPunctuality + wViolations + wCompliance + wResponsibility;

  // If complete, calculate exact 5-factor weighted score
  // If incomplete, calculate based on assessed factors without fabricating data
  let finalScore = 0;
  if (isComplete) {
    finalScore = Math.round(
      (
        (attendanceScore * wAttendance) +
        (punctualityScore * wPunctuality) +
        (violationScore * wViolations) +
        (complianceScore * wCompliance) +
        (responsibilityScore * wResponsibility)
      ) / (totalWeight || 100)
    );
  } else {
    // Calculate objective baseline (Kehadiran 30% + Ketepatan 20% + Bebas Pelanggaran 25% = 75% total baseline)
    const baselineWeight = wAttendance + wPunctuality + wViolations;
    finalScore = Math.round(
      (
        (attendanceScore * wAttendance) +
        (punctualityScore * wPunctuality) +
        (violationScore * wViolations)
      ) / (baselineWeight || 75)
    );
  }

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
    is_complete: isComplete,
    status_label: statusLabel,
    factors: {
      attendance_score: Math.round(attendanceScore),
      punctuality_score: Math.round(punctualityScore),
      violation_score: Math.round(violationScore),
      compliance_score: Math.round(complianceScore),
      responsibility_score: Math.round(responsibilityScore),
      has_compliance_input: hasComplianceInput,
      has_responsibility_input: hasResponsibilityInput,
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

  const highAttThresh = settings.high_priority_attendance_threshold ?? 80;
  const highAlpaThresh = settings.high_priority_alpa_threshold ?? 3;
  const warnAttThresh = settings.warning_attendance_threshold ?? 90;
  const warnLateThresh = settings.warning_late_threshold ?? 3;
  const warnViolThresh = settings.warning_violation_threshold ?? 2;

  // Rule 1: High Priority (Prioritas Tinggi)
  // Kehadiran < threshold (80%) ATAU Alpa >= threshold (3) ATAU Kasus berat aktif
  let isHighPriority = false;

  if (metrics.total >= 3 && metrics.attendance_rate < highAttThresh) {
    isHighPriority = true;
    reasons.push(`Tingkat kehadiran sangat rendah (${metrics.attendance_rate}% < ${highAttThresh}%)`);
  }

  if (metrics.alpa >= highAlpaThresh) {
    isHighPriority = true;
    reasons.push(`Akumulasi Alpa mencapai ${metrics.alpa} hari (Batas aman: < ${highAlpaThresh})`);
  }

  if (activeBerat.length > 0) {
    isHighPriority = true;
    reasons.push(`Memiliki ${activeBerat.length} kasus pelanggaran berat aktif yang belum selesai`);
  }

  if (isHighPriority) {
    return { level: 'Prioritas Tinggi', reasons };
  }

  // Rule 2: Warning (Perlu Perhatian)
  // Kehadiran di bawah standar (80-89%) ATAU Terlambat >= 3 ATAU Pelanggaran Aktif >= 2
  let isWarning = false;

  if (metrics.total >= 3 && metrics.attendance_rate < warnAttThresh) {
    isWarning = true;
    reasons.push(`Kehadiran di bawah standar (${metrics.attendance_rate}% < ${warnAttThresh}%)`);
  }

  if (metrics.terlambat >= warnLateThresh) {
    isWarning = true;
    reasons.push(`Sering terlambat (${metrics.terlambat} kali terlambat)`);
  }

  if (activeViolations.length >= warnViolThresh) {
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
