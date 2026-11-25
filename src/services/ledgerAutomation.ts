import { getFunctions, httpsCallable } from 'firebase/functions';
import { app, isFirebaseConfigured } from './firebase';
import type { StudentLedger } from '../types';

export async function reconcileStudentLedgerSecure(studentId: string, academicYear: string, semester: string): Promise<StudentLedger | null> {
  if (!isFirebaseConfigured || !app) return null;
  const callable = httpsCallable<{studentId: string; academicYear: string; semester: string}, StudentLedger>(getFunctions(app), 'reconcileStudentLedger');
  const result = await callable({studentId, academicYear, semester});
  return result.data;
}
