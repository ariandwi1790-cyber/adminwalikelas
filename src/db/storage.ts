import { 
  AppDatabase, 
  Student, 
  Address, 
  Parent, 
  SchoolClass, 
  AcademicYear, 
  StudentClassHistory, 
  AttendanceRecord, 
  ViolationRecord, 
  GuidanceRecord, 
  HomeVisitRecord, 
  StudentNote, 
  AchievementRecord, 
  StudentPotential, 
  ParentCommunication,
  SchoolSettings,
  StudentFullData
} from '../types';
import { INITIAL_SEED_DATA } from './seedData';
import { 
  calculateAttendanceMetrics, 
  calculateDisciplineIndex, 
  evaluateEarlyWarning, 
  generateNextStudentId 
} from '../utils/calculations';

const STORAGE_KEY = 'wali_kelas_db_v2_0';

export function loadDatabase(): AppDatabase {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      // Also check previous keys or reset to fresh seed data
      saveDatabase(INITIAL_SEED_DATA);
      return INITIAL_SEED_DATA;
    }
    const parsed = JSON.parse(raw) as AppDatabase;
    // Integrity check
    if (!parsed.students || !parsed.school_settings || parsed.students.length === 0) {
      saveDatabase(INITIAL_SEED_DATA);
      return INITIAL_SEED_DATA;
    }
    return parsed;
  } catch (err) {
    console.error('Error reading database from localStorage:', err);
    saveDatabase(INITIAL_SEED_DATA);
    return INITIAL_SEED_DATA;
  }
}

export function saveDatabase(db: AppDatabase): void {
  try {
    db.last_backup = new Date().toISOString();
    localStorage.setItem(STORAGE_KEY, JSON.stringify(db));
    window.dispatchEvent(new Event('wali_kelas_db_updated'));
  } catch (err) {
    console.error('Error saving database to localStorage:', err);
  }
}

export function resetToSeedData(): AppDatabase {
  saveDatabase(INITIAL_SEED_DATA);
  return INITIAL_SEED_DATA;
}

export const resetDatabaseToSeed = resetToSeedData;

export function exportDatabaseBackup(): string {
  const db = loadDatabase();
  return JSON.stringify(db, null, 2);
}

export function importDatabaseBackup(jsonString: string): { success: boolean; message: string; data?: AppDatabase } {
  try {
    const parsed = JSON.parse(jsonString) as AppDatabase;
    if (!parsed.students || !Array.isArray(parsed.students) || !parsed.school_settings) {
      return { success: false, message: 'Format file backup tidak valid. Pastikan file berasal dari export Wali Kelas System.' };
    }
    parsed.last_backup = new Date().toISOString();
    saveDatabase(parsed);
    return { success: true, message: `Berhasil memulihkan ${parsed.students.length} data siswa dan seluruh riwayat.`, data: parsed };
  } catch (err) {
    return { success: false, message: `Gagal memproses file JSON: ${(err as Error).message}` };
  }
}

// Student Full Data Aggregator
export function getStudentFullData(
  db: AppDatabase, 
  studentId: string, 
  selectedAcademicYearId?: string
): StudentFullData | null {
  const student = db.students.find(s => s.student_id === studentId);
  if (!student) return null;

  const address = db.addresses.find(a => a.student_id === studentId);
  const parent = db.parents.find(p => p.student_id === studentId);
  const potential = db.potentials.find(p => p.student_id === studentId);

  // Class histories
  const rawHistories = db.student_class_history.filter(h => h.student_id === studentId);
  const class_history = rawHistories.map(history => ({
    history,
    school_class: db.classes.find(c => c.class_id === history.class_id),
    academic_year: db.academic_years.find(y => y.academic_year_id === history.academic_year_id),
  }));

  // Current active history or latest
  const activeHistory = rawHistories.find(h => h.status === 'Active') || rawHistories[rawHistories.length - 1];
  const current_class = activeHistory ? db.classes.find(c => c.class_id === activeHistory.class_id) : undefined;

  // Filter records by academic year if specified
  const ayId = selectedAcademicYearId || db.school_settings.current_academic_year_id;

  const studentAttendance = db.attendance.filter(
    a => a.student_id === studentId && (!ayId || a.academic_year_id === ayId)
  );

  const studentViolations = db.violations.filter(
    v => v.student_id === studentId && (!ayId || v.academic_year_id === ayId)
  );

  const studentGuidance = db.guidance.filter(
    g => g.student_id === studentId && (!ayId || g.academic_year_id === ayId)
  );

  const studentHomeVisits = db.home_visits.filter(
    hv => hv.student_id === studentId && (!ayId || hv.academic_year_id === ayId)
  );

  const studentNotes = db.student_notes.filter(
    n => n.student_id === studentId && (!ayId || n.academic_year_id === ayId)
  );

  const studentAchievements = db.achievements.filter(
    ach => ach.student_id === studentId && (!ayId || ach.academic_year_id === ayId)
  );

  const studentComms = db.parent_communications.filter(
    c => c.student_id === studentId && (!ayId || c.academic_year_id === ayId)
  );

  // Calculations
  const attendance_summary = calculateAttendanceMetrics(studentAttendance);
  const discipline_score = calculateDisciplineIndex(
    studentAttendance,
    studentViolations,
    db.school_settings.discipline_settings
  );
  const early_warning = evaluateEarlyWarning(
    studentAttendance,
    studentViolations,
    db.school_settings.early_warning_settings
  );

  return {
    student,
    address,
    parent,
    potential,
    current_class,
    current_history: activeHistory,
    class_history,
    attendance_summary,
    discipline_score,
    warning_level: early_warning.level,
    warning_reasons: early_warning.reasons,
    violation_count: studentViolations.length,
    active_violations: studentViolations.filter(v => v.status !== 'Selesai'),
    guidance_count: studentGuidance.length,
    home_visit_count: studentHomeVisits.length,
    achievement_count: studentAchievements.length,
    notes_count: studentNotes.length,
    comm_count: studentComms.length,
  };
}

export function getAllStudentsFullData(db: AppDatabase, filterClassId?: string, filterAyId?: string): StudentFullData[] {
  const ayId = filterAyId || db.school_settings.current_academic_year_id;
  
  return db.students
    .map(s => getStudentFullData(db, s.student_id, ayId))
    .filter((data): data is StudentFullData => {
      if (!data) return false;
      if (filterClassId && filterClassId !== 'all') {
        const isInClass = data.class_history.some(
          h => h.history.class_id === filterClassId && (h.history.status === 'Active' || !filterAyId || h.history.academic_year_id === ayId)
        );
        return isInClass;
      }
      return true;
    });
}
