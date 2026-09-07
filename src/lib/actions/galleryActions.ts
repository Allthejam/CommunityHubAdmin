'use server';

import { initializeAdminApp } from "@/firebase/admin-app";
import { Timestamp, FieldValue } from "firebase-admin/firestore";
import { getStorage } from 'firebase-admin/storage';

type ActionResponse = {
  success: boolean;
  error?: string;
  count?: number;
};

type GalleryImage = {
  url: string;
  path: string;
  description?: string;
};

/**
 * Adds a single image record to the global platform marketing gallery.
 * These assets are shared with all community leaders and staff.
 */
export async function addGalleryImageAction(params: {
  userId: string;
  imageUrl: string;
  storagePath: string;
}): Promise<ActionResponse> {
  const { userId, imageUrl, storagePath } = params;

  if (!userId) {
    return { success: false, error: "User ID is required for audit tracking." };
  }

  try {
    const { firestore } = initializeAdminApp();
    
    const newImage = {
        url: imageUrl,
        path: storagePath,
        createdBy: userId,
        createdAt: Timestamp.now(),
        updatedAt: Timestamp.now(),
    };

    // Save to the global shared collection
    const galleryRef = firestore.collection('platform_marketing_gallery').doc();
    await galleryRef.set(newImage);
    
    return { success: true };
  } catch (error: any) {
    console.error("Error adding image to platform gallery:", error);
    return { success: false, error: "Could not save the image to the platform repository." };
  }
}

/**
 * Scans the Storage bucket for images in the 'gallery/' folder and indexes them into the global platform gallery.
 * This ensures that images uploaded via FTP or external tools appear for all leaders and staff.
 */
export async function syncStorageGalleryAction(params: { userId: string }): Promise<ActionResponse> {
    const { userId } = params;
    if (!userId) return { success: false, error: "User ID is required for synchronization." };

    try {
        const { firestore, adminApp } = initializeAdminApp();
        const bucket = getStorage(adminApp).bucket();
        
        // 1. List files in the 'gallery/' folder
        const [files] = await bucket.getFiles({ prefix: 'gallery/' });
        
        // 2. Get existing global records to prevent duplicates
        const galleryColl = firestore.collection('platform_marketing_gallery');
        const existingDocs = await galleryColl.get();
        const existingPaths = new Set(existingDocs.docs.map(d => d.data().path));
        
        let addedCount = 0;
        const batchSize = 450;
        let batch = firestore.batch();

        for (const file of files) {
            // Skip the directory entry itself and non-image files
            if (file.name === 'gallery/') continue;
            
            const lowerName = file.name.toLowerCase();
            const isImage = lowerName.endsWith('.jpg') || lowerName.endsWith('.jpeg') || lowerName.endsWith('.png') || lowerName.endsWith('.webp') || lowerName.endsWith('.gif');
            
            if (!isImage) continue;

            if (!existingPaths.has(file.name)) {
                // Ensure the file is public so we can generate a permanent URL
                try {
                    await file.makePublic();
                } catch (e) {
                    // Ignore if already public or permission issues
                }

                const publicUrl = file.publicUrl();
                const newDocRef = galleryColl.doc();

                batch.set(newDocRef, {
                    url: publicUrl,
                    path: file.name,
                    createdAt: Timestamp.now(),
                    updatedAt: Timestamp.now(),
                    createdBy: userId,
                    description: 'Auto-indexed from Storage',
                    isImported: true
                });

                addedCount++;
                
                if (addedCount % batchSize === 0) {
                    await batch.commit();
                    batch = firestore.batch();
                }
            }
        }
        
        if (addedCount % batchSize !== 0) {
            await batch.commit();
        }
        
        return { success: true, count: addedCount };
    } catch (error: any) {
        console.error("Global Gallery Sync Failure:", error);
        return { success: false, error: error.message };
    }
}

/**
 * Updates the description of a shared gallery asset.
 */
export async function updateGalleryImageDescriptionAction(params: {
  imageId: string;
  description: string;
}): Promise<ActionResponse> {
  const { imageId, description } = params;
   if (!imageId) {
    return { success: false, error: "Missing required parameters." };
  }
  try {
    const { firestore } = initializeAdminApp();
    const imageDocRef = firestore.collection('platform_marketing_gallery').doc(imageId);
    await imageDocRef.update({ 
        description: description,
        updatedAt: Timestamp.now()
    });
    return { success: true };
  } catch (error: any) {
    console.error("Error updating gallery image description:", error);
    return { success: false, error: "Could not update asset description." };
  }
}

/**
 * Removes an image from the global platform library.
 */
export async function deleteGalleryImageAction(params: {
  imageId: string;
}): Promise<ActionResponse> {
  const { imageId } = params;

  if (!imageId) {
    return { success: false, error: "Asset ID is required for deletion." };
  }
  
  try {
    const { firestore } = initializeAdminApp();
    const imageRef = firestore.collection('platform_marketing_gallery').doc(imageId);
    
    // In a production environment, we might want to also delete the physical file from Storage,
    // but for the platform-shared gallery, we typically only remove the record so the file
    // remains in the master bucket folder for reference.
    
    await imageRef.delete();
    return { success: true };
  } catch (error: any) {
    console.error("Error deleting platform gallery asset:", error);
    return { success: false, error: "Could not remove the asset from the platform repository." };
  }
}
