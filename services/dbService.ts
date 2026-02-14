
import { Question, UserProfile } from '../types';
import { supabase, isSupabaseConfigured } from './supabaseClient';

// =====================================================
// IndexedDB Layer (offline fallback)
// =====================================================

const DB_NAME = 'eipi_data_store';
const DB_VERSION = 2;
const STORES = {
  DRAFT: 'draft_bank',
  LIVE: 'live_bank',
  HISTORY: 'student_history',
  USERS: 'users'
};

const openDB = (): Promise<IDBDatabase> => {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);
    request.onupgradeneeded = (event) => {
      const db = (event.target as IDBOpenDBRequest).result;
      if (!db.objectStoreNames.contains(STORES.DRAFT)) db.createObjectStore(STORES.DRAFT);
      if (!db.objectStoreNames.contains(STORES.LIVE)) db.createObjectStore(STORES.LIVE);
      if (!db.objectStoreNames.contains(STORES.HISTORY)) db.createObjectStore(STORES.HISTORY);
      if (!db.objectStoreNames.contains(STORES.USERS)) db.createObjectStore(STORES.USERS, { keyPath: 'email' });
    };
    request.onsuccess = (event) => resolve((event.target as IDBOpenDBRequest).result);
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

const idbLoadAll = async (storeName: string): Promise<any[]> => {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(storeName, 'readonly');
    const store = tx.objectStore(storeName);
    const req = store.getAll();
    req.onsuccess = () => resolve(req.result || []);
    req.onerror = () => reject(req.error);
  });
};

const idbDelete = async (storeName: string, key: string): Promise<void> => {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(storeName, 'readwrite');
    const store = tx.objectStore(storeName);
    const req = store.delete(key);
    req.onsuccess = () => resolve();
    req.onerror = () => reject(req.error);
  });
};

// =====================================================
// Supabase Layer
// =====================================================
// Tables expected in Supabase:
//   - profiles (email TEXT PK, real_name, username, school, year_level, referral_source, password, joined_at, picture_url)
//   - exam_history (id UUID PK, email TEXT, date TEXT, score INT, total INT, percentage INT, topic_stats JSONB)
//
// The live_bank (questions) is loaded from exam-data.json on GitHub,
// not stored in Supabase. Supabase handles user data & history only.

const supaProfileToLocal = (row: any): UserProfile => ({
  email: row.email,
  realName: row.real_name || '',
  username: row.username || '',
  school: row.school || '',
  yearLevel: row.year_level || '',
  referralSource: row.referral_source || '',
  joinedAt: row.joined_at || '',
  pictureUrl: row.picture_url || undefined,
  password: row.password || undefined,
});

const localProfileToSupa = (p: UserProfile) => ({
  email: p.email,
  real_name: p.realName,
  username: p.username,
  school: p.school,
  year_level: p.yearLevel,
  referral_source: p.referralSource,
  password: p.password || null,
  joined_at: p.joinedAt,
  picture_url: p.pictureUrl || null,
});

// =====================================================
// Unified API — Supabase first, IDB fallback
// =====================================================

export const dbService = {
  // --- Live question bank (from exam-data.json, cached in IDB) ---
  saveLiveBank: (questions: Question[]) => idbSave(STORES.LIVE, questions, 'main'),
  loadLiveBank: () => idbLoad(STORES.LIVE, 'main'),
  saveLiveMetadata: (meta: any) => idbSave(STORES.LIVE, meta, 'meta'),
  loadLiveMetadata: () => idbLoad(STORES.LIVE, 'meta'),

  // --- User Profiles ---
  saveUserProfile: async (profile: UserProfile): Promise<void> => {
    // Always save to IDB (offline access)
    await idbSave(STORES.USERS, profile);

    // Sync to Supabase if configured
    if (isSupabaseConfigured() && supabase) {
      try {
        await supabase.from('profiles').upsert(localProfileToSupa(profile), { onConflict: 'email' });
      } catch (e) {
        console.warn('[Supabase] Failed to sync profile, using offline mode', e);
      }
    }
  },

  loadUserProfile: async (email: string): Promise<UserProfile | null> => {
    // Try Supabase first
    if (isSupabaseConfigured() && supabase) {
      try {
        const { data, error } = await supabase
          .from('profiles')
          .select('*')
          .eq('email', email)
          .single();

        if (data && !error) {
          const profile = supaProfileToLocal(data);
          // Cache locally
          await idbSave(STORES.USERS, profile).catch(() => {});
          return profile;
        }
      } catch (e) {
        console.warn('[Supabase] Failed to load profile, falling back to IDB', e);
      }
    }

    // Fallback to IDB
    return idbLoad(STORES.USERS, email);
  },

  loadAllUsers: async (): Promise<UserProfile[]> => {
    // Try Supabase first
    if (isSupabaseConfigured() && supabase) {
      try {
        const { data, error } = await supabase.from('profiles').select('*').order('joined_at', { ascending: false });
        if (data && !error) {
          return data.map(supaProfileToLocal);
        }
      } catch (e) {
        console.warn('[Supabase] Failed to load users, falling back to IDB', e);
      }
    }
    return idbLoadAll(STORES.USERS) as Promise<UserProfile[]>;
  },

  deleteUserProfile: async (email: string): Promise<void> => {
    await idbDelete(STORES.USERS, email);
    if (isSupabaseConfigured() && supabase) {
      try {
        await supabase.from('profiles').delete().eq('email', email);
      } catch (e) {
        console.warn('[Supabase] Failed to delete profile', e);
      }
    }
  },

  // --- Exam History ---
  saveHistory: async (history: any[]): Promise<void> => {
    // Always save full history to IDB
    await idbSave(STORES.HISTORY, history, 'main');

    // Sync latest result to Supabase
    if (isSupabaseConfigured() && supabase && history.length > 0) {
      try {
        const latest = history[0];
        await supabase.from('exam_history').insert({
          email: latest.email || 'anonymous',
          date: latest.date,
          score: latest.score,
          total: latest.total,
          percentage: latest.percentage,
          topic_stats: latest.topicStats,
        });
      } catch (e) {
        console.warn('[Supabase] Failed to sync history', e);
      }
    }
  },

  loadHistory: async (): Promise<any[]> => {
    // History is stored locally for now (per-device)
    // Could be extended to load from Supabase by user email
    return idbLoad(STORES.HISTORY, 'main');
  },
};
