/**
 * PRD v1.1 - Wali Kelas Management System Type Definitions
 */

export type StudentStatus = 'Aktif' | 'Lulus' | 'Pindah' | 'Keluar' | 'Alumni';

export type Gender = 'L' | 'P';

export type AttendanceStatus = 'Hadir' | 'Sakit' | 'Izin' | 'Alpa' | 'Terlambat';

export type ViolationLevel = 'Ringan' | 'Sedang' | 'Berat';

export type ViolationStatus = 'Open' | 'Dalam Pembinaan' | 'Selesai';

export type GuidanceStage = 
  | 'Pembinaan 1'
  | 'Pembinaan 2'
  | 'Komunikasi Orang Tua'
  | 'Monitoring'
  | 'Home Visit'
  | 'Peringatan Tertulis'
  | 'Selesai';

export type NoteCategory = 
  | 'Akademik'
  | 'Disiplin'
  | 'Perilaku'
  | 'Sosial'
  | 'Positif'
  | 'Lainnya';

export type AchievementCategory = 
  | 'Akademik'
  | 'Non-Akademik'
  | 'Seni & Budaya'
  | 'Olahraga'
  | 'Keagamaan'
  | 'Teknologi & Vokasi'
  | 'Lainnya';

export type AchievementLevel = 
  | 'Sekolah'
  | 'Kecamatan'
  | 'Kabupaten/Kota'
  | 'Provinsi'
  | 'Nasional'
  | 'Internasional';

export type CommMedia = 'WhatsApp' | 'Telepon' | 'Tatap Muka di Sekolah' | 'Home Visit' | 'Surat Resmi';

export type WarningLevel = 'Normal' | 'Perlu Perhatian' | 'Prioritas Tinggi';

export interface Student {
  student_id: string; // STU-00001
  nis: string;
  nisn: string;
  full_name: string;
  gender: Gender;
  birth_place: string;
  birth_date: string; // YYYY-MM-DD
  nik?: string;
  religion?: string;
  phone?: string;
  previous_school?: string;
  status: StudentStatus;
  notes?: string;
  created_at: string;
  updated_at: string;
}

export interface Address {
  address_id: string;
  student_id: string;
  rt: string;
  rw: string;
  dusun: string;
  desa: string;
  kecamatan: string;
  kabupaten: string;
  full_address: string;
}

export interface Parent {
  parent_id: string;
  student_id: string;
  father_name: string;
  father_job: string;
  father_birth_date?: string | null;
  mother_name: string;
  mother_job: string;
  mother_birth_date?: string | null;
  guardian_name?: string;
  guardian_relation?: string;
  parent_phone: string;
}

export interface AcademicYear {
  academic_year_id: string;
  year_name: string; // e.g. 2026/2027
  semester: 'Ganjil' | 'Genap';
  start_date: string;
  end_date: string;
  status: 'Active' | 'Archived';
}

export interface SchoolClass {
  class_id: string;
  class_name: string; // e.g. X TKR B
  grade: number; // 10, 11, 12
  major: string; // TKR, RPL, dll
  academic_year_id: string;
  homeroom_teacher: string;
  status: 'Active' | 'Archived';
}

export interface StudentClassHistory {
  history_id: string;
  student_id: string;
  class_id: string;
  academic_year_id: string;
  start_date: string;
  end_date?: string;
  status: 'Active' | 'Completed' | 'Promoted' | 'Transferred' | 'Graduated';
  notes?: string;
}

export interface AttendanceRecord {
  attendance_id: string;
  student_id: string;
  class_id: string;
  academic_year_id: string;
  date: string; // YYYY-MM-DD
  status: AttendanceStatus;
  note?: string;
  recorded_at: string;
}

export interface ViolationRecord {
  violation_id: string;
  student_id: string;
  class_id: string;
  academic_year_id: string;
  date: string; // YYYY-MM-DD
  violation_type: string;
  level: ViolationLevel;
  chronology: string;
  action_taken: string;
  penalty_points: number;
  evidence_notes?: string;
  status: ViolationStatus;
  created_at: string;
  updated_at: string;
}

export interface GuidanceRecord {
  guidance_id: string;
  violation_id?: string; // Optional linking to violation
  student_id: string;
  class_id: string;
  academic_year_id: string;
  date: string;
  stage: GuidanceStage;
  counselor_name: string;
  notes: string;
  agreement: string;
  follow_up: string;
  status: 'Dalam Proses' | 'Selesai' | 'Butuh Rujukan BK';
  created_at: string;
}

