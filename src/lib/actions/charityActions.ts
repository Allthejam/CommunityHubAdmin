'use server';

import { initializeAdminApp } from "@/firebase/admin-app";
import { Timestamp } from "firebase-admin/firestore";
import { scanAndFlagAction } from "./moderationActions";

type ActionResponse = {
  success: boolean;
  error?: string;
};

export type CharityData = {
    title: string;
    category: string;
    address: string;
    description: string;
    website: string;
    email: string;
    phone: string;
    image: string | null;
    communityId: string;
    registrationNumber?: string;
    metaTitle?: string;
    metaDescription?: string;
};

export type CharityApplicationData = {
    title: string;
    description: string;
    website: string;
    contactPerson: string;
    contactNumber: string;
    image: string | null;
    communityId: string;
    userId: string;
}

export async function applyForCharityListingAction(data: CharityApplicationData): Promise<ActionResponse> {
     if (!data.communityId || !data.title || !data.description || !data.userId) {
        return { success: false, error: 'Missing required application fields.' };
    }
    try {
        const { firestore } = initializeAdminApp();
        const batch = firestore.batch();
        
        const charityRef = firestore.collection('charities').doc();
        batch.set(charityRef, {
            title: data.title,
            category: 'Uncategorized', // Default category, to be set by leader
            description: data.description,
            website: data.website,
            image: data.image,
            communityId: data.communityId,
            submittedBy: data.userId,
            contactPerson: data.contactPerson, // For internal review
            contactNumber: data.contactNumber, // For internal review
            status: 'Pending',
            createdAt: Timestamp.now(),
        });

        // Moderation Scan
        await scanAndFlagAction({
            text: `${data.title} ${data.description}`,
            contentType: "Charity Application",
            authorId: data.userId,
            authorName: data.contactPerson,
            contentId: charityRef.id
        });

        // Find the community leader to notify
        const usersRef = firestore.collection('users');
        const roleQuery = usersRef
            .where(`communityRoles.${data.communityId}.role`, 'in', ['leader', 'president'])
            .limit(1);
        let leaderSnapshot = await roleQuery.get();

        if (leaderSnapshot.empty) {
            const primaryLeaderQuery = usersRef
                .where('homeCommunityId', '==', data.communityId)
                .where('role', 'in', ['leader', 'president'])
                .limit(1);
            leaderSnapshot = await primaryLeaderQuery.get();
        }

        if (!leaderSnapshot.empty) {
            const leaderId = leaderSnapshot.docs[0].id;
            const notificationRef = firestore.collection('notifications').doc();
            batch.set(notificationRef, {
                recipientId: leaderId,
                type: 'Charity Application',
                subject: `New Charity Application: ${data.title}`,
                from: data.contactPerson,
                date: Timestamp.now().toDate().toISOString(),
                status: 'New',
                relatedId: charityRef.id,
                communityId: data.communityId,
            });
        }
        
        await batch.commit();

        return { success: true };
    } catch (error: any) {
        console.error("Error submitting charity application:", error);
        return { success: false, error: error.message };
    }
}

export async function createCharityAction(data: CharityData): Promise<ActionResponse> {
    if (!data.communityId || !data.title || !data.description) {
        return { success: false, error: 'Missing required fields.' };
    }
    try {
        const { firestore } = initializeAdminApp();
        await firestore.collection('charities').add({
            ...data,
            status: 'Pending', // All new listings must be approved
            createdAt: Timestamp.now(),
        });
        return { success: true };
    } catch (error: any) {
        console.error("Error creating charity:", error);
        return { success: false, error: error.message };
    }
}

export async function updateCharityAction(id: string, data: Partial<Omit<CharityData, 'communityId'>>): Promise<ActionResponse> {
    if (!id) {
        return { success: false, error: 'Charity ID is required.' };
    }
    try {
        const { firestore } = initializeAdminApp();
        await firestore.collection('charities').doc(id).update({
            ...data,
            status: 'Pending', // Require re-approval on edit
            updatedAt: Timestamp.now(),
        });
        return { success: true };
    } catch (error: any) {
        console.error("Error updating charity:", error);
        return { success: false, error: error.message };
    }
}

export async function updateCharityStatusAction(id: string, status: 'Active' | 'Archived' | 'Pending' | 'Declined' | 'Paused'): Promise<ActionResponse> {
    if (!id) {
        return { success: false, error: 'Charity ID is required.' };
    }
    try {
        const { firestore } = initializeAdminApp();
        await firestore.collection('charities').doc(id).update({ status });
        return { success: true };
    } catch (error: any) {
        console.error("Error updating charity status:", error);
        return { success: false, error: error.message };
    }
}

export async function deleteCharityAction(id: string): Promise<ActionResponse> {
    if (!id) {
        return { success: false, error: 'Charity ID is required.' };
    }
    try {
        const { firestore } = initializeAdminApp();
        await firestore.collection('charities').doc(id).delete();
        return { true: true };
    } catch (error: any) {
        console.error("Error deleting charity:", error);
        return { success: false, error: error.message };
    }
}
