import { signInWithEmailAndPassword, signOut, type User } from 'firebase/auth';
import { doc, getDocFromServer } from 'firebase/firestore';
import { auth, db } from './firebase';
import { changeAccountPassword } from './accountApi';
import type { UserProfile } from '../types';

const STUDENT_DOMAIN = 'students.academiahub.invalid';
const STUDENT_ID = /^[a-z0-9]+(?:-[a-z0-9]+)*$/i;
export const PASSWORD_GUIDANCE = 'Use at least 12 characters with uppercase, lowercase, a number, and a symbol.';

export function isStrongPassword(value: string) {
  return value.length >= 12 && value.length <= 128 && /[a-z]/.test(value) &&
    /[A-Z]/.test(value) && /\d/.test(value) && /[^A-Za-z0-9\s]/.test(value);
}

export function loginEmail(identifier: string) {
  const value = identifier.trim().toLowerCase();
  if (value.includes('@')) return value;
  if (value.length < 3 || value.length > 40 || !STUDENT_ID.test(value)) {
    throw new Error('Enter your Student ID Number or institutional email.');
  }
  return value + '@' + STUDENT_DOMAIN;
}

export async function verifiedProfile(session: User, profile?: UserProfile): Promise<UserProfile> {
  if (!db) throw new Error('Firebase is unavailable.');
  const account = profile ?? (await getDocFromServer(doc(db, 'users', session.uid))).data() as UserProfile | undefined;
  if (!account || account.uid !== session.uid || account.status !== 'active') {
    throw new Error('Your account is unavailable. Contact the Registrar.');
  }
  if (account.studentIdLogin && account.studentAuthEmail !== session.email) {
    throw new Error('Sign in with your Student ID.');
  }
  if (!account.mustChangePassword && account.credentialsValidAfter) {
    const token = await session.getIdTokenResult();
    if (Date.parse(token.authTime) <= account.credentialsValidAfter * 1000) {
      throw new Error('Your password was updated. Sign in again to continue.');
    }
  }
  return account;
}

export async function loginWithCredentials(identifier: string, password: string): Promise<UserProfile> {
  if (!auth) throw new Error('Firebase Authentication is unavailable.');
  const session = await signInWithEmailAndPassword(auth, loginEmail(identifier), password);
  try {
    return await verifiedProfile(session.user);
  } catch (error) {
    if (auth.currentUser === session.user) await signOut(auth);
    throw error;
  }
}

export async function logoutUser(): Promise<void> {
  if (auth) await signOut(auth);
}

export async function updateOwnPassword(current: string, next: string, confirmation: string) {
  const email = auth?.currentUser?.email;
  if (!email) throw new Error('Sign in again to change your password.');
  const {signInAfter} = await changeAccountPassword(current, next, confirmation);
  // Firebase Auth timestamps have one-second granularity. Start a fresh session past the server cutoff.
  await new Promise(resolve => setTimeout(resolve, Math.max(1100, Math.min(3000, signInAfter - Date.now() + 50))));
  try {
    return await loginWithCredentials(email, next);
  } catch {
    await logoutUser();
    throw new Error('Password changed. Sign in again with your new password.');
  }
}

export function authErrorMessage(error: unknown): string {
  const code = (error as {code?: string})?.code;
  const message = error instanceof Error ? error.message.toLowerCase() : '';
  if (['auth/invalid-credential', 'auth/wrong-password', 'auth/user-not-found'].includes(code ?? '')) {
    return 'Check your Student ID or email and password.';
  }
  if (code === 'auth/user-disabled') return 'Your account is inactive. Contact the Registrar.';
  if (code === 'permission-denied') {
    return 'Your portal account is not configured correctly. Contact the Registrar.';
  }
  if (code === 'auth/network-request-failed' || code === 'unavailable' ||
      message.includes('client is offline') || message.includes('failed to get document')) {
    return 'Could not connect to the portal. Check your internet connection and try again.';
  }
  return error instanceof Error ? error.message : 'The operation failed. Try again.';
}
