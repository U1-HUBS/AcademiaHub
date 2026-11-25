import { createUserWithEmailAndPassword, getAuth, sendPasswordResetEmail, signOut } from 'firebase/auth';
import { getApp, getApps, initializeApp } from 'firebase/app';
import { doc, setDoc, updateDoc, writeBatch } from 'firebase/firestore';
import { auth, db, firebaseConfig } from './firebase';
import type { EnrollmentRecord, StudentLedger, UserProfile } from '../types';
import { fetchDocById } from './storage';
import { recalculateStudentLedger } from './ledgerService';

export interface TemporaryCredentials {
  username: string;
  temporaryPassword: string;
}

export interface StaffAccountResult {
  username: string;
}

type EnrollmentDetails = Pick<EnrollmentRecord, 'programId' | 'yearLevel' | 'status' | 'academicYear' | 'semester' | 'studentType'> & {sectionId?: string};
type Identity = Pick<UserProfile, 'firstName' | 'lastName' | 'email' | 'phone'>;
type StudentIdentity = Identity & Pick<UserProfile, 'idNumber'>;
export type StaffInput = Identity & {
  role: Exclude<UserProfile['role'], 'student'>;
  programId?: string;
  password: string;
  confirmPassword: string;
};
type EnrollmentInput = EnrollmentDetails & (
  { student: StudentIdentity } | { studentUid: string; enrollmentId?: string }
);

export const saveEnrollmentWithAccount = (data: EnrollmentInput) =>
  saveEnrollmentWithAccountClient(data);
export async function resetStudentPassword(studentIdNumber: string): Promise<{username: string}> {
  if (!auth) throw new Error('Firebase Authentication is unavailable.');
  const id = studentIdNumber.trim().toLowerCase();
  if (!id) throw new Error('Student ID Number is required.');
  const email = `${id}@students.academiahub.invalid`;
  await sendPasswordResetEmail(auth, email);
  return {username: email};
}
// Spark-compatible builds do not call Cloud Functions. The setup page remains
// available at /setup; Firestore/Auth determine whether the submitted account works.
export const getRegistrarSetupStatus = async () => ({configured: true});
export const setupRegistrarClient = async (data: Identity & {password: string}) => {
  if (!auth || !db) throw new Error('Firebase is unavailable.');
  const {password, ...identity} = data;
  const credential = await createUserWithEmailAndPassword(auth, identity.email.trim().toLowerCase(), password);
  const uid = credential.user.uid;
  const now = new Date().toISOString();
  const batch = writeBatch(db);
  batch.set(doc(db, 'system', 'bootstrap'), {createdAt: now, registrarUid: uid});
  batch.set(doc(db, 'users', uid), {
    ...identity,
    email: identity.email.trim().toLowerCase(),
    fullName: `${identity.firstName.trim()} ${identity.lastName.trim()}`,
    phone: identity.phone?.trim() || '',
    uid,
    role: 'registrar',
    status: 'active',
    idNumber: `REG-${new Date().getFullYear()}-0001`,
    mustChangePassword: false,
    createdAt: now,
    updatedAt: now,
  });
  try {
    await batch.commit();
    return {email: data.email.trim().toLowerCase()};
  } catch (error) {
    await credential.user.delete().catch(() => {});
    throw error;
  }
};
export async function createStaffAccount(data: StaffInput): Promise<StaffAccountResult> {
  if (!auth || !db) throw new Error('Firebase is unavailable.');
  const assignedProgram = data.programId ? await fetchDocById<{id: string; code: string}>('programs', data.programId) : null;
  const staffAppName = 'automate-staff-provisioning';
  const staffApp = getApps().some(item => item.name === staffAppName)
    ? getApp(staffAppName)
    : initializeApp(firebaseConfig, staffAppName);
  const staffAuth = getAuth(staffApp);
  const credential = await createUserWithEmailAndPassword(staffAuth, data.email.trim().toLowerCase(), data.password);
  const now = new Date().toISOString();
  const prefix = {registrar: 'REG', program_chair: 'CHR', teacher: 'TCH'}[data.role];
  const uid = credential.user.uid;
  try {
    await setDoc(doc(db, 'users', uid), {
      uid,
      firstName: data.firstName.trim(),
      lastName: data.lastName.trim(),
      fullName: `${data.firstName.trim()} ${data.lastName.trim()}`,
      email: data.email.trim().toLowerCase(),
      phone: data.phone?.trim() || '',
      role: data.role,
      programId: data.programId || null,
      programCode: assignedProgram?.code || null,
      idNumber: `${prefix}-${new Date().getFullYear()}-${uid.slice(0, 8).toUpperCase()}`,
      status: 'active',
      mustChangePassword: true,
      authProvisioned: true,
      createdAt: now,
      updatedAt: now,
    });
    return {username: data.email.trim().toLowerCase()};
  } catch (error) {
    await signOut(staffAuth).catch(() => {});
    await credential.user.delete().catch(() => {});
    throw error;
  }
}

