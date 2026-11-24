import { httpsCallable } from 'firebase/functions';
import { createUserWithEmailAndPassword } from 'firebase/auth';
import { doc, writeBatch } from 'firebase/firestore';
import { auth, db, functions } from './firebase';
import type { EnrollmentRecord, StudentLedger, UserProfile } from '../types';

export interface TemporaryCredentials {
  username: string;
  temporaryPassword: string;
}

type EnrollmentDetails = Pick<EnrollmentRecord, 'programId' | 'sectionId' | 'yearLevel' | 'status' | 'academicYear' | 'semester'>;
type Identity = Pick<UserProfile, 'firstName' | 'lastName' | 'email' | 'phone'>;
type StudentIdentity = Identity & Pick<UserProfile, 'idNumber'>;
export type StaffInput = Identity & { role: Exclude<UserProfile['role'], 'student'>; programId?: string };
type EnrollmentInput = EnrollmentDetails & (
  { student: StudentIdentity } | { studentUid: string; enrollmentId?: string }
);

async function call<Output>(name: string, input: object = {}): Promise<Output> {
  if (!functions) throw new Error('Connect to Firebase to continue.');
  const invoke = httpsCallable<object, Output>(functions, name);
  return (await invoke(input)).data;
}

export const saveEnrollmentWithAccount = (data: EnrollmentInput) =>
  call<{ enrollment: EnrollmentRecord; credentials: TemporaryCredentials | null }>('enrollmentWithAccount', data);
export const resetStudentPassword = (studentUid: string) =>
  call<TemporaryCredentials>('resetStudentPassword', {studentUid});
export const getRegistrarSetupStatus = () => call<{configured: boolean}>('getSetupStatus');
export const setupRegistrar = (data: Identity & {password: string; setupKey: string}) =>
  call<{email: string}>('setupRegistrar', data);
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
export const createStaffAccount = (data: StaffInput) => call<TemporaryCredentials>('createStaffAccount', data);
export const updateAccountProfile = (uid: string, changes: Partial<UserProfile>) =>
  call<{status: UserProfile['status']}>('updateAccountProfile', {...changes, uid});
export const provisionExistingStaff = (uid: string) =>
  call<TemporaryCredentials>('provisionExistingStaff', {uid});
export const ensureStudentLedger = () => call<StudentLedger>('ensureStudentLedger');
export const changeAccountPassword = (currentPassword: string, newPassword: string, confirmPassword: string) =>
  call<{signInAfter: number}>('changeAccountPassword', {currentPassword, newPassword, confirmPassword});
