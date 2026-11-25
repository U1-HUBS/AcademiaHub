import { initializeApp, getApps, getApp, FirebaseApp } from 'firebase/app';
import { getAuth, connectAuthEmulator, Auth } from 'firebase/auth';
import { initializeFirestore, getFirestore, connectFirestoreEmulator, Firestore } from 'firebase/firestore';
import { getAnalytics, isSupported, Analytics } from 'firebase/analytics';

export const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY || "AIzaSyCPS6VRcNJ18u11Nu7Mtz3fpOyDE9t3rq8",
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN || "academia-e2117.firebaseapp.com",
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID || "academia-e2117",
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET || "academia-e2117.firebasestorage.app",
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID || "676615635424",
  appId: import.meta.env.VITE_FIREBASE_APP_ID || "1:676615635424:web:d1565687f5b877c5d86b85",
  measurementId: import.meta.env.VITE_FIREBASE_MEASUREMENT_ID || "G-3SQ58TDHYH"
};

// Check if actual configuration has been provided
export const isFirebaseConfigured = Boolean(
  firebaseConfig.apiKey &&
  firebaseConfig.apiKey !== 'your_api_key_here' &&
  firebaseConfig.projectId &&
  firebaseConfig.projectId !== 'your_project_id'
);

let app: FirebaseApp | null = null;
let auth: Auth | null = null;
let db: Firestore | null = null;
let analytics: Analytics | null = null;

if (isFirebaseConfigured) {
  try {
    const hasExistingApp = getApps().length > 0;
    app = hasExistingApp ? getApp() : initializeApp(firebaseConfig);
    auth = getAuth(app);
    // Some campus networks, proxies, and privacy extensions block Firestore's
    // streaming transport. Let the SDK detect that and fall back to polling.
    db = hasExistingApp ? getFirestore(app) : initializeFirestore(app, {
      ignoreUndefinedProperties: true,
      experimentalAutoDetectLongPolling: true,
    });
    if (import.meta.env.VITE_USE_FIREBASE_EMULATORS === 'true') {
      connectAuthEmulator(auth, 'http://127.0.0.1:9099', {disableWarnings: true});
      connectFirestoreEmulator(db, '127.0.0.1', 8080);
    }
    console.log('[AUTOMATE] Connected to live Firebase project:', firebaseConfig.projectId);

    if (typeof window !== 'undefined' && import.meta.env.VITE_USE_FIREBASE_EMULATORS !== 'true') {
      isSupported()
        .then(supported => {
          if (supported && app) {
            analytics = getAnalytics(app);
            console.log('[AUTOMATE] Google Analytics initialized.');
          }
        })
        .catch(() => {
          // Analytics safely skipped if unsupported or blocked
        });
    }
  } catch (error) {
    console.warn('[AUTOMATE] Firebase initialization failed:', error);
  }
}

export { app, auth, db, analytics };
