import { initializeApp } from 'firebase/app';
import { getAuth, connectAuthEmulator } from 'firebase/auth';
import { getFirestore, connectFirestoreEmulator } from 'firebase/firestore';
import { getFunctions, connectFunctionsEmulator } from 'firebase/functions';
const config={
  apiKey:import.meta.env.VITE_FIREBASE_API_KEY||'AIzaSyCPS6VRcNJ18u11Nu7Mtz3fpOyDE9t3rq8',
  authDomain:import.meta.env.VITE_FIREBASE_AUTH_DOMAIN||'academia-e2117.firebaseapp.com',
  projectId:import.meta.env.VITE_FIREBASE_PROJECT_ID||'academia-e2117',
  storageBucket:import.meta.env.VITE_FIREBASE_STORAGE_BUCKET||'academia-e2117.firebasestorage.app',
  messagingSenderId:import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID||'676615635424',
  appId:import.meta.env.VITE_FIREBASE_APP_ID||'1:676615635424:web:d1565687f5b877c5d86b85',
  measurementId:import.meta.env.VITE_FIREBASE_MEASUREMENT_ID||'G-3SQ58TDHYH'
};
export const app=initializeApp(config); export const auth=getAuth(app); export const db=getFirestore(app); export const functions=getFunctions(app);
if(import.meta.env.VITE_USE_EMULATORS==='true'){connectAuthEmulator(auth,'http://127.0.0.1:9099',{disableWarnings:true});connectFirestoreEmulator(db,'127.0.0.1',8080);connectFunctionsEmulator(functions,'127.0.0.1',5001)}
