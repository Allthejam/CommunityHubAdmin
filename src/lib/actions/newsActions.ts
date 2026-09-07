
'use server';

import { initializeAdminApp } from "@/firebase/admin-app";
import { FieldValue, Timestamp } from "firebase-admin/firestore";

type ActionResponse = {
  success: boolean;
  error?: string;
};

export async function updateNewsStoryStatus(params: {
  storyId: string;
  status: 'Published' | 'Archived' | 'Declined' | 'Requires Amendment';
  amendmentReason?: string;
}): Promise<ActionResponse> {
  console.log('Updating news story status with params:', params);
  try {
    const { firestore } = initializeAdminApp();
    const storyRef = firestore.collection('news').doc(params.storyId);
    const updateData: { status: string; amendmentReason?: string | FieldValue, publishedAt?: Timestamp } = {
        status: params.status,
    };
    if (params.status === 'Requires Amendment' && params.amendmentReason) {
        updateData.amendmentReason = params.amendmentReason;
    } else {
        updateData.amendmentReason = FieldValue.delete();
    }
    if (params.status === 'Published') {
        updateData.publishedAt = Timestamp.now();
    }
    await storyRef.update(updateData);
    return { success: true };
  } catch (error: any) {
      return { success: false, error: error.message };
  }
}

export type ProofreadTextOutput = {
    proofreadText: string;
    suggestions: string[];
}

export async function runProofreadText({ text }: { text: string }): Promise<ProofreadTextOutput> {
    console.log('Proofreading text:', text);
    // In a real app, this would call an AI service.
    // This mock will find a common typo and suggest a fix.
    let suggestions: string[] = [];
    let proofreadText = text;

    if (text.toLowerCase().includes('teh')) {
        proofreadText = text.replace(/teh/gi, 'the');
        suggestions.push("Corrected 'teh' to 'the'.");
    }
     if (text.toLowerCase().includes('wierd')) {
        proofreadText = text.replace(/wierd/gi, 'weird');
        suggestions.push("Corrected 'wierd' to 'weird'.");
    }
    if (suggestions.length === 0) {
        suggestions.push("No major spelling or grammar issues found.");
    }

    return {
        proofreadText,
        suggestions,
    };
}


export async function runCreateNewsStory(params: {
    storyId?: string; // Optional ID for updates
    title: string;
    category: string;
    shortDescription: string;
    content: string;
    image: string | null;
    authorId: string;
    authorName: string;
    communityId: string;
    status: 'Draft' | 'Pending Approval' | 'Published';
}): Promise<ActionResponse> {
    console.log('Creating or updating news story with params:', params);
     try {
        const { firestore } = initializeAdminApp();
        const { storyId, ...storyData } = params;
        
        let dataToSave: any = {
            ...storyData,
        };

        if (storyId) {
            // Update existing story
            dataToSave.updatedAt = Timestamp.now();
            if (storyData.status === 'Published') {
                dataToSave.publishedAt = Timestamp.now();
                 dataToSave.submittedAt = FieldValue.delete();
            } else if (storyData.status === 'Pending Approval') {
                 dataToSave.submittedAt = Timestamp.now();
            }


            const storyRef = firestore.collection('news').doc(storyId);
            await storyRef.update(dataToSave);
        } else {
            // Create new story
            dataToSave.createdAt = Timestamp.now();
            if (storyData.status === 'Published') {
                dataToSave.publishedAt = Timestamp.now();
            }
             if (storyData.status === 'Pending Approval') {
                 dataToSave.submittedAt = Timestamp.now();
            }
             dataToSave.date = Timestamp.now();
            await firestore.collection('news').add(dataToSave);
        }
        return { success: true };
    } catch (error: any) {
        console.error('Error creating/updating news story:', error);
        return { success: false, error: error.message };
    }
}

export async function deleteNewsStoryAction(params: {
  storyId: string;
}): Promise<ActionResponse> {
  const { storyId } = params;
  if (!storyId) {
    return { success: false, error: 'Story ID is required.' };
  }

  try {
    const { firestore } = initializeAdminApp();
    await firestore.collection('news').doc(storyId).delete();
    return { success: true };
  } catch (error: any) {
    console.error(`Error deleting story ${storyId}:`, error);
    return { success: false, error: error.message || 'Failed to delete story.' };
  }
}

