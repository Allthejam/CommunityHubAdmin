'use server';

import { initializeAdminApp } from "@/firebase/admin-app";
import { logAuditTrailAction } from "./auditActions";

type ActionResponse = {
  success: boolean;
  error?: string;
};

type MemberStatus = 'active' | 'suspended' | 'pending approval' | 'under investigation' | 'hidden' | 'gardening_leave';

export async function updateMemberStatusAction(params: {
  memberId: string;
  newStatus: MemberStatus;
  adminId?: string;
  adminName?: string;
}): Promise<ActionResponse> {
  console.log('Updating member status with params:', params);
  
  try {
    const { firestore } = initializeAdminApp();
    const userDoc = await firestore.collection('users').doc(params.memberId).get();
    const userData = userDoc.data();

    await firestore.collection('users').doc(params.memberId).update({
      status: params.newStatus,
    });

    await logAuditTrailAction({
      adminId: params.adminId || 'system_admin',
      adminName: params.adminName || 'Platform Administration',
      action: `user_status_${params.newStatus.replace(/\s+/g, '_')}`,
      category: 'Users & Directory',
      details: `Updated member status for ${userData?.name || params.memberId} to "${params.newStatus}".`,
      targetUser: {
        id: params.memberId,
        name: userData?.name || 'User',
        email: userData?.email
      },
      metadata: { previousStatus: userData?.status, newStatus: params.newStatus }
    });

    return { success: true };
  } catch (error: any) {
    console.error('Error updating member status:', error);
    return { success: false, error: error.message };
  }
}
