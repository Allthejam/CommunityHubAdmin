
'use client';

import { firebaseConfig } from '@/firebase/config';
import { initializeApp, getApps, getApp, FirebaseApp } from 'firebase/app';
import { getAuth, type Auth } from 'firebase/auth';
import { getFirestore, type Firestore } from 'firebase/firestore'

/**
 * Initializes and returns the Firebase SDKs.
 * This function uses the hardcoded config object to ensure consistency 
 * between development and production environments, resolving "configuration-not-found" errors.
 */
export function initializeFirebase() {
  const app = getApps().length > 0 ? getApp() : initializeApp(firebaseConfig);
  return getSdks(app);
}

/**
 * Utility to get initialized SDK instances for a given Firebase App.
 */
export function getSdks(firebaseApp: FirebaseApp) {
  return {
    firebaseApp,
    auth: getAuth(firebaseApp),
    firestore: getFirestore(firebaseApp)
  };
}

export * from './provider';
export * from './client-provider';
export * from './firestore/use-collection';
export * from './firestore/use-doc';
export * from './non-blocking-updates';
export * from './errors';
export * from './error-emitter';

/**
 * Helper to initiate an email/password sign-in.
 */
export const initiateEmailSignIn = (auth: Auth, email: string, password: string) => {
  if (!auth) {
    console.error('Firebase Auth instance not provided');
    return;
  }
  
  import('firebase/auth').then(({ signInWithEmailAndPassword }) => {
    signInWithEmailAndPassword(auth, email, password).catch((e) => {
      console.error('Sign-in error:', e.message);
    });
  });
};
