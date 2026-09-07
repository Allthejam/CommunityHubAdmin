'use server';

import { initializeAdminApp } from "@/firebase/admin-app";
import { Timestamp } from "firebase-admin/firestore";

type ActionResponse = {
  success: boolean;
  error?: string;
  id?: string;
};

/**
 * YouTube ID Extractor
 * Supports youtu.be, youtube.com/watch, and embed URLs
 */
const getYoutubeId = (url: string) => {
    const regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|\&v=)([^#\&\?]*).*/;
    const match = url.match(regExp);
    return (match && match[2].length === 11) ? match[2] : null;
};

type VideoResourceData = {
    id?: string;
    title: string;
    youtubeUrl: string;
    accountType: 'personal' | 'business' | 'leader' | 'enterprise' | 'national';
}

export async function saveVideoResourceAction(data: VideoResourceData): Promise<ActionResponse> {
    const videoId = getYoutubeId(data.youtubeUrl);
    
    if (!videoId) {
        return { success: false, error: "Invalid YouTube URL provided." };
    }

    try {
        const { firestore } = initializeAdminApp();
        const videoCollection = firestore.collection('video_resources');
        
        const payload = {
            title: data.title,
            youtubeUrl: data.youtubeUrl,
            videoId: videoId,
            accountType: data.accountType,
            updatedAt: Timestamp.now(),
        };

        if (data.id) {
            await videoCollection.doc(data.id).update(payload);
            return { success: true, id: data.id };
        } else {
            const docRef = await videoCollection.add({
                ...payload,
                createdAt: Timestamp.now(),
            });
            return { success: true, id: docRef.id };
        }
    } catch (error: any) {
        console.error("Error saving video resource:", error);
        return { success: false, error: error.message };
    }
}

export async function deleteVideoResourceAction(docId: string): Promise<ActionResponse> {
    if (!docId) return { success: false, error: "Document ID is required." };
    try {
        const { firestore } = initializeAdminApp();
        await firestore.collection('video_resources').doc(docId).delete();
        return { success: true };
    } catch (error: any) {
        console.error("Error deleting video resource:", error);
        return { success: false, error: error.message };
    }
}
