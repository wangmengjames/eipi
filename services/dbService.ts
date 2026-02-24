import { Question, UserProfile } from '../types';
import { db, isFirebaseConfigured } from './firebaseClient';
import {
  doc, setDoc, getDoc, getDocs, deleteDoc,
  collection, query, orderBy, addDoc, Timestamp
} from 'firebase/firestore';

// =====================================================
// IndexedDB Layer (question bank cache only)
// =====================================================

const DB_NAME = 'eipi_data_store';
const DB_VERSION = 3;
const STORES = {
  LIVE: 'live_bank',
};

let cachedDb: IDBDatabase | null = null;

const openDB = (): Promise<IDBDatabase> => {
  if (cachedDb) return Promise.resolve(cachedDb);
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);
    request.onupgradeneeded = (event) => {
      const db = (event.target as IDBOpenDBRequest).result;
      // Delete old stores from previous versions
      for (const name of Array.from(db.objectStoreNames)) {
        if (name !== STORES.LIVE) {
          db.deleteObjectStore(name);
        }
      }
      if (!db.objectStoreNames.contains(STORES.LIVE)) {
        db.createObjectStore(STORES.LIVE);
      }
    };
    request.onsuccess = (event) => {
      cachedDb = (event.target as IDBOpenDBRequest).result;
      cachedDb.onclose = () => { cachedDb = null; };
      resolve(cachedDb);
    };
    request.onerror = (event) => reject((event.target as IDBOpenDBRequest).error);
  });
};

const idbSave = async (storeName: string, data: any, key?: string): Promise<void> => {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(storeName, 'readwrite');
    const store = tx.objectStore(storeName);
    const req = key ? store.put(data, key) : store.put(data);
    req.onsuccess = () => resolve();
    req.onerror = () => reject(req.error);
  });
};

const idbLoad = async (storeName: string, key: string): Promise<any> => {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(storeName, 'readonly');
    const store = tx.objectStore(storeName);
    const req = store.get(key);
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
};

// =====================================================
// Unified API — IDB for question bank, Firestore for user data
// =====================================================

export const dbService = {
  // --- Premium status check ---
  checkPremium: async (uid: string): Promise<boolean> => {
    if (!isFirebaseConfigured() || !db) return false;
    const snap = await getDoc(doc(db, 'users', uid));
    if (!snap.exists()) return false;
    return snap.data().isPremium === true;
  },

  // --- Admin check (Firestore `admins` collection) ---
  checkIsAdmin: async (uid: string): Promise<boolean> => {
    if (!isFirebaseConfigured() || !db) return false;
    const snap = await getDoc(doc(db, 'admins', uid));
    return snap.exists();
  },

  // --- Live question bank (parsed from bank.md, cached in IDB) ---
  saveLiveBank: (questions: Question[]) => idbSave(STORES.LIVE, questions, 'main'),
  loadLiveBank: () => idbLoad(STORES.LIVE, 'main'),
  saveLiveMetadata: (meta: any) => idbSave(STORES.LIVE, meta, 'meta'),
  loadLiveMetadata: () => idbLoad(STORES.LIVE, 'meta'),

  // --- User Profiles (Firestore) ---
  saveUserProfile: async (uid: string, profile: UserProfile): Promise<void> => {
    if (!isFirebaseConfigured() || !db) {
      console.warn('[Firebase] Not configured, profile not saved');
      return;
    }
    await setDoc(doc(db, 'users', uid), {
      email: profile.email,
      realName: profile.realName,
      username: profile.username,
      school: profile.school,
      yearLevel: profile.yearLevel,
      referralSource: profile.referralSource,
      joinedAt: profile.joinedAt,
      pictureUrl: profile.pictureUrl || null,
      authProvider: profile.authProvider || null,
    }, { merge: true });
  },

  loadUserProfile: async (uid: string): Promise<UserProfile | null> => {
    if (!isFirebaseConfigured() || !db) return null;
    const snap = await getDoc(doc(db, 'users', uid));
    if (!snap.exists()) return null;
    const data = snap.data();
    return {
      email: data.email || '',
      realName: data.realName || '',
      username: data.username || '',
      school: data.school || '',
      yearLevel: data.yearLevel || '',
      referralSource: data.referralSource || '',
      joinedAt: data.joinedAt || '',
      pictureUrl: data.pictureUrl || undefined,
      authProvider: data.authProvider || undefined,
    };
  },

  loadAllUsers: async (): Promise<(UserProfile & { uid: string })[]> => {
    if (!isFirebaseConfigured() || !db) return [];
    const q = query(collection(db, 'users'), orderBy('joinedAt', 'desc'));
    const snap = await getDocs(q);
    return snap.docs.map(d => {
      const data = d.data();
      return {
        uid: d.id,
        email: data.email || '',
        realName: data.realName || '',
        username: data.username || '',
        school: data.school || '',
        yearLevel: data.yearLevel || '',
        referralSource: data.referralSource || '',
        joinedAt: data.joinedAt || '',
        pictureUrl: data.pictureUrl || undefined,
        authProvider: data.authProvider || undefined,
      };
    });
  },

  deleteUserProfile: async (uid: string): Promise<void> => {
    if (!isFirebaseConfigured() || !db) return;
    // Delete exam_history subcollection first
    const historySnap = await getDocs(collection(db, 'users', uid, 'exam_history'));
    const deletes = historySnap.docs.map(d => deleteDoc(d.ref));
    await Promise.all(deletes);
    await deleteDoc(doc(db, 'users', uid));
  },

  // --- Exam History (Firestore subcollection) ---
  saveHistory: async (uid: string, entry: {
    email: string;
    date: string;
    score: number;
    total: number;
    percentage: number;
    topicStats: Record<string, { total: number; correct: number }>;
  }): Promise<void> => {
    if (!isFirebaseConfigured() || !db) {
      console.warn('[Firebase] Not configured, history not saved');
      return;
    }
    await addDoc(collection(db, 'users', uid, 'exam_history'), {
      ...entry,
      createdAt: Timestamp.now(),
    });
  },

  loadHistory: async (uid: string): Promise<any[]> => {
    if (!isFirebaseConfigured() || !db) return [];
    const q = query(
      collection(db, 'users', uid, 'exam_history'),
      orderBy('createdAt', 'desc')
    );
    const snap = await getDocs(q);
    return snap.docs.map(d => d.data());
  },
};
