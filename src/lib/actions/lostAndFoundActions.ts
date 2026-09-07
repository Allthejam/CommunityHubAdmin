'use server';

import { initializeAdminApp } from "@/firebase/admin-app";
import { Timestamp } from "firebase-admin/firestore";
import { scanAndFlagAction } from "./moderationActions";

type ActionResponse = {
  success: boolean;
  error?: string;
};

type ReportItemParams = {
    type: 'lost' | 'found';
    description: string;
    location: string;
    date: Date;
    image: string | null;
    ownerId: string;
    communityId: string;
    reporterName: string;
}

export async function reportLostOrFoundItemAction(params: ReportItemParams): Promise<ActionResponse> {
    if (!params.communityId || !params.ownerId) {
        return { success: false, error: 'User or community information is missing.' };
    }
    
    try {
        const { firestore } = initializeAdminApp();
        const batch = firestore.batch();
        
        const itemRef = firestore.collection('lostAndFound').doc();
        batch.set(itemRef, {
            ...params,
            date: Timestamp.fromDate(params.date),
            status: 'new', // Items must be approved by a leader
            createdAt: Timestamp.now(), 
        });
        
        // Moderation Scan
        await scanAndFlagAction({
            text: params.description,
            contentType: `Lost & Found (${params.type})`,
            authorId: params.ownerId,
            authorName: params.reporterName,
            contentId: itemRef.id
        });

        // Notify leaders
        const usersRef = firestore.collection('users');
        const roleQuery = usersRef
            .where(`communityRoles.${params.communityId}.role`, 'in', ['leader', 'president'])
            .limit(5);
        let leaderSnapshot = await roleQuery.get();

        if (leaderSnapshot.empty) {
            const primaryLeaderQuery = usersRef
                .where('homeCommunityId', '==', params.communityId)
                .where('role', 'in', ['leader', 'president'])
                .limit(5);
            leaderSnapshot = await primaryLeaderQuery.get();
        }

        if (!leaderSnapshot.empty) {
            leaderSnapshot.forEach(leaderDoc => {
                const notificationRef = firestore.collection('notifications').doc();
                batch.set(notificationRef, {
                    recipientId: leaderDoc.id,
                    type: 'Lost & Found Report',
                    subject: `New ${params.type} item (#${itemRef.id.substring(0, 6)})`,
                    from: params.reporterName,
                    date: Timestamp.now().toDate().toISOString(),
                    status: 'New',
                    relatedId: itemRef.id,
                    communityId: params.communityId,
                });
            });
        }
        
        await batch.commit();

        return { success: true };
    } catch (error: any) {
        console.error("Error reporting lost or found item:", error);
        return { success: false, error: error.message };
    }
}

export async function updateLostAndFoundStatusAction(params: {
  itemId: string;
  status: 'active' | 'resolved' | 'rejected' | 'deleted';
  communityId: string;
}): Promise<ActionResponse> {
  const { itemId, status, communityId } = params;
  if (!itemId || !status || !communityId) {
    return { success: false, error: 'Item ID, status, and community ID are required.' };
  }

  try {
    const { firestore } = initializeAdminApp();
    const itemRef = firestore.collection('lostAndFound').doc(itemId);
    await itemRef.update({ status: status });
    return { success: true };
  } catch (error: any) {
    console.error(`Error updating item ${itemId} to status ${status}:`, error);
    return { success: false, error: error.message || 'Failed to update status.' };
  }
}

export async function deleteLostAndFoundItemAction(params: {
  itemId: string;
}): Promise<ActionResponse> {
  const { itemId } = params;
  if (!itemId) {
    return { success: false, error: 'Item ID is required.' };
  }

  try {
    const { firestore } = initializeAdminApp();
    await firestore.collection('lostAndFound').doc(itemId).delete();
    return { success: true };
  } catch (error: any) {
    console.error(`Error deleting item ${itemId}:`, error);
    return { success: false, error: error.message || 'Failed to delete item.' };
  }
}
