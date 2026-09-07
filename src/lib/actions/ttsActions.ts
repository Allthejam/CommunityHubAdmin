'use server';

import { initializeAdminApp } from '@/firebase/admin-app';
import { getStorage } from 'firebase-admin/storage';
import { ttsFlow } from '@/ai/flows/tts-flow';

type ActionResponse = {
  success: boolean;
  error?: string;
  url?: string;
};

// Target the specific verified bucket address
const BUCKET_NAME = 'studio-293583498-5253a.firebasestorage.app';

/**
 * Generates audio via AI and saves it to the specified Firebase Storage bucket.
 */
export async function generateAndSaveAudioAction(params: {
  tourId: string;
  text: string;
  voice: string;
}): Promise<ActionResponse> {
  const { tourId, text, voice } = params;

  if (!tourId || !text || !voice) {
    return { success: false, error: 'Missing required parameters.' };
  }

  try {
    // 1. Generate Audio
    const ttsResult = await ttsFlow({ text, voice });
    
    if (!ttsResult || !ttsResult.media) {
      throw new Error("The AI model failed to produce audio media. Try a shorter script.");
    }

    // 2. Initialize Storage
    const { adminApp, firestore } = initializeAdminApp();
    const bucket = getStorage(adminApp).bucket(BUCKET_NAME);
    const storagePath = `audioTours/${tourId}.wav`;

    // 3. Extract Data
    const match = ttsResult.media.match(/^data:(audio\/[a-zA-Z0-9-+.]+);base64,(.*)$/);
    if (!match) {
        throw new Error('Invalid audio data format received from AI.');
    }
    const contentType = match[1];
    const base64Data = match[2];
    
    const buffer = Buffer.from(base64Data, 'base64');
    const file = bucket.file(storagePath);

    // 4. Save to Storage
    await file.save(buffer, {
      metadata: { 
        contentType,
        cacheControl: 'public, max-age=31536000'
      },
    });

    // 5. Make Public & Update Firestore
    await file.makePublic();
    const publicUrl = file.publicUrl();
    
    const tourRef = firestore.collection('audioTours').doc(tourId);
    await tourRef.update({ 
        audioUrl: publicUrl,
        updatedAt: Date.now() 
    });

    return { success: true, url: publicUrl };

  } catch (error: any) {
    console.error("Audio Generation Action Failure:", error);
    return { success: false, error: error.message || "Failed to generate or save audio." };
  }
}

/**
 * Deletes an audio tour document and its associated storage file.
 * Performs safe deletion to ensure database integrity even if file is missing.
 */
export async function deleteAudioTourAction(tourId: string): Promise<ActionResponse> {
    if (!tourId) return { success: false, error: "Tour ID is required." };
    
    console.log(`[Audio Hub] Starting deletion for tour ID: ${tourId}`);
    
    try {
        const { firestore, adminApp } = initializeAdminApp();
        const bucket = getStorage(adminApp).bucket(BUCKET_NAME);
        const storagePath = `audioTours/${tourId}.wav`;
        
        // 1. Attempt Storage Deletion (safe check)
        try {
            const file = bucket.file(storagePath);
            const [exists] = await file.exists();
            if (exists) {
                await file.delete();
                console.log(`[Audio Hub] Deleted storage file: ${storagePath}`);
            } else {
                console.log(`[Audio Hub] No storage file found at ${storagePath}, skipping file deletion.`);
            }
        } catch (e: any) {
            console.warn(`[Audio Hub] Non-fatal storage deletion warning: ${e.message}`);
        }

        // 2. Firestore Document Deletion
        await firestore.collection('audioTours').doc(tourId).delete();
        console.log(`[Audio Hub] Deleted Firestore document: ${tourId}`);

        return { success: true };
    } catch (error: any) {
        console.error("[Audio Hub] Fatal Deletion Error:", error);
        return { success: false, error: error.message || "A system error occurred during deletion." };
    }
}
