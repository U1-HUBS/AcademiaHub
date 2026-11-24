import { StudentLedger, LedgerTransaction } from '../types';
import { fetchCollection, fetchDocById, saveDoc } from './storage';
import { ensureStudentLedger } from './accountApi';

export async function getAllLedgers(): Promise<StudentLedger[]> {
  return fetchCollection<StudentLedger>('ledgers');
}

export async function getStudentLedger(studentId: string): Promise<StudentLedger | null> {
  const ledger = await fetchDocById<StudentLedger>('ledgers', studentId);
  return ledger;
}

// Legacy accounts can initialize a missing ledger through their verified Firebase session.
export const initializeStudentLedger = ensureStudentLedger;

/**
 * Records an official payment transaction made to the student ledger (Registrar action)
 */
export async function recordPayment(
  studentId: string,
  amount: number,
  method: 'payment_cash' | 'payment_online',
  referenceNo: string,
  description: string = 'Tuition & Fee Payment'
): Promise<StudentLedger> {
  const ledger = await getStudentLedger(studentId);
  if (!ledger) {
    throw new Error('Ledger record not found for student.');
  }

  const now = new Date().toISOString();
  const tx: LedgerTransaction = {
    id: `tx-pay-${Date.now()}`,
    date: now.split('T')[0],
    referenceNo: referenceNo.trim() || `PAY-${Date.now().toString().slice(-6)}`,
    type: 'payment',
    category: method,
    description,
    amount: Number(amount),
    academicYear: ledger.academicYear,
    semester: ledger.semester,
  };

  const newTotalPaid = Number((ledger.totalPaid + amount).toFixed(2));
  const newBalance = Number(Math.max(0, ledger.totalAssessment - newTotalPaid).toFixed(2));
  const newStatus: StudentLedger['status'] =
    newBalance <= 0 ? 'paid' : newTotalPaid > 0 ? 'partial' : 'unpaid';

  const updatedTransactions = [...ledger.transactions, tx];

  const updatedLedger: StudentLedger = {
    ...ledger,
    totalPaid: newTotalPaid,
    remainingBalance: newBalance,
    status: newStatus,
    transactions: updatedTransactions,
    updatedAt: now,
  };

  await saveDoc('ledgers', studentId, updatedLedger);
  return updatedLedger;
}

/**
 * Adds an assessment charge to the student ledger (Registrar action)
 */
export async function addLedgerCharge(
  studentId: string,
  category: LedgerTransaction['category'],
  description: string,
  amount: number
): Promise<StudentLedger> {
  const ledger = await getStudentLedger(studentId);
  if (!ledger) {
    throw new Error('Ledger record not found for student.');
  }

  const now = new Date().toISOString();
  const tx: LedgerTransaction = {
    id: `tx-charge-${Date.now()}`,
    date: now.split('T')[0],
    referenceNo: `CHG-${Math.floor(10000 + Math.random() * 90000)}`,
    type: 'assessment',
    category,
    description,
    amount: Number(amount),
    academicYear: ledger.academicYear,
    semester: ledger.semester,
  };

  const newTotalAssessment = Number((ledger.totalAssessment + amount).toFixed(2));
  const newBalance = Number((newTotalAssessment - ledger.totalPaid).toFixed(2));
  const newStatus: StudentLedger['status'] =
    newBalance <= 0 ? 'paid' : ledger.totalPaid > 0 ? 'partial' : 'unpaid';

  const updatedTransactions = [...ledger.transactions, tx];

  const updatedLedger: StudentLedger = {
    ...ledger,
    totalAssessment: newTotalAssessment,
    remainingBalance: newBalance,
    status: newStatus,
    transactions: updatedTransactions,
    updatedAt: now,
  };

  await saveDoc('ledgers', studentId, updatedLedger);
  return updatedLedger;
}
