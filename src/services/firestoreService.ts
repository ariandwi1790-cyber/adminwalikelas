import { 
  collection, 
  doc, 
  getDocs, 
  getDoc, 
  setDoc, 
  updateDoc, 
  deleteDoc, 
  writeBatch, 
  onSnapshot, 
  runTransaction,
  Unsubscribe,
  DocumentData
} from 'firebase/firestore';
import { db, auth } from './firebase';
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
  PeriodicEvaluation,
  SchoolSettings 
} from '../types';
import { INITIAL_SEED_DATA } from '../db/seedData';

export enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
  TRANSACTION = 'transaction',
}

export interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId?: string | null;
    email?: string | null;
    emailVerified?: boolean | null;
    isAnonymous?: boolean | null;
    tenantId?: string | null;
    providerInfo?: {
      providerId?: string | null;
      email?: string | null;
    }[];
  };
}

export function handleFirestoreError(error: unknown, operationType: OperationType, path: string | null): never {
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: auth.currentUser?.uid,
      email: auth.currentUser?.email,
      emailVerified: auth.currentUser?.emailVerified,
      isAnonymous: auth.currentUser?.isAnonymous,
      tenantId: auth.currentUser?.tenantId,
      providerInfo: auth.currentUser?.providerData?.map(provider => ({
        providerId: provider.providerId,
        email: provider.email,
      })) || []
    },
    operationType,
    path
  };
  console.error('Firestore Error: ', JSON.stringify(errInfo));
  throw new Error(JSON.stringify(errInfo));
}

// Collection Names Map
export const COLLECTIONS = {
  STUDENTS: 'students',
  PARENTS: 'parents',
  ADDRESSES: 'addresses',
  ACADEMIC_YEARS: 'academic_years',
  CLASSES: 'classes',
  STUDENT_CLASS_HISTORY: 'student_class_history',
  ATTENDANCE: 'attendance',
  VIOLATIONS: 'violations',
  GUIDANCE: 'guidance',
  HOME_VISITS: 'home_visits',
  STUDENT_NOTES: 'student_notes',
  ACHIEVEMENTS: 'achievements',
  POTENTIALS: 'potentials',
  PARENT_COMMUNICATIONS: 'parent_communications',
  SCHOOL_SETTINGS: 'school_settings',
  EVALUATIONS: 'evaluations',
  COUNTERS: 'counters',
} as const;

// Atomic Student ID Counter Allocation via Firestore Transaction
// Completely eliminates concurrency race conditions (User A and User B creating students simultaneously)
export async function allocateAtomicStudentIds(count: number = 1): Promise<string[]> {
  const counterRef = doc(db, COLLECTIONS.COUNTERS, 'students');
  try {
    const allocatedIds = await runTransaction(db, async (transaction) => {
      const counterSnap = await transaction.get(counterRef);
      let currentNumber = 0;
      if (counterSnap.exists()) {
        const data = counterSnap.data();
        currentNumber = typeof data.last_number === 'number' ? data.last_number : 0;
      } else {
        // Find existing maximum student ID in database
        const studentsSnap = await getDocs(collection(db, COLLECTIONS.STUDENTS));
        let maxExisting = 0;
        studentsSnap.forEach((sDoc) => {
          const match = sDoc.id.match(/STU-(\d+)/i) || (sDoc.data() as any).student_id?.match(/STU-(\d+)/i);
          if (match && match[1]) {
            const num = parseInt(match[1], 10);
            if (!isNaN(num) && num > maxExisting) maxExisting = num;
          }
        });
        currentNumber = maxExisting;
      }

      const newLastNumber = currentNumber + count;
      transaction.set(counterRef, {
        last_number: newLastNumber,
        updated_at: new Date().toISOString(),
      }, { merge: true });

      const ids: string[] = [];
      for (let i = 1; i <= count; i++) {
        const num = currentNumber + i;
        ids.push(`STU-${String(num).padStart(5, '0')}`);
      }
      return ids;
    });
    return allocatedIds;
  } catch (error) {
    console.warn('Atomic counter transaction warning, generating safe fallback IDs:', error);
    const studentsSnap = await getDocs(collection(db, COLLECTIONS.STUDENTS)).catch(() => null);
    let maxExisting = 0;
    if (studentsSnap && !studentsSnap.empty) {
      studentsSnap.forEach((sDoc) => {
        const match = sDoc.id.match(/STU-(\d+)/i) || (sDoc.data() as any).student_id?.match(/STU-(\d+)/i);
        if (match && match[1]) {
          const num = parseInt(match[1], 10);
          if (!isNaN(num) && num > maxExisting) maxExisting = num;
        }
      });
    }
    const ids: string[] = [];
    for (let i = 1; i <= count; i++) {
      ids.push(`STU-${String(maxExisting + i).padStart(5, '0')}`);
    }
    return ids;
  }
}

