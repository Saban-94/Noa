import { initializeApp } from 'firebase/app';
import { getAuth, GoogleAuthProvider, signInWithPopup, signOut } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';
import firebaseConfig from '../../firebase-applet-config.json';

const app = initializeApp(firebaseConfig);
export const db = getFirestore(app, (firebaseConfig as any).firestoreDatabaseId);
export const auth = getAuth(app);
export const googleProvider = new GoogleAuthProvider();

// Workspace Gmail, Tasks and Calendar Scopes added for PWA Engine integration (PWA Engine v63)
googleProvider.addScope('https://www.googleapis.com/auth/gmail.readonly');
googleProvider.addScope('https://www.googleapis.com/auth/gmail.send');
googleProvider.addScope('https://www.googleapis.com/auth/gmail.modify');
googleProvider.addScope('https://www.googleapis.com/auth/tasks');
googleProvider.addScope('https://www.googleapis.com/auth/calendar');

let cachedToken: string | null = null;

export const signInWithGoogle = async () => {
  try {
    const result = await signInWithPopup(auth, googleProvider);
    const credential = GoogleAuthProvider.credentialFromResult(result);
    cachedToken = credential?.accessToken || null;
    return { user: result.user, token: cachedToken };
  } catch (error) {
    console.error("Error signing in with Google", error);
    throw error;
  }
};

export const getCachedGmailToken = () => cachedToken;
export const setCachedGmailToken = (token: string | null) => {
  cachedToken = token;
};

export const disconnectGmail = async () => {
  try {
    await signOut(auth);
    cachedToken = null;
  } catch (error) {
    console.error("Error signing out", error);
  }
};
