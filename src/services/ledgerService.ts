import { StudentLedger, LedgerTransaction, UserProfile } from '../types';
import { fetchCollection, fetchDocById, saveDoc } from './storage';
import { auth, db } from './firebase';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { getAllEnrollments } from './enrollmentService';
import { getAllSubjects } from './subjectService';
import { getFeeConfiguration } from './feeService';
import { getAllSchedules } from './scheduleService';

export async function getAllLedgers(): Promise<StudentLedger[]> {
  return fetchCollection<StudentLedger>('ledgers');
}

export async function getStudentLedger(studentId: string): Promise<StudentLedger | null> {
  const ledger = await fetchDocById<StudentLedger>('ledgers', studentId);
  return ledger;
}

// Legacy accounts can initialize a missing ledger through their verified Firebase session.
export async function initializeStudentLedger(): Promise<StudentLedger> {
  if (!auth?.currentUser || !db) throw new Error('Sign in again to initialize your ledger.');
  const existing = await getStudentLedger(auth.currentUser.uid);
  if (existing) return existing;
  const profile = (await getDoc(doc(db, 'users', auth.currentUser.uid))).data() as UserProfile | undefined;
  if (!profile || profile.role !== 'student') throw new Error('Student profile not found.');
  const now = new Date().toISOString();
  const ledger: StudentLedger = {id: profile.uid, studentId: profile.uid, studentName: profile.fullName, studentIdNumber: profile.idNumber, programCode: profile.programCode || '', academicYear: '2026-2027', semester: '1st Semester', tuitionFee: 0, miscellaneousFee: 0, otherCharges: 0, totalAssessment: 0, totalPaid: 0, remainingBalance: 0, status: 'paid', transactions: [], updatedAt: now};
  await setDoc(doc(db, 'ledgers', profile.uid), ledger, {merge: true});
  return ledger;
}

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

/** Rebuilds assessment lines from official enrollment without duplicating charges. */
export async function recalculateStudentLedger(studentId: string, academicYear: string, semester: string, persist = true): Promise<StudentLedger> {
  const [ledger, enrollments, subjects, schedules, config] = await Promise.all([
    getStudentLedger(studentId), getAllEnrollments(), getAllSubjects(), getAllSchedules(), getFeeConfiguration(academicYear, semester),
  ]);
  if (!ledger) throw new Error('Ledger record not found for student.');
  if (!config) return ledger;
  const official = enrollments.filter(item => item.studentId === studentId && item.academicYear === academicYear && item.semester === semester && ['enrolled', 'regular', 'irregular'].includes(item.status));
  const enrolledScheduleSubjectIds = new Set(schedules.filter(schedule => schedule.enrolledStudentIds.includes(studentId) && schedule.academicYear === academicYear && schedule.semester === semester).map(schedule => schedule.subjectId));
  const enrolledSubjects = subjects.filter(subject => enrolledScheduleSubjectIds.has(subject.id));
  const units = enrolledSubjects.reduce((sum, subject) => sum + subject.units, 0);
  const tuitionFee = Number((units * config.tuitionPerUnit).toFixed(2));
  const laboratoryFee = Number((enrolledSubjects.filter(subject => (subject.labHours || 0) > 0).length * config.laboratoryFeePerSubject).toFixed(2));
  const subjectCharges = enrolledSubjects.map(subject => ({subjectId: subject.id, subjectCode: subject.code, subjectTitle: subject.title, units: subject.units, tuition: Number((subject.units * config.tuitionPerUnit).toFixed(2)), laboratory: Number(((subject.labHours || 0) > 0 ? config.laboratoryFeePerSubject : 0).toFixed(2))}));
  const totalAssessment = Number((tuitionFee + laboratoryFee + config.miscellaneousFee + config.otherCharges).toFixed(2));
  const assessmentTransactions = ledger.transactions.filter(item => item.type === 'assessment' && item.academicYear === academicYear && item.semester === semester && item.category !== 'tuition' && item.category !== 'laboratory' && item.category !== 'miscellaneous' && item.category !== 'registration');
  const now = new Date().toISOString();
  const newTransactions: LedgerTransaction[] = [
    {id: `assessment-${studentId}-${academicYear}-${semester}`, date: now.slice(0, 10), referenceNo: `ASSESS-${academicYear}-${semester}`, type: 'assessment', category: 'tuition', description: `Tuition (${units} units × ₱${config.tuitionPerUnit.toLocaleString()})`, amount: tuitionFee, academicYear, semester},
    {id: `laboratory-${studentId}-${academicYear}-${semester}`, date: now.slice(0, 10), referenceNo: `LAB-${academicYear}-${semester}`, type: 'assessment', category: 'laboratory', description: 'Laboratory fees', amount: laboratoryFee, academicYear, semester},
    {id: `miscellaneous-${studentId}-${academicYear}-${semester}`, date: now.slice(0, 10), referenceNo: `MISC-${academicYear}-${semester}`, type: 'assessment', category: 'miscellaneous', description: 'Miscellaneous fees', amount: config.miscellaneousFee, academicYear, semester},
  ];
  const kept = ledger.transactions.filter(item => !(item.type === 'assessment' && ['tuition', 'laboratory', 'miscellaneous'].includes(item.category) && item.academicYear === academicYear && item.semester === semester));
  const totalPaid = ledger.transactions.filter(item => item.type === 'payment' && item.academicYear === academicYear && item.semester === semester).reduce((sum, item) => sum + item.amount, 0);
  const remainingBalance = Number(Math.max(0, totalAssessment - totalPaid).toFixed(2));
  const updated: StudentLedger = {...ledger, academicYear, semester, tuitionFee, miscellaneousFee: config.miscellaneousFee, otherCharges: Number((laboratoryFee + config.otherCharges).toFixed(2)), totalAssessment, totalPaid, remainingBalance, status: remainingBalance <= 0 ? 'paid' : totalPaid > 0 ? 'partial' : 'unpaid', subjectCharges, transactions: [...kept, ...assessmentTransactions, ...newTransactions], updatedAt: now};
  if (persist) await saveDoc('ledgers', studentId, updated);
  return updated;
}
