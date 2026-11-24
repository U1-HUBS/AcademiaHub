import {
  collection,
  doc,
  setDoc,
  updateDoc,
  deleteDoc,
  getDocsFromServer,
  getDocFromServer,
} from 'firebase/firestore';
import { db, isFirebaseConfigured } from './firebase';
import {
  INITIAL_USERS,
  INITIAL_PROGRAMS,
  INITIAL_SECTIONS,
  INITIAL_SUBJECTS,
  INITIAL_SCHEDULES,
  INITIAL_ENROLLMENTS,
  INITIAL_ATTENDANCE,
  INITIAL_ASSESSMENTS,
  INITIAL_SUBMISSIONS,
  INITIAL_GRADES,
  INITIAL_ANNOUNCEMENTS,
  INITIAL_LEDGERS,
} from './initialData';

const STORAGE_PREFIX = 'automate_data_';

// Initialize local store if not present
function getLocalCollection<T>(collectionName: string, initialFallback: T[]): T[] {
  try {
    const raw = localStorage.getItem(STORAGE_PREFIX + collectionName);
    if (!raw) {
      localStorage.setItem(STORAGE_PREFIX + collectionName, JSON.stringify(initialFallback));
      return initialFallback;
    }
    return JSON.parse(raw);
  } catch (err) {
    console.warn(`Error reading local collection ${collectionName}:`, err);
    return initialFallback;
  }
}

function setLocalCollection<T>(collectionName: string, data: T[]): void {
  try {
    localStorage.setItem(STORAGE_PREFIX + collectionName, JSON.stringify(data));
    window.dispatchEvent(new CustomEvent('automate:data-change', { detail: { collectionName } }));
  } catch (err) {
    console.error(`Error saving local collection ${collectionName}:`, err);
  }
}

// Clear all local persistent data from browser storage
export function clearAllLocalData(): void {
  try {
    const keys = Object.keys(localStorage);
    keys.forEach(key => {
      if (key.startsWith(STORAGE_PREFIX) || key === 'automate_auth_user') {
        localStorage.removeItem(key);
      }
    });
    window.dispatchEvent(new CustomEvent('automate:data-change', { detail: { collectionName: 'all' } }));
  } catch (err) {
    console.error('Error clearing local data:', err);
  }
}

// Automatically purge legacy mock data on startup
export function purgeOldDemoData(): void {
  try {
    const rawUsers = localStorage.getItem(STORAGE_PREFIX + 'users');
    if (rawUsers && (rawUsers.includes('user-registrar-01') || rawUsers.includes('registrar@automate.edu') || rawUsers.includes('user-student-alex'))) {
      clearAllLocalData();
    }
  } catch (err) {
    console.warn('Failed to check demo data purge:', err);
  }
}

export function resetLocalData(): void {
  clearAllLocalData();
}

// Fallbacks map (empty for production use)
const initialMap: Record<string, any[]> = {
  users: INITIAL_USERS,
  programs: INITIAL_PROGRAMS,
  sections: INITIAL_SECTIONS,
  subjects: INITIAL_SUBJECTS,
  schedules: INITIAL_SCHEDULES,
  enrollments: INITIAL_ENROLLMENTS,
  attendance: INITIAL_ATTENDANCE,
  assessments: INITIAL_ASSESSMENTS,
  submissions: INITIAL_SUBMISSIONS,
  grades: INITIAL_GRADES,
  announcements: INITIAL_ANNOUNCEMENTS,
  ledgers: INITIAL_LEDGERS,
};

export async function fetchCollection<T extends { id?: string; uid?: string }>(collectionName: string): Promise<T[]> {
  if (isFirebaseConfigured) {
    if (!db) throw new Error('Firebase is unavailable.');
    const snapshot = await getDocsFromServer(collection(db, collectionName));
    return snapshot.docs.map(item => ({...item.data(), id: item.id}) as T);
  }
  return getLocalCollection<T>(collectionName, (initialMap[collectionName] as T[]) || []);
}

export async function fetchDocById<T extends { id?: string; uid?: string }>(
  collectionName: string, id: string,
): Promise<T | null> {
  if (isFirebaseConfigured) {
    if (!db) throw new Error('Firebase is unavailable.');
    const snapshot = await getDocFromServer(doc(db, collectionName, id));
    return snapshot.exists() ? {...snapshot.data() as T, id: snapshot.id} : null;
  }
  return getLocalCollection<T>(collectionName, (initialMap[collectionName] as T[]) || [])
    .find(item => item.id === id || item.uid === id) ?? null;
}

export async function saveDoc(collectionName: string, id: string, data: object): Promise<void> {
  if (isFirebaseConfigured) {
    if (!db) throw new Error('Firebase is unavailable.');
    await setDoc(doc(db, collectionName, id), {...data}, {merge: true});
    return;
  }
  const records = getLocalCollection<Record<string, unknown>>(collectionName, initialMap[collectionName] || []);
  const index = records.findIndex(item => item.id === id || item.uid === id);
  if (index >= 0) records[index] = {...records[index], ...data};
  else records.push({...data, id});
  setLocalCollection(collectionName, records);
}

export async function updateDocById(collectionName: string, id: string, updates: object): Promise<void> {
  if (isFirebaseConfigured) {
    if (!db) throw new Error('Firebase is unavailable.');
    await updateDoc(doc(db, collectionName, id), {...updates});
    return;
  }
  const records = getLocalCollection<Record<string, unknown>>(collectionName, initialMap[collectionName] || []);
  const index = records.findIndex(item => item.id === id || item.uid === id);
  if (index >= 0) records[index] = {...records[index], ...updates};
  setLocalCollection(collectionName, records);
}

export async function deleteDocById(collectionName: string, id: string): Promise<void> {
  if (isFirebaseConfigured) {
    if (!db) throw new Error('Firebase is unavailable.');
    await deleteDoc(doc(db, collectionName, id));
    return;
  }
  const records = getLocalCollection<Record<string, unknown>>(collectionName, initialMap[collectionName] || []);
  setLocalCollection(collectionName, records.filter(item => item.id !== id && item.uid !== id));
}
