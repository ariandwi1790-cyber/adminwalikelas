import { initializeApp, getApps, getApp } from 'firebase/app';
import { 
  getAuth, 
  signInWithPopup, 
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  updateProfile,
  GoogleAuthProvider, 
  onAuthStateChanged, 
  signOut, 
  User 
} from 'firebase/auth';
import { 
  getFirestore, 
  doc, 
  getDocFromServer,
  enableIndexedDbPersistence 
} from 'firebase/firestore';
import firebaseConfig from '../../firebase-applet-config.json';
import { AppAccount, AppUser } from '../types';

const app = getApps().length > 0 ? getApp() : initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);

// Attempt offline persistence if browser supports it
try {
  enableIndexedDbPersistence(db).catch((err) => {
    if (err.code === 'failed-precondition') {
      console.warn('Firestore persistence failed: Multiple tabs open');
    } else if (err.code === 'unimplemented') {
      console.warn('Firestore persistence is not supported by current browser');
    }
  });
} catch (e) {
  // Persistence already enabled or not supported in this context
}

const provider = new GoogleAuthProvider();
provider.addScope('https://www.googleapis.com/auth/spreadsheets.readonly');
provider.setCustomParameters({
  prompt: 'select_account'
});

let cachedAccessToken: string | null = null;

export const PRESET_ACCOUNTS: AppAccount[] = [
  {
    uid: 'preset-wali-1',
    username: 'ahmad',
    displayName: 'Ahmad Subari, S.Pd',
    email: 'ahmad.subari@smkn1.sch.id',
    role: 'Wali Kelas X TKR B',
    nip: '19850315 201001 1 012',
    classAssigned: 'cls-x-tkr-b',
    schoolName: 'SMK Negeri 1 Kota',
    avatarUrl: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80',
    password: 'password123'
  },
  {
    uid: 'preset-wali-2',
    username: 'siti',
    displayName: 'Siti Rahmawati, S.Pd',
    email: 'siti.rahma@smkn1.sch.id',
    role: 'Wali Kelas XI TKJ A',
    nip: '19890422 201402 2 005',
    classAssigned: 'cls-xi-tkj-a',
    schoolName: 'SMK Negeri 1 Kota',
    avatarUrl: 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=150&auto=format&fit=crop&q=80',
    password: 'password123'
  },
  {
    uid: 'preset-bk-1',
    username: 'hendra',
    displayName: 'Hendra Wijaya, M.Pd, Kons',
    email: 'hendra.bk@smkn1.sch.id',
    role: 'Guru Bimbingan Konseling (BK)',
    nip: '19820710 200801 1 009',
    schoolName: 'SMK Negeri 1 Kota',
    avatarUrl: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&auto=format&fit=crop&q=80',
    password: 'password123'
  },
  {
    uid: 'preset-kepsek',
    username: 'kepsek',
    displayName: 'Drs. Bambang Sudarmono, M.M',
    email: 'kepsek@smkn1.sch.id',
    role: 'Kepala Sekolah',
    nip: '19681120 199403 1 003',
    schoolName: 'SMK Negeri 1 Kota',
    avatarUrl: 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=150&auto=format&fit=crop&q=80',
    password: 'password123'
  },
  {
    uid: 'preset-admin',
    username: 'admin',
    displayName: 'Tim Administrasi & Kesiswaan',
    email: 'kesiswaan@smkn1.sch.id',
    role: 'Administrator Sistem',
    schoolName: 'SMK Negeri 1 Kota',
    avatarUrl: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=150&auto=format&fit=crop&q=80',
    password: 'password123'
  }
];

export const getRegisteredAccounts = (): AppAccount[] => {
  try {
    const raw = localStorage.getItem('wali_registered_accounts');
    if (raw) {
      return JSON.parse(raw);
    }
  } catch (e) {
    console.error('Error reading registered accounts:', e);
  }
  return [];
};

export const saveRegisteredAccount = (account: AppAccount) => {
  try {
    const existing = getRegisteredAccounts();
    const updated = [account, ...existing.filter(a => a.uid !== account.uid && a.username !== account.username && a.email !== account.email)];
    localStorage.setItem('wali_registered_accounts', JSON.stringify(updated));
  } catch (e) {
    console.error('Error saving registered account:', e);
  }
};

export const initAuth = (
  onAuthSuccess?: (user: User, token: string) => void,
  onAuthFailure?: () => void
) => {
  return onAuthStateChanged(auth, async (user: User | null) => {
    if (user) {
      if (onAuthSuccess) onAuthSuccess(user, cachedAccessToken || '');
    } else {
      if (onAuthFailure) onAuthFailure();
    }
  });
};

export const googleSignIn = async (): Promise<{ user: User; accessToken: string }> => {
  try {
    const result = await signInWithPopup(auth, provider);
    const credential = GoogleAuthProvider.credentialFromResult(result);
    cachedAccessToken = credential?.accessToken || '';
    return { user: result.user, accessToken: cachedAccessToken };
  } catch (error: any) {
    console.error('Google Sign In error:', error);
    throw error;
  }
};

export const emailSignIn = async (email: string, pass: string): Promise<User> => {
  const result = await signInWithEmailAndPassword(auth, email, pass);
  return result.user;
};

export const emailSignUp = async (email: string, pass: string, displayName: string): Promise<User> => {
  const result = await createUserWithEmailAndPassword(auth, email, pass);
  if (displayName && result.user) {
    await updateProfile(result.user, { displayName });
  }
  return result.user;
};

export const getCachedAccessToken = (): string | null => {
  return cachedAccessToken;
};

export const logoutGoogle = async () => {
  await signOut(auth);
  cachedAccessToken = null;
};

export async function testFirestoreConnection(): Promise<boolean> {
  try {
    if (auth.currentUser) {
      await getDocFromServer(doc(db, 'test', 'connection'));
    }
    return true;
  } catch (error: any) {
    if (error instanceof Error && error.message.includes('the client is offline')) {
      console.warn('Firestore client is offline or network unreachable.');
      return false;
    }
    return true;
  }
}
