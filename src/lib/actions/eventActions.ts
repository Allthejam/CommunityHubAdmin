'use server';

import { initializeAdminApp } from "@/firebase/admin-app";
import { Timestamp } from "firebase-admin/firestore";
import { scanAndFlagAction } from "./moderationActions";

type ActionResponse = {
  success: boolean;
  error?: string;
  id?: string;
};

type EventData = {
    ownerId: string;
    businessId?: string;
    title: string;
    category: string;
    description: string;
    startDate: Date;
    endDate?: Date;
    startTime?: string;
    image: string | null;
    metaTitle?: string;
    metaDescription?: string;
}

export async function createEventAction(data: EventData): Promise<ActionResponse> {
    try {
        const { firestore } = initializeAdminApp();
        let businessData: any;
        let businessName: string | null = null;
        let communityId: string | null = null;

        // If a businessId is provided, fetch its data
        if (data.businessId) {
            const businessDoc = await firestore.collection('businesses').doc(data.businessId).get();
            if (!businessDoc.exists) {
                return { success: false, error: "Selected business does not exist." };
            }
            businessData = businessDoc.data();
            businessName = businessData?.businessName;
            communityId = businessData?.primaryCommunityId;
        } else {
            // If no businessId, it's a community event created by a leader. Get community from leader's profile.
            const userDoc = await firestore.collection('users').doc(data.ownerId).get();
            if (!userDoc.exists) {
                return { success: false, error: "Event creator not found." };
            }
            const userData = userDoc.data();
            communityId = userData?.communityId;
            businessName = "Community Event"; // Default organizer name
        }

        if (!communityId) {
             return { success: false, error: "Could not determine a community for this event." };
        }

        let initialStatus: 'Pending Approval' | 'Live' | 'Upcoming' = 'Pending Approval';
        const isEnterprise = businessData?.accountType === 'enterprise';
        const isApprovedPartner = isEnterprise && (businessData?.status === 'Approved' || businessData?.status === 'Subscribed');
        const startDate = data.startDate ? new Date(data.startDate) : new Date();

        // Enterprise partners or leaders creating community events can bypass approval
        if (isApprovedPartner || !data.businessId) {
            initialStatus = startDate <= new Date() ? 'Live' : 'Upcoming';
        }

        const eventToCreate = {
            ...data,
            businessName: businessName,
            communityId: communityId,
            status: initialStatus,
            createdAt: Timestamp.now(),
            submittedAt: Timestamp.now(),
            startDate: Timestamp.fromDate(startDate),
            endDate: data.endDate ? Timestamp.fromDate(new Date(data.endDate)) : null,
        };

        const newEventRef = await firestore.collection('events').add(eventToCreate);
        
        // Moderation Scan
        await scanAndFlagAction({
            text: `${data.title} ${data.description}`,
            contentType: "Community Event",
            authorId: data.ownerId,
            authorName: businessName || 'Unknown Organizer',
            contentId: newEventRef.id
        });

        // Notify leader if pending approval
        if (initialStatus === 'Pending Approval') {
            const usersRef = firestore.collection('users');
            const roleQuery = usersRef
                .where(`communityRoles.${communityId}.role`, 'in', ['leader', 'president'])
                .limit(1);
            let leaderSnapshot = await roleQuery.get();

            if (leaderSnapshot.empty) {
                const primaryLeaderQuery = usersRef
                    .where('homeCommunityId', '==', communityId)
                    .where('role', 'in', ['leader', 'president'])
                    .limit(1);
                leaderSnapshot = await primaryLeaderQuery.get();
            }

            if (!leaderSnapshot.empty) {
                const leaderId = leaderSnapshot.docs[0].id;
                const notificationRef = firestore.collection('notifications').doc();
                await notificationRef.set({
                    recipientId: leaderId,
                    communityId: communityId,
                    type: 'Event Request',
                    subject: `New event for approval: ${data.title}`,
                    from: businessName,
                    date: Timestamp.now().toDate().toISOString(),
                    status: 'New',
                    relatedId: newEventRef.id,
                });
            }
        }

        return { success: true, id: newEventRef.id };

    } catch (error: any) {
        console.error("Error creating event:", error);
        return { success: false, error: error.message || "Failed to create event." };
    }
}


export async function updateEventAction(eventId: string, data: Partial<EventData>): Promise<ActionResponse> {
  if (!eventId) {
    return { success: false, error: "Event ID is required." };
  }
  try {
    const { firestore } = initializeAdminApp();
    const eventRef = firestore.collection('events').doc(eventId);
    
    const updateData: any = { 
        ...data,
        updatedAt: Timestamp.now(),
        status: 'Pending Approval', // Re-submit for approval on edit
        submittedAt: Timestamp.now(),
    };

    if (data.startDate) {
      updateData.startDate = Timestamp.fromDate(new Date(data.startDate));
    }
    if (data.endDate) {
      updateData.endDate = Timestamp.fromDate(new Date(data.endDate));
    }

    await eventRef.update(updateData);
    
     // Notify leader
    const eventDoc = await eventRef.get();
    const fullEventData = eventDoc.data();
    if (fullEventData && fullEventData.communityId) {
        const usersRef = firestore.collection('users');
        const roleQuery = usersRef
            .where(`communityRoles.${fullEventData.communityId}.role`, 'in', ['leader', 'president'])
            .limit(1);
        let leaderSnapshot = await roleQuery.get();

        if (leaderSnapshot.empty) {
            const primaryLeaderQuery = usersRef
                .where('homeCommunityId', '==', fullEventData.communityId)
                .where('role', 'in', ['leader', 'president'])
                .limit(1);
            leaderSnapshot = await primaryLeaderQuery.get();
        }

        if (!leaderSnapshot.empty) {
            const leaderId = leaderSnapshot.docs[0].id;
            await firestore.collection('notifications').add({
                recipientId: leaderId,
                communityId: fullEventData.communityId,
                type: 'Event Request',
                subject: `Event updated, needs re-approval: ${fullEventData.title}`,
                from: fullEventData.businessName || 'Community Member',
                date: Timestamp.now().toDate().toISOString(),
                status: 'New',
                relatedId: eventId,
            });
        }
    }

    return { success: true };
  } catch (error: any) {
    console.error(`Error updating event ${eventId}:`, error);
    return { success: false, error: error.message || "Failed to update event." };
  }
}


export async function updateEventStatusAction(params: {
    eventId: string;
    status: string;
}): Promise<ActionResponse> {
    try {
        const { firestore } = initializeAdminApp();
        const eventRef = firestore.collection('events').doc(params.eventId);
        await eventRef.update({ status: params.status });
        return { success: true };
    } catch (error: any) {
        console.error("Error updating event status:", error);
        return { success: false, error: error.message };
    }
}

export async function deleteEventAction(params: {
    eventId: string;
}): Promise<ActionResponse> {
    try {
        const { firestore } = initializeAdminApp();
        await firestore.collection('events').doc(params.eventId).delete();
        return { success: true };
    } catch (error: any) {
        console.error("Error deleting event:", error);
        return { success: false, error: error.message };
    }
}
