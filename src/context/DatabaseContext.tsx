import React, { createContext, useContext, useState, useEffect, useCallback, ReactNode, useRef } from 'react';
import { User } from 'firebase/auth';
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
  DisciplineFactorWeights,
  EarlyWarningThresholds,
  DisciplineSettings,
  EarlyWarningSettings,
  StudentFullData,
  PeriodicEvaluation,
  AppAccount,
  AppUser
} from '../types';
import { 
  loadDatabase as loadLocalCache, 
  saveDatabase as saveLocalCache, 
  resetToSeedData, 
  getStudentFullData, 
  getAllStudentsFullData 
} from '../db/storage';
import { generateNextStudentId } from '../utils/calculations';
import { 
  auth, 
  googleSignIn, 
  logoutGoogle, 
  emailSignIn, 
  emailSignUp, 
  PRESET_ACCOUNTS, 
  testFirestoreConnection 
} from '../services/firebase';
import { 
  COLLECTIONS,
  setFirestoreDocument, 
  updateFirestoreDocument, 
  deleteFirestoreDocument, 
  batchWriteFirestore, 
  subscribeToAppDatabase, 
  loadFullDatabaseFromFirestore, 
  saveFullDatabaseToFirestore,
  allocateAtomicStudentIds,
  isFirestoreInitialized,
  handleFirestoreError,
  OperationType,
  FirestoreErrorInfo
} from '../services/firestoreService';
import { INITIAL_SEED_DATA } from '../db/seedData';

export interface ToastInfo {
  type: 'success' | 'error' | 'info' | 'loading';
  text: string;
  timestamp: number;
}

interface DatabaseContextType {
  db: AppDatabase;
  activeAcademicYear: AcademicYear | undefined;
  activeClass: SchoolClass | undefined;
  setActiveAcademicYearId: (id: string) => void;
  setActiveClassId: (id: string) => void;
  
  // Student full query
  allStudentsFullData: StudentFullData[];
  getStudentById: (studentId: string) => StudentFullData | null;

  // Auth & Cloud Sync Status
  currentUser: AppUser | null;
  isAuthenticated: boolean;
  isAuthLoading: boolean;
  isFirestoreConnected: boolean;
  isSyncing: boolean;
  isOffline: boolean;
  lastSyncTime: string | null;
  syncErrorMessage: string | null;
  toast: ToastInfo | null;
  showToast: (type: 'success' | 'error' | 'info' | 'loading', text: string, durationMs?: number) => void;
  clearToast: () => void;
  isLoginModalOpen: boolean;
  setIsLoginModalOpen: (open: boolean) => void;
  loginWithPreset: (account: AppAccount) => Promise<void>;
  loginWithEmail: (email: string, pass: string) => Promise<void>;
  registerWithEmail: (email: string, pass: string, name: string, role: string, nip?: string) => Promise<void>;
  loginGoogleUser: () => Promise<void>;
  logoutUser: () => Promise<void>;

  // Migration & Persistence
  localDataAvailableForMigration: boolean;
  localDataCount: number;
  migrateLocalDataToFirestore: () => Promise<{ success: boolean; count: number; error?: string }>;

  // Student CRUD (writes to Firestore)
  addStudent: (
    studentData: Omit<Student, 'student_id' | 'created_at' | 'updated_at'>,
    addressData?: Omit<Address, 'address_id' | 'student_id'>,
    parentData?: Omit<Parent, 'parent_id' | 'student_id'>,
    potentialData?: Omit<StudentPotential, 'potential_id' | 'student_id' | 'updated_at'>,
    classId?: string
  ) => Promise<Student>;
  updateStudent: (
    studentId: string,
    studentData: Partial<Student>,
    addressData?: Partial<Address>,
    parentData?: Partial<Parent>,
    potentialData?: Partial<StudentPotential>
  ) => Promise<void>;
  deleteStudent: (studentId: string) => Promise<void>;
  deleteMultipleStudents: (studentIds: string[]) => Promise<void>;

  // Class & Promotion
  promoteStudents: (
    studentIds: string[],
    targetClassId: string,
    targetAcademicYearId: string,
    actionType: 'Naik Kelas' | 'Lulus' | 'Mutasi Keluar'
  ) => Promise<void>;
  addClass: (newClass: Omit<SchoolClass, 'class_id'>) => Promise<SchoolClass>;
  addAcademicYear: (newAy: Omit<AcademicYear, 'academic_year_id'>) => Promise<AcademicYear>;

  // Attendance
  saveAttendanceBatch: (records: Omit<AttendanceRecord, 'attendance_id' | 'recorded_at'>[]) => Promise<void>;
  saveDailyAttendance: (records: Omit<AttendanceRecord, 'attendance_id' | 'recorded_at'>[]) => Promise<void>;

  // Violations & Guidance
  addViolation: (violation: Omit<ViolationRecord, 'violation_id' | 'created_at' | 'updated_at'>) => Promise<ViolationRecord>;
  updateViolation: (violationId: string, updates: Partial<ViolationRecord>) => Promise<void>;
  deleteViolation: (violationId: string) => Promise<void>;
  addGuidance: (guidance: Omit<GuidanceRecord, 'guidance_id' | 'created_at'>) => Promise<GuidanceRecord>;
  updateGuidance: (guidanceId: string, updates: Partial<GuidanceRecord>) => Promise<void>;
  deleteGuidance: (guidanceId: string) => Promise<void>;

  // Home Visit
  addHomeVisit: (hv: Omit<HomeVisitRecord, 'visit_id' | 'created_at'>) => Promise<HomeVisitRecord>;
  updateHomeVisit: (visitId: string, updates: Partial<HomeVisitRecord>) => Promise<void>;
  deleteHomeVisit: (visitId: string) => Promise<void>;

  // Notes
  addStudentNote: (note: Omit<StudentNote, 'note_id' | 'created_at'>) => Promise<StudentNote>;
  deleteStudentNote: (noteId: string) => Promise<void>;

  // Achievements & Potentials
  addAchievement: (ach: Omit<AchievementRecord, 'achievement_id' | 'created_at'>) => Promise<AchievementRecord>;
  deleteAchievement: (achId: string) => Promise<void>;
  savePotential: (potential: Omit<StudentPotential, 'potential_id' | 'updated_at'>) => Promise<void>;

  // Periodic Evaluations
  saveEvaluation: (evaluation: Omit<PeriodicEvaluation, 'evaluation_id' | 'evaluated_at'>) => Promise<void>;

  // Parent Comms
  addParentComm: (comm: Omit<ParentCommunication, 'comm_id' | 'created_at'>) => Promise<ParentCommunication>;
  deleteParentComm: (commId: string) => Promise<void>;
  addParentCommunication: (comm: Omit<ParentCommunication, 'comm_id' | 'created_at'>) => Promise<ParentCommunication>;
  deleteParentCommunication: (commId: string) => Promise<void>;

  // Settings & DB Management
  updateSettings: (settings: Partial<SchoolSettings>) => Promise<void>;
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
  ) => Promise<{ created: number; updated: number; skipped: number }>;
  replaceAllStudentsWithImport: (
    studentsToImport: {
      student: Partial<Student>;
      address: Partial<Address>;
      parent: Partial<Parent>;
      classId: string;
      academicYearId: string;
    }[]
  ) => Promise<{ totalImported: number }>;
  resetDatabase: () => Promise<void>;
  restoreDatabaseFromJSON: (jsonString: string) => Promise<{ success: boolean; message: string; count?: number }>;
  reloadFromStorage: () => void;
}

const DatabaseContext = createContext<DatabaseContextType | null>(null);

