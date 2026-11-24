import { timingSafeEqual } from 'node:crypto';
import { initializeApp } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';
import { getFirestore } from 'firebase-admin/firestore';
import { defineSecret, defineString } from 'firebase-functions/params';
import { HttpsError, onCall } from 'firebase-functions/v2/https';
import { makeAccounts } from './accounts.js';

const app = initializeApp();
const auth = getAuth(app);
const setupKey = defineSecret('REGISTRAR_SETUP_KEY');
const authApiKey = defineString('AUTH_WEB_API_KEY', {default: ''});

async function verifyCurrentPassword(email, password, uid) {
  const emulator = process.env.FIREBASE_AUTH_EMULATOR_HOST;
  const host = emulator ? 'http://' + emulator + '/identitytoolkit.googleapis.com' : 'https://identitytoolkit.googleapis.com';
  const key = emulator ? 'emulator-key' : authApiKey.value();
  if (!key) throw new HttpsError('failed-precondition', 'Password verification is not configured.');
  const response = await fetch(host + '/v1/accounts:signInWithPassword?key=' + encodeURIComponent(key), {
    method: 'POST',
    headers: {'Content-Type': 'application/json'},
    body: JSON.stringify({email, password, returnSecureToken: true}),
    signal: AbortSignal.timeout(10_000),
  });
  if (response.status === 400 || response.status === 401) return false;
  if (!response.ok) throw new HttpsError('unavailable', 'Password verification is temporarily unavailable.');
  const result = await response.json();
  if (result.localId !== uid || typeof result.idToken !== 'string') return false;
  const verified = await auth.verifyIdToken(result.idToken);
  return verified.uid === uid;
}

const accounts = makeAccounts(getFirestore(app), auth, verifyCurrentPassword);
const options = {region: 'us-central1', timeoutSeconds: 60};

function callable(handler, settings = {}) {
  return onCall({...options, ...settings}, async request => {
    try {
      return await handler(request);
    } catch (error) {
      if (error instanceof HttpsError) throw error;
      if (['auth/email-already-exists', 'auth/uid-already-exists'].includes(error.code)) {
        throw new HttpsError('already-exists', 'This Firebase identity is already in use.');
      }
      if (error.code === 'auth/invalid-password') {
        throw new HttpsError('invalid-argument', 'Firebase did not accept this password.');
      }
      if (error.code === 6) throw new HttpsError('already-exists', 'The record already exists.');
      // Never log callable payloads or Firebase Auth error bodies, which may contain submitted values.
      throw new HttpsError('internal', 'The account operation failed. Check the record before trying again.');
    }
  });
}

export const enrollmentWithAccount = callable(accounts.enroll);
export const resetStudentPassword = callable(accounts.reset);
export const changeAccountPassword = callable(accounts.change);
export const getSetupStatus = callable(accounts.setupStatus);
export const createStaffAccount = callable(accounts.createStaff);
export const updateAccountProfile = callable(accounts.updateProfile);
export const provisionExistingStaff = callable(accounts.provisionLegacyStaff);
export const ensureStudentLedger = callable(accounts.ensureLedger);

export const setupRegistrar = callable(request => {
  const configuredKey = setupKey.value() || '';
  const presentedKey = typeof request.data?.setupKey === 'string' ? request.data.setupKey : '';
  if (configuredKey.length < 24 || !presentedKey || presentedKey.length > 256) {
    throw new HttpsError('permission-denied', 'Enter the setup key provided by the Firebase administrator.');
  }
  const expected = Buffer.from(configuredKey);
  const received = Buffer.from(presentedKey);
  if (expected.length !== received.length || !timingSafeEqual(expected, received)) {
    throw new HttpsError('permission-denied', 'The setup key is incorrect.');
  }
  return accounts.setup(request.data);
}, {secrets: [setupKey]});
