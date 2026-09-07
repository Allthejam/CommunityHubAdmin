'use server';

import { initializeAdminApp } from "@/firebase/admin-app";
import { FieldValue, Timestamp } from "firebase-admin/firestore";
import { scanAndFlagAction } from "./moderationActions";

type ActionResponse = {
  success: boolean;
  error?: string;
};

export type BusinessListing = {
  id: string;
  businessName: string;
  businessCategory: string;
  accountType?: string;
  status:
    | "Pending Approval"
    | "Approved"
    | "Requires Amendment" | "Declined" | "Subscribed" | "Draft" | "Hidden" | "Trial Expired";
  createdAt?: { toDate: () => Date };
  submittedAt?: { toDate: () => Date };
};


export async function deleteBusinessAction(params: {
  businessId: string;
  userId: string;
}): Promise<ActionResponse> {
  try {
    const { firestore } = initializeAdminApp();
    await firestore.collection('businesses').doc(params.businessId).delete();
    return { success: true };
  } catch (error: any) {
    console.error('Error deleting business:', error);
    return { success: false, error: error.message };
  }
}

export async function updateBusinessStatusAction(params: {
    businessId: string,
    status: BusinessListing['status'],
    amendmentReason?: string;
}): Promise<ActionResponse> {
    try {
        const { firestore } = initializeAdminApp();
        const updateData: {status: string, amendmentReason?: string | FieldValue} = { status: params.status };
        if (params.status === 'Requires Amendment' && params.amendmentReason) {
            updateData.amendmentReason = params.amendmentReason;
        } else {
            updateData.amendmentReason = FieldValue.delete();
        }
        await firestore.collection('businesses').doc(params.businessId).update(updateData);
        return { success: true };
    } catch (error: any) {
        console.error('Error updating business status:', error);
        return { success: false, error: error.message };
    }
}

export async function runCreateBusiness(businessData: any): Promise<ActionResponse> {
  try {
    const { firestore } = initializeAdminApp();
    const { businessId, ownerId, ...data } = businessData;
    
    const contentToScan = `${data.businessName} ${data.shortDescription} ${data.longDescription || ''}`;
    
    if (businessId) {
      const businessRef = firestore.collection('businesses').doc(businessId);
      
      await firestore.runTransaction(async (transaction) => {
        const businessDoc = await transaction.get(businessRef);
        if (!businessDoc.exists) {
            throw new Error("Business to update not found.");
        }
        const existingStatus = businessDoc.data()?.status;
        const newStatus = (existingStatus === 'Subscribed' || existingStatus === 'Approved') 
            ? existingStatus 
            : 'Pending Approval';

        const updatePayload: any = {
            ...data,
            ownerId,
            updatedAt: Timestamp.now(),
            status: newStatus, 
        };

        if (newStatus === 'Pending Approval') {
            updatePayload.submittedAt = Timestamp.now();
        }

        transaction.update(businessRef, updatePayload);

        // Scan for profanity - passing absolute path
        await scanAndFlagAction({
            text: contentToScan,
            contentType: "Business Profile (Update)",
            authorId: ownerId,
            authorName: data.ownerName || 'Unknown Owner',
            contentId: businessId,
            contentPath: businessRef.path
        });

        if (data.primaryCommunityId) {
            const usersRef = firestore.collection('users');
            let leaderSnapshot = await usersRef.where(`communityRoles.${data.primaryCommunityId}.role`, 'in', ['leader', 'president']).limit(1).get();

            if (leaderSnapshot.empty) {
                leaderSnapshot = await usersRef.where('homeCommunityId', '==', data.primaryCommunityId).where('role', 'in', ['leader', 'president']).limit(1).get();
            }

            if (!leaderSnapshot.empty) {
                const leaderId = leaderSnapshot.docs[0].id;
                const notificationRef = firestore.collection('notifications').doc();
                const subject = newStatus === 'Pending Approval' 
                  ? `Business updated, needs re-approval: ${data.businessName}`
                  : `A subscribed business has updated their profile: ${data.businessName}`;
                
                transaction.set(notificationRef, {
                    recipientId: leaderId,
                    communityId: data.primaryCommunityId,
                    type: 'Business Submission',
                    subject: subject,
                    from: data.ownerName,
                    date: Timestamp.now().toDate().toISOString(),
                    status: 'New',
                    relatedId: businessId,
                });
            }
        }
      });
    } else {
      const newBusinessRef = firestore.collection('businesses').doc();
      const createPayload: any = {
        ...data,
        status: 'Pending Approval',
        ownerId,
        createdAt: Timestamp.now(),
        submittedAt: Timestamp.now(),
      };
      
      const batch = firestore.batch();
      batch.set(newBusinessRef, createPayload);

      // Scan for profanity - passing absolute path
      await scanAndFlagAction({
          text: contentToScan,
          contentType: "Business Profile (New)",
          authorId: ownerId,
          authorName: data.ownerName || 'Unknown Owner',
          contentId: newBusinessRef.id,
          contentPath: newBusinessRef.path
      });

      if (data.primaryCommunityId) {
          const usersRef = firestore.collection('users');
          let leaderSnapshot = await usersRef.where(`communityRoles.${data.primaryCommunityId}.role`, 'in', ['leader', 'president']).limit(1).get();

          if (leaderSnapshot.empty) {
              leaderSnapshot = await usersRef.where('homeCommunityId', '==', data.primaryCommunityId).where('role', 'in', ['leader', 'president']).limit(1).get();
          }

          if (!leaderSnapshot.empty) {
              const leaderId = leaderSnapshot.docs[0].id;
              const notificationRef = firestore.collection('notifications').doc();
              batch.set(notificationRef, {
                  recipientId: leaderId,
                  communityId: data.primaryCommunityId,
                  type: 'Business Submission',
                  subject: `New business for approval: ${data.businessName}`,
                  from: data.ownerName,
                  date: Timestamp.now().toDate().toISOString(),
                  status: 'New',
                  relatedId: newBusinessRef.id,
              });
          }
      }
      
      await batch.commit();
    }

    return { success: true };
  } catch (error: any) {
    console.error("Error creating/updating business:", error);
    return { success: false, error: error.message };
  }
}

export async function saveBusinessAsDraft(params: {
  userId: string;
  businessData: any;
}): Promise<ActionResponse> {
  try {
    const { firestore } = initializeAdminApp();
    const { userId, businessData } = params;
    const { id, ...dataToSave } = businessData;
    
    const draftData = {
        ...dataToSave,
        status: 'Draft',
        ownerId: userId,
        accountType: businessData.accountType || 'business',
    };

    if (id) {
        const businessRef = firestore.collection('businesses').doc(id);
        await businessRef.set({ ...draftData, updatedAt: Timestamp.now() }, { merge: true });
    } else {
        await firestore.collection('businesses').add({
            ...draftData,
            createdAt: Timestamp.now(),
        });
    }

    return { success: true };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}
