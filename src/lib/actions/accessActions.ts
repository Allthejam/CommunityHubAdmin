'use server';

import { initializeAdminApp } from "@/firebase/admin-app";
import { Timestamp } from "firebase-admin/firestore";

type ActionResponse = {
  success: boolean;
  error?: string;
};

type AccessRequestParams = {
    userId: string;
    applicantName: string;
    applicantTitle: string;
    agency: string;
    country: string;
    govLevel: string;
    phone: string;
    email: string;
    refName: string;
    refTitle: string;
    refEmail: string;
    refPhone: string;
    justification: string;
    agreedToTerms: boolean;
}

export async function createAccessRequestAction(params: AccessRequestParams): Promise<ActionResponse> {
    try {
        const { firestore } = initializeAdminApp();
        await firestore.collection('access_requests').add({ 
            ...params, 
            status: 'Pending', 
            createdAt: Timestamp.now() 
        });
        return { success: true };
    } catch (error: any) {
        return { success: false, error: "Failed to submit application to the database." };
    }
}

/**
 * Grants or Amends special broadcast access for a user.
 * Syncs permissions and scopes from the request document to the user profile.
 */
export async function grantSpecialAccessAction(params: {
  userId: string;
  requestId: string;
}): Promise<ActionResponse> {
  const { userId, requestId } = params;

  try {
    const { firestore } = initializeAdminApp();
    
    // 1. Get the latest data from the request document
    const requestDoc = await firestore.collection('access_requests').doc(requestId).get();
    if (!requestDoc.exists) {
        throw new Error("Application record not found.");
    }
    
    const requestData = requestDoc.data()!;
    const { permissions, broadcastScopes } = requestData;

    const batch = firestore.batch();

    // 2. Update the user's profile with granular permissions and scopes
    const userRef = firestore.collection('users').doc(userId);
    batch.update(userRef, { 
        'permissions.hasBroadcastAccess': true,
        'permissions.canSendStandard': permissions?.standard ?? false,
        'permissions.canSendEmergency': permissions?.emergency ?? false,
        'permissions.broadcastScopes': broadcastScopes || [],
        'settings.hasBroadcastAccess': true // Legacy field compatibility
    });

    // 3. Create a notification for the user
    const notificationRef = firestore.collection('notifications').doc();
    batch.set(notificationRef, {
      recipientId: userId,
      type: 'Special Access Request',
      subject: requestData.status === 'Approved' ? 'Your broadcast access has been updated.' : 'Your request for broadcast access was approved!',
      from: 'Platform Administration',
      date: Timestamp.now().toDate().toISOString(),
      status: 'New',
      relatedId: requestId,
    });

    // 4. Record the audit log entry
    const logRef = firestore.collection('audit_log').doc();
    batch.set(logRef, {
        adminId: 'system', // Ideally passed from caller context
        action: 'grant_special_access',
        details: `Granted/Amended broadcast access for ${requestData.applicantName}. Scopes: ${broadcastScopes?.length || 0}.`,
        timestamp: Timestamp.now(),
        targetUser: { id: userId, name: requestData.applicantName }
    });

    await batch.commit();
    return { success: true };
  } catch (error: any) {
    console.error("Error granting special access:", error);
    return { success: false, error: error.message };
  }
}

export async function validateContactAction(params: {
    email?: string;
    phone?: string;
    country: string;
}): Promise<{ isValid: boolean; reason?: string }> {
    if (params.email) {
        if (params.email.endsWith('.gov') || params.email.endsWith('.gov.uk') || params.email.endsWith('.police.uk')) {
            return { isValid: true };
        }
        return { isValid: false, reason: "Please use an official government or agency email address." };
    }
    if (params.phone) {
        if (params.phone.length > 8) {
            return { isValid: true };
        }
        return { isValid: false, reason: "The phone number appears to be invalid." };
    }
    return { isValid: false, reason: 'No contact information provided.' };
}
