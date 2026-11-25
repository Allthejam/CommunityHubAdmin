
import 'dotenv/config'; // Ensure all environment variables are loaded
import { initializeApp, getApps, App, cert, deleteApp } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import 'server-only'; // Ensures this module is only used on the server

import * as fs from 'fs';
import * as path from 'path';

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

  // Explicitly load the service account key from env or local file if present.
  try {
    let serviceAccount: any = null;
    if (process.env.FIREBASE_SERVICE_ACCOUNT_KEY) {
      try {
        const rawKey = process.env.FIREBASE_SERVICE_ACCOUNT_KEY.trim();
        if (rawKey.startsWith('{')) {
          serviceAccount = JSON.parse(rawKey);
        } else {
          // Attempt Base64 decode
          const decoded = Buffer.from(rawKey, 'base64').toString('utf8');
          serviceAccount = JSON.parse(decoded);
        }
      } catch (parseErr) {
        console.error('[Firebase Admin] Failed to parse FIREBASE_SERVICE_ACCOUNT_KEY:', parseErr);
      }
    }

    if (!serviceAccount) {
      const candidates = [
        path.join(process.cwd(), 'service-account.json'),
        path.join(process.cwd(), 'Admin APP', 'service-account.json'),
        path.join(process.cwd(), 'Main Community Hub APP', 'service-account.json'),
        path.resolve(process.cwd(), '..', 'service-account.json'),
        path.resolve(process.cwd(), '..', 'Admin APP', 'service-account.json'),
        path.resolve(__dirname, '..', '..', 'service-account.json'),
        path.resolve(__dirname, '..', '..', '..', 'service-account.json'),
        path.resolve(__dirname, '..', '..', '..', 'Admin APP', 'service-account.json'),
        path.resolve(__dirname, '..', '..', '..', 'Main Community Hub APP', 'service-account.json'),
        'C:\\Users\\Allan\\OneDrive\\000 - New Business (AJ)\\APPS Backups\\Community Hub (ALL)\\Admin APP\\service-account.json',
        'C:\\Users\\Allan\\OneDrive\\000 - New Business (AJ)\\APPS Backups\\Community Hub (ALL)\\Main Community Hub APP\\service-account.json',
      ];
      for (const candidate of candidates) {
        if (fs.existsSync(candidate)) {
          try {
            const raw = fs.readFileSync(candidate, 'utf8');
            serviceAccount = JSON.parse(raw);
            break;
          } catch (readErr) {
            console.warn('[Firebase Admin] Could not parse local service-account.json at', candidate, readErr);
          }
        }
      }
    }

    const storageBucket = process.env.FIREBASE_STORAGE_BUCKET || process.env.GCLOUD_STORAGE_BUCKET || 'studio-293583498-5253a.firebasestorage.app';

    if (existingApp) {
      // If the app was already initialized with credentials or we have no new credentials, return it
      if (!serviceAccount || (existingApp.options as any)?.credential) {
        return existingApp;
      }
      // If existing app was unauthenticated and we now have a service account, replace it
      try {
        deleteApp(existingApp);
      } catch (_) {}
    }

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