export const DatabaseProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  // Local cache as initial state
  const [db, setDb] = useState<AppDatabase>(() => loadLocalCache());
  const [selectedAyId, setSelectedAyId] = useState<string>(
    () => db.school_settings?.current_academic_year_id || 'ay-2026-2027'
  );
  const [selectedClassId, setSelectedClassId] = useState<string>(
    () => db.school_settings?.current_class_id || 'cls-x-tkr-b'
  );

  // Auth & Cloud State
  const [currentUser, setCurrentUser] = useState<AppUser | null>(() => {
    try {
      const savedUser = localStorage.getItem('wali_active_user');
      if (savedUser) return JSON.parse(savedUser);
    } catch (e) {}
    // Default initial user for seamless out-of-the-box experience
    return {
      uid: 'preset-wali-1',
      displayName: 'Ahmad Subari, S.Pd',
      email: 'ahmad.subari@smkn1.sch.id',
      role: 'Wali Kelas X TKR B',
      nip: '19850315 201001 1 012',
      photoURL: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80',
      isPreset: true
    };
  });
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(true);
  const [isAuthLoading, setIsAuthLoading] = useState<boolean>(false);
  const [isFirestoreConnected, setIsFirestoreConnected] = useState<boolean>(false);
  const [isSyncing, setIsSyncing] = useState<boolean>(false);
  const [isOffline, setIsOffline] = useState<boolean>(!navigator.onLine);
  const [lastSyncTime, setLastSyncTime] = useState<string | null>(null);
  const [syncErrorMessage, setSyncErrorMessage] = useState<string | null>(null);
  const [toast, setToast] = useState<ToastInfo | null>(null);
  const [isLoginModalOpen, setIsLoginModalOpen] = useState<boolean>(false);

  // Migration status
  const [localDataAvailableForMigration, setLocalDataAvailableForMigration] = useState<boolean>(false);
  const [localDataCount, setLocalDataCount] = useState<number>(0);

  const toastTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const showToast = useCallback((type: 'success' | 'error' | 'info' | 'loading', text: string, durationMs?: number) => {
    if (toastTimeoutRef.current) clearTimeout(toastTimeoutRef.current);
    setToast({ type, text, timestamp: Date.now() });

    // Duration: 1500ms default for success, 2500ms for error, 2000ms max safety timeout for loading
    const actualDuration = durationMs ?? (type === 'error' ? 2500 : type === 'loading' ? 2000 : 1500);

    toastTimeoutRef.current = setTimeout(() => {
      setToast(null);
    }, actualDuration);
  }, []);

  const clearToast = useCallback(() => {
    if (toastTimeoutRef.current) clearTimeout(toastTimeoutRef.current);
    setToast(null);
  }, []);

  // Online / Offline window listeners
  useEffect(() => {
    const handleOnline = () => {
      setIsOffline(false);
      showToast('info', 'Koneksi internet pulih. Menyinkronkan ke Firestore...', 1500);
    };
    const handleOffline = () => {
      setIsOffline(true);
      showToast('info', 'Anda sedang offline. Perubahan disimpan di cache lokal.', 1500);
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, [showToast]);

  // Auth state listener for Firebase
  useEffect(() => {
    const unsubscribeAuth = auth.onAuthStateChanged(async (firebaseUser) => {
      if (firebaseUser) {
        const appUser: AppUser = {
          uid: firebaseUser.uid,
          email: firebaseUser.email,
          displayName: firebaseUser.displayName || firebaseUser.email?.split('@')[0] || 'Guru',
          photoURL: firebaseUser.photoURL,
          role: 'Pengguna Terverifikasi',
          isPreset: false
        };
        setCurrentUser(appUser);
        setIsAuthenticated(true);
        localStorage.setItem('wali_active_user', JSON.stringify(appUser));
        setIsFirestoreConnected(true);
        
        // Check if Firestore is empty to seed or offer migration
        try {
          const hasData = await isFirestoreInitialized();
          const localDb = loadLocalCache();
          if (!hasData) {
            if (localDb.students && localDb.students.length > 0) {
              setLocalDataAvailableForMigration(true);
              setLocalDataCount(localDb.students.length);
              setIsSyncing(true);
              await saveFullDatabaseToFirestore(localDb);
              setIsSyncing(false);
              setLastSyncTime(new Date().toLocaleTimeString());
              showToast('success', 'Data database berhasil disinkronkan ke Cloud Firestore.', 1500);
            } else {
              setIsSyncing(true);
              await saveFullDatabaseToFirestore(INITIAL_SEED_DATA);
              setIsSyncing(false);
              setLastSyncTime(new Date().toLocaleTimeString());
            }
          }
        } catch (err: any) {
          console.warn('Initial Firestore sync check error:', err);
        }
      }
      setIsAuthLoading(false);
    });

    return () => unsubscribeAuth();
  }, [showToast]);

  // Real-time Firestore Subscription
  useEffect(() => {
    if (!isAuthenticated) return;

    setIsSyncing(true);
    const unsubscribeSnapshot = subscribeToAppDatabase(
      (firestoreData) => {
        setIsSyncing(false);
        setIsFirestoreConnected(true);
        setSyncErrorMessage(null);
        setLastSyncTime(new Date().toLocaleTimeString());

        // Update in-memory state & update local storage as secondary cache
        setDb(firestoreData);
        saveLocalCache(firestoreData);
      },
      (error) => {
        setIsSyncing(false);
        setSyncErrorMessage(error.error);
        if (error.error.includes('offline') || error.error.includes('network')) {
          setIsOffline(true);
        }
      }
    );

    return () => {
      unsubscribeSnapshot();
    };
  }, [isAuthenticated]);

  const loginWithPreset = async (account: AppAccount) => {
    const appUser: AppUser = {
      uid: account.uid,
      email: account.email,
      displayName: account.displayName,
      role: account.role,
      nip: account.nip,
      photoURL: account.avatarUrl,
      isPreset: true
    };
    setCurrentUser(appUser);
    setIsAuthenticated(true);
    localStorage.setItem('wali_active_user', JSON.stringify(appUser));
    
    if (account.classAssigned) {
      setSelectedClassId(account.classAssigned);
    }
    showToast('success', `Berhasil masuk sebagai ${account.displayName} (${account.role})`, 1500);
  };

  const loginWithEmail = async (email: string, pass: string) => {
    try {
      showToast('loading', 'Memverifikasi akun...', 1500);
      const user = await emailSignIn(email, pass);
      const appUser: AppUser = {
        uid: user.uid,
        email: user.email,
        displayName: user.displayName || user.email?.split('@')[0] || 'Guru',
        photoURL: user.photoURL,
        role: 'Guru Terdaftar',
        isPreset: false
      };
      setCurrentUser(appUser);
      setIsAuthenticated(true);
      localStorage.setItem('wali_active_user', JSON.stringify(appUser));
      showToast('success', `Selamat datang, ${appUser.displayName}!`, 1500);
    } catch (err: any) {
      showToast('error', `Gagal masuk: ${err.message || 'Periksa email & password'}`, 2500);
      throw err;
    }
  };

  const registerWithEmail = async (email: string, pass: string, name: string, role: string, nip?: string) => {
    try {
      showToast('loading', 'Mendaftarkan akun baru...', 1500);
      const user = await emailSignUp(email, pass, name);
      const appUser: AppUser = {
        uid: user.uid,
        email: user.email,
        displayName: name,
        role: role || 'Wali Kelas',
        nip: nip,
        photoURL: user.photoURL,
        isPreset: false
      };
      setCurrentUser(appUser);
      setIsAuthenticated(true);
      localStorage.setItem('wali_active_user', JSON.stringify(appUser));
      showToast('success', `Akun ${name} berhasil didaftarkan!`, 1500);
    } catch (err: any) {
      showToast('error', `Gagal pendaftaran: ${err.message}`, 2500);
      throw err;
    }
  };

  const loginGoogleUser = async () => {
    try {
      showToast('loading', 'Menghubungkan ke Akun Google...', 1500);
      const { user } = await googleSignIn();
      const appUser: AppUser = {
        uid: user.uid,
        email: user.email,
        displayName: user.displayName || user.email?.split('@')[0] || 'Guru',
        photoURL: user.photoURL,
        role: 'Google Workspace User',
        isPreset: false
      };
      setCurrentUser(appUser);
      setIsAuthenticated(true);
      localStorage.setItem('wali_active_user', JSON.stringify(appUser));
      showToast('success', `Berhasil login sebagai ${appUser.displayName}`, 1500);
    } catch (err: any) {
      showToast('error', `Gagal login Google: ${err.message || 'Terjadi kesalahan'}`, 2500);
    }
  };

  const logoutUser = async () => {
    try {
      await logoutGoogle();
      setCurrentUser(null);
      setIsAuthenticated(false);
      localStorage.removeItem('wali_active_user');
      showToast('info', 'Anda telah keluar dari akun.', 1500);
    } catch (err: any) {
      showToast('error', `Gagal logout: ${err.message}`, 2000);
    }
  };

  const migrateLocalDataToFirestore = useCallback(async () => {
    try {
      setIsSyncing(true);
      showToast('loading', 'Mengunggah data lokal ke Firestore...');
      const localData = loadLocalCache();
      const result = await saveFullDatabaseToFirestore(localData);
      setIsSyncing(false);
      setLocalDataAvailableForMigration(false);
      setLastSyncTime(new Date().toLocaleTimeString());
      showToast('success', `Migrasi berhasil! ${result.totalWritten} dokumen tersimpan di Cloud Firestore.`);
      return { success: true, count: result.totalWritten };
    } catch (err: any) {
      setIsSyncing(false);
      showToast('error', `Gagal migrasi: ${err.message}`);
      return { success: false, count: 0, error: err.message };
    }
  }, [showToast]);

  const reloadFromStorage = useCallback(() => {
    const loaded = loadLocalCache();
    setDb(loaded);
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

  // STUDENT CRUD
  const addStudent = useCallback(async (
    studentData: Omit<Student, 'student_id' | 'created_at' | 'updated_at'>,
    addressData?: Omit<Address, 'address_id' | 'student_id'>,
    parentData?: Omit<Parent, 'parent_id' | 'student_id'>,
    potentialData?: Omit<StudentPotential, 'potential_id' | 'student_id' | 'updated_at'>,
    classId?: string
  ): Promise<Student> => {
    // Allocate atomic sequential ID via Firestore transaction to prevent concurrent duplicate keys
    let newStudentId = '';
    try {
      const allocated = await allocateAtomicStudentIds(1);
      if (allocated && allocated.length > 0) {
        newStudentId = allocated[0];
      }
    } catch {
      newStudentId = generateNextStudentId(db.students);
    }
    if (!newStudentId) {
      newStudentId = generateNextStudentId(db.students);
    }

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

    const operations: { type: 'set'; collection: string; docId: string; data: any }[] = [
      { type: 'set', collection: COLLECTIONS.STUDENTS, docId: newStudentId, data: newStudent },
      { type: 'set', collection: COLLECTIONS.STUDENT_CLASS_HISTORY, docId: newHistory.history_id, data: newHistory }
    ];

    let newAddress: Address | undefined;
    if (addressData) {
      newAddress = {
        ...addressData,
        address_id: `addr-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
        student_id: newStudentId,
      };
      operations.push({ type: 'set', collection: COLLECTIONS.ADDRESSES, docId: newAddress.address_id, data: newAddress });
    }

    let newParent: Parent | undefined;
    if (parentData) {
      newParent = {
        ...parentData,
        parent_id: `par-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
        student_id: newStudentId,
      };
      operations.push({ type: 'set', collection: COLLECTIONS.PARENTS, docId: newParent.parent_id, data: newParent });
    }

    let newPot: StudentPotential | undefined;
    if (potentialData) {
      newPot = {
        ...potentialData,
        potential_id: `pot-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
        student_id: newStudentId,
        updated_at: now,
      };
      operations.push({ type: 'set', collection: COLLECTIONS.POTENTIALS, docId: newPot.potential_id, data: newPot });
    }

    // Optimistic local update
    const updatedDb: AppDatabase = {
      ...db,
      students: [newStudent, ...db.students],
      student_class_history: [...db.student_class_history, newHistory],
      addresses: newAddress ? [...db.addresses, newAddress] : db.addresses,
      parents: newParent ? [...db.parents, newParent] : db.parents,
      potentials: newPot ? [...db.potentials, newPot] : db.potentials,
    };
    setDb(updatedDb);
    saveLocalCache(updatedDb);

    try {
      showToast('loading', 'Menyimpan data siswa ke Cloud Firestore...');
      await batchWriteFirestore(operations);
      showToast('success', `Siswa ${newStudent.full_name} (${newStudent.student_id}) berhasil disimpan.`);
    } catch (err: any) {
      showToast('error', `Gagal menyimpan ke Firestore: ${err.message}`);
    }

    return newStudent;
  }, [db, selectedClassId, selectedAyId, showToast]);

  const updateStudent = useCallback(async (
    studentId: string,
    studentData: Partial<Student>,
    addressData?: Partial<Address>,
    parentData?: Partial<Parent>,
    potentialData?: Partial<StudentPotential>
  ) => {
    const now = new Date().toISOString();
    const operations: { type: 'set' | 'update'; collection: string; docId: string; data: any }[] = [];

    // Student Doc - Protect student_id from being mutated
    const existingStudent = db.students.find(s => s.student_id === studentId);
    const { student_id: _ignoredId, ...safeStudentData } = studentData as any;
    const updatedStudent: Student = { 
      ...(existingStudent || ({} as Student)), 
      ...safeStudentData, 
      student_id: studentId, 
      updated_at: now 
    };

    operations.push({
      type: 'set',
      collection: COLLECTIONS.STUDENTS,
      docId: studentId,
      data: updatedStudent
    });

    // Address
    let updatedAddresses = [...db.addresses];
    if (addressData) {
      const existingAddr = db.addresses.find(a => a.student_id === studentId);
      const addrId = existingAddr?.address_id || `addr-${Date.now()}`;
      const cleanAddr: Address = {
        address_id: addrId,
        student_id: studentId,
        rt: '', rw: '', dusun: '', desa: '', kecamatan: '', kabupaten: '', full_address: '',
        ...(existingAddr || {}),
        ...addressData
      };
      operations.push({
        type: 'set',
        collection: COLLECTIONS.ADDRESSES,
        docId: addrId,
        data: cleanAddr
      });
      updatedAddresses = existingAddr 
        ? db.addresses.map(a => a.student_id === studentId ? cleanAddr : a)
        : [...db.addresses, cleanAddr];
    }

    // Parent
    let updatedParents = [...db.parents];
    if (parentData) {
      const existingPar = db.parents.find(p => p.student_id === studentId);
      const parId = existingPar?.parent_id || `par-${Date.now()}`;
      const cleanPar: Parent = {
        parent_id: parId,
        student_id: studentId,
        father_name: '', father_job: '', mother_name: '', mother_job: '', parent_phone: '',
        ...(existingPar || {}),
        ...parentData
      };
      operations.push({
        type: 'set',
        collection: COLLECTIONS.PARENTS,
        docId: parId,
        data: cleanPar
      });
      updatedParents = existingPar
        ? db.parents.map(p => p.student_id === studentId ? cleanPar : p)
        : [...db.parents, cleanPar];
    }

    // Potential
    let updatedPotentials = [...db.potentials];
    if (potentialData) {
      const existingPot = db.potentials.find(pot => pot.student_id === studentId);
      const potId = existingPot?.potential_id || `pot-${Date.now()}`;
      const cleanPot: StudentPotential = {
        potential_id: potId,
        student_id: studentId,
        interests: '', talents: '', skills: '', notes: '',
        ...(existingPot || {}),
        ...potentialData,
        updated_at: now
      };
      operations.push({
        type: 'set',
        collection: COLLECTIONS.POTENTIALS,
        docId: potId,
        data: cleanPot
      });
      updatedPotentials = existingPot
        ? db.potentials.map(p => p.student_id === studentId ? cleanPot : p)
        : [...db.potentials, cleanPot];
    }

    // Optimistic Update
    const updatedDb: AppDatabase = {
      ...db,
      students: db.students.map(s => s.student_id === studentId ? updatedStudent : s),
      addresses: updatedAddresses,
      parents: updatedParents,
      potentials: updatedPotentials
    };
    setDb(updatedDb);
    saveLocalCache(updatedDb);

    try {
      showToast('loading', 'Menyimpan perubahan ke Firestore...');
      await batchWriteFirestore(operations);
      showToast('success', 'Perubahan data siswa tersimpan di Firestore.');
    } catch (err: any) {
      showToast('error', `Gagal update ke Firestore: ${err.message}`);
    }
  }, [db, showToast]);

  const deleteMultipleStudents = useCallback(async (studentIds: string[]) => {
    if (!studentIds.length) return;
    const targetSet = new Set(studentIds);
    let ops: { type: 'delete'; collection: string; docId: string }[] = [];

    setDb(prev => {
      ops = [];
      studentIds.forEach(id => {
        ops.push({ type: 'delete', collection: COLLECTIONS.STUDENTS, docId: id });
      });

      prev.addresses.filter(a => targetSet.has(a.student_id)).forEach(a => {
        ops.push({ type: 'delete', collection: COLLECTIONS.ADDRESSES, docId: a.address_id });
      });
      prev.parents.filter(p => targetSet.has(p.student_id)).forEach(p => {
        ops.push({ type: 'delete', collection: COLLECTIONS.PARENTS, docId: p.parent_id });
      });
      prev.student_class_history.filter(h => targetSet.has(h.student_id)).forEach(h => {
        ops.push({ type: 'delete', collection: COLLECTIONS.STUDENT_CLASS_HISTORY, docId: h.history_id });
      });
      prev.attendance.filter(att => targetSet.has(att.student_id)).forEach(att => {
        ops.push({ type: 'delete', collection: COLLECTIONS.ATTENDANCE, docId: att.attendance_id });
      });
      prev.violations.filter(v => targetSet.has(v.student_id)).forEach(v => {
        ops.push({ type: 'delete', collection: COLLECTIONS.VIOLATIONS, docId: v.violation_id });
      });
      prev.guidance.filter(g => targetSet.has(g.student_id)).forEach(g => {
        ops.push({ type: 'delete', collection: COLLECTIONS.GUIDANCE, docId: g.guidance_id });
      });
      prev.home_visits.filter(hv => targetSet.has(hv.student_id)).forEach(hv => {
        ops.push({ type: 'delete', collection: COLLECTIONS.HOME_VISITS, docId: hv.visit_id });
      });
      prev.student_notes.filter(n => targetSet.has(n.student_id)).forEach(n => {
        ops.push({ type: 'delete', collection: COLLECTIONS.STUDENT_NOTES, docId: n.note_id });
      });
      prev.achievements.filter(ach => targetSet.has(ach.student_id)).forEach(ach => {
        ops.push({ type: 'delete', collection: COLLECTIONS.ACHIEVEMENTS, docId: ach.achievement_id });
      });
      prev.potentials.filter(pot => targetSet.has(pot.student_id)).forEach(pot => {
        ops.push({ type: 'delete', collection: COLLECTIONS.POTENTIALS, docId: pot.potential_id });
      });
      prev.parent_communications.filter(c => targetSet.has(c.student_id)).forEach(c => {
        ops.push({ type: 'delete', collection: COLLECTIONS.PARENT_COMMUNICATIONS, docId: c.comm_id });
      });
      prev.evaluations?.filter(e => targetSet.has(e.student_id)).forEach(e => {
        ops.push({ type: 'delete', collection: COLLECTIONS.EVALUATIONS, docId: e.evaluation_id });
      });

      const updatedDb: AppDatabase = {
        ...prev,
        students: prev.students.filter(s => !targetSet.has(s.student_id)),
        addresses: prev.addresses.filter(a => !targetSet.has(a.student_id)),
        parents: prev.parents.filter(p => !targetSet.has(p.student_id)),
        student_class_history: prev.student_class_history.filter(h => !targetSet.has(h.student_id)),
        attendance: prev.attendance.filter(att => !targetSet.has(att.student_id)),
        violations: prev.violations.filter(v => !targetSet.has(v.student_id)),
        guidance: prev.guidance.filter(g => !targetSet.has(g.student_id)),
        home_visits: prev.home_visits.filter(hv => !targetSet.has(hv.student_id)),
        student_notes: prev.student_notes.filter(n => !targetSet.has(n.student_id)),
        achievements: prev.achievements.filter(ach => !targetSet.has(ach.student_id)),
        potentials: prev.potentials.filter(pot => !targetSet.has(pot.student_id)),
        parent_communications: prev.parent_communications.filter(c => !targetSet.has(c.student_id)),
        evaluations: prev.evaluations?.filter(e => !targetSet.has(e.student_id)) || [],
      };
      saveLocalCache(updatedDb);
      return updatedDb;
    });

    if (ops.length > 0) {
      try {
        await batchWriteFirestore(ops);
      } catch (err: any) {
        console.warn('Background firestore delete sync error:', err);
      }
    }
    showToast('success', `${studentIds.length} data siswa berhasil dihapus.`, 1500);
  }, [showToast]);

  const deleteStudent = useCallback(async (studentId: string) => {
    return deleteMultipleStudents([studentId]);
  }, [deleteMultipleStudents]);

  // Class Promotion & Lifecycle
  const promoteStudents = useCallback(async (
    studentIds: string[],
    targetClassId: string,
    targetAcademicYearId: string,
    actionType: 'Naik Kelas' | 'Lulus' | 'Mutasi Keluar'
  ) => {
    const today = new Date().toISOString().split('T')[0];
    const now = new Date().toISOString();

    const updatedHistories = [...db.student_class_history];
    const newHistories: StudentClassHistory[] = [];
    const ops: { type: 'set' | 'update'; collection: string; docId: string; data: any }[] = [];

    const updatedStudents = db.students.map(s => {
      if (studentIds.includes(s.student_id)) {
        // Complete current active history
        for (let i = 0; i < updatedHistories.length; i++) {
          if (updatedHistories[i].student_id === s.student_id && updatedHistories[i].status === 'Active') {
            const completed = {
              ...updatedHistories[i],
              end_date: today,
              status: (actionType === 'Naik Kelas' ? 'Promoted' : actionType === 'Lulus' ? 'Graduated' : 'Transferred') as any,
            };
            updatedHistories[i] = completed;
            ops.push({
              type: 'set',
              collection: COLLECTIONS.STUDENT_CLASS_HISTORY,
              docId: completed.history_id,
              data: completed
            });
          }
        }

        // If promoted, create new history in the target class
        if (actionType === 'Naik Kelas') {
          const newHist: StudentClassHistory = {
            history_id: `hist-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
            student_id: s.student_id,
            class_id: targetClassId,
            academic_year_id: targetAcademicYearId,
            start_date: today,
            status: 'Active',
            notes: 'Naik kelas dari tahun ajaran sebelumnya',
          };
          newHistories.push(newHist);
          ops.push({
            type: 'set',
            collection: COLLECTIONS.STUDENT_CLASS_HISTORY,
            docId: newHist.history_id,
            data: newHist
          });
          const updatedS = { ...s, status: 'Aktif' as const, updated_at: now };
          ops.push({
            type: 'set',
            collection: COLLECTIONS.STUDENTS,
            docId: s.student_id,
            data: updatedS
          });
          return updatedS;
        } else if (actionType === 'Lulus') {
          const updatedS = { ...s, status: 'Lulus' as const, updated_at: now };
          ops.push({
            type: 'set',
            collection: COLLECTIONS.STUDENTS,
            docId: s.student_id,
            data: updatedS
          });
          return updatedS;
        } else {
          const updatedS = { ...s, status: 'Pindah' as const, updated_at: now };
          ops.push({
            type: 'set',
            collection: COLLECTIONS.STUDENTS,
            docId: s.student_id,
            data: updatedS
          });
          return updatedS;
        }
      }
      return s;
    });

    const updatedDb: AppDatabase = {
      ...db,
      students: updatedStudents,
      student_class_history: [...updatedHistories, ...newHistories],
    };
    setDb(updatedDb);
    saveLocalCache(updatedDb);

    try {
      showToast('loading', `Memproses ${actionType} untuk ${studentIds.length} siswa di Firestore...`);
      await batchWriteFirestore(ops);
      showToast('success', `Berhasil memproses ${actionType} untuk ${studentIds.length} siswa.`);
    } catch (err: any) {
      showToast('error', `Gagal proses promosi ke Firestore: ${err.message}`);
    }
  }, [db, showToast]);

  const addClass = useCallback(async (newClassData: Omit<SchoolClass, 'class_id'>): Promise<SchoolClass> => {
    const newClass: SchoolClass = {
      ...newClassData,
      class_id: `cls-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
    };
    const updatedDb: AppDatabase = {
      ...db,
      classes: [...db.classes, newClass],
    };
    setDb(updatedDb);
    saveLocalCache(updatedDb);

    try {
      await setFirestoreDocument(COLLECTIONS.CLASSES, newClass.class_id, newClass);
      showToast('success', `Kelas ${newClass.class_name} berhasil ditambahkan.`);
    } catch (err: any) {
      showToast('error', `Gagal menambah kelas: ${err.message}`);
    }
    return newClass;
  }, [db, showToast]);

  const addAcademicYear = useCallback(async (newAyData: Omit<AcademicYear, 'academic_year_id'>): Promise<AcademicYear> => {
    const newAy: AcademicYear = {
      ...newAyData,
      academic_year_id: `ay-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
    };
    const updatedDb: AppDatabase = {
      ...db,
      academic_years: [...db.academic_years, newAy],
    };
    setDb(updatedDb);
    saveLocalCache(updatedDb);

    try {
      await setFirestoreDocument(COLLECTIONS.ACADEMIC_YEARS, newAy.academic_year_id, newAy);
      showToast('success', `Tahun Ajaran ${newAy.year_name} berhasil ditambahkan.`);
    } catch (err: any) {
      showToast('error', `Gagal menambah tahun ajaran: ${err.message}`);
    }
    return newAy;
  }, [db, showToast]);

  // Attendance
  const saveAttendanceBatch = useCallback(async (records: Omit<AttendanceRecord, 'attendance_id' | 'recorded_at'>[]) => {
    const now = new Date().toISOString();
    const newAttendanceList = [...db.attendance];
    const ops: { type: 'set'; collection: string; docId: string; data: any }[] = [];

    for (let idx = 0; idx < records.length; idx++) {
      const rec = records[idx];
      const existingIdx = newAttendanceList.findIndex(
        a => a.student_id === rec.student_id && a.date === rec.date
      );

      if (existingIdx >= 0) {
        const updatedRec: AttendanceRecord = {
          ...newAttendanceList[existingIdx],
          ...rec,
          recorded_at: now,
        };
        newAttendanceList[existingIdx] = updatedRec;
        ops.push({
          type: 'set',
          collection: COLLECTIONS.ATTENDANCE,
          docId: updatedRec.attendance_id,
          data: updatedRec
        });
      } else {
        const newRec: AttendanceRecord = {
          ...rec,
          attendance_id: `att-${Date.now()}-${idx}-${Math.random().toString(36).substr(2, 5)}`,
          recorded_at: now,
        };
        newAttendanceList.push(newRec);
        ops.push({
          type: 'set',
          collection: COLLECTIONS.ATTENDANCE,
          docId: newRec.attendance_id,
          data: newRec
        });
      }
    }

    const updatedDb: AppDatabase = {
      ...db,
      attendance: newAttendanceList,
    };
    setDb(updatedDb);
    saveLocalCache(updatedDb);

    if (isAuthenticated && auth.currentUser) {
      try {
        await batchWriteFirestore(ops);
      } catch (err: any) {
        console.error('[ATTENDANCE FIRESTORE SAVE ERROR]:', err);
        throw err;
      }
    }
  }, [db, isAuthenticated]);

  // Violations & Guidance
  const addViolation = useCallback(async (violation: Omit<ViolationRecord, 'violation_id' | 'created_at' | 'updated_at'>): Promise<ViolationRecord> => {
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
    setDb(updatedDb);
    saveLocalCache(updatedDb);

    try {
      await setFirestoreDocument(COLLECTIONS.VIOLATIONS, newViol.violation_id, newViol);
      showToast('success', `Pelanggaran tercatat di Cloud Firestore.`);
    } catch (err: any) {
      showToast('error', `Gagal mencatat pelanggaran: ${err.message}`);
    }
    return newViol;
  }, [db, showToast]);

  const updateViolation = useCallback(async (violationId: string, updates: Partial<ViolationRecord>) => {
    const now = new Date().toISOString();
    const existing = db.violations.find(v => v.violation_id === violationId);
    const updated = { ...(existing || {}), ...updates, updated_at: now } as ViolationRecord;

    const updatedDb: AppDatabase = {
      ...db,
      violations: db.violations.map(v => v.violation_id === violationId ? updated : v),
    };
    setDb(updatedDb);
    saveLocalCache(updatedDb);

    try {
      await setFirestoreDocument(COLLECTIONS.VIOLATIONS, violationId, updated);
      showToast('success', 'Data pelanggaran berhasil diperbarui.');
    } catch (err: any) {
      showToast('error', `Gagal update pelanggaran: ${err.message}`);
    }
  }, [db, showToast]);

  const deleteViolation = useCallback(async (violationId: string) => {
    setDb(prev => {
      const updatedDb: AppDatabase = {
        ...prev,
        violations: prev.violations.filter(v => v.violation_id !== violationId),
        guidance: prev.guidance.filter(g => g.violation_id !== violationId),
      };
      saveLocalCache(updatedDb);
      return updatedDb;
    });

    try {
      await deleteFirestoreDocument(COLLECTIONS.VIOLATIONS, violationId);
      showToast('success', 'Data pelanggaran berhasil dihapus.', 1500);
    } catch (err: any) {
      showToast('error', `Gagal menghapus pelanggaran: ${err.message}`, 2500);
    }
  }, [showToast]);

  const addGuidance = useCallback(async (guidance: Omit<GuidanceRecord, 'guidance_id' | 'created_at'>): Promise<GuidanceRecord> => {
    const newGuid: GuidanceRecord = {
      ...guidance,
      guidance_id: `guid-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
      created_at: new Date().toISOString(),
    };
    const updatedDb: AppDatabase = {
      ...db,
      guidance: [newGuid, ...db.guidance],
    };
    setDb(updatedDb);
    saveLocalCache(updatedDb);

    try {
      await setFirestoreDocument(COLLECTIONS.GUIDANCE, newGuid.guidance_id, newGuid);
      showToast('success', 'Catatan pembinaan berhasil disimpan di cloud.', 1500);
    } catch (err: any) {
      showToast('error', `Gagal menyimpan pembinaan: ${err.message}`, 2500);
    }
    return newGuid;
  }, [db, showToast]);

  const updateGuidance = useCallback(async (guidanceId: string, updates: Partial<GuidanceRecord>) => {
    const existing = db.guidance.find(g => g.guidance_id === guidanceId);
    const updated = { ...(existing || {}), ...updates } as GuidanceRecord;

    const updatedDb: AppDatabase = {
      ...db,
      guidance: db.guidance.map(g => g.guidance_id === guidanceId ? updated : g),
    };
    setDb(updatedDb);
    saveLocalCache(updatedDb);

    try {
      await setFirestoreDocument(COLLECTIONS.GUIDANCE, guidanceId, updated);
      showToast('success', 'Pembinaan berhasil diperbarui.', 1500);
    } catch (err: any) {
      showToast('error', `Gagal update pembinaan: ${err.message}`, 2500);
    }
  }, [db, showToast]);

  const deleteGuidance = useCallback(async (guidanceId: string) => {
    setDb(prev => {
      const updatedDb: AppDatabase = {
        ...prev,
        guidance: prev.guidance.filter(g => g.guidance_id !== guidanceId),
      };
      saveLocalCache(updatedDb);
      return updatedDb;
    });

    try {
      await deleteFirestoreDocument(COLLECTIONS.GUIDANCE, guidanceId);
      showToast('success', 'Pembinaan berhasil dihapus.', 1500);
    } catch (err: any) {
      showToast('error', `Gagal menghapus pembinaan: ${err.message}`, 2500);
    }
  }, [showToast]);

  // Home Visits
  const addHomeVisit = useCallback(async (hv: Omit<HomeVisitRecord, 'visit_id' | 'created_at'>): Promise<HomeVisitRecord> => {
    const newHv: HomeVisitRecord = {
      ...hv,
      visit_id: `hv-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
      created_at: new Date().toISOString(),
    };
    const updatedDb: AppDatabase = {
      ...db,
      home_visits: [newHv, ...db.home_visits],
    };
    setDb(updatedDb);
    saveLocalCache(updatedDb);

    try {
      await setFirestoreDocument(COLLECTIONS.HOME_VISITS, newHv.visit_id, newHv);
      showToast('success', 'Home Visit berhasil disimpan di cloud.', 1500);
    } catch (err: any) {
      showToast('error', `Gagal menyimpan home visit: ${err.message}`, 2500);
    }
    return newHv;
  }, [db, showToast]);

  const updateHomeVisit = useCallback(async (visitId: string, updates: Partial<HomeVisitRecord>) => {
    const existing = db.home_visits.find(hv => hv.visit_id === visitId);
    const updated = { ...(existing || {}), ...updates } as HomeVisitRecord;

    const updatedDb: AppDatabase = {
      ...db,
      home_visits: db.home_visits.map(hv => hv.visit_id === visitId ? updated : hv),
    };
    setDb(updatedDb);
    saveLocalCache(updatedDb);

    try {
      await setFirestoreDocument(COLLECTIONS.HOME_VISITS, visitId, updated);
      showToast('success', 'Home Visit berhasil diperbarui.', 1500);
    } catch (err: any) {
      showToast('error', `Gagal update home visit: ${err.message}`, 2500);
    }
  }, [db, showToast]);

  const deleteHomeVisit = useCallback(async (visitId: string) => {
    setDb(prev => {
      const updatedDb: AppDatabase = {
        ...prev,
        home_visits: prev.home_visits.filter(hv => hv.visit_id !== visitId),
      };
      saveLocalCache(updatedDb);
      return updatedDb;
    });

    try {
      await deleteFirestoreDocument(COLLECTIONS.HOME_VISITS, visitId);
      showToast('success', 'Home Visit berhasil dihapus.', 1500);
    } catch (err: any) {
      showToast('error', `Gagal menghapus home visit: ${err.message}`, 2500);
    }
  }, [showToast]);

  // Notes
  const addStudentNote = useCallback(async (note: Omit<StudentNote, 'note_id' | 'created_at'>): Promise<StudentNote> => {
    const newNote: StudentNote = {
      ...note,
      note_id: `not-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
      created_at: new Date().toISOString(),
    };
    const updatedDb: AppDatabase = {
      ...db,
      student_notes: [newNote, ...db.student_notes],
    };
    setDb(updatedDb);
    saveLocalCache(updatedDb);

    try {
      await setFirestoreDocument(COLLECTIONS.STUDENT_NOTES, newNote.note_id, newNote);
      showToast('success', 'Catatan siswa berhasil disimpan di cloud.', 1500);
    } catch (err: any) {
      showToast('error', `Gagal menyimpan catatan: ${err.message}`, 2500);
    }
    return newNote;
  }, [db, showToast]);

  const deleteStudentNote = useCallback(async (noteId: string) => {
    setDb(prev => {
      const updatedDb: AppDatabase = {
        ...prev,
        student_notes: prev.student_notes.filter(n => n.note_id !== noteId),
      };
      saveLocalCache(updatedDb);
      return updatedDb;
    });

    try {
      await deleteFirestoreDocument(COLLECTIONS.STUDENT_NOTES, noteId);
      showToast('success', 'Catatan siswa berhasil dihapus.', 1500);
    } catch (err: any) {
      showToast('error', `Gagal menghapus catatan: ${err.message}`, 2500);
    }
  }, [showToast]);

  // Achievements & Potential
  const addAchievement = useCallback(async (ach: Omit<AchievementRecord, 'achievement_id' | 'created_at'>): Promise<AchievementRecord> => {
    const newAch: AchievementRecord = {
      ...ach,
      achievement_id: `ach-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
      created_at: new Date().toISOString(),
    };
    const updatedDb: AppDatabase = {
      ...db,
      achievements: [newAch, ...db.achievements],
    };
    setDb(updatedDb);
    saveLocalCache(updatedDb);

    try {
      await setFirestoreDocument(COLLECTIONS.ACHIEVEMENTS, newAch.achievement_id, newAch);
      showToast('success', 'Prestasi siswa berhasil disimpan.', 1500);
    } catch (err: any) {
      showToast('error', `Gagal menyimpan prestasi: ${err.message}`, 2500);
    }
    return newAch;
  }, [db, showToast]);

  const deleteAchievement = useCallback(async (achId: string) => {
    // 1. Optimistically and synchronously update local state & cache
    setDb(prev => {
      const updated = {
        ...prev,
        achievements: prev.achievements.filter(a => a.achievement_id !== achId),
      };
      saveLocalCache(updated);
      return updated;
    });

    try {
      await deleteFirestoreDocument(COLLECTIONS.ACHIEVEMENTS, achId);
      showToast('success', 'Prestasi siswa berhasil dihapus.', 1500);
    } catch (err: any) {
      console.error('[DatabaseContext] deleteAchievement error:', err);
      const cached = loadLocalCache();
      setDb(cached);
      showToast('error', `Gagal menghapus prestasi: ${err.message || 'Terjadi kesalahan'}`, 2500);
      throw err;
    }
  }, [showToast]);

  const savePotential = useCallback(async (pot: Omit<StudentPotential, 'potential_id' | 'updated_at'>) => {
    const now = new Date().toISOString();
    const existing = db.potentials.find(p => p.student_id === pot.student_id);
    const potId = existing?.potential_id || `pot-${Date.now()}`;
    const cleanPot: StudentPotential = {
      potential_id: potId,
      student_id: pot.student_id,
      interests: pot.interests || '',
      talents: pot.talents || '',
      skills: pot.skills || '',
      notes: pot.notes || '',
      updated_at: now
    };

    const updatedDb: AppDatabase = {
      ...db,
      potentials: existing 
        ? db.potentials.map(p => p.student_id === pot.student_id ? cleanPot : p)
        : [...db.potentials, cleanPot]
    };
    setDb(updatedDb);
    saveLocalCache(updatedDb);

    try {
      await setFirestoreDocument(COLLECTIONS.POTENTIALS, potId, cleanPot);
      showToast('success', 'Potensi siswa berhasil disimpan.');
    } catch (err: any) {
      showToast('error', `Gagal menyimpan potensi: ${err.message}`);
    }
  }, [db, showToast]);

  // Periodic Evaluations
  const saveEvaluation = useCallback(async (
    evaluationData: Omit<PeriodicEvaluation, 'evaluation_id' | 'evaluated_at'>
  ) => {
    const now = new Date().toISOString();
    const existing = db.evaluations?.find(
      e => e.student_id === evaluationData.student_id && 
           e.academic_year_id === evaluationData.academic_year_id && 
           e.period === evaluationData.period
    );
    const evalId = existing?.evaluation_id || `eval-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`;
    const cleanEval: PeriodicEvaluation = {
      evaluation_id: evalId,
      student_id: evaluationData.student_id,
      academic_year_id: evaluationData.academic_year_id,
      semester: evaluationData.semester || 'Ganjil',
      period: evaluationData.period,
      compliance_score: Math.min(100, Math.max(0, evaluationData.compliance_score ?? 100)),
      responsibility_score: Math.min(100, Math.max(0, evaluationData.responsibility_score ?? 100)),
      notes: evaluationData.notes || '',
      evaluator: evaluationData.evaluator || db.school_settings.homeroom_teacher_name || 'Wali Kelas',
      evaluated_at: now,
    };

    const updatedEvals = existing
      ? (db.evaluations || []).map(e => e.evaluation_id === evalId ? cleanEval : e)
      : [...(db.evaluations || []), cleanEval];

    const updatedDb: AppDatabase = {
      ...db,
      evaluations: updatedEvals
    };
    setDb(updatedDb);
    saveLocalCache(updatedDb);

    try {
      await setFirestoreDocument(COLLECTIONS.EVALUATIONS, evalId, cleanEval);
      showToast('success', 'Penilaian berkala siswa berhasil disimpan di Firestore.');
    } catch (err: any) {
      showToast('error', `Gagal menyimpan penilaian: ${err.message}`);
    }
  }, [db, showToast]);

  // Parent Comms
  const addParentComm = useCallback(async (comm: Omit<ParentCommunication, 'comm_id' | 'created_at'>): Promise<ParentCommunication> => {
    const newComm: ParentCommunication = {
      ...comm,
      comm_id: `pcomm-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
      created_at: new Date().toISOString(),
    };
    const updatedDb: AppDatabase = {
      ...db,
      parent_communications: [newComm, ...db.parent_communications],
    };
    setDb(updatedDb);
    saveLocalCache(updatedDb);

    try {
      await setFirestoreDocument(COLLECTIONS.PARENT_COMMUNICATIONS, newComm.comm_id, newComm);
      showToast('success', 'Komunikasi orang tua berhasil dicatat.');
    } catch (err: any) {
      showToast('error', `Gagal menyimpan log komunikasi: ${err.message}`);
    }
    return newComm;
  }, [db, showToast]);

  const deleteParentComm = useCallback(async (commId: string) => {
    setDb(prev => {
      const updatedDb: AppDatabase = {
        ...prev,
        parent_communications: prev.parent_communications.filter(c => c.comm_id !== commId),
      };
      saveLocalCache(updatedDb);
      return updatedDb;
    });

    try {
      await deleteFirestoreDocument(COLLECTIONS.PARENT_COMMUNICATIONS, commId);
      showToast('success', 'Log komunikasi berhasil dihapus.', 1500);
    } catch (err: any) {
      showToast('error', `Gagal menghapus komunikasi: ${err.message}`, 2500);
    }
  }, [showToast]);

  // Settings
  const updateSettings = useCallback(async (settings: Partial<SchoolSettings>) => {
    let latestSettings: SchoolSettings | null = null;

    setDb(prev => {
      const mergedWeights: DisciplineFactorWeights = {
        attendance_weight: 30,
        punctuality_weight: 20,
        violation_weight: 25,
        compliance_weight: 15,
        responsibility_weight: 10,
        ...(prev.school_settings?.discipline_weights || {}),
        ...(settings.discipline_weights || {})
      };

      const mergedThresholds: EarlyWarningThresholds = {
        min_attendance_rate: 80,
        max_alpa_count: 3,
        max_violation_points: 30,
        ...(prev.school_settings?.early_warning_thresholds || {}),
        ...(settings.early_warning_thresholds || {})
      };

      const disciplineSettings: DisciplineSettings = {
        weight_attendance: mergedWeights.attendance_weight,
        weight_punctuality: mergedWeights.punctuality_weight,
        weight_violations: mergedWeights.violation_weight,
        weight_compliance: mergedWeights.compliance_weight,
        weight_responsibility: mergedWeights.responsibility_weight,
      };

      const earlyWarningSettings: EarlyWarningSettings = {
        high_priority_attendance_threshold: mergedThresholds.min_attendance_rate,
        high_priority_alpa_threshold: mergedThresholds.max_alpa_count,
        warning_attendance_threshold: 90,
        warning_late_threshold: 3,
        warning_violation_threshold: 2,
      };

      const updatedSettings: SchoolSettings = {
        ...(prev.school_settings || {
          school_name: '',
          npsn: '',
          school_address: '',
          school_city: '',
          school_province: '',
          school_phone: '',
          school_email: '',
          principal_name: '',
          principal_nip: '',
          homeroom_teacher_name: '',
          homeroom_teacher_nip: '',
          current_academic_year_id: 'ay-2026-2027',
          current_class_id: 'cls-x-tkr-b',
          discipline_settings: disciplineSettings,
          early_warning_settings: earlyWarningSettings,
          discipline_weights: mergedWeights,
          early_warning_thresholds: mergedThresholds
        }),
        ...settings,
        discipline_settings: settings.discipline_settings || disciplineSettings,
        early_warning_settings: settings.early_warning_settings || earlyWarningSettings,
        discipline_weights: mergedWeights,
        early_warning_thresholds: mergedThresholds
      };

      latestSettings = updatedSettings;
      const updatedDb: AppDatabase = {
        ...prev,
        school_settings: updatedSettings,
      };
      saveLocalCache(updatedDb);
      return updatedDb;
    });

    if (latestSettings) {
      try {
        await setFirestoreDocument(COLLECTIONS.SCHOOL_SETTINGS, 'current', latestSettings);
        showToast('success', 'Pengaturan sekolah & bobot berhasil disimpan.');
      } catch (err: any) {
        console.warn('Sync settings error to cloud:', err);
        showToast('success', 'Pengaturan berhasil disimpan di cache lokal.');
      }
    }
  }, [showToast]);

  // Batch Import with Firestore Batch
  const batchImportStudents = useCallback(async (
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

    // Pre-allocate atomic sequential IDs for all newly created students
    const newItemsCount = studentsToImport.filter(item => item.userAction === 'create_new').length;
    let allocatedIds: string[] = [];
    if (newItemsCount > 0) {
      try {
        allocatedIds = await allocateAtomicStudentIds(newItemsCount);
      } catch {
        allocatedIds = [];
      }
    }
    let allocatedIdx = 0;

    const ops: { type: 'set'; collection: string; docId: string; data: any }[] = [];

    for (const item of studentsToImport) {
      if (item.userAction === 'skip') {
        skipped++;
        continue;
      }

      if (item.userAction === 'update_existing' && item.existingStudentId) {
        const sId = item.existingStudentId;
        const existingStudent = currentStudents.find(s => s.student_id === sId);
        const { student_id: _, ...safeStudentFields } = item.student as any;
        const updatedS = { 
          ...(existingStudent || ({} as Student)), 
          ...safeStudentFields, 
          student_id: sId, 
          updated_at: now 
        } as Student;
        currentStudents = currentStudents.map(s => s.student_id === sId ? updatedS : s);
        ops.push({ type: 'set', collection: COLLECTIONS.STUDENTS, docId: sId, data: updatedS });

        // Update address
        const addrIdx = currentAddresses.findIndex(a => a.student_id === sId);
        const addrId = addrIdx >= 0 ? currentAddresses[addrIdx].address_id : `addr-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`;
        const updatedAddr: Address = {
          address_id: addrId,
          student_id: sId,
          rt: '', rw: '', dusun: '', desa: '', kecamatan: '', kabupaten: '', full_address: '',
          ...(addrIdx >= 0 ? currentAddresses[addrIdx] : {}),
          ...item.address,
        };
        if (addrIdx >= 0) {
          currentAddresses[addrIdx] = updatedAddr;
        } else {
          currentAddresses.push(updatedAddr);
        }
        ops.push({ type: 'set', collection: COLLECTIONS.ADDRESSES, docId: addrId, data: updatedAddr });

        // Update parent
        const parIdx = currentParents.findIndex(p => p.student_id === sId);
        const parId = parIdx >= 0 ? currentParents[parIdx].parent_id : `par-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`;
        const updatedPar: Parent = {
          parent_id: parId,
          student_id: sId,
          father_name: '', father_job: '', mother_name: '', mother_job: '', parent_phone: '',
          ...(parIdx >= 0 ? currentParents[parIdx] : {}),
          ...item.parent,
        };
        if (parIdx >= 0) {
          currentParents[parIdx] = updatedPar;
        } else {
          currentParents.push(updatedPar);
        }
        ops.push({ type: 'set', collection: COLLECTIONS.PARENTS, docId: parId, data: updatedPar });

        // History
        const hasHistory = currentHistories.some(
          h => h.student_id === sId && h.class_id === item.classId && h.academic_year_id === item.academicYearId
        );
        if (!hasHistory) {
          const newHist: StudentClassHistory = {
            history_id: `hist-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
            student_id: sId,
            class_id: item.classId,
            academic_year_id: item.academicYearId,
            start_date: today,
            status: 'Active',
          };
          currentHistories.push(newHist);
          ops.push({ type: 'set', collection: COLLECTIONS.STUDENT_CLASS_HISTORY, docId: newHist.history_id, data: newHist });
        }

        updated++;
      } else {
        // Create new student with atomic ID
        const newStudentId = (allocatedIdx < allocatedIds.length) 
          ? allocatedIds[allocatedIdx++] 
          : generateNextStudentId(currentStudents);

        const newStudent: Student = {
          student_id: newStudentId,
          nis: item.student.nis || '',
          nisn: item.student.nisn || '',
          nik: item.student.nik || '',
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
        ops.push({ type: 'set', collection: COLLECTIONS.STUDENTS, docId: newStudentId, data: newStudent });

        const addrId = `addr-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`;
        const newAddr: Address = {
          address_id: addrId,
          student_id: newStudentId,
          rt: item.address.rt || '',
          rw: item.address.rw || '',
          dusun: item.address.dusun || '',
          desa: item.address.desa || '',
          kecamatan: item.address.kecamatan || '',
          kabupaten: item.address.kabupaten || '',
          full_address: item.address.full_address || '',
        };
        currentAddresses.push(newAddr);
        ops.push({ type: 'set', collection: COLLECTIONS.ADDRESSES, docId: addrId, data: newAddr });

        const parId = `par-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`;
        const newPar: Parent = {
          parent_id: parId,
          student_id: newStudentId,
          father_name: item.parent.father_name || '',
          father_job: item.parent.father_job || '',
          mother_name: item.parent.mother_name || '',
          mother_job: item.parent.mother_job || '',
          guardian_name: item.parent.guardian_name || '',
          guardian_relation: item.parent.guardian_relation || '',
          parent_phone: item.parent.parent_phone || '',
        };
        currentParents.push(newPar);
        ops.push({ type: 'set', collection: COLLECTIONS.PARENTS, docId: parId, data: newPar });

        const histId = `hist-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`;
        const newHist: StudentClassHistory = {
          history_id: histId,
          student_id: newStudentId,
          class_id: item.classId,
          academic_year_id: item.academicYearId,
          start_date: today,
          status: 'Active',
        };
        currentHistories.push(newHist);
        ops.push({ type: 'set', collection: COLLECTIONS.STUDENT_CLASS_HISTORY, docId: histId, data: newHist });

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

    setDb(updatedDb);
    saveLocalCache(updatedDb);

    try {
      showToast('loading', `Menyimpan ${ops.length} dokumen import ke Cloud Firestore...`);
      await batchWriteFirestore(ops);
      showToast('success', `Import berhasil: ${created} baru, ${updated} diperbarui, ${skipped} dilewati.`);
    } catch (err: any) {
      showToast('error', `Gagal import ke Firestore: ${err.message}`);
    }

    return { created, updated, skipped };
  }, [db, showToast]);

  const replaceAllStudentsWithImport = useCallback(async (
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
        nik: item.student.nik || '',
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
        guardian_name: item.parent.guardian_name || '',
        guardian_relation: item.parent.guardian_relation || '',
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

    setDb(updatedDb);
    saveLocalCache(updatedDb);

    try {
      showToast('loading', `Menulis ${newStudents.length} siswa ke Cloud Firestore...`);
      await saveFullDatabaseToFirestore(updatedDb);
      showToast('success', `Berhasil inisialisasi ${newStudents.length} siswa di Cloud Firestore.`);
    } catch (err: any) {
      showToast('error', `Gagal replace Firestore: ${err.message}`);
    }

    return { totalImported: newStudents.length };
  }, [db, showToast]);

  const resetDatabase = useCallback(async () => {
    const reset = resetToSeedData();
    setDb(reset);
    saveLocalCache(reset);

    try {
      showToast('loading', 'Mereset data di Firestore ke kondisi percontohan...');
      await saveFullDatabaseToFirestore(reset);
      showToast('success', 'Database di Firestore berhasil direset ke data contoh.');
    } catch (err: any) {
      showToast('error', `Gagal reset Firestore: ${err.message}`);
    }
  }, [showToast]);

  const restoreDatabaseFromJSON = useCallback(async (jsonString: string) => {
    try {
      const parsed = JSON.parse(jsonString) as AppDatabase;
      if (!parsed.students || !Array.isArray(parsed.students) || !parsed.school_settings) {
        return { 
          success: false, 
          message: 'Format file backup tidak valid. Pastikan file JSON diekspor dari Wali Kelas System.' 
        };
      }
      parsed.last_backup = new Date().toISOString();
      
      // Update memory & local
      setDb(parsed);
      saveLocalCache(parsed);

      // Write to Firestore in controlled batches
      showToast('loading', `Memulihkan ${parsed.students.length} siswa ke Cloud Firestore...`);
      const result = await saveFullDatabaseToFirestore(parsed);
      showToast('success', `Pemulihan selesai! ${result.totalWritten} dokumen berhasil ditulis ke Cloud Firestore.`);

      return {
        success: true,
        message: `Berhasil memulihkan ${parsed.students.length} siswa dan ${result.totalWritten} dokumen ke Firestore.`,
        count: result.totalWritten
      };
    } catch (err: any) {
      showToast('error', `Gagal memulihkan database: ${err.message}`);
      return {
        success: false,
        message: `Terjadi kesalahan saat restore: ${err.message}`
      };
    }
  }, [showToast]);

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
        
        currentUser,
        isAuthenticated,
        isAuthLoading,
        isFirestoreConnected,
        isSyncing,
        isOffline,
        lastSyncTime,
        syncErrorMessage,
        toast,
        showToast,
        clearToast,
        isLoginModalOpen,
        setIsLoginModalOpen,
        loginWithPreset,
        loginWithEmail,
        registerWithEmail,
        loginGoogleUser,
        logoutUser,

        localDataAvailableForMigration,
        localDataCount,
        migrateLocalDataToFirestore,

        addStudent,
        updateStudent,
        deleteStudent,
        deleteMultipleStudents,
        promoteStudents,
        addClass,
        addAcademicYear,
        saveAttendanceBatch,
        saveDailyAttendance: saveAttendanceBatch,
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
        saveEvaluation,
        addParentComm,
        deleteParentComm,
        addParentCommunication: addParentComm,
        deleteParentCommunication: deleteParentComm,
        updateSettings,
        batchImportStudents,
        replaceAllStudentsWithImport,
        resetDatabase,
        restoreDatabaseFromJSON,
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