// Helper to sanitize undefined values for Firestore (Firestore does not allow `undefined`)
export function sanitizeForFirestore<T extends Record<string, any>>(obj: T): T {
  const sanitized: any = Array.isArray(obj) ? [] : {};
  for (const key of Object.keys(obj)) {
    const val = obj[key];
    if (val === undefined) {
      sanitized[key] = null;
    } else if (val !== null && typeof val === 'object' && !(val instanceof Date)) {
      sanitized[key] = sanitizeForFirestore(val);
    } else {
      sanitized[key] = val;
    }
  }
  return sanitized;
}

// Generic Document Set / Create
export async function setFirestoreDocument<T extends Record<string, any>>(
  collectionName: string, 
  docId: string, 
  data: T
): Promise<void> {
  const path = `${collectionName}/${docId}`;
  try {
    const cleanData = sanitizeForFirestore(data);
    await setDoc(doc(db, collectionName, docId), cleanData, { merge: true });
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, path);
  }
}

// Generic Document Update
export async function updateFirestoreDocument<T extends Record<string, any>>(
  collectionName: string, 
  docId: string, 
  data: Partial<T>
): Promise<void> {
  const path = `${collectionName}/${docId}`;
  try {
    const cleanData = sanitizeForFirestore(data);
    const docRef = doc(db, collectionName, docId);
    await updateDoc(docRef as any, cleanData as any);
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, path);
  }
}

// Generic Document Delete
export async function deleteFirestoreDocument(
  collectionName: string, 
  docId: string
): Promise<void> {
  const path = `${collectionName}/${docId}`;
  try {
    await deleteDoc(doc(db, collectionName, docId));
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, path);
  }
}

// Generic Collection Fetch
export async function fetchCollectionData<T extends DocumentData>(collectionName: string): Promise<T[]> {
  try {
    const snapshot = await getDocs(collection(db, collectionName));
    return snapshot.docs.map(d => d.data() as T);
  } catch (error) {
    handleFirestoreError(error, OperationType.LIST, collectionName);
  }
}

// Batch write with chunking (Max 400 operations per batch)
export async function batchWriteFirestore(
  operations: {
    type: 'set' | 'update' | 'delete';
    collection: string;
    docId: string;
    data?: any;
  }[]
): Promise<{ success: boolean; count: number }> {
  const CHUNK_SIZE = 400;
  let processed = 0;

  for (let i = 0; i < operations.length; i += CHUNK_SIZE) {
    const chunk = operations.slice(i, i + CHUNK_SIZE);
    const batch = writeBatch(db);

    for (const op of chunk) {
      const docRef = doc(db, op.collection, op.docId);
      if (op.type === 'set' && op.data) {
        batch.set(docRef, sanitizeForFirestore(op.data), { merge: true });
      } else if (op.type === 'update' && op.data) {
        batch.update(docRef, sanitizeForFirestore(op.data));
      } else if (op.type === 'delete') {
        batch.delete(docRef);
      }
    }

    try {
      await batch.commit();
      processed += chunk.length;
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, `batch_chunk_${i}`);
    }
  }

  return { success: true, count: processed };
}