export interface HomeVisitRecord {
  visit_id: string;
  student_id: string;
  class_id: string;
  academic_year_id: string;
  date: string;
  reason: string;
  address: string;
  met_parties: string; // e.g. Orang Tua (Ibu), Siswa
  condition: string; // Kondisi lingkungan/keluarga
  problem: string;
  result: string;
  agreement: string;
  follow_up: string;
  documentation_notes?: string;
  created_at: string;
}

export interface StudentNote {
  note_id: string;
  student_id: string;
  academic_year_id: string;
  date: string;
  category: NoteCategory;
  title: string;
  content: string;
  author: string;
  created_at: string;
}

export interface AchievementRecord {
  achievement_id: string;
  student_id: string;
  academic_year_id: string;
  title: string;
  category: AchievementCategory;
  level: AchievementLevel;
  date: string;
  rank: string; // Juara 1, 2, 3, Harapan 1, Finalis, dsb.
  organizer: string;
  documentation?: string;
  created_at: string;
}

export interface StudentPotential {
  potential_id: string;
  student_id: string;
  interests: string; // Minat
  talents: string; // Bakat
  skills: string; // Keterampilan
  notes: string;
  updated_at: string;
}

export interface ParentCommunication {
  comm_id: string;
  student_id: string;
  academic_year_id: string;
  date: string;
  parent_name: string;
  media: CommMedia;
  topic: string;
  result: string;
  follow_up: string;
  created_at: string;
}

export type ParentCommunicationRecord = ParentCommunication;
export type DisciplineFactorWeights = DisciplineSettings;
export type EarlyWarningThresholds = EarlyWarningSettings;
export type DuplicateHandling = 'create_new' | 'update_existing' | 'skip';
export type ExcelImportRow = any;
export type ExcelMappingConfig = any;

export interface DisciplineSettings {
  weight_attendance: number; // default 30
  weight_punctuality: number; // default 20
  weight_violations: number; // default 25
  weight_compliance: number; // default 15
  weight_responsibility: number; // default 10
}

export interface EarlyWarningSettings {
  high_priority_attendance_threshold: number; // < 80%
  high_priority_alpa_threshold: number; // >= 3
  warning_attendance_threshold: number; // < 90%
  warning_late_threshold: number; // >= 3
  warning_violation_threshold: number; // >= 2
}

export interface SchoolSettings {
  school_name: string;
  npsn: string;
  school_address: string;
  school_city: string;
  school_province: string;
  school_phone: string;
  school_email: string;
  principal_name: string;
  principal_nip: string;
  homeroom_teacher_name: string;
  homeroom_teacher_nip: string;
  current_academic_year_id: string;
  current_class_id: string;
  discipline_settings: DisciplineSettings;
  early_warning_settings: EarlyWarningSettings;
}

export interface AppDatabase {
  version: string;
  last_backup: string;
  school_settings: SchoolSettings;
  academic_years: AcademicYear[];
  classes: SchoolClass[];
  students: Student[];
  addresses: Address[];
  parents: Parent[];
  student_class_history: StudentClassHistory[];
  attendance: AttendanceRecord[];
  violations: ViolationRecord[];
  guidance: GuidanceRecord[];
  home_visits: HomeVisitRecord[];
  student_notes: StudentNote[];
  achievements: AchievementRecord[];
  potentials: StudentPotential[];
  parent_communications: ParentCommunication[];
}

export interface StudentFullData {
  student: Student;
  address?: Address;
  parent?: Parent;
  potential?: StudentPotential;
  current_class?: SchoolClass;
  current_history?: StudentClassHistory;
  class_history: {
    history: StudentClassHistory;
    school_class?: SchoolClass;
    academic_year?: AcademicYear;
  }[];
  attendance_summary: {
    total: number;
    hadir: number;
    sakit: number;
    izin: number;
    alpa: number;
    terlambat: number;
    attendance_rate: number;
  };
  discipline_score: {
    score: number;
    category: 'Sangat Baik' | 'Baik' | 'Cukup' | 'Perlu Pembinaan' | 'Perhatian Khusus';
    factors: {
      attendance_score: number;
      punctuality_score: number;
      violation_score: number;
      compliance_score: number;
      responsibility_score: number;
    };
  };
  warning_level: WarningLevel;
  warning_reasons: string[];
  violation_count: number;
  active_violations: ViolationRecord[];
  guidance_count: number;
  home_visit_count: number;
  achievement_count: number;
  notes_count: number;
  comm_count: number;
}
