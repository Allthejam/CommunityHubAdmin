'use server';

import { initializeAdminApp } from "@/firebase/admin-app";

type ActionResponse = {
  success: boolean;
  error?: string;
};

export async function updateFeedbackStatusAction(params: {
  id: string;
  communityId: string;
  status: 'Read' | 'Actioned' | 'Archived';
}): Promise<ActionResponse> {
  const { id, communityId, status } = params;
  if (!communityId || !id || !status) {
    return { success: false, error: 'Required parameters are missing.' };
  }

  try {
    const { firestore } = initializeAdminApp();
    const feedbackRef = firestore.doc(`communities/${communityId}/feedback/${id}`);
    await feedbackRef.update({ status });
    return { success: true };
  } catch (error: any) {
    console.error(`Error updating feedback status:`, error);
    return { success: false, error: error.message || 'Failed to update status.' };
  }
}
