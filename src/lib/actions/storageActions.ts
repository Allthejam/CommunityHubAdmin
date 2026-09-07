
'use server';

import { initializeAdminApp } from '@/firebase/admin-app';
import { getStorage } from 'firebase-admin/storage';

type ActionResponse = {
  success: boolean;
  error?: string;
  url?: string;
};

export async function uploadAudioAction(params: {
  base64Data: string;
  path: string;
}): Promise<ActionResponse> {
  const { base64Data, path } = params;

  if (!base64Data || !path) {
    return { success: false, error: 'Base64 data and path are required.' };
  }

  try {
    const { adminApp } = initializeAdminApp();
    const bucket = getStorage(adminApp).bucket(process.env.GCLOUD_STORAGE_BUCKET);
    
    // Extract content type and data from data URI
    const match = base64Data.match(/^data:(audio\/[a-zA-Z0-9-+.]+);base64,(.*)$/);
    if (!match) {
        return { success: false, error: 'Invalid data URI format.' };
    }
    const contentType = match[1];
    const data = match[2];
    
    const buffer = Buffer.from(data, 'base64');
    const file = bucket.file(path);

    await file.save(buffer, {
      metadata: {
        contentType: contentType,
      },
    });

    // Make the file public and get its URL
    await file.makePublic();
    const publicUrl = file.publicUrl();

    return { success: true, url: publicUrl };
  } catch (error: any) {
    console.error("Error uploading audio:", error);
    return { success: false, error: error.message || 'Failed to upload audio file.' };
  }
}
