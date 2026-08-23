import React, { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react';
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
import { 
  loadDatabase, 
  saveDatabase, 
  resetToSeedData, 
  getStudentFullData, 
  getAllStudentsFullData 
} from '../db/storage';
import { generateNextStudentId } from '../utils/calculations';

interface DatabaseContextType {
  db: AppDatabase;
  activeAcademicYear: AcademicYear | undefined;
  activeClass: SchoolClass | undefined;
  setActiveAcademicYearId: (id: string) => void;
  setActiveClassId: (id: string) => void;
  
  // Student full query
  allStudentsFullData: StudentFullData[];
  getStudentById: (studentId: string) => StudentFullData | null;

  // Student CRUD
  addStudent: (
    studentData: Omit<Student, 'student_id' | 'created_at' | 'updated_at'>,
    addressData?: Omit<Address, 'address_id' | 'student_id'>,
    parentData?: Omit<Parent, 'parent_id' | 'student_id'>,
    potentialData?: Omit<StudentPotential, 'potential_id' | 'student_id' | 'updated_at'>,
    classId?: string
  ) => Student;
  updateStudent: (
    studentId: string,
    studentData: Partial<Student>,
    addressData?: Partial<Address>,
    parentData?: Partial<Parent>,
    potentialData?: Partial<StudentPotential>
  ) => void;
  deleteStudent: (studentId: string) => void;

  // Class & Promotion
  promoteStudents: (
    studentIds: string[],
    targetClassId: string,
    targetAcademicYearId: string,
    actionType: 'Naik Kelas' | 'Lulus' | 'Mutasi Keluar'
  ) => void;
  addClass: (newClass: Omit<SchoolClass, 'class_id'>) => SchoolClass;
  addAcademicYear: (newAy: Omit<AcademicYear, 'academic_year_id'>) => AcademicYear;

  // Attendance
  saveAttendanceBatch: (records: Omit<AttendanceRecord, 'attendance_id' | 'recorded_at'>[]) => void;

  // Violations & Guidance
  addViolation: (violation: Omit<ViolationRecord, 'violation_id' | 'created_at' | 'updated_at'>) => ViolationRecord;
  updateViolation: (violationId: string, updates: Partial<ViolationRecord>) => void;
  deleteViolation: (violationId: string) => void;
  addGuidance: (guidance: Omit<GuidanceRecord, 'guidance_id' | 'created_at'>) => GuidanceRecord;
  updateGuidance: (guidanceId: string, updates: Partial<GuidanceRecord>) => void;
  deleteGuidance: (guidanceId: string) => void;

  // Home Visit
  addHomeVisit: (hv: Omit<HomeVisitRecord, 'visit_id' | 'created_at'>) => HomeVisitRecord;
  updateHomeVisit: (visitId: string, updates: Partial<HomeVisitRecord>) => void;
  deleteHomeVisit: (visitId: string) => void;

  // Notes
  addStudentNote: (note: Omit<StudentNote, 'note_id' | 'created_at'>) => StudentNote;
  deleteStudentNote: (noteId: string) => void;

  // Achievements & Potentials
  addAchievement: (ach: Omit<AchievementRecord, 'achievement_id' | 'created_at'>) => AchievementRecord;
  deleteAchievement: (achId: string) => void;
  savePotential: (potential: Omit<StudentPotential, 'potential_id' | 'updated_at'>) => void;

  // Parent Comms
  addParentComm: (comm: Omit<ParentCommunication, 'comm_id' | 'created_at'>) => ParentCommunication;
  deleteParentComm: (commId: string) => void;

  // Settings & DB Management
  updateSettings: (settings: Partial<SchoolSettings>) => void;
  batchImportStudents: (
    studentsToImport: {
      student: Partial<Student>;
      address: Partial<Address>;
      parent: Partial<Parent>;
      classId: string;
      academicYearId: string;
      userAction: 'create_new' | 'update_existing' | 'skip';
      existingStudentId?: string;
    }[]
  ) => { created: number; updated: number; skipped: number };
  replaceAllStudentsWithImport: (
    studentsToImport: {
      student: Partial<Student>;
      address: Partial<Address>;
      parent: Partial<Parent>;
      classId: string;
      academicYearId: string;
    }[]
  ) => { totalImported: number };
  resetDatabase: () => void;
  reloadFromStorage: () => void;
}

const DatabaseContext = createContext<DatabaseContextType | null>(null);

export const DatabaseProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [db, setDb] = useState<AppDatabase>(() => loadDatabase());
  const [selectedAyId, setSelectedAyId] = useState<string>(
    () => db.school_settings?.current_academic_year_id || 'ay-2026-2027'
  );
  const [selectedClassId, setSelectedClassId] = useState<string>(
    () => db.school_settings?.current_class_id || 'cls-x-tkr-b'
  );

  const reloadFromStorage = useCallback(() => {
    const loaded = loadDatabase();
    setDb(loaded);
  }, []);

  useEffect(() => {
    const handleStorageUpdate = () => {
      setDb(loadDatabase());
    };
    window.addEventListener('wali_kelas_db_updated', handleStorageUpdate);
    return () => window.removeEventListener('wali_kelas_db_updated', handleStorageUpdate);
  }, []);

  const activeAcademicYear = db.academic_years.find(y => y.academic_year_id === selectedAyId) 
    || db.academic_years.find(y => y.status === 'Active') 
    || db.academic_years[0];

  const activeClass = db.classes.find(c => c.class_id === selectedClassId) 
    || db.classes[0];

  const allStudentsFullData = getAllStudentsFullData(db, selectedClassId, selectedAyId);

  const getStudentById = useCallback((studentId: string) => {
    return getStudentFullData(db, studentId, selectedAyId);
  }, [db, selectedAyId]);

  // Student CRUD
  const addStudent = useCallback((
    studentData: Omit<Student, 'student_id' | 'created_at' | 'updated_at'>,
    addressData?: Omit<Address, 'address_id' | 'student_id'>,
    parentData?: Omit<Parent, 'parent_id' | 'student_id'>,
    potentialData?: Omit<StudentPotential, 'potential_id' | 'student_id' | 'updated_at'>,
    classId?: string
  ): Student => {
    const newStudentId = generateNextStudentId(db.students);
    const now = new Date().toISOString();

    const newStudent: Student = {
      ...studentData,
      student_id: newStudentId,
      created_at: now,
      updated_at: now,
    };

    const targetClassId = classId || selectedClassId || db.school_settings.current_class_id;
    const targetAyId = selectedAyId || db.school_settings.current_academic_year_id;

    const newHistory: StudentClassHistory = {
      history_id: `hist-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
      student_id: newStudentId,
      class_id: targetClassId,
      academic_year_id: targetAyId,
      start_date: new Date().toISOString().split('T')[0],
      status: 'Active',
    };

    const updatedDb: AppDatabase = {
      ...db,
      students: [newStudent, ...db.students],
      student_class_history: [...db.student_class_history, newHistory],
    };

    if (addressData) {
      const newAddress: Address = {
        ...addressData,
        address_id: `addr-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
        student_id: newStudentId,
      };
      updatedDb.addresses = [...db.addresses, newAddress];
    }

    if (parentData) {
      const newParent: Parent = {
        ...parentData,
        parent_id: `par-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
        student_id: newStudentId,
      };
      updatedDb.parents = [...db.parents, newParent];
    }

    if (potentialData) {
      const newPot: StudentPotential = {
        ...potentialData,
        potential_id: `pot-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
        student_id: newStudentId,
        updated_at: now,
      };
      updatedDb.potentials = [...db.potentials, newPot];
    }

    saveDatabase(updatedDb);
    setDb(updatedDb);
    return newStudent;
  }, [db, selectedClassId, selectedAyId]);

  const updateStudent = useCallback((
    studentId: string,
    studentData: Partial<Student>,
    addressData?: Partial<Address>,
    parentData?: Partial<Parent>,
    potentialData?: Partial<StudentPotential>
  ) => {
    const now = new Date().toISOString();
    const updatedDb: AppDatabase = { ...db };

    updatedDb.students = db.students.map(s => 
      s.student_id === studentId ? { ...s, ...studentData, updated_at: now } : s
    );

    if (addressData) {
      const existing = db.addresses.find(a => a.student_id === studentId);
      if (existing) {
        updatedDb.addresses = db.addresses.map(a => 
          a.student_id === studentId ? { ...a, ...addressData } : a
        );
      } else {
        updatedDb.addresses = [
          ...db.addresses, 
          { 
            address_id: `addr-${Date.now()}`, 
            student_id: studentId, 
            rt: '', rw: '', dusun: '', desa: '', kecamatan: '', kabupaten: '', full_address: '',
            ...addressData 
          }
        ];
      }
    }

    if (parentData) {
      const existing = db.parents.find(p => p.student_id === studentId);
      if (existing) {
        updatedDb.parents = db.parents.map(p => 
          p.student_id === studentId ? { ...p, ...parentData } : p
        );
      } else {
        updatedDb.parents = [
          ...db.parents,
          {
            parent_id: `par-${Date.now()}`,
            student_id: studentId,
            father_name: '', father_job: '', mother_name: '', mother_job: '', parent_phone: '',
            ...parentData
          }
        ];
      }
    }

    if (potentialData) {
      const existing = db.potentials.find(pot => pot.student_id === studentId);
      if (existing) {
        updatedDb.potentials = db.potentials.map(pot =>
          pot.student_id === studentId ? { ...pot, ...potentialData, updated_at: now } : pot
        );
      } else {
        updatedDb.potentials = [
          ...db.potentials,
          {
            potential_id: `pot-${Date.now()}`,
            student_id: studentId,
            interests: '', talents: '', skills: '', notes: '',
            ...potentialData,
            updated_at: now,
          }
        ];
      }
    }

    saveDatabase(updatedDb);
    setDb(updatedDb);
  }, [db]);

  const deleteStudent = useCallback((studentId: string) => {
    const updatedDb: AppDatabase = {
      ...db,
      students: db.students.filter(s => s.student_id !== studentId),
      addresses: db.addresses.filter(a => a.student_id !== studentId),
      parents: db.parents.filter(p => p.student_id !== studentId),
      student_class_history: db.student_class_history.filter(h => h.student_id !== studentId),
      attendance: db.attendance.filter(att => att.student_id !== studentId),
      violations: db.violations.filter(v => v.student_id !== studentId),
      guidance: db.guidance.filter(g => g.student_id !== studentId),
      home_visits: db.home_visits.filter(hv => hv.student_id !== studentId),
      student_notes: db.student_notes.filter(n => n.student_id !== studentId),
      achievements: db.achievements.filter(ach => ach.student_id !== studentId),
      potentials: db.potentials.filter(pot => pot.student_id !== studentId),
      parent_communications: db.parent_communications.filter(c => c.student_id !== studentId),
    };
    saveDatabase(updatedDb);
    setDb(updatedDb);
  }, [db]);

  // Class Promotion & Lifecycle
  const promoteStudents = useCallback((
    studentIds: string[],
    targetClassId: string,
    targetAcademicYearId: string,
    actionType: 'Naik Kelas' | 'Lulus' | 'Mutasi Keluar'
  ) => {
    const today = new Date().toISOString().split('T')[0];
    const now = new Date().toISOString();

    const updatedHistories = [...db.student_class_history];
    const newHistories: StudentClassHistory[] = [];

    const updatedStudents = db.students.map(s => {
      if (studentIds.includes(s.student_id)) {
        // Complete current active history
        for (let i = 0; i < updatedHistories.length; i++) {
          if (updatedHistories[i].student_id === s.student_id && updatedHistories[i].status === 'Active') {
            updatedHistories[i] = {
              ...updatedHistories[i],
              end_date: today,
              status: actionType === 'Naik Kelas' ? 'Promoted' : actionType === 'Lulus' ? 'Graduated' : 'Transferred',
            };
          }
        }

        // If promoted, create new history in the target class
        if (actionType === 'Naik Kelas') {
          newHistories.push({
            history_id: `hist-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
            student_id: s.student_id,
            class_id: targetClassId,
            academic_year_id: targetAcademicYearId,
            start_date: today,
            status: 'Active',
            notes: 'Naik kelas dari tahun ajaran sebelumnya',
          });
          return { ...s, status: 'Aktif' as const, updated_at: now };
        } else if (actionType === 'Lulus') {
          return { ...s, status: 'Lulus' as const, updated_at: now };
        } else {
          return { ...s, status: 'Pindah' as const, updated_at: now };
        }
      }
      return s;
    });

    const updatedDb: AppDatabase = {
      ...db,
      students: updatedStudents,
      student_class_history: [...updatedHistories, ...newHistories],
    };

    saveDatabase(updatedDb);
    setDb(updatedDb);
  }, [db]);

  const addClass = useCallback((newClassData: Omit<SchoolClass, 'class_id'>): SchoolClass => {
    const newClass: SchoolClass = {
      ...newClassData,
      class_id: `cls-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
    };
    const updatedDb: AppDatabase = {
      ...db,
      classes: [...db.classes, newClass],
    };
    saveDatabase(updatedDb);
    setDb(updatedDb);
    return newClass;
  }, [db]);

  const addAcademicYear = useCallback((newAyData: Omit<AcademicYear, 'academic_year_id'>): AcademicYear => {
    const newAy: AcademicYear = {
      ...newAyData,
      academic_year_id: `ay-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
    };
    const updatedDb: AppDatabase = {
      ...db,
      academic_years: [...db.academic_years, newAy],
    };
    saveDatabase(updatedDb);
    setDb(updatedDb);
    return newAy;
  }, [db]);

  // Attendance
  const saveAttendanceBatch = useCallback((records: Omit<AttendanceRecord, 'attendance_id' | 'recorded_at'>[]) => {
    const now = new Date().toISOString();
    const newAttendanceList = [...db.attendance];

    for (const rec of records) {
      // Find existing attendance for student on the same date
      const existingIdx = newAttendanceList.findIndex(
        a => a.student_id === rec.student_id && a.date === rec.date
      );

      if (existingIdx >= 0) {
        newAttendanceList[existingIdx] = {
          ...newAttendanceList[existingIdx],
          ...rec,
          recorded_at: now,
        };
      } else {
        newAttendanceList.push({
          ...rec,
          attendance_id: `att-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`,
          recorded_at: now,
        });
      }
    }

    const updatedDb: AppDatabase = {
      ...db,
      attendance: newAttendanceList,
    };
    saveDatabase(updatedDb);
    setDb(updatedDb);
  }, [db]);

  // Violations & Guidance
  const addViolation = useCallback((violation: Omit<ViolationRecord, 'violation_id' | 'created_at' | 'updated_at'>): ViolationRecord => {
    const now = new Date().toISOString();
    const newViol: ViolationRecord = {
      ...violation,
      violation_id: `viol-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
      created_at: now,
      updated_at: now,
    };
    const updatedDb: AppDatabase = {
      ...db,
      violations: [newViol, ...db.violations],
    };
    saveDatabase(updatedDb);
    setDb(updatedDb);
    return newViol;
  }, [db]);

  const updateViolation = useCallback((violationId: string, updates: Partial<ViolationRecord>) => {
    const now = new Date().toISOString();
    const updatedDb: AppDatabase = {
      ...db,
      violations: db.violations.map(v => 
        v.violation_id === violationId ? { ...v, ...updates, updated_at: now } : v
      ),
    };
    saveDatabase(updatedDb);
    setDb(updatedDb);
  }, [db]);

  const deleteViolation = useCallback((violationId: string) => {
    const updatedDb: AppDatabase = {
      ...db,
      violations: db.violations.filter(v => v.violation_id !== violationId),
      guidance: db.guidance.filter(g => g.violation_id !== violationId),
    };
    saveDatabase(updatedDb);
    setDb(updatedDb);
  }, [db]);

  const addGuidance = useCallback((guidance: Omit<GuidanceRecord, 'guidance_id' | 'created_at'>): GuidanceRecord => {
    const newGuid: GuidanceRecord = {
      ...guidance,
      guidance_id: `guid-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
      created_at: new Date().toISOString(),
    };
    const updatedDb: AppDatabase = {
      ...db,
      guidance: [newGuid, ...db.guidance],
    };
    saveDatabase(updatedDb);
    setDb(updatedDb);
    return newGuid;
  }, [db]);

  const updateGuidance = useCallback((guidanceId: string, updates: Partial<GuidanceRecord>) => {
    const updatedDb: AppDatabase = {
      ...db,
      guidance: db.guidance.map(g => g.guidance_id === guidanceId ? { ...g, ...updates } : g),
    };
    saveDatabase(updatedDb);
    setDb(updatedDb);
  }, [db]);

  const deleteGuidance = useCallback((guidanceId: string) => {
    const updatedDb: AppDatabase = {
      ...db,
      guidance: db.guidance.filter(g => g.guidance_id !== guidanceId),
    };
    saveDatabase(updatedDb);
    setDb(updatedDb);
  }, [db]);

  // Home Visits
  const addHomeVisit = useCallback((hv: Omit<HomeVisitRecord, 'visit_id' | 'created_at'>): HomeVisitRecord => {
    const newHv: HomeVisitRecord = {
      ...hv,
      visit_id: `hv-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
      created_at: new Date().toISOString(),
    };
    const updatedDb: AppDatabase = {
      ...db,
      home_visits: [newHv, ...db.home_visits],
    };
    saveDatabase(updatedDb);
    setDb(updatedDb);
    return newHv;
  }, [db]);

  const updateHomeVisit = useCallback((visitId: string, updates: Partial<HomeVisitRecord>) => {
    const updatedDb: AppDatabase = {
      ...db,
      home_visits: db.home_visits.map(hv => hv.visit_id === visitId ? { ...hv, ...updates } : hv),
    };
    saveDatabase(updatedDb);
    setDb(updatedDb);
  }, [db]);

  const deleteHomeVisit = useCallback((visitId: string) => {
    const updatedDb: AppDatabase = {
      ...db,
      home_visits: db.home_visits.filter(hv => hv.visit_id !== visitId),
    };
    saveDatabase(updatedDb);
    setDb(updatedDb);
  }, [db]);

  // Notes
  const addStudentNote = useCallback((note: Omit<StudentNote, 'note_id' | 'created_at'>): StudentNote => {
    const newNote: StudentNote = {
      ...note,
      note_id: `not-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
      created_at: new Date().toISOString(),
    };
    const updatedDb: AppDatabase = {
      ...db,
      student_notes: [newNote, ...db.student_notes],
    };
    saveDatabase(updatedDb);
    setDb(updatedDb);
    return newNote;
  }, [db]);

  const deleteStudentNote = useCallback((noteId: string) => {
    const updatedDb: AppDatabase = {
      ...db,
      student_notes: db.student_notes.filter(n => n.note_id !== noteId),
    };
    saveDatabase(updatedDb);
    setDb(updatedDb);
  }, [db]);

  // Achievements & Potential
  const addAchievement = useCallback((ach: Omit<AchievementRecord, 'achievement_id' | 'created_at'>): AchievementRecord => {
    const newAch: AchievementRecord = {
      ...ach,
      achievement_id: `ach-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
      created_at: new Date().toISOString(),
    };
    const updatedDb: AppDatabase = {
      ...db,
      achievements: [newAch, ...db.achievements],
    };
    saveDatabase(updatedDb);
    setDb(updatedDb);
    return newAch;
  }, [db]);

  const deleteAchievement = useCallback((achId: string) => {
    const updatedDb: AppDatabase = {
      ...db,
      achievements: db.achievements.filter(a => a.achievement_id !== achId),
    };
    saveDatabase(updatedDb);
    setDb(updatedDb);
  }, [db]);

  const savePotential = useCallback((pot: Omit<StudentPotential, 'potential_id' | 'updated_at'>) => {
    const now = new Date().toISOString();
    const existing = db.potentials.find(p => p.student_id === pot.student_id);
    const updatedDb: AppDatabase = { ...db };

    if (existing) {
      updatedDb.potentials = db.potentials.map(p => 
        p.student_id === pot.student_id ? { ...p, ...pot, updated_at: now } : p
      );
    } else {
      updatedDb.potentials = [
        ...db.potentials,
        {
          ...pot,
          potential_id: `pot-${Date.now()}`,
          updated_at: now,
        }
      ];
    }
    saveDatabase(updatedDb);
    setDb(updatedDb);
  }, [db]);

  // Parent Comms
  const addParentComm = useCallback((comm: Omit<ParentCommunication, 'comm_id' | 'created_at'>): ParentCommunication => {
    const newComm: ParentCommunication = {
      ...comm,
      comm_id: `pcomm-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
      created_at: new Date().toISOString(),
    };
    const updatedDb: AppDatabase = {
      ...db,
      parent_communications: [newComm, ...db.parent_communications],
    };
    saveDatabase(updatedDb);
    setDb(updatedDb);
    return newComm;
  }, [db]);

  const deleteParentComm = useCallback((commId: string) => {
    const updatedDb: AppDatabase = {
      ...db,
      parent_communications: db.parent_communications.filter(c => c.comm_id !== commId),
    };
    saveDatabase(updatedDb);
    setDb(updatedDb);
  }, [db]);

  // Settings
  const updateSettings = useCallback((settings: Partial<SchoolSettings>) => {
    const updatedDb: AppDatabase = {
      ...db,
      school_settings: {
        ...db.school_settings,
        ...settings,
      },
    };
    saveDatabase(updatedDb);
    setDb(updatedDb);
  }, [db]);

  // Batch Import
  const batchImportStudents = useCallback((
    studentsToImport: {
      student: Partial<Student>;
      address: Partial<Address>;
      parent: Partial<Parent>;
      classId: string;
      academicYearId: string;
      userAction: 'create_new' | 'update_existing' | 'skip';
      existingStudentId?: string;
    }[]
  ) => {
    let created = 0;
    let updated = 0;
    let skipped = 0;

    let currentStudents = [...db.students];
    let currentAddresses = [...db.addresses];
    let currentParents = [...db.parents];
    let currentHistories = [...db.student_class_history];
    const now = new Date().toISOString();
    const today = now.split('T')[0];

    for (const item of studentsToImport) {
      if (item.userAction === 'skip') {
        skipped++;
        continue;
      }

      if (item.userAction === 'update_existing' && item.existingStudentId) {
        const sId = item.existingStudentId;
        currentStudents = currentStudents.map(s => {
          if (s.student_id === sId) {
            return {
              ...s,
              ...item.student,
              updated_at: now,
            };
          }
          return s;
        });

        // Update address
        const addrIdx = currentAddresses.findIndex(a => a.student_id === sId);
        if (addrIdx >= 0) {
          currentAddresses[addrIdx] = { ...currentAddresses[addrIdx], ...item.address };
        } else {
          currentAddresses.push({
            address_id: `addr-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
            student_id: sId,
            rt: '', rw: '', dusun: '', desa: '', kecamatan: '', kabupaten: '', full_address: '',
            ...item.address,
          });
        }

        // Update parent
        const parIdx = currentParents.findIndex(p => p.student_id === sId);
        if (parIdx >= 0) {
          currentParents[parIdx] = { ...currentParents[parIdx], ...item.parent };
        } else {
          currentParents.push({
            parent_id: `par-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
            student_id: sId,
            father_name: '', father_job: '', mother_name: '', mother_job: '', parent_phone: '',
            ...item.parent,
          });
        }

        // Ensure history entry exists for this class & academic year
        const hasHistory = currentHistories.some(
          h => h.student_id === sId && h.class_id === item.classId && h.academic_year_id === item.academicYearId
        );
        if (!hasHistory) {
          currentHistories.push({
            history_id: `hist-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
            student_id: sId,
            class_id: item.classId,
            academic_year_id: item.academicYearId,
            start_date: today,
            status: 'Active',
          });
        }

        updated++;
      } else {
        // Create new student
        const newStudentId = generateNextStudentId(currentStudents);
        const newStudent: Student = {
          student_id: newStudentId,
          nis: item.student.nis || '',
          nisn: item.student.nisn || '',
          full_name: item.student.full_name || 'SISWA BARU',
          gender: item.student.gender || 'L',
          birth_place: item.student.birth_place || '',
          birth_date: item.student.birth_date || '',
          religion: item.student.religion || 'Islam',
          phone: item.student.phone || '',
          previous_school: item.student.previous_school || '',
          status: 'Aktif',
          created_at: now,
          updated_at: now,
        };
        currentStudents.push(newStudent);

        currentAddresses.push({
          address_id: `addr-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
          student_id: newStudentId,
          rt: item.address.rt || '',
          rw: item.address.rw || '',
          dusun: item.address.dusun || '',
          desa: item.address.desa || '',
          kecamatan: item.address.kecamatan || '',
          kabupaten: item.address.kabupaten || '',
          full_address: item.address.full_address || '',
        });

        currentParents.push({
          parent_id: `par-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
          student_id: newStudentId,
          father_name: item.parent.father_name || '',
          father_job: item.parent.father_job || '',
          mother_name: item.parent.mother_name || '',
          mother_job: item.parent.mother_job || '',
          parent_phone: item.parent.parent_phone || '',
        });

        currentHistories.push({
          history_id: `hist-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
          student_id: newStudentId,
          class_id: item.classId,
          academic_year_id: item.academicYearId,
          start_date: today,
          status: 'Active',
        });

        created++;
      }
    }

    const updatedDb: AppDatabase = {
      ...db,
      students: currentStudents,
      addresses: currentAddresses,
      parents: currentParents,
      student_class_history: currentHistories,
    };

    saveDatabase(updatedDb);
    setDb(updatedDb);

    return { created, updated, skipped };
  }, [db]);

  const replaceAllStudentsWithImport = useCallback((
    studentsToImport: {
      student: Partial<Student>;
      address: Partial<Address>;
      parent: Partial<Parent>;
      classId: string;
      academicYearId: string;
    }[]
  ) => {
    const now = new Date().toISOString();
    const today = now.split('T')[0];

    const newStudents: Student[] = [];
    const newAddresses: Address[] = [];
    const newParents: Parent[] = [];
    const newHistories: StudentClassHistory[] = [];

    studentsToImport.forEach((item, idx) => {
      const padNum = String(idx + 1).padStart(5, '0');
      const studentId = `STU-${padNum}`;

      newStudents.push({
        student_id: studentId,
        nis: item.student.nis || '',
        nisn: item.student.nisn || '',
        full_name: item.student.full_name || `SISWA ${idx + 1}`,
        gender: (item.student.gender as any) || 'L',
        birth_place: item.student.birth_place || '',
        birth_date: item.student.birth_date || '',
        religion: item.student.religion || 'Islam',
        phone: item.student.phone || '',
        previous_school: item.student.previous_school || '',
        status: 'Aktif',
        created_at: now,
        updated_at: now,
      });

      newAddresses.push({
        address_id: `addr-${Date.now()}-${idx}`,
        student_id: studentId,
        rt: item.address.rt || '',
        rw: item.address.rw || '',
        dusun: item.address.dusun || '',
        desa: item.address.desa || '',
        kecamatan: item.address.kecamatan || '',
        kabupaten: item.address.kabupaten || '',
        full_address: item.address.full_address || '',
      });

      newParents.push({
        parent_id: `par-${Date.now()}-${idx}`,
        student_id: studentId,
        father_name: item.parent.father_name || '',
        father_job: item.parent.father_job || '',
        mother_name: item.parent.mother_name || '',
        mother_job: item.parent.mother_job || '',
        parent_phone: item.parent.parent_phone || '',
      });

      newHistories.push({
        history_id: `hist-${Date.now()}-${idx}`,
        student_id: studentId,
        class_id: item.classId,
        academic_year_id: item.academicYearId,
        start_date: today,
        status: 'Active',
      });
    });

    const updatedDb: AppDatabase = {
      ...db,
      students: newStudents,
      addresses: newAddresses,
      parents: newParents,
      student_class_history: newHistories,
      attendance: [],
      violations: [],
      guidance: [],
      home_visits: [],
      student_notes: [],
      achievements: [],
      potentials: [],
      parent_communications: [],
    };

    saveDatabase(updatedDb);
    setDb(updatedDb);

    return { totalImported: newStudents.length };
  }, [db]);

  const resetDatabase = useCallback(() => {
    const reset = resetToSeedData();
    setDb(reset);
  }, []);

  return (
    <DatabaseContext.Provider
      value={{
        db,
        activeAcademicYear,
        activeClass,
        setActiveAcademicYearId: setSelectedAyId,
        setActiveClassId: setSelectedClassId,
        allStudentsFullData,
        getStudentById,
        addStudent,
        updateStudent,
        deleteStudent,
        promoteStudents,
        addClass,
        addAcademicYear,
        saveAttendanceBatch,
        addViolation,
        updateViolation,
        deleteViolation,
        addGuidance,
        updateGuidance,
        deleteGuidance,
        addHomeVisit,
        updateHomeVisit,
        deleteHomeVisit,
        addStudentNote,
        deleteStudentNote,
        addAchievement,
        deleteAchievement,
        savePotential,
        addParentComm,
        deleteParentComm,
        updateSettings,
        batchImportStudents,
        replaceAllStudentsWithImport,
        resetDatabase,
        reloadFromStorage,
      }}
    >
      {children}
    </DatabaseContext.Provider>
  );
};

export const useDatabase = () => {
  const context = useContext(DatabaseContext);
  if (!context) {
    throw new Error('useDatabase must be used within a DatabaseProvider');
  }
  return context;
};
