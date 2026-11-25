
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
  // Explicitly load the service account key from env or local file if present.
  try {
    let serviceAccount: any = null;

    // 1. Check process.env.FIREBASE_SERVICE_ACCOUNT_KEY
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
        console.error('[Firebase Admin] Failed to parse FIREBASE_SERVICE_ACCOUNT_KEY from env:', parseErr);
      }
    }

    // 2. Directly read .env.local on disk in case server process was started prior to env change
    if (!serviceAccount) {
      const envCandidates = [
        path.join(process.cwd(), '.env.local'),
        path.join(process.cwd(), 'Admin APP', '.env.local'),
        path.resolve(process.cwd(), '..', '.env.local'),
        path.resolve(process.cwd(), '..', 'Admin APP', '.env.local'),
        'C:\\Users\\Allan\\OneDrive\\000 - New Business (AJ)\\APPS Backups\\Community Hub (ALL)\\Admin APP\\.env.local',
        'C:\\Users\\Allan\\OneDrive\\000 - New Business (AJ)\\APPS Backups\\Community Hub (ALL)\\Main Community Hub APP\\.env.local',
      ];
      for (const envFile of envCandidates) {
        if (fs.existsSync(envFile)) {
          try {
            const content = fs.readFileSync(envFile, 'utf8');
            const match = content.match(/FIREBASE_SERVICE_ACCOUNT_KEY=(.+)/);
            if (match && match[1]) {
              const val = match[1].trim();
              if (val.startsWith('{')) {
                serviceAccount = JSON.parse(val);
              } else {
                const decoded = Buffer.from(val, 'base64').toString('utf8');
                serviceAccount = JSON.parse(decoded);
              }
              if (serviceAccount) {
                console.log(`[Firebase Admin] Successfully read service account from ${envFile}`);
                break;
              }
            }
          } catch (_) {}
        }
      }
    }

    // 3. Directly search service-account.json candidates on disk
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
        'C:\\Users\\Allan\\OneDrive\\000 - New Business (AJ)\\APPS Backups\\Community Hub (ALL)\\service-account.json',
      ];
      for (const candidate of candidates) {
        if (fs.existsSync(candidate)) {
          try {
            const raw = fs.readFileSync(candidate, 'utf8');
            serviceAccount = JSON.parse(raw);
            console.log(`[Firebase Admin] Loaded service account from file: ${candidate}`);
            break;
          } catch (readErr) {
            console.warn('[Firebase Admin] Could not parse local service-account.json at', candidate, readErr);
          }
        }
      }
    }

    const storageBucket = process.env.FIREBASE_STORAGE_BUCKET || process.env.GCLOUD_STORAGE_BUCKET || 'studio-293583498-5253a.firebasestorage.app';

    // If service account is available, check for or initialize authenticated app
    if (serviceAccount) {
      const authAppName = 'firebase-admin-authenticated';
      const existingAuth = getApps().find((app) => app.name === authAppName);
      if (existingAuth && (existingAuth.options as any)?.credential) {
        return existingAuth;
      }

      const credential = cert(serviceAccount);
      return initializeApp({
        credential,
        projectId: serviceAccount.project_id || process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || 'studio-293583498-5253a',
        storageBucket
      }, authAppName);
    }

    // Default Google Cloud Application Default Credentials if running in App Hosting / GCP
    const defaultAppName = 'firebase-admin-app';
    const existingDefault = getApps().find((app) => app.name === defaultAppName);
    if (existingDefault) {
      return existingDefault;
    }

    return initializeApp({
      projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || 'studio-293583498-5253a',
      storageBucket
    }, defaultAppName);
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
  if (!adminApp || !(adminApp.options as any)?.credential) {
    adminApp = createAdminApp();
  }
  return {
    firestore: getFirestore(adminApp),
    adminApp,
  };
}