async function saveEnrollmentWithAccountClient(data: EnrollmentInput): Promise<{enrollment: EnrollmentRecord; credentials: TemporaryCredentials | null}> {
  if (!auth || !db) throw new Error('Firebase is unavailable.');
  const program = await fetchDocById<{id: string; code: string}>('programs', data.programId);
  const section = data.sectionId ? await fetchDocById<{id: string; name: string; programId: string; yearLevel: number}>('sections', data.sectionId) : null;
  if (!program) throw new Error('Choose a valid academic program.');
  if (section && (section.programId !== data.programId || section.yearLevel !== data.yearLevel)) throw new Error('Choose a valid program and year level.');
  let studentUid: string;
  let credentials: TemporaryCredentials | null = null;
  if ('studentUid' in data) studentUid = data.studentUid;
  else {
    const student = data.student;
    const email = `${student.idNumber.trim().toLowerCase()}@students.academiahub.invalid`;
    const studentAppName = 'automate-student-provisioning';
    const studentApp = getApps().some(item => item.name === studentAppName) ? getApp(studentAppName) : initializeApp(firebaseConfig, studentAppName);
    const studentAuth = getAuth(studentApp);
    const temporaryPassword = `A9!${crypto.randomUUID().replaceAll('-', '')}z`;
    const created = await createUserWithEmailAndPassword(studentAuth, email, temporaryPassword);
    studentUid = created.user.uid;
    credentials = {username: student.idNumber.trim().toUpperCase(), temporaryPassword};
    const now = new Date().toISOString();
    await setDoc(doc(db, 'users', studentUid), {uid: studentUid, ...student, idNumber: student.idNumber.trim().toUpperCase(), email: student.email?.trim() || '', fullName: `${student.firstName.trim()} ${student.lastName.trim()}`, role: 'student', status: 'active', mustChangePassword: true, studentIdLogin: true, studentAuthEmail: email, programId: data.programId, programCode: program.code, yearLevel: data.yearLevel, studentType: data.studentType, sectionId: data.sectionId || '', sectionName: section?.name || '', createdAt: now, updatedAt: now});
  }
  const now = new Date().toISOString();
  const id = 'enrollmentId' in data && data.enrollmentId ? data.enrollmentId : `enr-${studentUid}-${data.academicYear}-${data.semester.replaceAll(' ', '-')}`;
  const enrollment: EnrollmentRecord = {id, studentId: studentUid, studentName: 'student' in data ? `${data.student.firstName.trim()} ${data.student.lastName.trim()}` : studentUid, studentIdNumber: 'student' in data ? data.student.idNumber.trim().toUpperCase() : studentUid, studentEmail: 'student' in data ? data.student.email?.trim() || '' : '', programId: data.programId, programCode: program.code, yearLevel: data.yearLevel, sectionId: data.sectionId || '', sectionName: section?.name || '', studentType: data.studentType, status: data.status, academicYear: data.academicYear, semester: data.semester, enrolledAt: now};
  await setDoc(doc(db, 'enrollments', id), enrollment, {merge: true});
  if (credentials) {
    const ledger: StudentLedger = {id: studentUid, studentId: studentUid, studentName: enrollment.studentName, studentIdNumber: enrollment.studentIdNumber, programCode: program.code, academicYear: data.academicYear, semester: data.semester, tuitionFee: 0, miscellaneousFee: 0, otherCharges: 0, totalAssessment: 0, totalPaid: 0, remainingBalance: 0, status: 'paid', transactions: [], updatedAt: now};
    await setDoc(doc(db, 'ledgers', studentUid), ledger, {merge: true});
  }
  await recalculateStudentLedger(studentUid, data.academicYear, data.semester).catch(() => undefined);
  return {enrollment, credentials};
}
export async function updateAccountProfile(uid: string, changes: Partial<UserProfile>): Promise<{status: UserProfile['status']}> {
  if (!db) throw new Error('Firebase is unavailable.');
  const {uid: ignoredUid, createdAt, ...safeChanges} = changes;
  void ignoredUid; void createdAt;
  await updateDoc(doc(db, 'users', uid), {...safeChanges, updatedAt: new Date().toISOString()});
  return {status: (safeChanges.status as UserProfile['status']) || 'active'};
}