// Subscribe to all collections to provide real-time updates for AppDatabase
export function subscribeToAppDatabase(
  onData: (db: AppDatabase) => void,
  onError: (error: FirestoreErrorInfo) => void
): () => void {
  const unsubs: Unsubscribe[] = [];
  const currentData: Partial<AppDatabase> = {
    students: [],
    parents: [],
    addresses: [],
    academic_years: [],
    classes: [],
    student_class_history: [],
    attendance: [],
    violations: [],
    guidance: [],
    home_visits: [],
    student_notes: [],
    achievements: [],
    potentials: [],
    parent_communications: [],
    evaluations: [],
    school_settings: INITIAL_SEED_DATA.school_settings,
    last_backup: new Date().toISOString()
  };

  let initializedCount = 0;
  const totalCollections = 16;

  const emitIfReady = () => {
    if (initializedCount >= totalCollections) {
      onData(currentData as AppDatabase);
    }
  };

  const setupCollectionListener = <K extends keyof AppDatabase>(
    key: K, 
    collectionName: string, 
    isSingleDoc: boolean = false
  ) => {
    try {
      const colRef = collection(db, collectionName);
      const unsub = onSnapshot(
        colRef,
        (snapshot) => {
          if (isSingleDoc) {
            if (!snapshot.empty) {
              const docData = snapshot.docs[0].data();
              (currentData as any)[key] = docData;
            }
          } else {
            const list = snapshot.docs.map(doc => doc.data());
            (currentData as any)[key] = list;
          }
          initializedCount = Math.min(totalCollections, initializedCount + 1);
          emitIfReady();
        },
        (error) => {
          const errInfo: FirestoreErrorInfo = {
            error: error.message,
            operationType: OperationType.LIST,
            path: collectionName,
            authInfo: {
              userId: auth.currentUser?.uid,
              email: auth.currentUser?.email,
              emailVerified: auth.currentUser?.emailVerified,
              isAnonymous: auth.currentUser?.isAnonymous,
            }
          };
          console.error(`Error in onSnapshot for ${collectionName}:`, error);
          onError(errInfo);
        }
      );
      unsubs.push(unsub);
    } catch (err: any) {
      console.error(`Failed to setup listener for ${collectionName}:`, err);
    }
  };

  setupCollectionListener('students', COLLECTIONS.STUDENTS);
  setupCollectionListener('parents', COLLECTIONS.PARENTS);
  setupCollectionListener('addresses', COLLECTIONS.ADDRESSES);
  setupCollectionListener('academic_years', COLLECTIONS.ACADEMIC_YEARS);
  setupCollectionListener('classes', COLLECTIONS.CLASSES);
  setupCollectionListener('student_class_history', COLLECTIONS.STUDENT_CLASS_HISTORY);
  setupCollectionListener('attendance', COLLECTIONS.ATTENDANCE);
  setupCollectionListener('violations', COLLECTIONS.VIOLATIONS);
  setupCollectionListener('guidance', COLLECTIONS.GUIDANCE);
  setupCollectionListener('home_visits', COLLECTIONS.HOME_VISITS);
  setupCollectionListener('student_notes', COLLECTIONS.STUDENT_NOTES);
  setupCollectionListener('achievements', COLLECTIONS.ACHIEVEMENTS);
  setupCollectionListener('potentials', COLLECTIONS.POTENTIALS);
  setupCollectionListener('parent_communications', COLLECTIONS.PARENT_COMMUNICATIONS);
  setupCollectionListener('evaluations', COLLECTIONS.EVALUATIONS);
  setupCollectionListener('school_settings', COLLECTIONS.SCHOOL_SETTINGS, true);

  return () => {
    unsubs.forEach(unsub => unsub());
  };
}

// Load entire database once from Firestore
export async function loadFullDatabaseFromFirestore(): Promise<AppDatabase> {
  const [
    students,
    parents,
    addresses,
    academic_years,
    classes,
    student_class_history,
    attendance,
    violations,
    guidance,
    home_visits,
    student_notes,
    achievements,
    potentials,
    parent_communications,
    evaluations,
    settingsDocs
  ] = await Promise.all([
    fetchCollectionData<Student>(COLLECTIONS.STUDENTS),
    fetchCollectionData<Parent>(COLLECTIONS.PARENTS),
    fetchCollectionData<Address>(COLLECTIONS.ADDRESSES),
    fetchCollectionData<AcademicYear>(COLLECTIONS.ACADEMIC_YEARS),
    fetchCollectionData<SchoolClass>(COLLECTIONS.CLASSES),
    fetchCollectionData<StudentClassHistory>(COLLECTIONS.STUDENT_CLASS_HISTORY),
    fetchCollectionData<AttendanceRecord>(COLLECTIONS.ATTENDANCE),
    fetchCollectionData<ViolationRecord>(COLLECTIONS.VIOLATIONS),
    fetchCollectionData<GuidanceRecord>(COLLECTIONS.GUIDANCE),
    fetchCollectionData<HomeVisitRecord>(COLLECTIONS.HOME_VISITS),
    fetchCollectionData<StudentNote>(COLLECTIONS.STUDENT_NOTES),
    fetchCollectionData<AchievementRecord>(COLLECTIONS.ACHIEVEMENTS),
    fetchCollectionData<StudentPotential>(COLLECTIONS.POTENTIALS),
    fetchCollectionData<ParentCommunication>(COLLECTIONS.PARENT_COMMUNICATIONS),
    fetchCollectionData<PeriodicEvaluation>(COLLECTIONS.EVALUATIONS),
    fetchCollectionData<SchoolSettings>(COLLECTIONS.SCHOOL_SETTINGS)
  ]);

  const school_settings = settingsDocs.length > 0 
    ? settingsDocs[0] 
    : INITIAL_SEED_DATA.school_settings;

  return {
    version: INITIAL_SEED_DATA.version || '1.1',
    students,
    parents,
    addresses,
    academic_years: academic_years.length > 0 ? academic_years : INITIAL_SEED_DATA.academic_years,
    classes: classes.length > 0 ? classes : INITIAL_SEED_DATA.classes,
    student_class_history,
    attendance,
    violations,
    guidance,
    home_visits,
    student_notes,
    achievements,
    potentials,
    parent_communications,
    evaluations,
    school_settings,
    last_backup: new Date().toISOString()
  };
}

