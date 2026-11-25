import { getFunctions, httpsCallable } from 'firebase/functions';
import { app, isFirebaseConfigured } from './firebase';
import type { StudentLedger } from '../types';

export async function recordStudentPaymentSecure(studentId: string, amount: number, referenceNo: string, description: string): Promise<StudentLedger | null> {
  if (!isFirebaseConfigured || !app) return null;
  const callable = httpsCallable<{studentId: string; amount: number; method: 'payment_cash'; referenceNo: string; description: string}, StudentLedger>(getFunctions(app), 'recordStudentPayment');
  const result = await callable({studentId, amount, method: 'payment_cash', referenceNo, description});
  return result.data;
}
