
import 'dotenv/config'; // Ensure all environment variables are loaded
import { initializeApp, getApps, App, cert } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import 'server-only'; // Ensures this module is only used on the server

let adminApp: App;

/**
 * Initializes and returns the Firebase Admin App instance.
 *
 * This function handles server-side Firebase initialization. It's designed to be
 * idempotent, meaning it will only initialize the app once.
 */
function createAdminApp(): App {
  const adminAppName = 'firebase-admin-app';
  const existingApp = getApps().find((app) => app.name === adminAppName);
  if (existingApp) {
    return existingApp;
  }

  // Explicitly load the service account key from env or local file.
  try {
    let serviceAccount: any;
    if (process.env.FIREBASE_SERVICE_ACCOUNT_KEY) {
      serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT_KEY);
    } else {
      try {
        serviceAccount = require('../../service-account.json');
      } catch {
        // Fallback for different execution contexts
        serviceAccount = null;
      }
    }

    const storageBucket = process.env.FIREBASE_STORAGE_BUCKET || process.env.GCLOUD_STORAGE_BUCKET || 'studio-293583498-5253a.firebasestorage.app';

    if (serviceAccount) {
      const credential = cert(serviceAccount);
      return initializeApp({
        credential,
        projectId: serviceAccount.project_id || process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || 'studio-293583498-5253a',
        storageBucket
      }, adminAppName);
    }

    // Default Google Cloud Application Default Credentials if running in App Hosting / GCP
    return initializeApp({
      projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || 'studio-293583498-5253a',
      storageBucket
    }, adminAppName);
  } catch (e: any) {
    console.error(
      'Firebase Admin initialization failed. Ensure service-account.json or FIREBASE_SERVICE_ACCOUNT_KEY is present and valid. Original error: ' + e.message
    );
    throw e;
  }
}

/**
 * Provides initialized Firebase Admin SDK services.
 *
 * This function is the entry point for accessing server-side Firebase services.
 * It ensures the admin app is initialized before returning the services.
 *
 * @returns An object containing the Firestore instance and the Admin App itself.
 */
export function initializeAdminApp() {
  if (!adminApp) {
    adminApp = createAdminApp();
  }
  return {
    firestore: getFirestore(adminApp),
    adminApp,
  };
}