// Save complete dataset to Firestore (for Seed initialization or Full Restore)
export async function saveFullDatabaseToFirestore(
  database: AppDatabase
): Promise<{ success: boolean; totalWritten: number }> {
  const operations: {
    type: 'set';
    collection: string;
    docId: string;
    data: any;
  }[] = [];

  // Settings
  operations.push({
    type: 'set',
    collection: COLLECTIONS.SCHOOL_SETTINGS,
    docId: 'current',
    data: database.school_settings
  });

  // Academic Years
  database.academic_years.forEach(ay => {
    operations.push({
      type: 'set',
      collection: COLLECTIONS.ACADEMIC_YEARS,
      docId: ay.academic_year_id,
      data: ay
    });
  });

  // Classes
  database.classes.forEach(c => {
    operations.push({
      type: 'set',
      collection: COLLECTIONS.CLASSES,
      docId: c.class_id,
      data: c
    });
  });

  // Students
  database.students.forEach(s => {
    operations.push({
      type: 'set',
      collection: COLLECTIONS.STUDENTS,
      docId: s.student_id,
      data: s
    });
  });

  // Parents
  database.parents.forEach(p => {
    operations.push({
      type: 'set',
      collection: COLLECTIONS.PARENTS,
      docId: p.parent_id,
      data: p
    });
  });

  // Addresses
  database.addresses.forEach(a => {
    operations.push({
      type: 'set',
      collection: COLLECTIONS.ADDRESSES,
      docId: a.address_id,
      data: a
    });
  });

  // Student Class History
  database.student_class_history.forEach(h => {
    operations.push({
      type: 'set',
      collection: COLLECTIONS.STUDENT_CLASS_HISTORY,
      docId: h.history_id,
      data: h
    });
  });

  // Attendance
  database.attendance.forEach(att => {
    operations.push({
      type: 'set',
      collection: COLLECTIONS.ATTENDANCE,
      docId: att.attendance_id,
      data: att
    });
  });

  // Violations
  database.violations.forEach(v => {
    operations.push({
      type: 'set',
      collection: COLLECTIONS.VIOLATIONS,
      docId: v.violation_id,
      data: v
    });
  });

  // Guidance
  database.guidance.forEach(g => {
    operations.push({
      type: 'set',
      collection: COLLECTIONS.GUIDANCE,
      docId: g.guidance_id,
      data: g
    });
  });

  // Home Visits
  database.home_visits.forEach(hv => {
    operations.push({
      type: 'set',
      collection: COLLECTIONS.HOME_VISITS,
      docId: hv.visit_id,
      data: hv
    });
  });

  // Student Notes
  database.student_notes.forEach(n => {
    operations.push({
      type: 'set',
      collection: COLLECTIONS.STUDENT_NOTES,
      docId: n.note_id,
      data: n
    });
  });

  // Achievements
  database.achievements.forEach(ach => {
    operations.push({
      type: 'set',
      collection: COLLECTIONS.ACHIEVEMENTS,
      docId: ach.achievement_id,
      data: ach
    });
  });

  // Potentials
  database.potentials.forEach(pot => {
    operations.push({
      type: 'set',
      collection: COLLECTIONS.POTENTIALS,
      docId: pot.potential_id,
      data: pot
    });
  });

  // Parent Comms
  database.parent_communications.forEach(pc => {
    operations.push({
      type: 'set',
      collection: COLLECTIONS.PARENT_COMMUNICATIONS,
      docId: pc.comm_id,
      data: pc
    });
  });

  // Evaluations
  if (database.evaluations && database.evaluations.length > 0) {
    database.evaluations.forEach(ev => {
      operations.push({
        type: 'set',
        collection: COLLECTIONS.EVALUATIONS,
        docId: ev.evaluation_id,
        data: ev
      });
    });
  }

  const result = await batchWriteFirestore(operations);
  return { success: true, totalWritten: result.count };
}

// Check if Firestore is already initialized with data
export async function isFirestoreInitialized(): Promise<boolean> {
  try {
    const studentsSnap = await getDocs(collection(db, COLLECTIONS.STUDENTS));
    return !studentsSnap.empty;
  } catch (error) {
    return false;
  }
}
