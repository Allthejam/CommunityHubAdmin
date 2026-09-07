
'use server';

import { initializeAdminApp } from "@/firebase/admin-app";

type ActionResponse = {
  success: boolean;
  error?: string;
};

type AdvertiserStatus = "Pending Approval" | "Approved" | "Requires Amendment" | "Declined" | "Suspended" | "Draft";

export async function updateNationalAdvertiserStatusAction(params: {
  userId: string;
  status: AdvertiserStatus;
}): Promise<ActionResponse> {
  const { userId, status } = params;
  if (!userId || !status) {
    return { success: false, error: 'User ID and status are required.' };
  }

  try {
    const { firestore } = initializeAdminApp();
    const userRef = firestore.collection('users').doc(userId);
    await userRef.update({ 'companyProfile.status': status });
    return { success: true };
  } catch (error: any) {
    console.error(`Error updating advertiser ${userId} status:`, error);
    return { success: false, error: error.message || 'Failed to update status.' };
  }
}

    