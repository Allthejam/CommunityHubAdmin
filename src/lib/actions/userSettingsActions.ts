
'use server';

import { initializeAdminApp } from "@/firebase/admin-app";
import { Timestamp } from "firebase-admin/firestore";

type ActionResponse = {
  success: boolean;
  error?: string;
};

export async function saveAllUserSettingsAction(
  userId: string,
  settings: Record<string, any>
): Promise<ActionResponse> {
  if (!userId) {
    return { success: false, error: 'User ID is required.' };
  }

  try {
    const { firestore } = initializeAdminApp();
    const userRef = firestore.collection('users').doc(userId);
    
    // Convert Date objects to Firestore Timestamps if they exist
    const dataToSave = { ...settings };
    if (dataToSave['settings.emergencyNotificationsSnoozedUntil'] instanceof Date) {
        dataToSave['settings.emergencyNotificationsSnoozedUntil'] = Timestamp.fromDate(dataToSave['settings.emergencyNotificationsSnoozedUntil']);
    } else if (dataToSave['settings.emergencyNotificationsSnoozedUntil'] === null) {
        dataToSave['settings.emergencyNotificationsSnoozedUntil'] = null;
    }

    // This directly updates the fields passed in the `settings` object.
    // If `settings` is { avatar: '...', banner: '...' }, it will update those top-level fields.
    await userRef.update(dataToSave);
    
    return { success: true };
  } catch (error: any) {
    console.error('Error saving user settings:', error);
    return { success: false, error: error.message || 'Failed to save settings.' };
  }
}
